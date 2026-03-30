import { useState, useEffect } from 'react'
import type { GitStatus as GitStatusType, QuickAction } from '../types.js'

interface Props {
  status: GitStatusType | null
  onSendMessage: (text: string) => void
}

export function QuickActions({ status, onSendMessage }: Props) {
  const [actions, setActions] = useState<QuickAction[]>([])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => setActions(s.quickActions ?? []))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {status && (
        <>
          <div className="text-xs text-muted">
            commits: {status.ahead} ahead, {status.behind} behind main
            {(status.uncommitted > 0 || status.untracked > 0) && (
              <> · {status.uncommitted > 0 && `${status.uncommitted} uncommitted`}{status.uncommitted > 0 && status.untracked > 0 && ', '}{status.untracked > 0 && `${status.untracked} untracked`}</>
            )}
          </div>

          {(status.uncommitted > 0 || status.untracked > 0) && (
            <div className="text-xs text-yellow bg-yellow/10 border border-yellow/30 rounded px-2 py-1">
              Uncommitted changes detected — the AI may not have committed its work
            </div>
          )}
        </>
      )}

      {actions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(action.message)}
              className="w-full bg-indigo/20 border border-indigo/40 text-indigo hover:bg-indigo/30 transition-colors rounded px-3 py-2 text-sm font-medium text-left"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
