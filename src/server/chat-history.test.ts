import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { appendChatEvent, readChatHistory } from './chat-history.js'
import type { ChatHistoryEntry } from '../shared/types.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ff-chat-history-test-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('appendChatEvent', () => {
  it('creates file and appends a session_start entry', async () => {
    const entry: ChatHistoryEntry = { ts: '2026-03-28T17:00:00Z', type: 'session_start' }
    await appendChatEvent(dir, 'TASK-001', entry)
    const raw = await readFile(join(dir, 'TASK-001', 'chat-history.jsonl'), 'utf-8')
    const lines = raw.trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0])).toEqual(entry)
  })

  it('appends multiple entries as separate lines', async () => {
    await appendChatEvent(dir, 'TASK-001', { ts: '2026-03-28T17:00:00Z', type: 'session_start' })
    await appendChatEvent(dir, 'TASK-001', { ts: '2026-03-28T17:00:01Z', type: 'user', text: 'hello' })
    const raw = await readFile(join(dir, 'TASK-001', 'chat-history.jsonl'), 'utf-8')
    const lines = raw.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[1])).toEqual({ ts: '2026-03-28T17:00:01Z', type: 'user', text: 'hello' })
  })
})

describe('readChatHistory', () => {
  it('returns empty array when no history file exists', async () => {
    const entries = await readChatHistory(dir, 'TASK-001')
    expect(entries).toEqual([])
  })

  it('returns all entries in order', async () => {
    await appendChatEvent(dir, 'TASK-001', { ts: '2026-03-28T17:00:00Z', type: 'session_start' })
    await appendChatEvent(dir, 'TASK-001', { ts: '2026-03-28T17:00:01Z', type: 'user', text: 'hi' })
    const entries = await readChatHistory(dir, 'TASK-001')
    expect(entries).toHaveLength(2)
    expect(entries[0].type).toBe('session_start')
    expect(entries[1].type).toBe('user')
  })
})
