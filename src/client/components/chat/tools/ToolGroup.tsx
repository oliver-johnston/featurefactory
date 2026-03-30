import { useState } from 'react'
import { ToolBlock } from './ToolBlock.js'
import type { ChatContentBlock } from '../../../types.js'

const MAX_VISIBLE = 5

interface ToolEntry {
  block: ChatContentBlock & { type: 'tool_use' }
  index: number
}

interface Props {
  tools: ToolEntry[]
  toolResults: Map<string, string>
}

export function ToolGroup({ tools, toolResults }: Props) {
  const [expanded, setExpanded] = useState(false)
  const hiddenCount = tools.length - MAX_VISIBLE
  const shouldCollapse = hiddenCount > 0
  const visibleTools = shouldCollapse && !expanded ? tools.slice(-MAX_VISIBLE) : tools
  const hiddenTools = shouldCollapse && expanded ? tools.slice(0, hiddenCount) : []

  return (
    <div className="border-l-2 border-overlay my-2 py-1">
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(o => !o)}
          className="w-full flex items-center gap-2 px-3 py-1 text-xs font-mono text-muted hover:text-subtext hover:bg-surface/50 transition-colors text-left"
        >
          <span className="w-4 text-center shrink-0">{expanded ? '▾' : '▸'}</span>
          <span>{expanded ? `Hide ${hiddenCount} tools` : `${hiddenCount} more tools`}</span>
        </button>
      )}
      {expanded && hiddenTools.map(({ block, index }) => (
        block.name === 'TodoWrite' ? (
          <div key={index} className="flex items-center gap-2 px-3 py-1 text-xs font-mono text-muted">
            <span className="w-4 text-center">✓</span>
            <span>Updated tasks</span>
          </div>
        ) : (
          <ToolBlock
            key={index}
            toolName={block.name}
            input={block.input}
            result={toolResults.get(block.id)}
          />
        )
      ))}
      {visibleTools.map(({ block, index }) => (
        block.name === 'TodoWrite' ? (
          <div key={index} className="flex items-center gap-2 px-3 py-1 text-xs font-mono text-muted">
            <span className="w-4 text-center">✓</span>
            <span>Updated tasks</span>
          </div>
        ) : (
          <ToolBlock
            key={index}
            toolName={block.name}
            input={block.input}
            result={toolResults.get(block.id)}
          />
        )
      ))}
    </div>
  )
}
