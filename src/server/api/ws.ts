import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { ChatHistoryEntry, FileType, GitStatus, Session, WsMessage } from '../../shared/types.js'
import type { ChatRunner } from '../chat/runner.js'
import type { FileWatcher } from '../files/watcher.js'

const clients = new Set<WebSocket>()

export function broadcastSessionUpdate(session: Session) {
  const msg: WsMessage = { type: 'task:updated', task: session }
  const json = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

export function broadcastSessionRemove(taskId: string) {
  const msg: WsMessage = { type: 'task:removed', taskId }
  const json = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

export function broadcastFileUpdate(taskId: string, fileType: FileType, content: string) {
  const msg: WsMessage = { type: 'file:updated', taskId, fileType, content }
  const json = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

export function broadcastChatEvent(taskId: string, event: WsMessage & { type: 'chat:event' }) {
  const json = JSON.stringify(event)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

export function broadcastChatDone(taskId: string) {
  const msg: WsMessage = { type: 'chat:done', taskId }
  const json = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

export function broadcastGitStatus(taskId: string, status: GitStatus) {
  const msg: WsMessage = { type: 'git:status', taskId, status }
  const json = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

export function broadcastChatUser(taskId: string, text: string) {
  const msg: WsMessage = { type: 'chat:user', taskId, text }
  const json = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

export function broadcastChatError(taskId: string, error: string) {
  const msg: WsMessage = { type: 'chat:error', taskId, error }
  const json = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

export function broadcastQueueState(taskId: string, messages: string[]) {
  const msg: WsMessage = { type: 'chat:queue:state', taskId, messages }
  const json = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(json)
  }
}

function send(socket: WebSocket, msg: WsMessage) {
  if (socket.readyState === 1) socket.send(JSON.stringify(msg))
}

export async function registerWs(
  app: FastifyInstance,
  getRunner: (taskId: string) => ChatRunner | undefined,
  getWatcher: (taskId: string) => FileWatcher | undefined,
  getInitialSessions: () => Session[],
  getHistory: (taskId: string) => Promise<ChatHistoryEntry[]>,
  getQueueState: (taskId: string) => string[],
  onChatMessage: (taskId: string, text: string) => Promise<void>,
  onChatStop: (taskId: string) => Promise<void>,
  onQueueAdd: (taskId: string, text: string) => Promise<void>,
  onQueueRemove: (taskId: string, index: number) => Promise<void>,
  onQueueForceSend: (taskId: string) => Promise<void>,
  getGitStatusForSession?: (taskId: string) => Promise<GitStatus | null>,
) {
  await app.register(import('@fastify/websocket'))

  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket)
    socket.send(JSON.stringify({ type: 'task:list', tasks: getInitialSessions() } satisfies WsMessage))

    socket.on('message', async (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsMessage

        if (msg.type === 'chat:subscribe') {
          const watcher = getWatcher(msg.taskId)
          if (!watcher) return
          const [todos, design, impl] = await Promise.all([
            watcher.readFile('todos'),
            watcher.readFile('design'),
            watcher.readFile('implementation'),
          ])
          send(socket, {
            type: 'file:list',
            taskId: msg.taskId,
            files: [
              { fileType: 'todos', content: todos },
              { fileType: 'design', content: design },
              { fileType: 'implementation', content: impl },
            ],
          })
          // Replay persisted chat history
          const history = await getHistory(msg.taskId)
          if (history.length > 0) {
            send(socket, { type: 'chat:history', taskId: msg.taskId, entries: history })
          }
          send(socket, { type: 'chat:history_done', taskId: msg.taskId })
          // Send current queue state
          const queueMessages = getQueueState(msg.taskId)
          if (queueMessages.length > 0) {
            send(socket, { type: 'chat:queue:state', taskId: msg.taskId, messages: queueMessages })
          }

          // Send current git status
          if (getGitStatusForSession) {
            const gitStatus = await getGitStatusForSession(msg.taskId)
            if (gitStatus) {
              send(socket, { type: 'git:status', taskId: msg.taskId, status: gitStatus })
            }
          }
        }

        if (msg.type === 'chat:message') {
          const runner = getRunner(msg.taskId)
          if (runner) runner.recordUserMessage(msg.text)
          await onChatMessage(msg.taskId, msg.text)
        }

        if (msg.type === 'chat:stop') {
          await onChatStop(msg.taskId)
        }

        if (msg.type === 'chat:queue:add') {
          await onQueueAdd(msg.taskId, msg.text)
        }

        if (msg.type === 'chat:queue:remove') {
          await onQueueRemove(msg.taskId, msg.index)
        }

        if (msg.type === 'chat:queue:force-send') {
          await onQueueForceSend(msg.taskId)
        }
      } catch {
        // Ignore malformed messages
      }
    })

    socket.on('close', () => {
      clients.delete(socket)
    })
  })
}
