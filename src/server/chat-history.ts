import { appendFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { ChatHistoryEntry } from '../shared/types.js'

export async function appendChatEvent(tasksDir: string, taskId: string, entry: ChatHistoryEntry): Promise<void> {
  const dir = join(tasksDir, taskId)
  await mkdir(dir, { recursive: true })
  await appendFile(join(dir, 'chat-history.jsonl'), JSON.stringify(entry) + '\n', 'utf-8')
}

export async function readChatHistory(tasksDir: string, taskId: string): Promise<ChatHistoryEntry[]> {
  let raw: string
  try {
    raw = await readFile(join(tasksDir, taskId, 'chat-history.jsonl'), 'utf-8')
  } catch {
    return []
  }
  return raw.trim().split('\n').filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line) as ChatHistoryEntry] }
    catch { return [] }
  })
}
