export type SessionStatus = 'active' | 'on_hold' | 'done'

export type SessionState = 'idle' | 'running' | 'waiting_for_input' | 'needs_permission'
export type SessionStage = 'brainstorm' | 'design' | 'implementation_plan' | 'implement'

export interface GitStatus {
  ahead: number
  behind: number
  uncommitted: number
  untracked: number
}

export interface ModelOption {
  id: string
  label: string
}

export type ModelProvider = string

export interface SessionWorktree {
  root: string
  branch: string
  paths: string[]
}

export interface Session {
  id: string
  title: string
  repos: string[]
  provider: ModelProvider
  model: string
  status: SessionStatus
  sessionState?: SessionState
  stage?: SessionStage
  providerSessionId?: string
  created_at: string
  worktree: SessionWorktree
}

export type ChatStreamEvent =
  | { type: 'assistant'; message: { content: ChatContentBlock[] } }
  | { type: 'tool'; content: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> }
  | { type: 'result'; subtype: 'success' | string; session_id: string; result: string }

export type ChatContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'meta'; label: string; content?: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

export type ChatHistoryEntry =
  | { ts: string; type: 'session_start' }
  | { ts: string; type: 'user'; text: string }
  | { ts: string; type: 'assistant'; blocks: ChatContentBlock[] }
  | { ts: string; type: 'tool_result'; tool_use_id: string; content: string }

export type FileType = 'todos' | 'design' | 'implementation' | 'prs'

export type WsMessage =
  | { type: 'task:updated'; task: Session }
  | { type: 'task:list'; tasks: Session[] }
  | { type: 'task:removed'; taskId: string }
  | { type: 'pty:data'; taskId: string; data: string }
  | { type: 'pty:input'; taskId: string; data: string }
  | { type: 'pty:subscribe'; taskId: string }
  | { type: 'pty:resize'; taskId: string; cols: number; rows: number }
  // Chat (replaces pty:*)
  | { type: 'chat:subscribe'; taskId: string }
  | { type: 'chat:message'; taskId: string; text: string }
  | { type: 'chat:stop'; taskId: string }
  | { type: 'chat:event'; taskId: string; event: ChatStreamEvent }
  | { type: 'chat:done'; taskId: string }
  | { type: 'chat:error'; taskId: string; error: string }
  | { type: 'chat:user'; taskId: string; text: string }
  | { type: 'chat:history'; taskId: string; entries: ChatHistoryEntry[] }
  | { type: 'chat:history_done'; taskId: string }
  // Message queue
  | { type: 'chat:queue:add'; taskId: string; text: string }
  | { type: 'chat:queue:remove'; taskId: string; index: number }
  | { type: 'chat:queue:force-send'; taskId: string }
  | { type: 'chat:queue:state'; taskId: string; messages: string[] }
  // File viewer
  | { type: 'file:updated'; taskId: string; fileType: FileType; content: string }
  | { type: 'file:list'; taskId: string; files: Array<{ fileType: FileType; content: string }> }
  // Git status
  | { type: 'git:status'; taskId: string; status: GitStatus }

export type { Settings, SettingsModelOption, QuickAction } from './settingsTypes.js'
// test
