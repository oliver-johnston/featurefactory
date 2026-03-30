import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FileWatcher } from './watcher.js'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  getDesignContextPath,
  getImplementationContextPath,
  getTodosContextPath,
} from '../context.js'

describe('FileWatcher', () => {
  let taskDir: string
  let worktreeDir: string

  beforeEach(async () => {
    taskDir = join(tmpdir(), `fw-task-${Date.now()}`)
    worktreeDir = join(tmpdir(), `fw-worktree-${Date.now()}`)
    await mkdir(taskDir, { recursive: true })
    await mkdir(join(worktreeDir, '.featurefactory'), { recursive: true })
  })

  afterEach(async () => {
    await rm(taskDir, { recursive: true, force: true })
    await rm(worktreeDir, { recursive: true, force: true })
  })

  it('reads todos.json content', async () => {
    await writeFile(getTodosContextPath(worktreeDir), '[{"content":"Do thing","status":"pending","activeForm":"Doing thing"}]')
    const watcher = new FileWatcher('TASK-001', taskDir, worktreeDir)
    const content = await watcher.readFile('todos')
    expect(content).toBe('[{"content":"Do thing","status":"pending","activeForm":"Doing thing"}]')
    await watcher.stop()
  })

  it('returns empty string when todos.json is missing', async () => {
    const watcher = new FileWatcher('TASK-001', taskDir, worktreeDir)
    const content = await watcher.readFile('todos')
    expect(content).toBe('')
    await watcher.stop()
  })

  it('reads design.md content from the worktree context directory', async () => {
    await writeFile(getDesignContextPath(worktreeDir), '# Design')
    const watcher = new FileWatcher('TASK-001', taskDir, worktreeDir)
    const content = await watcher.readFile('design')
    expect(content).toBe('# Design')
    await watcher.stop()
  })

  it('reads implementation.md content from the worktree context directory', async () => {
    await writeFile(getImplementationContextPath(worktreeDir), '# Plan')
    const watcher = new FileWatcher('TASK-001', taskDir, worktreeDir)
    const content = await watcher.readFile('implementation')
    expect(content).toBe('# Plan')
    await watcher.stop()
  })

  it('returns empty string when design file is missing', async () => {
    const watcher = new FileWatcher('TASK-001', taskDir, worktreeDir)
    const content = await watcher.readFile('design')
    expect(content).toBe('')
    await watcher.stop()
  })

  it('calls onChange when todos.json is written', async () => {
    await writeFile(getTodosContextPath(worktreeDir), '[]')
    const onChange = vi.fn()
    const watcher = new FileWatcher('TASK-001', taskDir, worktreeDir)
    await watcher.start(onChange)
    await writeFile(getTodosContextPath(worktreeDir), '[{"content":"Done","status":"completed","activeForm":"Done"}]')
    // Give chokidar time to fire
    await new Promise(r => setTimeout(r, 500))
    expect(onChange).toHaveBeenCalledWith('todos', '[{"content":"Done","status":"completed","activeForm":"Done"}]')
    await watcher.stop()
  })
})
