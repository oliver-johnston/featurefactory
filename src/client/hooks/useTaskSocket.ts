import { useEffect, useRef, useState, useCallback } from 'react'
import type { GitStatus, ModelProvider, Session, WsMessage } from '../types.js'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`

export function useSessionSocket() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [connected, setConnected] = useState(false)
  const [gitStatus, setGitStatus] = useState<Map<string, GitStatus>>(new Map())
  const ws = useRef<WebSocket | null>(null)
  const chatListeners = useRef<Map<string, (event: WsMessage) => void>>(new Map())
  const subscribedTaskIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    let retryDelay = 1000
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let active = true

    function connect() {
      const socket = new WebSocket(WS_URL)
      ws.current = socket

      socket.onopen = () => {
        setConnected(true)
        retryDelay = 1000
        for (const taskId of subscribedTaskIds.current) {
          socket.send(JSON.stringify({ type: 'chat:subscribe', taskId } satisfies WsMessage))
        }
      }

      socket.onclose = () => {
        setConnected(false)
        if (!active) return
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 16000)
          connect()
        }, retryDelay)
      }

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data) as WsMessage

        if (msg.type === 'task:list') setSessions(msg.tasks)

        if (msg.type === 'task:updated') {
          setSessions(prev => {
            const idx = prev.findIndex(s => s.id === msg.task.id)
            if (idx === -1) return [...prev, msg.task]
            const next = [...prev]
            next[idx] = msg.task
            return next
          })
        }

        if (msg.type === 'task:removed') {
          setSessions(prev => prev.filter(s => s.id !== msg.taskId))
        }

        if (msg.type === 'git:status') {
          setGitStatus(prev => {
            const next = new Map(prev)
            next.set(msg.taskId, msg.status)
            return next
          })
        }

        // Route chat/file events to per-session listeners
        if (
          msg.type === 'chat:event' ||
          msg.type === 'chat:done' ||
          msg.type === 'chat:error' ||
          msg.type === 'chat:history' ||
          msg.type === 'chat:history_done' ||
          msg.type === 'chat:user' ||
          msg.type === 'chat:queue:state' ||
          msg.type === 'file:updated' ||
          msg.type === 'file:list' ||
          msg.type === 'git:status'
        ) {
          const listener = chatListeners.current.get(msg.taskId)
          if (listener) listener(msg)
        }
      }
    }

    connect()
    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      ws.current?.close()
    }
  }, [])

  const subscribeToSession = useCallback((taskId: string, onMessage: (msg: WsMessage) => void) => {
    chatListeners.current.set(taskId, onMessage)
    subscribedTaskIds.current.add(taskId)
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'chat:subscribe', taskId } satisfies WsMessage))
    }
    return () => {
      chatListeners.current.delete(taskId)
      subscribedTaskIds.current.delete(taskId)
    }
  }, [])

  const sendChatMessage = useCallback((taskId: string, text: string) => {
    ws.current?.send(JSON.stringify({ type: 'chat:message', taskId, text } satisfies WsMessage))
  }, [])

  const sendStopMessage = useCallback((taskId: string) => {
    ws.current?.send(JSON.stringify({ type: 'chat:stop', taskId } satisfies WsMessage))
  }, [])

  const sendQueueAdd = useCallback((taskId: string, text: string) => {
    ws.current?.send(JSON.stringify({ type: 'chat:queue:add', taskId, text } satisfies WsMessage))
  }, [])

  const sendQueueRemove = useCallback((taskId: string, index: number) => {
    ws.current?.send(JSON.stringify({ type: 'chat:queue:remove', taskId, index } satisfies WsMessage))
  }, [])

  const sendQueueForceSend = useCallback((taskId: string) => {
    ws.current?.send(JSON.stringify({ type: 'chat:queue:force-send', taskId } satisfies WsMessage))
  }, [])

  const createSession = useCallback(async (
    title: string,
    repos: string[],
    provider: ModelProvider,
    model: string,
    workflow: 'free' | 'full' = 'full',
  ): Promise<Session> => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, repos, provider, model, workflow }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? 'Failed to create session')
    }
    const session: Session = await res.json()
    setSessions(prev => prev.some(s => s.id === session.id) ? prev : [...prev, session])
    return session
  }, [])

  const markDone = useCallback(async (taskId: string): Promise<void> => {
    await fetch(`/api/sessions/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
  }, [])

  const setOnHold = useCallback(async (taskId: string): Promise<void> => {
    await fetch(`/api/sessions/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'on_hold' }),
    })
  }, [])

  const getGitStatusForSession = useCallback((taskId: string): GitStatus | null => {
    return gitStatus.get(taskId) ?? null
  }, [gitStatus])

  return { sessions, connected, subscribeToSession, sendChatMessage, sendStopMessage, sendQueueAdd, sendQueueRemove, sendQueueForceSend, createSession, markDone, setOnHold, getGitStatusForSession }
}
