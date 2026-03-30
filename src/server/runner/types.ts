export type ChatContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

export type ChatStreamEvent =
  | { type: 'assistant'; message: { content: ChatContentBlock[] } }
  | { type: 'tool'; content: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> }

export type OnEvent = (event: ChatStreamEvent) => void
export type OnDone = () => void
export type OnError = (err: string) => void

export type HistoryEntry =
  | { kind: 'user'; text: string }
  | { kind: 'event'; event: ChatStreamEvent }
  | { kind: 'done' }
  | { kind: 'error'; error: string }

export interface ChatRunner {
  start(onEvent: OnEvent, onDone: OnDone, onError: OnError): void
  sendMessage(text: string, onEvent: OnEvent, onDone: OnDone, onError: OnError): void
  setPrompts(systemPrompt: string, initialPrompt: string): void
  kill(): void
  killAsync(): Promise<void>
  getProviderSessionId(): string | null
  setProviderSessionId(id: string): void
  getHistory(): HistoryEntry[]
  recordUserMessage(text: string): void
  recordDone(): void
  recordError(error: string): void
}

export type ParsedLine =
  | { type: 'event'; event: ChatStreamEvent }
  | { type: 'session_id'; id: string }
  | { type: 'done' }
  | null

export interface ProviderStrategy {
  buildArgs(opts: { model: string; systemPrompt: string; prompt: string }): string[]
  buildResumeArgs(opts: { sessionId: string; model: string; prompt: string }): string[]
  parseLine(line: string): ParsedLine
  resolveCommand(): Promise<string>
}
