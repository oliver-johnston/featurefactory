import { readFile, writeFile, mkdir, readdir, rm } from 'fs/promises'
import { join } from 'path'
import type { Session } from '../shared/types.js'

function normalizeSession(session: Session): Session {
  return {
    ...session,
    workflow: session.workflow ?? 'full',
  }
}

export async function writeSession(tasksDir: string, session: Session): Promise<void> {
  const dir = join(tasksDir, session.id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'task.json'), JSON.stringify(session, null, 2) + '\n', 'utf-8')
}

export async function readSession(tasksDir: string, id: string): Promise<Session> {
  const content = await readFile(join(tasksDir, id, 'task.json'), 'utf-8')
  return normalizeSession(JSON.parse(content) as Session)
}

export async function listSessions(tasksDir: string): Promise<Session[]> {
  let entries: string[]
  try {
    entries = await readdir(tasksDir)
  } catch {
    return []
  }

  const sessions: Session[] = []
  for (const entry of entries) {
    try {
      const session = await readSession(tasksDir, entry)
      sessions.push(session)
    } catch {
      // skip invalid/missing task.json
    }
  }
  return sessions
}

export async function deleteSession(tasksDir: string, id: string): Promise<void> {
  const dir = join(tasksDir, id)
  await rm(dir, { recursive: true, force: true })
}

export async function nextSessionId(tasksDir: string): Promise<string> {
  let entries: string[]
  try {
    entries = await readdir(tasksDir)
  } catch {
    return 'TASK-001'
  }

  const nums = entries
    .map(e => e.match(/^TASK-(\d+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => parseInt(m[1], 10))

  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `TASK-${String(max + 1).padStart(3, '0')}`
}
