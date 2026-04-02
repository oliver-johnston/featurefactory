import type { Session } from '../types.js'

interface Props {
  session: Session
  onClick: () => void
  selected?: boolean
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
        <span className="inline-flex px-2 py-0.5 rounded-full bg-surface text-xs text-muted font-mono truncate">{repoName}</span>
        <span className="text-xs text-subtle shrink-0">{timeAgo(session.created_at)}</span>
      </div>
    </div>
  )
}
