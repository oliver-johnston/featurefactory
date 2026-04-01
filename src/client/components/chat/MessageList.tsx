import { useEffect, useRef, useState } from 'react'
import { UserMessage } from './UserMessage.js'
import { AssistantMessage } from './AssistantMessage.js'
import { ChatInput } from './ChatInput.js'
import { FactoryAnimation } from './FactoryAnimation.js'
import { MessageQueue } from './MessageQueue.js'
import type { ChatContentBlock, WsMessage } from '../../types.js'

const EMPTY_TOOL_RESULTS = new Map<string, string>()

interface Message {
  id: string
  role: 'user' | 'assistant' | 'divider'
  // user messages
  text?: string
  // assistant messages
  blocks?: ChatContentBlock[]
  toolResults?: Map<string, string>
  streaming?: boolean
  streamingStartedAt?: number
  thinkingSeconds?: number
}

interface Props {
  taskId: string
  registerListener: (handler: (msg: WsMessage) => void) => () => void
  sendChatMessage: (taskId: string, text: string) => void
  sendQueueAdd: (taskId: string, text: string) => void
  sendQueueRemove: (taskId: string, index: number) => void
  sendQueueForceSend: (taskId: string) => void
  sessionRunning: boolean
  waitingForInput: boolean
  onStop: () => void
}

export function MessageList({ taskId, registerListener, sendChatMessage, sendQueueAdd, sendQueueRemove, sendQueueForceSend, sessionRunning, waitingForInput, onStop }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)
  const sessionRunningRef = useRef(sessionRunning)
  useEffect(() => { sessionRunningRef.current = sessionRunning }, [sessionRunning])

  const [queuedMessages, setQueuedMessages] = useState<string[]>([])
  const localSentMessages = useRef<Set<string>>(new Set())

  useEffect(() => {
    const unsub = registerListener((msg) => {
      if (msg.type === 'chat:user') {
        // Skip if this was sent locally (direct user input)
        if (localSentMessages.current.has(msg.text)) {
          localSentMessages.current.delete(msg.text)
          return
        }
        // Server-initiated user message (queue flush, force send, git button)
        setMessages(prev => [...prev, {
          id: `user-${nextId.current++}`,
          role: 'user',
          text: msg.text,
        }, {
          id: `assistant-${nextId.current++}`,
          role: 'assistant',
          blocks: [],
          toolResults: EMPTY_TOOL_RESULTS,
          streaming: true,
          streamingStartedAt: Date.now(),
        }])
      }
      if (msg.type === 'chat:history') {
        const newMessages: Message[] = []
        for (const entry of msg.entries) {
          if (entry.type === 'session_start') {
            // Don't show divider at the very top when there are no messages above it
            if (newMessages.length > 0) {
              newMessages.push({
                id: `divider-${nextId.current++}`,
                role: 'divider',
              })
            }
          } else if (entry.type === 'user') {
            newMessages.push({
              id: `user-${nextId.current++}`,
              role: 'user',
              text: entry.text,
            })
          } else if (entry.type === 'assistant') {
            // Merge consecutive assistant entries into one message
            // (during live streaming, multiple events get appended to the same message,
            // but each event is persisted as a separate JSONL line)
            const lastMsg = newMessages.at(-1)
            if (lastMsg?.role === 'assistant') {
              lastMsg.blocks = [...(lastMsg.blocks ?? []), ...entry.blocks]
            } else {
              newMessages.push({
                id: `assistant-${nextId.current++}`,
                role: 'assistant',
                blocks: entry.blocks,
                toolResults: EMPTY_TOOL_RESULTS,
                streaming: false,
              })
            }
          } else if (entry.type === 'tool_result') {
            // Attach tool result to the last assistant message
            const lastMsg = newMessages.at(-1)
            if (lastMsg?.role === 'assistant') {
              const newResults = new Map(lastMsg.toolResults)
              newResults.set(entry.tool_use_id, entry.content)
              lastMsg.toolResults = newResults
            }
          }
        }
        // If the session is currently running, append a synthetic streaming
        // assistant message so the FactoryAnimation shows
        if (sessionRunningRef.current) {
          const last = newMessages.at(-1)
          if (!last || last.role !== 'assistant' || !last.streaming) {
            newMessages.push({
              id: `assistant-${nextId.current++}`,
              role: 'assistant',
              blocks: [],
              toolResults: EMPTY_TOOL_RESULTS,
              streaming: true,
              streamingStartedAt: Date.now(),
            })
          }
        }
        setMessages(newMessages)
      }
      if (msg.type === 'chat:event') {
        const event = msg.event
        if (event.type === 'assistant') {
          setMessages(prev => {
            const last = prev.at(-1)
            if (last?.role === 'assistant' && last.streaming) {
              // Append blocks to existing streaming message
              const updated: Message = {
                ...last,
                blocks: [...(last.blocks ?? []), ...event.message.content],
              }
              return [...prev.slice(0, -1), updated]
            }
            // New assistant message
            return [...prev, {
              id: `assistant-${nextId.current++}`,
              role: 'assistant',
              blocks: event.message.content,
              toolResults: EMPTY_TOOL_RESULTS,
              streaming: true,
              streamingStartedAt: Date.now(),
            }]
          })
        }
        if (event.type === 'tool') {
          setMessages(prev => {
            const last = prev.at(-1)
            if (last?.role !== 'assistant') return prev
            const newResults = new Map(last.toolResults)
            for (const result of event.content) {
              newResults.set(result.tool_use_id, result.content)
            }
            return [...prev.slice(0, -1), { ...last, toolResults: newResults }]
          })
        }
      }
      if (msg.type === 'chat:done') {
        setMessages(prev => {
          const last = prev.at(-1)
          if (last?.role === 'assistant') {
            const thinkingSeconds = last.streamingStartedAt
              ? Math.max(1, Math.round((Date.now() - last.streamingStartedAt) / 1000))
              : undefined
            return [...prev.slice(0, -1), { ...last, streaming: false, thinkingSeconds }]
          }
          return prev
        })
      }
      if (msg.type === 'chat:error') {
        setMessages(prev => {
          const last = prev.at(-1)
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, streaming: false, text: (last.text ?? '') + '\n\n⚠️ Error: ' + msg.error }]
          }
          return [...prev, {
            id: `error-${nextId.current++}`,
            role: 'assistant',
            blocks: [{ type: 'text' as const, text: '⚠️ Error: ' + msg.error }],
            toolResults: EMPTY_TOOL_RESULTS,
            streaming: false,
          }]
        })
      }
      if (msg.type === 'chat:queue:state') {
        setQueuedMessages(msg.messages)
      }
    })
    return unsub
  }, [registerListener])

  // Auto-scroll to bottom when messages change or session finishes
  // Use requestAnimationFrame to ensure DOM has updated before scrolling
  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [messages, sessionRunning])

  const handleSend = (text: string) => {
    if (sessionRunning) {
      sendQueueAdd(taskId, text)
      return
    }
    localSentMessages.current.add(text)
    setMessages(prev => [...prev, {
      id: `user-${nextId.current++}`,
      role: 'user',
      text,
    }, {
      id: `assistant-${nextId.current++}`,
      role: 'assistant',
      blocks: [],
      toolResults: EMPTY_TOOL_RESULTS,
      streaming: true,
      streamingStartedAt: Date.now(),
    }])
    sendChatMessage(taskId, text)
  }

  const handleQueueRemove = (index: number) => {
    sendQueueRemove(taskId, index)
  }

  const handleQueueForceSend = () => {
    sendQueueForceSend(taskId)
  }

  const lastMessage = messages.at(-1)
  const isStreaming = lastMessage?.role === 'assistant' && lastMessage?.streaming

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
       <div className="max-w-3xl mx-auto">
        {messages.length === 0 && (
          <div className="text-center text-muted text-sm mt-8 flex items-center justify-center gap-2">
            {(sessionRunning || waitingForInput) && <FactoryAnimation slow={waitingForInput} />}
            <span>{sessionRunning ? 'Agent is starting…' : waitingForInput ? '' : 'No messages yet'}</span>
          </div>
        )}
        {messages.map((msg, idx) => {
          if (msg.role === 'divider') {
            return (
              <div key={msg.id} className="flex items-center gap-3 my-6 text-muted text-xs">
                <div className="flex-1 border-t border-border" />
                <span>New Session</span>
                <div className="flex-1 border-t border-border" />
              </div>
            )
          }
          if (msg.role === 'user') {
            return <UserMessage key={msg.id} text={msg.text!} />
          }
          const isLast = idx === messages.length - 1
          return (
            <AssistantMessage
              key={msg.id}
              blocks={msg.blocks ?? []}
              toolResults={msg.toolResults ?? EMPTY_TOOL_RESULTS}
              streaming={msg.streaming ?? false}
              thinkingSeconds={msg.thinkingSeconds}
              waitingForInput={isLast && waitingForInput}
            />
          )
        })}
        <div ref={bottomRef} />
       </div>
      </div>
      <MessageQueue
        messages={queuedMessages}
        running={sessionRunning}
        onRemove={handleQueueRemove}
        onForceSend={handleQueueForceSend}
      />
      <ChatInput onSend={handleSend} onStop={onStop} running={sessionRunning} />
    </div>
  )
}
