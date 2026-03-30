interface Props {
  input: Record<string, unknown>
  result?: string
}

export function GrepExpanded({ input, result }: Props) {
  const pattern = String(input.pattern ?? '')
  const glob = input.glob ? String(input.glob) : undefined

  return (
    <div className="bg-mantle rounded border border-overlay text-xs font-mono overflow-hidden">
      <div className="px-3 py-1.5 bg-surface/50 text-muted border-b border-overlay">
        grep "{pattern}"{glob ? ` ${glob}` : ''}
      </div>
      {result !== undefined && (
        <pre className="px-3 py-2 text-subtext whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
          {result}
        </pre>
      )}
    </div>
  )
}
