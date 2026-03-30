import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ThinkingBlock } from './ThinkingBlock.js'
import { ToolGroup } from './tools/ToolGroup.js'
import { FactoryAnimation } from './FactoryAnimation.js'
import type { ChatContentBlock } from '../../types.js'

interface Props {
  blocks: ChatContentBlock[]
  toolResults: Map<string, string>
  streaming: boolean
  thinkingSeconds?: number
  waitingForInput?: boolean
}

export function AssistantMessage({ blocks, toolResults, streaming, thinkingSeconds, waitingForInput }: Props) {
  if (blocks.length === 0 && streaming) {
    return (
      <div className="mb-3">
        <FactoryAnimation />
      </div>
    )
  }

  // Group consecutive blocks by type for visual grouping
  const groups: { kind: 'tool' | 'other'; blocks: { block: ChatContentBlock; index: number }[] }[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const kind = block.type === 'tool_use' ? 'tool' : 'other'
    const lastGroup = groups.at(-1)
    if (lastGroup && lastGroup.kind === kind) {
      lastGroup.blocks.push({ block, index: i })
    } else {
      groups.push({ kind, blocks: [{ block, index: i }] })
    }
  }

  return (
    <div className="mb-3">
      {groups.map((group, gi) => {
        if (group.kind === 'tool') {
          const toolEntries = group.blocks
            .filter((e): e is { block: ChatContentBlock & { type: 'tool_use' }; index: number } => e.block.type === 'tool_use')
          return (
            <ToolGroup key={gi} tools={toolEntries} toolResults={toolResults} />
          )
        }

        return group.blocks.map(({ block, index }) => {
          if (block.type === 'thinking') {
            return <ThinkingBlock key={index} thinking={block.thinking} durationSeconds={thinkingSeconds} streaming={streaming} />
          }
          if (block.type === 'meta') {
            return (
              <div key={index} className="mb-2 rounded-lg border border-overlay bg-surface/60 px-3 py-2 text-sm text-muted">
                <div className="font-mono text-xs uppercase tracking-wide text-subtle">{block.label}</div>
                {block.content && (
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-text">{block.content}</pre>
                )}
              </div>
            )
          }
          if (block.type === 'text' && block.text) {
            return (
              <div key={index} className="prose prose-sm prose-invert max-w-none text-text">
                <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-light underline hover:text-indigo">
                      {children}
                    </a>
                  ),
                }}
              >{block.text}</ReactMarkdown>
              </div>
            )
          }
          return null
        })
      })}
      {(streaming || waitingForInput) && (
        <div className={blocks.length > 0 ? 'mt-2' : ''}>
          <FactoryAnimation className="ml-1" slow={!streaming && waitingForInput} />
        </div>
      )}
    </div>
  )
}
