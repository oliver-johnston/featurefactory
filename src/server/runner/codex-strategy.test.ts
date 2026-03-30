import { describe, expect, it, vi } from 'vitest'
import { codexStrategy } from './codex-strategy.js'

vi.mock('child_process', () => ({ execFile: vi.fn() }))
import { execFile } from 'child_process'

describe('codexStrategy.parseLine', () => {
  it('returns null for non-JSON and ignored event types', () => {
    expect(codexStrategy.parseLine('')).toBeNull()
    expect(codexStrategy.parseLine('not json')).toBeNull()
    expect(codexStrategy.parseLine(JSON.stringify({ type: 'turn.started' }))).toBeNull()
  })

  it('extracts thread_id from thread.started', () => {
    const line = JSON.stringify({ type: 'thread.started', thread_id: 'thread-xyz' })
    expect(codexStrategy.parseLine(line)).toEqual({ type: 'session_id', id: 'thread-xyz' })
  })

  it('maps agent_message item to ChatStreamEvent text block', () => {
    const line = JSON.stringify({
      type: 'item.completed',
      item: { id: 'item_0', type: 'agent_message', text: 'Hello from Codex' },
    })
    expect(codexStrategy.parseLine(line)).toEqual({
      type: 'event',
      event: {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello from Codex' }] },
      },
    })
  })

  it('returns null for non-agent_message items', () => {
    const line = JSON.stringify({
      type: 'item.completed',
      item: { id: 'item_0', type: 'tool_call', name: 'bash' },
    })
    expect(codexStrategy.parseLine(line)).toBeNull()
  })

  it('returns done from turn.completed', () => {
    const line = JSON.stringify({ type: 'turn.completed', usage: {} })
    expect(codexStrategy.parseLine(line)).toEqual({ type: 'done' })
  })
})

describe('codexStrategy.buildArgs', () => {
  it('builds correct args for initial turn', () => {
    const args = codexStrategy.buildArgs({
      model: 'gpt-5-codex',
      systemPrompt: 'You are helpful',
      prompt: 'Hello',
    })
    expect(args).toEqual([
      'exec', '--json',
      '--dangerously-bypass-approvals-and-sandbox',
      '-m', 'gpt-5-codex',
      'Hello',
    ])
  })
})

describe('codexStrategy.buildResumeArgs', () => {
  it('builds correct args for resumed turn', () => {
    const args = codexStrategy.buildResumeArgs({
      sessionId: 'thread-xyz',
      model: 'gpt-5-codex',
      prompt: 'Follow up',
    })
    expect(args).toEqual([
      'exec', '--json',
      '--dangerously-bypass-approvals-and-sandbox',
      '-m', 'gpt-5-codex',
      'resume', 'thread-xyz',
      'Follow up',
    ])
  })
})

describe('codexStrategy.resolveCommand', () => {
  it('resolves codex binary via login shell', async () => {
    vi.mocked(execFile).mockImplementation(
      ((_file: string, _args: string[], cb: (err: null, stdout: string, stderr: string) => void) => {
        cb(null, '/usr/local/bin/codex\n', '')
        return {} as never
      }) as unknown as typeof execFile,
    )

    const cmd = await codexStrategy.resolveCommand()
    expect(cmd).toBe('/usr/local/bin/codex')
  })
})
