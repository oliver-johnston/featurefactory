import { execFile } from 'child_process'
import type { ProviderStrategy, ParsedLine } from './types.js'

let cachedCommand: string | null = null

export const codexStrategy: ProviderStrategy = {
  buildArgs({ model, prompt }) {
    return [
      'exec', '--json',
      '--dangerously-bypass-approvals-and-sandbox',
      '-m', model,
      prompt,
    ]
  },

  buildResumeArgs({ sessionId, model, prompt }) {
    return [
      'exec', '--json',
      '--dangerously-bypass-approvals-and-sandbox',
      '-m', model,
      'resume', sessionId,
      prompt,
    ]
  },

  parseLine(line): ParsedLine {
    if (!line.trim()) return null
    let obj: Record<string, unknown>
    try { obj = JSON.parse(line) } catch { return null }

    if (obj.type === 'thread.started') {
      return { type: 'session_id', id: obj.thread_id as string }
    }

    if (obj.type === 'item.completed') {
      if (!obj.item || typeof obj.item !== 'object') return null
      const item = obj.item as { type: string; text?: string }
      if (item.type === 'agent_message' && typeof item.text === 'string') {
        return {
          type: 'event',
          event: {
            type: 'assistant',
            message: { content: [{ type: 'text', text: item.text }] },
          },
        }
      }
      return null
    }

    if (obj.type === 'turn.completed') {
      return { type: 'done' }
    }

    return null
  },

  async resolveCommand() {
    if (cachedCommand) return cachedCommand
    const shell = process.env.SHELL || '/bin/sh'
    const resolved = await new Promise<string>((resolve, reject) => {
      execFile(shell, ['-lc', 'command -v codex'], (err, stdout) => {
        if (err || !stdout.trim()) reject(err ?? new Error('codex not found'))
        else resolve(stdout.trim())
      })
    })
    cachedCommand = resolved
    return resolved
  },
}
