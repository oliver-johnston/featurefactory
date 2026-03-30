import { useState, useEffect } from 'react'
import type { GitStatus as GitStatusType, QuickAction } from '../types.js'

interface Props {
  status: GitStatusType | null
  onSendMessage: (text: string) => void
}

// Catppuccin Mocha colors blended ~50% with background (#1e1e2e) for muted solid buttons
const CATPPUCCIN_PALETTE = [
  { text: '#f5e0dc', bg: '#897f85', bgHover: '#9a8f94', border: '#6b6367' }, // Rosewater
  { text: '#cba6f7', bg: '#756293', bgHover: '#856fa6', border: '#5d4e76' }, // Mauve
  { text: '#fab387', bg: '#8c695b', bgHover: '#9e7768', border: '#6e5348' }, // Peach
  { text: '#a6e3a1', bg: '#628168', bgHover: '#729478', border: '#4e6753' }, // Green
  { text: '#89dceb', bg: '#547d8d', bgHover: '#618e9f', border: '#43636f' }, // Sky
  { text: '#f5c2e7', bg: '#8a708b', bgHover: '#9b7f9c', border: '#6c586d' }, // Pink
  { text: '#74c7ec', bg: '#49738d', bgHover: '#54839f', border: '#3a5b6f' }, // Sapphire
  { text: '#b4befe', bg: '#696e96', bgHover: '#777daa', border: '#535777' }, // Lavender
  { text: '#94e2d5', bg: '#598082', bgHover: '#679293', border: '#466567' }, // Teal
  { text: '#f2cdcd', bg: '#88767e', bgHover: '#99858d', border: '#6b5d63' }, // Flamingo
  { text: '#89b4fa', bg: '#546994', bgHover: '#6078a8', border: '#435376' }, // Blue
]

export function QuickActions({ status, onSendMessage }: Props) {
  const [actions, setActions] = useState<QuickAction[]>([])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

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
          {actions.map((action, i) => {
            const palette = CATPPUCCIN_PALETTE[i % CATPPUCCIN_PALETTE.length]
            return (
              <button
                key={i}
                onClick={() => onSendMessage(action.message)}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="w-full transition-colors rounded px-3 py-2 text-sm font-medium text-center"
                style={{
                  color: palette.text,
                  backgroundColor: hoveredIndex === i ? palette.bgHover : palette.bg,
                  border: `1px solid ${palette.border}`,
                }}
              >
                💬 {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
