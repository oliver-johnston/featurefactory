import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { Session } from '../shared/types.js'
import {
  ensureSessionContextFiles,
  generateClaudeMd,
  getDesignContextPath,
  getImplementationContextPath,
  getTodosContextPath,
  getTaskContextPath,
} from './context.js'

describe('ensureSessionContextFiles', () => {
  let rootDir: string
  let taskDir: string
  let worktreeDir: string
  let session: Session

  beforeEach(async () => {
    rootDir = join(tmpdir(), `ff-context-${Date.now()}`)
    taskDir = join(rootDir, 'tasks', 'TASK-001')
    worktreeDir = join(rootDir, 'worktrees', 'TASK-001')
    await mkdir(taskDir, { recursive: true })
    await mkdir(worktreeDir, { recursive: true })

    session = {
      id: 'TASK-001',
      title: 'Testing flow',
      repos: ['/repo'],
      provider: 'openai',
      model: 'gpt-5-codex',
      status: 'active',
      created_at: '2026-03-28T09:00:00Z',
      worktree: {
        root: worktreeDir,
        branch: 'feat/TASK-001-testing-flow',
        paths: [worktreeDir],
      },
    }
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('creates agent-facing files in the worktree context directory', async () => {
    await ensureSessionContextFiles(session, taskDir)

    await expect(readFile(getTaskContextPath(worktreeDir), 'utf-8')).resolves.toContain('# Testing flow')
    await expect(readFile(getTodosContextPath(worktreeDir), 'utf-8')).resolves.toBe('[]')
    await expect(readFile(getDesignContextPath(worktreeDir), 'utf-8')).resolves.toContain('# Design')
    await expect(readFile(getImplementationContextPath(worktreeDir), 'utf-8')).resolves.toContain('# Implementation')
  })

  it('creates default todos.json in worktree', async () => {
    await ensureSessionContextFiles(session, taskDir)

    await expect(readFile(getTodosContextPath(worktreeDir), 'utf-8')).resolves.toBe('[]')
  })

  it('overwrites stale context files from a different session', async () => {
    // Pre-populate with files from a different session (simulating repo checkout)
    const contextDir = join(worktreeDir, '.featurefactory')
    await mkdir(contextDir, { recursive: true })
    await writeFile(join(contextDir, 'task.md'), '# Old task\n\n- Task ID: TASK-999\n')
    await writeFile(join(contextDir, 'design.md'), '# Old design from TASK-999\n')
    await writeFile(join(contextDir, 'implementation.md'), '# Old implementation from TASK-999\n')
    await ensureSessionContextFiles(session, taskDir)

    // task.md should now have this session's ID
    const taskContent = await readFile(getTaskContextPath(worktreeDir), 'utf-8')
    expect(taskContent).toContain('TASK-001')
    expect(taskContent).not.toContain('TASK-999')

    // design and implementation should be fresh defaults
    const designContent = await readFile(getDesignContextPath(worktreeDir), 'utf-8')
    expect(designContent).toBe('# Design\n\nNo design notes yet.\n')

    const implContent = await readFile(getImplementationContextPath(worktreeDir), 'utf-8')
    expect(implContent).toBe('# Implementation\n\nNo implementation plan yet.\n')

    // todos should also be fresh
    const todosContent = await readFile(getTodosContextPath(worktreeDir), 'utf-8')
    expect(todosContent).toBe('[]')
  })

  it('preserves context files when resuming the same session', async () => {
    // First call creates files
    await ensureSessionContextFiles(session, taskDir)

    // Simulate agent writing to design.md
    await writeFile(getDesignContextPath(worktreeDir), '# My custom design\n')

    // Second call (resume) should preserve the custom content
    await ensureSessionContextFiles(session, taskDir)

    const designContent = await readFile(getDesignContextPath(worktreeDir), 'utf-8')
    expect(designContent).toBe('# My custom design\n')
  })
})

describe('generateClaudeMd', () => {
  let rootDir: string
  let session: Session

  beforeEach(async () => {
    rootDir = join(tmpdir(), `ff-claude-md-${Date.now()}`)
    await mkdir(rootDir, { recursive: true })

    session = {
      id: 'TASK-002',
      title: 'Multi-repo task',
      repos: ['/home/user/repos/frontend', '/home/user/repos/backend'],
      provider: 'openai',
      model: 'gpt-5-codex',
      status: 'active',
      created_at: '2026-03-29T10:00:00Z',
      worktree: {
        root: rootDir,
        branch: 'feat/TASK-002-multi-repo',
        paths: [join(rootDir, 'frontend'), join(rootDir, 'backend')],
      },
    }
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('creates CLAUDE.md with correct content', async () => {
    await generateClaudeMd(session)

    const content = await readFile(join(rootDir, 'CLAUDE.md'), 'utf-8')
    expect(content).toContain('# Multi-repo task')
    expect(content).toContain('Task ID: TASK-002')
    expect(content).toContain('Branch: feat/TASK-002-multi-repo')
    expect(content).toContain('`frontend/` — worktree of /home/user/repos/frontend')
    expect(content).toContain('`backend/` — worktree of /home/user/repos/backend')
    expect(content).toContain('.featurefactory/')
  })
})
