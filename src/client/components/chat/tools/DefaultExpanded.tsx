interface Props {
  toolName: string
  input: Record<string, unknown>
  result?: string
}

export function DefaultExpanded({ toolName, input, result }: Props) {
  return (
    <div className="bg-mantle rounded border border-overlay text-xs font-mono overflow-hidden">
      <div className="px-3 py-1.5 bg-surface/50 text-indigo-light font-semibold border-b border-overlay">
        {toolName}
      </div>
      <div className="px-3 py-2">
        <pre className="text-subtext whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(input, null, 2)}
        </pre>
      </div>
      {result !== undefined && (
        <pre className="px-3 py-2 border-t border-overlay text-subtext whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
          {result}
        </pre>
      )}
    </div>
  )
}
