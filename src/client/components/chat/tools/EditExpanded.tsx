interface Props {
  input: Record<string, unknown>
  result?: string
}

export function EditExpanded({ input, result }: Props) {
  const filePath = String(input.file_path ?? '')
  const oldStr = String(input.old_string ?? '')
  const newStr = String(input.new_string ?? '')
  const fileName = filePath.replace(/^\//, '')

  return (
    <div className="bg-mantle rounded border border-overlay text-xs font-mono overflow-hidden">
      <div className="px-3 py-1.5 bg-surface/50 text-muted border-b border-overlay">
        {fileName}
      </div>
      <div className="px-3 py-2 overflow-x-auto max-h-48 overflow-y-auto">
        {oldStr && (
          <pre className="text-red/80 whitespace-pre-wrap">
            {oldStr.split('\n').map((line, i) => (
              <div key={i}>- {line}</div>
            ))}
          </pre>
        )}
        {newStr && (
          <pre className="text-green/80 whitespace-pre-wrap">
            {newStr.split('\n').map((line, i) => (
              <div key={i}>+ {line}</div>
            ))}
          </pre>
        )}
      </div>
      {result !== undefined && (
        <div className="px-3 py-1.5 border-t border-overlay text-green text-xs">
          {result}
        </div>
      )}
    </div>
  )
}
