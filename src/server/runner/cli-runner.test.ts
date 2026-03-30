import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PassThrough } from 'stream'
import { EventEmitter } from 'events'
import { CliRunner } from './cli-runner.js'
import type { ProviderStrategy, ParsedLine } from './claude-strategy.js'

vi.mock('child_process', () => ({ spawn: vi.fn() }))
import { spawn } from 'child_process'

function makeProcess() {
  const proc = new EventEmitter() as any
  proc.stdout = new PassThrough()
  proc.stderr = new PassThrough()
  proc.kill = vi.fn()
  return proc
}

function makeStrategy(overrides: Partial<ProviderStrategy> = {}): ProviderStrategy {
  return {
    buildArgs: vi.fn(() => ['--first-turn', 'prompt']),
    buildResumeArgs: vi.fn(() => ['--resume', 'sess-1', 'prompt']),
    parseLine: vi.fn(() => null),
    resolveCommand: vi.fn(async () => '/usr/bin/mycli'),
    ...overrides,
  }
}

describe('CliRunner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('spawns process with args from buildArgs on first turn', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)
    const strategy = makeStrategy()

    const runner = new CliRunner('TASK-1', '/workspace', strategy, 'model-x', 'sys', 'initial')
    runner.start(vi.fn(), vi.fn(), vi.fn())

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    expect(spawn).toHaveBeenCalledWith('/usr/bin/mycli', ['--first-turn', 'prompt'], expect.objectContaining({ cwd: '/workspace', stdio: ['ignore', 'pipe', 'pipe'] }))
    expect(strategy.buildArgs).toHaveBeenCalledWith({ model: 'model-x', systemPrompt: 'sys', prompt: 'initial' })
  })

  it('uses buildResumeArgs when providerSessionId is set', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)
    const strategy = makeStrategy()

    const runner = new CliRunner('TASK-1', '/workspace', strategy, 'model-x', 'sys', 'initial')
    runner.setProviderSessionId('sess-1')
    runner.sendMessage('follow up', vi.fn(), vi.fn(), vi.fn())

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    expect(strategy.buildResumeArgs).toHaveBeenCalledWith({ sessionId: 'sess-1', model: 'model-x', prompt: 'follow up' })
  })

  it('forwards parsed events to onEvent', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)

    const event = { type: 'assistant' as const, message: { content: [{ type: 'text' as const, text: 'hi' }] } }
    const strategy = makeStrategy({
      parseLine: vi.fn((line) => line.includes('hi') ? { type: 'event' as const, event } : null),
    })

    const onEvent = vi.fn()
    const runner = new CliRunner('TASK-1', '/workspace', strategy, 'model-x', 'sys', 'initial')
    runner.start(onEvent, vi.fn(), vi.fn())

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    proc.stdout.write('{"type":"assistant","content":"hi"}\n')

    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledWith(event))
  })

  it('sets providerSessionId when parseLine returns session_id', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)

    const strategy = makeStrategy({
      parseLine: vi.fn((line): ParsedLine => line.includes('sess') ? { type: 'session_id', id: 'sess-abc' } : null),
    })

    const runner = new CliRunner('TASK-1', '/workspace', strategy, 'model-x', 'sys', 'initial')
    runner.start(vi.fn(), vi.fn(), vi.fn())

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    proc.stdout.write('{"type":"sess"}\n')

    await vi.waitFor(() => expect(runner.getProviderSessionId()).toBe('sess-abc'))
  })

  it('calls onDone when process exits with code 0', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)

    const onDone = vi.fn()
    const runner = new CliRunner('TASK-1', '/workspace', makeStrategy(), 'model-x', 'sys', 'initial')
    runner.start(vi.fn(), onDone, vi.fn())

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    proc.stdout.end()
    proc.emit('close', 0)

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('calls onError when process exits with non-zero code', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)

    const onError = vi.fn()
    const runner = new CliRunner('TASK-1', '/workspace', makeStrategy(), 'model-x', 'sys', 'initial')
    runner.start(vi.fn(), vi.fn(), onError)

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    proc.stdout.end()
    proc.emit('close', 1)

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('Process exited with code 1'))
  })

  it('rejects concurrent turns with onError', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)

    const onError = vi.fn()
    const runner = new CliRunner('TASK-1', '/workspace', makeStrategy(), 'model-x', 'sys', 'initial')
    runner.start(vi.fn(), vi.fn(), vi.fn())
    runner.sendMessage('concurrent', vi.fn(), vi.fn(), onError)

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('A turn is already in progress'))
  })

  it('calls onDone when parseLine returns done', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)

    const strategy = makeStrategy({
      parseLine: vi.fn((): ParsedLine => ({ type: 'done' })),
    })

    const onDone = vi.fn()
    const runner = new CliRunner('TASK-1', '/workspace', strategy, 'model-x', 'sys', 'initial')
    runner.start(vi.fn(), onDone, vi.fn())

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    proc.stdout.write('line\n')

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('calls onError when process emits error event', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)

    const onError = vi.fn()
    const runner = new CliRunner('TASK-1', '/workspace', makeStrategy(), 'model-x', 'sys', 'initial')
    runner.start(vi.fn(), vi.fn(), onError)

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    proc.emit('error', new Error('ENOENT: command not found'))

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('ENOENT: command not found'))
  })

  it('kill() terminates the process and suppresses onDone/onError', async () => {
    const proc = makeProcess()
    vi.mocked(spawn).mockReturnValue(proc)

    const onDone = vi.fn()
    const onError = vi.fn()
    const runner = new CliRunner('TASK-1', '/workspace', makeStrategy(), 'model-x', 'sys', 'initial')
    runner.start(vi.fn(), onDone, onError)

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    runner.kill()
    proc.emit('close', 0)

    expect(proc.kill).toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
