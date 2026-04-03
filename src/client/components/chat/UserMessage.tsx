import { MessageSquare } from 'lucide-react'

interface Props {
  text: string
  quickActionLabel?: string
}

export function UserMessage({ text, quickActionLabel }: Props) {
  if (quickActionLabel) {
    return (
      <div className="mb-3">
        <div className="bg-surface/40 border-l-[3px] border-l-mauve text-text text-sm rounded-lg px-4 py-3">
          <details>
            <summary className="cursor-pointer select-none flex items-center gap-1.5 font-medium text-mauve">
              <MessageSquare size={14} />
              {quickActionLabel}
            </summary>
            <div className="mt-2 pt-2 border-t border-overlay text-text/80 whitespace-pre-wrap">
              {text}
            </div>
          </details>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3">
      <div className="bg-surface/40 border-l-[3px] border-l-indigo text-text text-sm rounded-lg px-4 py-3 whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )
}
