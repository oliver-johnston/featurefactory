const ICON_MAP: Record<string, string> = {
  Read: '📄',
  Edit: '✏️',
  Write: '📝',
  Bash: '▶',
  Grep: '🔍',
  Glob: '📂',
  Agent: '🤖',
  WebSearch: '🌐',
  WebFetch: '🌐',
  Skill: '⚡',
  TodoWrite: '✓',
}

export function getToolIcon(toolName: string): string {
  return ICON_MAP[toolName] ?? '🔧'
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export function getToolSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Read':
      return `Read ${String(input.file_path ?? '').replace(/^\//, '')}`
    case 'Edit':
      return `Edit ${String(input.file_path ?? '').replace(/^\//, '')}`
    case 'Write':
      return `Write ${String(input.file_path ?? '').replace(/^\//, '')}`
    case 'Bash':
      return truncate(String(input.command ?? 'bash'), 60)
    case 'Grep': {
      const glob = input.glob ? ` ${input.glob}` : ''
      return `Grep "${input.pattern ?? ''}"${glob}`
    }
    case 'Glob':
      return `Glob ${input.pattern ?? ''}`
    case 'Agent':
      return `Agent: ${input.description ?? 'task'}`
    case 'WebSearch':
      return `Search "${input.query ?? ''}"`
    case 'WebFetch': {
      const url = String(input.url ?? '')
      return `Fetch ${url.replace(/^https?:\/\//, '')}`
    }
    case 'Skill':
      return `Skill: ${input.skill ?? ''}`
    case 'TodoWrite':
      return 'Updated tasks'
    default:
      return toolName
  }
}
