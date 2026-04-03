import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { readSession, writeSession, listSessions, nextSessionId, deleteSession } from './store.js'
import type { Session } from '../shared/types.js'

const SAMPLE: Session = {
  id: 'TASK-001',
  title: 'Add user auth',
  repos: ['/tmp/my-app'],
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  status: 'active',
  workflow: 'full',
  created_at: '2026-03-27T10:00:00Z',
  worktree: {
    root: '/tmp/.featurefactory/worktrees/TASK-001',
    branch: 'feat/TASK-001-add-user-auth',
    paths: ['/tmp/.featurefactory/worktrees/TASK-001/my-app'],
  },
}

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ff-store-test-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('writeSession / readSession', () => {
  it('round-trips a session', async () => {
    await writeSession(dir, SAMPLE)
    const result = await readSession(dir, SAMPLE.id)
    expect(result).toEqual(SAMPLE)
  })

  it('writeSession creates the task directory if missing', async () => {
    await writeSession(dir, SAMPLE)
    const result = await readSession(dir, SAMPLE.id)
    expect(result.id).toBe('TASK-001')
  })

  it('readSession throws for missing task', async () => {
    await expect(readSession(dir, 'TASK-999')).rejects.toThrow()
  })

  it('deleteSession removes the task directory', async () => {
    await writeSession(dir, SAMPLE)
    await deleteSession(dir, SAMPLE.id)
    await expect(readSession(dir, SAMPLE.id)).rejects.toThrow()
  })
})

describe('listSessions', () => {
  it('returns empty array when tasks dir is empty', async () => {
    const results = await listSessions(dir)
    expect(results).toEqual([])
  })

  it('returns all valid sessions', async () => {
    const second: Session = { ...SAMPLE, id: 'TASK-002', title: 'Fix bug' }
    await writeSession(dir, SAMPLE)
    await writeSession(dir, second)
    const results = await listSessions(dir)
    expect(results).toHaveLength(2)
    expect(results.map(s => s.id).sort()).toEqual(['TASK-001', 'TASK-002'])
  })

  it('skips directories without a valid task.json', async () => {
    await mkdir(join(dir, 'TASK-003'), { recursive: true })
    // no task.json written
    const results = await listSessions(dir)
    expect(results).toEqual([])
  })
})

describe('nextSessionId', () => {
  it('returns TASK-001 when no sessions exist', async () => {
    const id = await nextSessionId(dir)
    expect(id).toBe('TASK-001')
  })

  it('returns next ID after existing sessions', async () => {
    await writeSession(dir, SAMPLE)
    const second: Session = { ...SAMPLE, id: 'TASK-002', title: 'Fix bug' }
    await writeSession(dir, second)
    const id = await nextSessionId(dir)
    expect(id).toBe('TASK-003')
  })
})
