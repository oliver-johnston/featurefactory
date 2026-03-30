interface Props {
  input: Record<string, unknown>
  result?: string
}

export function BashExpanded({ input, result }: Props) {
  const command = String(input.command ?? '')
  return (
    <div className="bg-mantle rounded border border-overlay text-xs font-mono overflow-hidden">
      <div className="px-3 py-2 bg-surface/50 text-indigo-light border-b border-overlay">
        $ {command}
      </div>
      {result !== undefined && (
        <pre className="px-3 py-2 text-subtext whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
          {result}
        </pre>
      )}
    </div>
  )
}
