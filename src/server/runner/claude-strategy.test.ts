import { describe, expect, it, vi } from 'vitest'
import { claudeStrategy } from './claude-strategy.js'

vi.mock('child_process', () => ({ execFile: vi.fn() }))
import { execFile } from 'child_process'

describe('claudeStrategy.parseLine', () => {
  it('returns null for non-JSON lines', () => {
    expect(claudeStrategy.parseLine('')).toBeNull()
    expect(claudeStrategy.parseLine('not json')).toBeNull()
  })

  it('returns null for ignored event types', () => {
    expect(claudeStrategy.parseLine(JSON.stringify({ type: 'system', subtype: 'init' }))).toBeNull()
    expect(claudeStrategy.parseLine(JSON.stringify({ type: 'rate_limit_event' }))).toBeNull()
  })

  it('maps assistant text block to ChatStreamEvent', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'Hello world' }],
      },
    })
    expect(claudeStrategy.parseLine(line)).toEqual({
      type: 'event',
      event: {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello world' }] },
      },
    })
  })

  it('maps assistant thinking block to ChatStreamEvent', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'thinking', thinking: 'reasoning...' }],
      },
    })
    expect(claudeStrategy.parseLine(line)).toEqual({
      type: 'event',
      event: {
        type: 'assistant',
        message: { content: [{ type: 'thinking', thinking: 'reasoning...' }] },
      },
    })
  })

  it('maps assistant tool_use block to ChatStreamEvent', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } }],
      },
    })
    expect(claudeStrategy.parseLine(line)).toEqual({
      type: 'event',
      event: {
        type: 'assistant',
        message: { content: [{ type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } }] },
      },
    })
  })

  it('maps user tool_result to ChatStreamEvent tool event', () => {
    const line = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'tu_1', content: 'file contents here' },
        ],
      },
    })
    expect(claudeStrategy.parseLine(line)).toEqual({
      type: 'event',
      event: {
        type: 'tool',
        content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'file contents here' }],
      },
    })
  })

  it('returns null for user events without tool_result', () => {
    const line = JSON.stringify({
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text: 'hello' }] },
    })
    expect(claudeStrategy.parseLine(line)).toBeNull()
  })

  it('extracts session_id from result event', () => {
    const line = JSON.stringify({
      type: 'result',
      subtype: 'success',
      session_id: 'sess-abc',
      result: 'done',
    })
    expect(claudeStrategy.parseLine(line)).toEqual({
      type: 'session_id',
      id: 'sess-abc',
    })
  })

  it('returns session_id from result event regardless of subtype', () => {
    // result line produces session_id (done is signalled by process exit)
    const line = JSON.stringify({ type: 'result', session_id: 'sess-abc' })
    const parsed = claudeStrategy.parseLine(line)
    expect(parsed).toEqual({ type: 'session_id', id: 'sess-abc' })
  })
})

describe('claudeStrategy.buildArgs', () => {
  it('builds correct args for initial turn', () => {
    const args = claudeStrategy.buildArgs({
      model: 'claude-sonnet-4-6',
      systemPrompt: 'You are helpful',
      prompt: 'Hello',
    })
    expect(args).toEqual([
      '-p', '--output-format', 'stream-json', '--verbose',
      '--dangerously-skip-permissions',
      '--model', 'claude-sonnet-4-6',
      '--system-prompt', 'You are helpful',
      'Hello',
    ])
  })
})

describe('claudeStrategy.buildResumeArgs', () => {
  it('builds correct args for resumed turn (no system-prompt)', () => {
    const args = claudeStrategy.buildResumeArgs({
      sessionId: 'sess-abc',
      model: 'claude-sonnet-4-6',
      prompt: 'Follow up',
    })
    expect(args).toEqual([
      '-p', '--output-format', 'stream-json', '--verbose',
      '--dangerously-skip-permissions',
      '--model', 'claude-sonnet-4-6',
      '--resume', 'sess-abc',
      'Follow up',
    ])
  })
})

describe('claudeStrategy.resolveCommand', () => {
  it('resolves claude binary via login shell', async () => {
    vi.mocked(execFile).mockImplementation(
      ((_file: string, _args: string[], cb: (err: null, stdout: string, stderr: string) => void) => {
        cb(null, '/usr/local/bin/claude\n', '')
        return {} as never
      }) as unknown as typeof execFile,
    )

    const cmd = await claudeStrategy.resolveCommand()
    expect(cmd).toBe('/usr/local/bin/claude')
  })
})
