import { execFile } from 'child_process'
import type { ProviderStrategy, ParsedLine, ChatContentBlock, ChatStreamEvent } from './types.js'

let cachedCommand: string | null = null

export const claudeStrategy: ProviderStrategy = {
  buildArgs({ model, systemPrompt, prompt }) {
    return [
      '-p', '--output-format', 'stream-json', '--verbose',
      '--dangerously-skip-permissions',
      '--model', model,
      '--system-prompt', systemPrompt,
      prompt,
    ]
  },

  buildResumeArgs({ sessionId, model, prompt }) {
    return [
      '-p', '--output-format', 'stream-json', '--verbose',
      '--dangerously-skip-permissions',
      '--model', model,
      '--resume', sessionId,
      prompt,
    ]
  },

  parseLine(line): ParsedLine {
    if (!line.trim()) return null
    let obj: Record<string, unknown>
    try { obj = JSON.parse(line) } catch { return null }

    if (obj.type === 'assistant') {
      const message = obj.message as { content: ChatContentBlock[] }
      return { type: 'event', event: { type: 'assistant', message } as ChatStreamEvent }
    }

    if (obj.type === 'user') {
      const message = obj.message as { content?: Array<{ type: string; tool_use_id?: string; content?: string }> }
      const results = (message.content ?? []).filter(
        (b): b is { type: 'tool_result'; tool_use_id: string; content: string } =>
          b.type === 'tool_result' && typeof b.tool_use_id === 'string'
      )
      if (results.length > 0) {
        return { type: 'event', event: { type: 'tool', content: results } as ChatStreamEvent }
      }
    }

    if (obj.type === 'result') {
      return { type: 'session_id', id: obj.session_id as string }
    }

    return null
  },

  async resolveCommand() {
    if (cachedCommand) return cachedCommand
    const shell = process.env.SHELL || '/bin/sh'
    const resolved = await new Promise<string>((resolve, reject) => {
      execFile(shell, ['-lc', 'command -v claude'], (err, stdout) => {
        if (err || !stdout.trim()) reject(err ?? new Error('claude not found'))
        else resolve(stdout.trim())
      })
    })
    cachedCommand = resolved
    return resolved
  },
}

export type { ProviderStrategy, ParsedLine } from './types.js'
