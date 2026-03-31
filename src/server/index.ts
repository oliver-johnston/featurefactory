import Fastify from 'fastify'
import staticPlugin from '@fastify/static'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import type { ChatRunner } from './chat/runner.js'
import {
  ensureSessionContextFiles,
  generateClaudeMd,
  getDesignContextPath,
  getImplementationContextPath,
  getPrsContextPath,
  getTodosContextPath,
  getTaskContextPath,
} from './context.js'
import { FileWatcher } from './files/watcher.js'
import { CliRunner } from './runner/cli-runner.js'
import { claudeStrategy } from './runner/claude-strategy.js'
import { codexStrategy } from './runner/codex-strategy.js'
import { registerRoutes, TASKS_DIR } from './api/routes.js'
import { refreshRepos } from './repos.js'
import { getGitStatus } from './orchestrator/git.js'
import {
  broadcastChatDone,
  broadcastChatError,
  broadcastChatEvent,
  broadcastChatUser,
  broadcastGitStatus,
  broadcastSessionUpdate,
  broadcastFileUpdate,
  broadcastQueueState,
  registerWs,
} from './api/ws.js'
import { appendChatEvent, readChatHistory } from './chat-history.js'
import { listSessions, writeSession } from './store.js'
import type { ChatStreamEvent, Session } from '../shared/types.js'
import {
  applyUserStageTransition,
  buildStageInstructions,
  getInitialTurnInstruction,
  getSessionStage,
  syncSessionStage,
} from './workflow.js'
import type { SessionStage } from '../shared/types.js'
import { readSettings } from './settings.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const CWD = process.cwd()

function persistChatStreamEvent(taskId: string, event: ChatStreamEvent): void {
  if (event.type === 'assistant') {
    appendChatEvent(TASKS_DIR, taskId, {
      ts: new Date().toISOString(),
      type: 'assistant',
      blocks: event.message.content,
    }).catch(err => console.error(`[chat-history] failed to persist event for ${taskId}:`, err))
  }
  if (event.type === 'tool') {
    for (const result of event.content) {
      appendChatEvent(TASKS_DIR, taskId, {
        ts: new Date().toISOString(),
        type: 'tool_result',
        tool_use_id: result.tool_use_id,
        content: result.content,
      }).catch(err => console.error(`[chat-history] failed to persist event for ${taskId}:`, err))
    }
  }
}

function persistTodosFromEvent(worktreePath: string, event: ChatStreamEvent): void {
  if (event.type !== 'assistant') return
  for (const block of event.message.content) {
    if (block.type === 'tool_use' && block.name === 'TodoWrite' && Array.isArray((block.input as any).todos)) {
      const todosPath = getTodosContextPath(worktreePath)
      writeFile(todosPath, JSON.stringify((block.input as any).todos, null, 2), 'utf-8')
        .catch(err => console.error(`[todos] failed to persist todos:`, err))
    }
  }
}

function appendPrUrl(worktreePath: string, url: string): void {
  const prsPath = getPrsContextPath(worktreePath)
  readFile(prsPath, 'utf-8')
    .then(raw => {
      const prs: string[] = JSON.parse(raw)
      if (prs.includes(url)) return // deduplicate
      prs.push(url)
      return writeFile(prsPath, JSON.stringify(prs, null, 2), 'utf-8')
    })
    .catch(err => console.error(`[prs] failed to persist PR:`, err))
}

function persistPrsFromEvent(worktreePath: string, event: ChatStreamEvent): void {
  // Explicit PrCreated tool signal
  if (event.type === 'assistant') {
    for (const block of event.message.content) {
      if (block.type === 'tool_use' && block.name === 'PrCreated' && typeof (block.input as any).url === 'string') {
        appendPrUrl(worktreePath, (block.input as any).url)
      }
    }
  }

  // Auto-detect PR URLs from tool results (e.g. gh pr create output)
  if (event.type === 'tool') {
    readSettings()
      .then(settings => {
        const hosts = settings.githubHosts
        const pattern = new RegExp(
          `https?://(?:${hosts.map(h => h.replace(/\./g, '\\.')).join('|')})/[^/]+/[^/]+/pull/\\d+`,
          'g',
        )
        for (const result of event.content) {
          const matches = result.content.match(pattern)
          if (matches) {
            for (const url of matches) {
              appendPrUrl(worktreePath, url)
            }
          }
        }
      })
      .catch(err => console.error(`[prs] failed to scan for PR URLs:`, err))
  }
}

function getContextPromptLines(session: Session): string[] {
  const taskFilePath = getTaskContextPath(session.worktree.root)
  const designFilePath = getDesignContextPath(session.worktree.root)
  const implementationFilePath = getImplementationContextPath(session.worktree.root)

  return [
    `Your task file is at: ${taskFilePath}`,
    `Your design file is at: ${designFilePath}`,
    `Your implementation file is at: ${implementationFilePath}`,
  ]
}

function buildSystemPrompt(session: Session): string {
  const stage = getSessionStage(session)
  return [
    ...getContextPromptLines(session),
    '',
    'Read these files at the start of each session to recover context.',
    ...buildStageInstructions(stage),
  ].join('\n')
}

function buildInitialPrompt(session: Session): string {
  const stage = getSessionStage(session)
  return [
    `Task: ${session.title}`,
    `Stage: ${stage}`,
    ...getContextPromptLines(session).map(line => line.replace('Your ', '')),
    `Worktree: ${session.worktree.root}`,
    '',
    getInitialTurnInstruction(stage),
  ].join('\n')
}

async function main() {
  const PORT = Number(process.env.PORT ?? 3002)

  const runners = new Map<string, ChatRunner>()
  const watchers = new Map<string, FileWatcher>()
  const sessionCache = new Map<string, Session>()
  let shuttingDown = false
  const messageQueues = new Map<string, string[]>()
  const flushingTasks = new Set<string>()

  function getQueue(taskId: string): string[] {
    if (!messageQueues.has(taskId)) messageQueues.set(taskId, [])
    return messageQueues.get(taskId)!
  }

  async function flushQueue(taskId: string): Promise<void> {
    if (flushingTasks.has(taskId)) return
    const queue = getQueue(taskId)
    if (queue.length === 0) return
    flushingTasks.add(taskId)
    const combined = queue.join('\n\n')
    queue.length = 0
    broadcastQueueState(taskId, [])
    try {
      await handleChatMessage(taskId, combined)
    } finally {
      flushingTasks.delete(taskId)
    }
  }

  async function persistSession(session: Session): Promise<void> {
    sessionCache.set(session.id, session)
    broadcastSessionUpdate(session)
    await writeSession(TASKS_DIR, session).catch(err =>
      console.error(`[session] Failed to persist ${session.id}:`, err)
    )
  }

  function updateRunnerPrompts(taskId: string, session: Session): void {
    const runner = runners.get(taskId)
    if (!runner) return
    runner.setPrompts(buildSystemPrompt(session), buildInitialPrompt(session))
  }

  async function prepareSession(taskId: string, updater: (session: Session) => Promise<Session> | Session): Promise<Session | null> {
    const current = sessionCache.get(taskId)
    if (!current) return null
    const updated = await updater(current)
    sessionCache.set(taskId, updated)
    updateRunnerPrompts(taskId, updated)
    return updated
  }

  async function broadcastGitStatusForSession(taskId: string): Promise<void> {
    const session = sessionCache.get(taskId)
    if (!session || session.worktree.paths.length === 0) return
    try {
      const status = await getGitStatus(session.worktree.paths[0], session.repos[0])
      broadcastGitStatus(taskId, status)
    } catch (err) {
      console.error(`[git] Failed to get status for ${taskId}:`, err)
    }
  }

  async function spawnSession(session: Session): Promise<void> {
    console.log(`[session] spawning ${session.id} title="${session.title}" provider=${session.provider} model=${session.model}`)

    const taskDir = join(TASKS_DIR, session.id)
    await ensureSessionContextFiles(session, taskDir)
    await generateClaudeMd(session)
    const preparedSession = await syncSessionStage(session)
    sessionCache.set(session.id, preparedSession)
    const watcher = new FileWatcher(session.id, taskDir, session.worktree.root)
    await watcher.start((fileType, content) => {
      broadcastFileUpdate(session.id, fileType, content)
    })
    watchers.set(session.id, watcher)
    console.log(`[session] watcher ready for ${session.id}`)

    const strategy = session.provider === 'anthropic' ? claudeStrategy : codexStrategy
    const runner = new CliRunner(
      session.id,
      session.worktree.root,
      strategy,
      session.model,
      buildSystemPrompt(preparedSession),
      buildInitialPrompt(preparedSession),
    )

    if (preparedSession.providerSessionId) {
      runner.setProviderSessionId(preparedSession.providerSessionId)
    }

    runners.set(session.id, runner)
    await appendChatEvent(TASKS_DIR, session.id, { ts: new Date().toISOString(), type: 'session_start' })
    console.log(`[session] runner ready for ${session.id}`)

    // Update session state to running and broadcast
    const runningSession: Session = { ...preparedSession, sessionState: 'running' }
    await persistSession(runningSession)
    console.log(`[session] ${session.id} marked running`)

    runner.start(
      (event) => {
        broadcastChatEvent(session.id, { type: 'chat:event', taskId: session.id, event })
        persistChatStreamEvent(session.id, event)
        persistTodosFromEvent(session.worktree.root, event)
        persistPrsFromEvent(session.worktree.root, event)
      },
      async () => {
        const providerSessionId = runner.getProviderSessionId()
        let doneSession: Session = {
          ...runningSession,
          sessionState: 'waiting_for_input',
          providerSessionId: providerSessionId ?? undefined,
        }
        doneSession = await syncSessionStage(doneSession)
        updateRunnerPrompts(session.id, doneSession)
        console.log(`[session] ${session.id} turn complete providerSessionId=${providerSessionId ?? 'none'}`)
        runner.recordDone()
        broadcastChatDone(session.id)
        await broadcastGitStatusForSession(session.id)
        await persistSession(doneSession)
        // Auto-send queued messages if any
        await flushQueue(session.id)
      },
      async (err) => {
        console.error(`[session] ${session.id} error:`, err)
        runner.recordError(err)
        const errSession: Session = { ...runningSession, sessionState: 'idle' }
        await persistSession(errSession)
        console.log(`[session] ${session.id} marked idle after error`)
        broadcastChatError(session.id, err)
      },
    )
  }

  async function handleChatMessage(taskId: string, text: string): Promise<void> {
    const runner = runners.get(taskId)
    if (!runner) return

    const prepared = await prepareSession(taskId, async (session) => {
      const staged = await applyUserStageTransition(session, text)
      return { ...staged, sessionState: 'running', ...(session.status === 'on_hold' ? { status: 'active' as const } : {}) }
    })
    if (!prepared) return

    await persistSession(prepared)

    await appendChatEvent(TASKS_DIR, taskId, { ts: new Date().toISOString(), type: 'user', text })
    broadcastChatUser(taskId, text)

    runner.sendMessage(
      text,
      (event) => {
        broadcastChatEvent(taskId, { type: 'chat:event', taskId, event })
        persistChatStreamEvent(taskId, event)
        persistTodosFromEvent(prepared.worktree.root, event)
        persistPrsFromEvent(prepared.worktree.root, event)
      },
      async () => {
        const providerSessionId = runner.getProviderSessionId()
        const current = sessionCache.get(taskId) ?? prepared
        let doneSession: Session = {
          ...current,
          sessionState: 'waiting_for_input',
          providerSessionId: providerSessionId ?? undefined,
        }
        doneSession = await syncSessionStage(doneSession)
        updateRunnerPrompts(taskId, doneSession)
        console.log(`[session] ${taskId} turn complete providerSessionId=${providerSessionId ?? 'none'}`)
        runner.recordDone()
        broadcastChatDone(taskId)
        await broadcastGitStatusForSession(taskId)
        await persistSession(doneSession)
        // Auto-send queued messages if any
        await flushQueue(taskId)
      },
      async (err) => {
        console.error(`[session] ${taskId} error:`, err)
        runner.recordError(err)
        const current = sessionCache.get(taskId) ?? prepared
        const errSession: Session = { ...current, sessionState: 'idle' }
        await persistSession(errSession)
        console.log(`[session] ${taskId} marked idle after error`)
        broadcastChatError(taskId, err)
      },
    )
  }

  async function handleChatStop(taskId: string): Promise<void> {
    const runner = runners.get(taskId)
    if (!runner) return

    runner.kill()

    const current = sessionCache.get(taskId)
    if (!current) return

    const stoppedSession: Session = { ...current, sessionState: 'waiting_for_input' }
    await persistSession(stoppedSession)
    console.log(`[session] ${taskId} stopped by user`)
    broadcastChatDone(taskId)
    await broadcastGitStatusForSession(taskId)
  }

  async function handleQueueAdd(taskId: string, text: string): Promise<void> {
    const session = sessionCache.get(taskId)
    if (!session) return
    // If AI is not running, send immediately (flush any existing queue too)
    if (session.sessionState !== 'running') {
      const queue = getQueue(taskId)
      queue.push(text)
      await flushQueue(taskId)
      return
    }
    const queue = getQueue(taskId)
    queue.push(text)
    broadcastQueueState(taskId, [...queue])
  }

  async function handleQueueRemove(taskId: string, index: number): Promise<void> {
    const queue = getQueue(taskId)
    if (index < 0 || index >= queue.length) return
    queue.splice(index, 1)
    broadcastQueueState(taskId, [...queue])
  }

  async function handleQueueForceSend(taskId: string): Promise<void> {
    const queue = getQueue(taskId)
    if (queue.length === 0) return
    const session = sessionCache.get(taskId)
    if (!session) return
    // Snapshot and clear queue before killing so the runner's done callback
    // won't find anything to flush (prevents double message sends)
    const snapshot = [...queue]
    queue.length = 0
    broadcastQueueState(taskId, [])
    // If AI is running, stop it first and insert divider
    if (session.sessionState === 'running') {
      const runner = runners.get(taskId)
      if (runner) await runner.killAsync()
      const stoppedSession: Session = { ...session, sessionState: 'waiting_for_input' }
      await persistSession(stoppedSession)
      broadcastChatDone(taskId)
      // Insert interrupted divider
      await appendChatEvent(TASKS_DIR, taskId, { ts: new Date().toISOString(), type: 'session_start' })
      broadcastChatEvent(taskId, {
        type: 'chat:event',
        taskId,
        event: { type: 'assistant', message: { content: [{ type: 'meta', label: 'Interrupted — sending queued messages' }] } },
      })
    }
    const combined = snapshot.join('\n\n')
    await handleChatMessage(taskId, combined)
  }

  async function killSession(taskId: string): Promise<void> {
    runners.get(taskId)?.kill()
    runners.delete(taskId)
    await watchers.get(taskId)?.stop()
    watchers.delete(taskId)
    sessionCache.delete(taskId)
    messageQueues.delete(taskId)
  }

  // Detect repositories once at startup
  const repoDetection = await refreshRepos(CWD)
  console.log(`[startup] Detected ${repoDetection.repos.length} repo(s)`)

  // Load and resume active sessions
  const sessions = await listSessions(TASKS_DIR)
  for (const session of sessions) {
    sessionCache.set(session.id, session)
    if (session.status === 'active') {
      console.log(`[startup] resuming active session ${session.id}`)
      spawnSession(session).catch(err =>
        console.error(`[startup] Failed to spawn ${session.id}:`, err)
      )
    }
  }
  if (sessions.length > 0) {
    console.log(`[startup] Loaded ${sessions.length} session(s)`)
  }

  const app = Fastify({ logger: false })

  const publicDir = resolve(__dirname, '../../dist/public')
  if (existsSync(publicDir)) {
    await app.register(staticPlugin, { root: publicDir, prefix: '/', decorateReply: false })
  }

  await registerRoutes(app, {
    cwd: CWD,
    onSpawn: spawnSession,
    onKill: killSession,
    onUpdate: (session) => sessionCache.set(session.id, session),
    onGitOperation: async (taskId) => {
      const session = sessionCache.get(taskId)
      if (session) broadcastSessionUpdate(session)
    },
  })

  await registerWs(
    app,
    (taskId) => runners.get(taskId),
    (taskId) => watchers.get(taskId),
    () => Array.from(sessionCache.values()),
    (taskId) => readChatHistory(TASKS_DIR, taskId),
    (taskId) => [...getQueue(taskId)],
    handleChatMessage,
    handleChatStop,
    handleQueueAdd,
    handleQueueRemove,
    handleQueueForceSend,
    async (taskId) => {
      const session = sessionCache.get(taskId)
      if (!session || session.worktree.paths.length === 0) return null
      try {
        return await getGitStatus(session.worktree.paths[0], session.repos[0])
      } catch {
        return null
      }
    },
  )

  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[feature-factory] Received ${signal}, shutting down...`)
    for (const runner of runners.values()) {
      runner.kill()
    }
    runners.clear()
    for (const watcher of watchers.values()) {
      await watcher.stop().catch(() => {})
    }
    watchers.clear()
    await app.close()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT').catch(console.error))
  process.on('SIGTERM', () => shutdown('SIGTERM').catch(console.error))

  // Default 0.0.0.0 to allow LAN access. Set HOST=127.0.0.1 on untrusted networks.
  const HOST = process.env.HOST ?? '0.0.0.0'
  await app.listen({ port: PORT, host: HOST })
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST
  const url = `http://${displayHost}:${PORT}`
  const link = `\x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`
  console.log(`[feature-factory] Running at ${link}`)
}

export { main }
