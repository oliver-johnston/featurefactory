import { Badge } from '@workspace/ui'
import type { Session } from '../types.js'

interface Props {
  session: Session
  onClick: () => void
  selected?: boolean
}

const CATPPUCCIN_COLORS = [
  { bg: 'rgba(203,166,247,0.15)', text: '#cba6f7' }, // mauve
  { bg: 'rgba(137,220,235,0.15)', text: '#89dceb' }, // sky
  { bg: 'rgba(166,227,161,0.15)', text: '#a6e3a1' }, // green
  { bg: 'rgba(249,226,175,0.15)', text: '#f9e2af' }, // yellow
  { bg: 'rgba(243,139,168,0.15)', text: '#f38ba8' }, // red
  { bg: 'rgba(245,194,231,0.15)', text: '#f5c2e7' }, // pink
  { bg: 'rgba(148,226,213,0.15)', text: '#94e2d5' }, // teal
  { bg: 'rgba(250,179,135,0.15)', text: '#fab387' }, // peach
  { bg: 'rgba(137,180,250,0.15)', text: '#89b4fa' }, // blue
  { bg: 'rgba(180,190,254,0.15)', text: '#b4befe' }, // lavender
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function repoColor(name: string) {
  return CATPPUCCIN_COLORS[hashString(name) % CATPPUCCIN_COLORS.length]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function SessionCard({ session, onClick, selected = false }: Props) {
  const repoName = session.repos.map(r => r.split('/').pop() ?? r).join(', ')
  const pillColor = repoColor(repoName)
  const needsAttention =
    session.status !== 'on_hold' && (
      session.sessionState === 'waiting_for_input' ||
      session.sessionState === 'needs_permission'
    )

  return (
    <div
      onClick={onClick}
      className={[
        'cursor-pointer transition-colors p-2',
        'w-full shrink-0',
        selected
          ? 'bg-indigo/10'
          : needsAttention
          ? 'animate-needs-attention'
          : 'hover:bg-surface',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={[
          'w-2 h-2 rounded-full shrink-0',
          session.sessionState === 'running'
            ? 'bg-yellow animate-pulse'
            : session.status === 'on_hold'
            ? 'bg-yellow'
            : session.status === 'active'
            ? 'bg-green'
            : 'bg-muted',
        ].join(' ')} />
        <span className="text-sm text-text truncate">{session.title}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <Badge className="font-mono truncate" style={{ backgroundColor: pillColor.bg, color: pillColor.text }}>{repoName}</Badge>
        <span className="text-xs text-subtle shrink-0">{timeAgo(session.created_at)}</span>
      </div>
    </div>
  )
}
