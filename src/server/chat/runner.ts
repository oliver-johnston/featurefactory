import type { ChatStreamEvent } from '../../shared/types.js'

export type OnEvent = (event: ChatStreamEvent) => void
export type OnDone = () => void
export type OnError = (err: string) => void

/** A history entry stored for replay when clients reconnect. */
export type HistoryEntry =
  | { kind: 'user'; text: string }
  | { kind: 'event'; event: ChatStreamEvent }
  | { kind: 'done' }
  | { kind: 'error'; error: string }

export interface ChatRunner {
  start(onEvent: OnEvent, onDone: OnDone, onError: OnError): void
  sendMessage(text: string, onEvent: OnEvent, onDone: OnDone, onError: OnError): void
  kill(): void
  killAsync(): Promise<void>
  getProviderSessionId(): string | null
  setProviderSessionId(id: string): void
  /** Full conversation history for replay on reconnect. */
  getHistory(): HistoryEntry[]
  /** Record a user message in history (call before sendMessage). */
  recordUserMessage(text: string): void
  /** Record a done marker in history. */
  recordDone(): void
  /** Record an error in history. */
  recordError(error: string): void
}
