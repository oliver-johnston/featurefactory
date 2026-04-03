import type { FastifyInstance } from 'fastify'
import { join } from 'path'
import { rm } from 'fs/promises'
import { readSession, writeSession, listSessions, nextSessionId, deleteSession } from '../store.js'
import { getCachedRepos, refreshRepos } from '../repos.js'
import { ensureWorktrees, removeWorktrees } from '../orchestrator/worktree.js'
import type { ModelProvider, Session } from '../../shared/types.js'
import type { Settings } from '../../shared/settingsTypes.js'
import { CURATED_MODELS } from '../runner/models.js'
import { readSettings, writeSettings, readEffectiveSettings, writeRepoSettings, getOverrides } from '../settings.js'
import { broadcastSessionUpdate, broadcastSessionRemove } from './ws.js'
import { generateSlug } from '../slug.js'
import { mergeToMainAndPush, pushAndCreatePR } from '../orchestrator/git.js'
export { FF_DIR, TASKS_DIR, WORKTREES_DIR } from '../paths.js'
import { TASKS_DIR, WORKTREES_DIR } from '../paths.js'

let createLock = Promise.resolve()

interface RoutesOpts {
  cwd: string
  onSpawn: (session: Session) => Promise<void>
  onKill: (taskId: string) => void
  onUpdate: (session: Session) => void
  onGitOperation: (taskId: string) => Promise<void>
}

export async function registerRoutes(app: FastifyInstance, opts: RoutesOpts) {
  app.get('/api/info', async () => ({ cwd: opts.cwd }))

  app.get('/api/repos', async () => {
    return getCachedRepos() ?? { isSingleRepo: false, repos: [] }
  })

  app.post('/api/repos/refresh', async () => {
    return refreshRepos(opts.cwd)
  })

  app.get('/api/models', async () => {
    return CURATED_MODELS
  })

  app.get('/api/settings', async (req) => {
    const repo = (req.query as Record<string, string>).repo
    if (repo) return readEffectiveSettings(repo)
    return readSettings()
  })

  app.put('/api/settings', async (req, reply) => {
    const repo = (req.query as Record<string, string>).repo
    const settings = req.body as Settings
    try {
      if (repo) {
        await writeRepoSettings(repo, settings)
      } else {
        await writeSettings(settings)
      }
      return { success: true }
    } catch (e) {
      return reply.code(500).send({ success: false, error: (e as Error).message })
    }
  })

  app.get('/api/settings/overrides', async (req, reply) => {
    const repo = (req.query as Record<string, string>).repo
    if (!repo) return reply.code(400).send({ error: 'repo query param is required' })
    return getOverrides(repo)
  })

  app.get('/api/sessions', async () => {
    return listSessions(TASKS_DIR)
  })

  app.post('/api/sessions', async (req, reply) => {
    const body = req.body as { title?: string; repos?: string[]; provider?: ModelProvider; model?: string; workflow?: 'free' | 'full' }

    const workflow = body.workflow ?? 'full'
    const provider = body.provider
    const model = body.model?.trim()

    if (!provider) return reply.code(400).send({ error: 'provider is required' })
    if (!model) return reply.code(400).send({ error: 'model is required' })

    let session!: Session

    if (workflow === 'free') {
      const current = createLock.then(async () => {
        const id = await nextSessionId(TASKS_DIR)
        const existingSessions = await listSessions(TASKS_DIR)
        const freeCount = existingSessions.filter(s => s.workflow === 'free').length
        const title = `Free Session #${freeCount + 1}`

        session = {
          id,
          title,
          repos: [],
          provider,
          model,
          workflow: 'free',
          status: 'active',
          created_at: new Date().toISOString(),
          worktree: null,
        }

        await writeSession(TASKS_DIR, session)
      })
      createLock = current.catch(() => undefined)
      await current

      await opts.onSpawn(session)
      return reply.code(201).send(session)
    }

    // Full workflow
    const title = body.title?.trim()
    const repos = body.repos?.map(r => r.trim()).filter(Boolean)

    if (!title) return reply.code(400).send({ error: 'title is required' })
    if (!repos || repos.length === 0) return reply.code(400).send({ error: 'repos is required' })

    const current = createLock.then(async () => {
      const id = await nextSessionId(TASKS_DIR)
      const slug = await generateSlug(title)
      const rootPath = join(WORKTREES_DIR, id)
      const branch = `feat/${id}-${slug || id.toLowerCase()}`

      session = {
        id,
        title,
        repos,
        provider,
        model,
        workflow: 'full',
        status: 'active',
        stage: 'brainstorm',
        created_at: new Date().toISOString(),
        worktree: { root: rootPath, branch, paths: [] },
      }

      await writeSession(TASKS_DIR, session)
    })
    createLock = current.catch(() => undefined)
    await current

    const { paths, warnings } = await ensureWorktrees(session.repos, session.worktree!.root, session.worktree!.branch)
    session = { ...session, worktree: { ...session.worktree!, paths } }
    await writeSession(TASKS_DIR, session)
    await opts.onSpawn(session)

    return reply.code(201).send({ ...session, warnings })
  })

  app.patch('/api/sessions/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { status?: 'active' | 'on_hold' | 'done' }

    let session: Session
    try {
      session = await readSession(TASKS_DIR, id)
    } catch {
      return reply.code(404).send({ error: `Session ${id} not found` })
    }

    const updated: Session = { ...session, ...(body.status ? { status: body.status } : {}) }
    await writeSession(TASKS_DIR, updated)
    opts.onUpdate(updated)
    broadcastSessionUpdate(updated)

    // Remove worktrees when marking session as done
    if (body.status === 'done' && session.status !== 'done' && session.worktree) {
      await removeWorktrees(session.repos, session.worktree.paths)
      await rm(session.worktree.root, { recursive: true, force: true }).catch(() => {})
    }

    return reply.code(200).send(updated)
  })

  app.delete('/api/sessions/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    let session: Session
    try {
      session = await readSession(TASKS_DIR, id)
    } catch {
      return reply.code(404).send({ error: `Session ${id} not found` })
    }

    opts.onKill(id)
    if (session.worktree) {
      await removeWorktrees(session.repos, session.worktree.paths)
      await rm(session.worktree.root, { recursive: true, force: true }).catch(() => {})
    }
    await deleteSession(TASKS_DIR, id)
    broadcastSessionRemove(id)

    return reply.code(200).send({ deleted: id })
  })

  app.post('/api/sessions/:id/git/merge-and-push', async (req, reply) => {
    const { id } = req.params as { id: string }

    let session: Session
    try {
      session = await readSession(TASKS_DIR, id)
    } catch {
      return reply.code(404).send({ error: `Session ${id} not found` })
    }

    if (!session.worktree) return reply.code(400).send({ error: 'Git operations are not available for free sessions' })

    const repoRoot = session.repos[0]
    const result = await mergeToMainAndPush(repoRoot, session.worktree.branch)
    opts.onGitOperation(id).catch(err => console.error(`[git] Failed to broadcast status for ${id}:`, err))
    return reply.code(200).send(result)
  })

  app.post('/api/sessions/:id/git/push-and-pr', async (req, reply) => {
    const { id } = req.params as { id: string }

    let session: Session
    try {
      session = await readSession(TASKS_DIR, id)
    } catch {
      return reply.code(404).send({ error: `Session ${id} not found` })
    }

    if (!session.worktree) return reply.code(400).send({ error: 'Git operations are not available for free sessions' })

    const repoRoot = session.repos[0]
    const result = await pushAndCreatePR(repoRoot, session.worktree.branch, session.title)
    opts.onGitOperation(id).catch(err => console.error(`[git] Failed to broadcast status for ${id}:`, err))
    return reply.code(200).send(result)
  })
}
