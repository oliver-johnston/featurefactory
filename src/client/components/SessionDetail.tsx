import { useState, useEffect, useRef, useCallback } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { MessageList } from './chat/MessageList.js'
import { FileViewer } from './FileViewer.js'
import { TaskList } from './TaskList.js'
import { QuickActions } from './QuickActions.js'
import { ConfirmDialog } from './ConfirmDialog.js'
import type { GitStatus as GitStatusType, Session, WsMessage } from '../types.js'

type Tab = 'chat' | 'design' | 'implementation'

interface Props {
  session: Session
  onClose: () => void
  onMarkDone: () => void
  onSetOnHold: () => void
  subscribeToSession: (taskId: string, onMessage: (msg: WsMessage) => void) => () => void
  sendChatMessage: (taskId: string, text: string, quickActionLabel?: string) => void
  sendStopMessage: (taskId: string) => void
  sendQueueAdd: (taskId: string, text: string) => void
  sendQueueRemove: (taskId: string, index: number) => void
  sendQueueForceSend: (taskId: string) => void
  gitStatus: GitStatusType | null
}

export function SessionDetail({ session, onClose, onMarkDone, onSetOnHold, subscribeToSession, sendChatMessage, sendStopMessage, sendQueueAdd, sendQueueRemove, sendQueueForceSend, gitStatus }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [designContent, setDesignContent] = useState('')
  const [implContent, setImplContent] = useState('')
  const [progressOpen, setProgressOpen] = useState(false)
  const [todos, setTodos] = useState<Array<{ content: string; status: 'pending' | 'in_progress' | 'completed'; activeForm: string }>>([])
  const [prs, setPrs] = useState<string[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  const chatListenerRef = useRef<((msg: WsMessage) => void) | null>(null)
  const pendingChatMessagesRef = useRef<WsMessage[]>([])

  useEffect(() => {
    const unsub = subscribeToSession(session.id, (msg) => {
      if (msg.type === 'file:list') {
        for (const f of msg.files) {
          if (f.fileType === 'todos') {
            try { setTodos(JSON.parse(f.content)) } catch { /* ignore parse errors */ }
          }
          if (f.fileType === 'prs') {
            try { setPrs(JSON.parse(f.content)) } catch { /* ignore */ }
          }
          if (f.fileType === 'design') setDesignContent(f.content)
          if (f.fileType === 'implementation') setImplContent(f.content)
        }
      }
      if (msg.type === 'file:updated') {
        if (msg.fileType === 'todos') {
          try { setTodos(JSON.parse(msg.content)) } catch { /* ignore */ }
        }
        if (msg.fileType === 'prs') {
          try { setPrs(JSON.parse(msg.content)) } catch { /* ignore */ }
        }
        if (msg.fileType === 'design') setDesignContent(msg.content)
        if (msg.fileType === 'implementation') setImplContent(msg.content)
      }
      // Intercept TodoWrite events for sidebar before forwarding
      if (msg.type === 'chat:event' && msg.event.type === 'assistant') {
        for (const block of msg.event.message.content) {
          if (block.type === 'tool_use' && block.name === 'TodoWrite' && Array.isArray(block.input.todos)) {
            setTodos(block.input.todos as Array<{ content: string; status: 'pending' | 'in_progress' | 'completed'; activeForm: string }>)
          }
          if (block.type === 'tool_use' && block.name === 'PrCreated' && typeof block.input.url === 'string') {
            setPrs(prev => [...prev, block.input.url as string])
          }
        }
      }
      if (
        msg.type === 'chat:event' ||
        msg.type === 'chat:done' ||
        msg.type === 'chat:error' ||
        msg.type === 'chat:history' ||
        msg.type === 'chat:history_done' ||
        msg.type === 'chat:user' ||
        msg.type === 'chat:queue:state'
      ) {
        if (chatListenerRef.current) {
          chatListenerRef.current(msg)
        } else {
          pendingChatMessagesRef.current.push(msg)
        }
      }
    })
    return unsub
  }, [session.id, subscribeToSession])

  const registerChatListener = useCallback((handler: (msg: WsMessage) => void) => {
    chatListenerRef.current = handler
    const queued = pendingChatMessagesRef.current
    pendingChatMessagesRef.current = []
    for (const msg of queued) {
      handler(msg)
    }
    return () => {
      chatListenerRef.current = null
    }
  }, [])

  function handleMarkDoneClick() {
    if (gitStatus && gitStatus.ahead > 0) {
      setShowConfirm(true)
    } else {
      onMarkDone()
    }
  }

  const handleGitMessage = (text: string, quickActionLabel?: string) => {
    sendChatMessage(session.id, text, quickActionLabel)
  }

  const isWide = useMediaQuery('(min-width: 1600px)')
  const isFree = session.workflow === 'free'

  useEffect(() => {
    if (isWide && activeTab === 'chat' && !isFree) {
      setActiveTab('design')
    }
  }, [isWide])

  const sessionRunning = session.sessionState === 'running'
  const waitingForInput = session.sessionState === 'waiting_for_input'
  const repoName = session.repos.map(r => r.split('/').pop() ?? r).join(', ')
  const modelLabel = `${session.provider}/${session.model}`
  const allTabs: { id: Tab; label: string }[] = [
    { id: 'chat', label: 'Chat' },
    { id: 'design', label: 'Design' },
    { id: 'implementation', label: 'Plan' },
  ]
  const tabs = isFree
    ? allTabs.filter(t => t.id === 'chat')
    : isWide
      ? allTabs.filter(t => t.id !== 'chat')
      : allTabs

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left pane: tasks */}
      <div className="hidden sm:flex w-64 shrink-0 border-r border-overlay flex-col">
        <div className="px-4 py-3 border-b border-overlay flex items-center justify-between">
          <span className="text-xs text-muted uppercase tracking-wider font-semibold">Tasks</span>
          <span className="text-xs text-muted">{todos.filter(t => t.status === 'completed').length}/{todos.length}</span>
        </div>
        <TaskList todos={todos} />
        <div className="mt-auto p-3 border-t border-overlay flex flex-col gap-2">
          {session.status !== 'done' && (
            <>
              <QuickActions
                status={gitStatus}
                prs={prs}
                repo={session.repos[0]}
                onSendMessage={handleGitMessage}
              />
              {session.status === 'active' && (
                <button
                  onClick={onSetOnHold}
                  className="w-full bg-latte-yellow text-white hover:brightness-90 transition-all rounded px-3 py-2 text-sm font-medium"
                >
                  Put on Hold
                </button>
              )}
              <button
                onClick={handleMarkDoneClick}
                className="w-full bg-latte-green text-white hover:brightness-90 transition-all rounded px-3 py-2 text-sm font-medium"
              >
                Mark Done
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right pane: tabbed area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="sm:hidden shrink-0 flex items-center gap-2 px-3 py-2 border-b border-overlay">
          <button onClick={onClose} className="text-muted hover:text-text p-1">
            ← Back
          </button>
          <span className="text-sm font-semibold text-text flex-1 truncate">{session.title}</span>
          <button
            onClick={() => setProgressOpen(true)}
            className="text-xs text-indigo border border-indigo/40 rounded px-2 py-1"
          >
            Tasks
          </button>
        </div>

        {/* Desktop session info header — two rows */}
        <div className="hidden sm:block shrink-0 px-4 py-2 border-b border-overlay">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-text truncate">{session.title}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${sessionRunning ? 'bg-yellow animate-pulse' : session.status === 'on_hold' ? 'bg-yellow' : session.status === 'active' ? 'bg-green' : 'bg-muted'}`} />
              <span className="text-xs text-muted">{session.sessionState ?? session.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-mauve font-mono">{repoName}</span>
            <span className="text-xs text-indigo font-mono">{modelLabel}</span>
            {session.worktree && <span className="text-xs text-sky font-mono">{session.worktree.branch}</span>}
          </div>
        </div>

        {isWide ? (
          /* Wide layout: chat left, design/plan tabs right */
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Left: Chat always visible */}
            <div className="flex-1 min-w-0">
              <MessageList
                key={session.id}
                taskId={session.id}
                registerListener={registerChatListener}
                sendChatMessage={sendChatMessage}
                sendQueueAdd={sendQueueAdd}
                sendQueueRemove={sendQueueRemove}
                sendQueueForceSend={sendQueueForceSend}
                sessionRunning={sessionRunning}
                waitingForInput={waitingForInput}
                onStop={() => sendStopMessage(session.id)}
              />
            </div>
            {/* Right: Design/Plan tabs (hidden for free sessions) */}
            {!isFree && (
              <div className="flex-1 min-w-0 border-l border-overlay flex flex-col">
                <div className="shrink-0 flex border-b border-overlay">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-indigo text-text'
                          : 'border-transparent text-muted hover:text-text'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 overflow-hidden relative">
                  <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'design' ? '' : 'hidden'}`}>
                    <FileViewer content={designContent} placeholder="No design doc yet." />
                  </div>
                  <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'implementation' ? '' : 'hidden'}`}>
                    <FileViewer content={implContent} placeholder="No implementation plan yet." />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Narrow layout: all three tabs */
          <>
            {/* Tabs */}
            <div className="shrink-0 flex border-b border-overlay">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo text-text'
                      : 'border-transparent text-muted hover:text-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <div className={`absolute inset-0 ${activeTab === 'chat' ? '' : 'hidden'}`}>
                <MessageList
                  key={session.id}
                  taskId={session.id}
                  registerListener={registerChatListener}
                  sendChatMessage={sendChatMessage}
                  sendQueueAdd={sendQueueAdd}
                  sendQueueRemove={sendQueueRemove}
                  sendQueueForceSend={sendQueueForceSend}
                  sessionRunning={sessionRunning}
                  waitingForInput={waitingForInput}
                  onStop={() => sendStopMessage(session.id)}
                />
              </div>
              <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'design' ? '' : 'hidden'}`}>
                <FileViewer content={designContent} placeholder="No design doc yet." />
              </div>
              <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'implementation' ? '' : 'hidden'}`}>
                <FileViewer content={implContent} placeholder="No implementation plan yet." />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirm dialog for mark done without merge */}
      {showConfirm && (
        <ConfirmDialog
          message="You haven't merged to master and pushed yet. Continue marking done anyway?"
          confirmLabel="Yes, mark done"
          cancelLabel="Cancel"
          onConfirm={() => {
            setShowConfirm(false)
            onMarkDone()
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Mobile: Tasks bottom sheet overlay */}
      {progressOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/60 z-50 flex flex-col justify-end"
          onClick={() => setProgressOpen(false)}
        >
          <div
            className="bg-surface rounded-t-2xl max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-overlay">
              <span className="text-sm font-semibold text-text">Tasks</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">{todos.filter(t => t.status === 'completed').length}/{todos.length}</span>
                <button onClick={() => setProgressOpen(false)} className="text-muted hover:text-text">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TaskList todos={todos} />
            </div>
            {session.status !== 'done' && (
              <div className="p-3 border-t border-overlay flex flex-col gap-2">
                <QuickActions
                  status={gitStatus}
                  prs={prs}
                  onSendMessage={handleGitMessage}
                />
                {session.status === 'active' && (
                  <button
                    onClick={() => { onSetOnHold(); setProgressOpen(false) }}
                    className="w-full bg-latte-yellow text-white hover:brightness-90 transition-all rounded px-3 py-2 text-sm font-medium"
                  >
                    Put on Hold
                  </button>
                )}
                <button
                  onClick={() => { handleMarkDoneClick(); setProgressOpen(false) }}
                  className="w-full bg-latte-green text-white hover:brightness-90 transition-all rounded px-3 py-2 text-sm font-medium"
                >
                  Mark Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
