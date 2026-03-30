import { useState, useEffect } from 'react'
import type { GitStatus as GitStatusType, QuickAction } from '../types.js'

interface Props {
  status: GitStatusType | null
  onSendMessage: (text: string) => void
}

const CATPPUCCIN_PALETTE = [
  { text: '#1e1e2e', bg: '#f5e0dc', bgHover: '#edd4cf', border: '#e8c9c4' }, // Rosewater
  { text: '#1e1e2e', bg: '#cba6f7', bgHover: '#b98ef5', border: '#b486e8' }, // Mauve
  { text: '#1e1e2e', bg: '#fab387', bgHover: '#f9a06d', border: '#e89a6e' }, // Peach
  { text: '#1e1e2e', bg: '#a6e3a1', bgHover: '#90d98a', border: '#88cc83' }, // Green
  { text: '#1e1e2e', bg: '#89dceb', bgHover: '#6fd3e6', border: '#6ac5d6' }, // Sky
  { text: '#1e1e2e', bg: '#f5c2e7', bgHover: '#f1ade0', border: '#e6a5d6' }, // Pink
  { text: '#1e1e2e', bg: '#74c7ec', bgHover: '#5bbce8', border: '#5ab0d8' }, // Sapphire
  { text: '#1e1e2e', bg: '#b4befe', bgHover: '#9da9fd', border: '#969fef' }, // Lavender
  { text: '#1e1e2e', bg: '#94e2d5', bgHover: '#7ddacc', border: '#78ccbf' }, // Teal
  { text: '#1e1e2e', bg: '#f2cdcd', bgHover: '#ecbaba', border: '#e0b2b2' }, // Flamingo
  { text: '#1e1e2e', bg: '#89b4fa', bgHover: '#70a3f8', border: '#6b99e8' }, // Blue
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
