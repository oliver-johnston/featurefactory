import { useState } from 'react'
import { ToolOneLiner } from './ToolOneLiner.js'
import { BashExpanded } from './BashExpanded.js'
import { EditExpanded } from './EditExpanded.js'
import { ReadExpanded } from './ReadExpanded.js'
import { GrepExpanded } from './GrepExpanded.js'
import { DefaultExpanded } from './DefaultExpanded.js'

interface Props {
  toolName: string
  input: Record<string, unknown>
  result?: string
}

function ExpandedView({ toolName, input, result }: Props) {
  switch (toolName) {
    case 'Bash':
      return <BashExpanded input={input} result={result} />
    case 'Edit':
      return <EditExpanded input={input} result={result} />
    case 'Read':
    case 'Write':
      return <ReadExpanded input={input} result={result} />
    case 'Grep':
      return <GrepExpanded input={input} result={result} />
    default:
      return <DefaultExpanded toolName={toolName} input={input} result={result} />
  }
}

export function ToolBlock({ toolName, input, result }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-0.5">
      <ToolOneLiner
        toolName={toolName}
        input={input}
        hasResult={result !== undefined}
        onClick={() => setExpanded(o => !o)}
      />
      {expanded && (
        <div className="ml-6 mr-2 mt-1 mb-2">
          <ExpandedView toolName={toolName} input={input} result={result} />
        </div>
      )}
    </div>
  )
}
