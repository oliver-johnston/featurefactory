import { getToolIcon, getToolSummary } from './toolSummary.js'

interface Props {
  toolName: string
  input: Record<string, unknown>
  hasResult: boolean
  onClick: () => void
}

export function ToolOneLiner({ toolName, input, hasResult, onClick }: Props) {
  const icon = getToolIcon(toolName)
  const summary = getToolSummary(toolName, input)

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1 text-xs font-mono text-muted hover:text-subtext hover:bg-surface/50 transition-colors text-left group"
    >
      <span className="w-4 text-center shrink-0">{icon}</span>
      <span className="truncate">{summary}</span>
      <span className="ml-auto shrink-0">
        {hasResult ? (
          <span className="text-green">✓</span>
        ) : (
          <span className="w-3 h-3 border-2 border-muted border-t-transparent rounded-full animate-spin inline-block" />
        )}
      </span>
    </button>
  )
}
