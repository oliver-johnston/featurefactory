import { useState, useEffect } from 'react'
import type { GitStatus as GitStatusType, QuickAction } from '../types.js'

interface Props {
  status: GitStatusType | null
  prs: string[]
  onSendMessage: (text: string) => void
}

const CATPPUCCIN_PALETTE = [
  { text: '#fff', bg: '#dc8a78', bgHover: '#c77d6d' }, // Rosewater
  { text: '#fff', bg: '#8839ef', bgHover: '#7a33d6' }, // Mauve
  { text: '#fff', bg: '#fe640b', bgHover: '#e55a0a' }, // Peach
  { text: '#fff', bg: '#40a02b', bgHover: '#399026' }, // Green
  { text: '#fff', bg: '#04a5e5', bgHover: '#0494cd' }, // Sky
  { text: '#fff', bg: '#ea76cb', bgHover: '#d36ab6' }, // Pink
  { text: '#fff', bg: '#209fb5', bgHover: '#1d8fa2' }, // Sapphire
  { text: '#fff', bg: '#7287fd', bgHover: '#6679e4' }, // Lavender
  { text: '#fff', bg: '#179299', bgHover: '#15838a' }, // Teal
  { text: '#fff', bg: '#dd7878', bgHover: '#c76c6c' }, // Flamingo
  { text: '#fff', bg: '#1e66f5', bgHover: '#1b5cdc' }, // Blue
]

export function QuickActions({ status, prs, onSendMessage }: Props) {
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

      {prs.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted uppercase tracking-wider font-semibold">Pull Requests</span>
          {prs.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo hover:underline truncate"
            >
              {url.replace(/^https?:\/\/[^/]+\//, '')}
            </a>
          ))}
        </div>
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
