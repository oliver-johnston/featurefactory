// src/client/components/Sidebar.tsx
import { useState } from 'react'
import { Logo } from './Logo.js'
import { SessionCard } from './SessionCard.js'
import type { Session } from '../types.js'

interface Props {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (session: Session) => void
  onNewSession: () => void
  connected: boolean
  onOpenSettings: () => void
}

export function Sidebar({ sessions, selectedSessionId, onSelectSession, onNewSession, connected, onOpenSettings }: Props) {
  const [doneExpanded, setDoneExpanded] = useState(false)

  const activeSessions = sessions.filter(s => s.status !== 'done')
  const doneSessions = sessions.filter(s => s.status === 'done')

  return (
    <div className="flex flex-col h-full bg-bg border-r border-overlay">
      {/* Logo + title */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <Logo />
        <span className="font-bold text-base text-white">Feature Factory</span>
      </div>

      <div className="px-3 pb-3 border-b border-overlay">
        <button
          onClick={onNewSession}
          className="w-full bg-indigo border border-indigo text-white hover:brightness-90 transition-all rounded px-3 py-2 text-sm font-semibold"
        >
          + New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-0">
        {activeSessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            selected={session.id === selectedSessionId}
            onClick={() => onSelectSession(session)}
          />
        ))}

        {doneSessions.length > 0 && (
          <>
            <button
              onClick={() => setDoneExpanded(!doneExpanded)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted hover:text-text transition-colors"
            >
              <span className={`transition-transform ${doneExpanded ? 'rotate-90' : ''}`}>▶</span>
              <span>Done ({doneSessions.length})</span>
            </button>
            {doneExpanded && doneSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                selected={session.id === selectedSessionId}
                onClick={() => onSelectSession(session)}
              />
            ))}
          </>
        )}

        {activeSessions.length === 0 && doneSessions.length === 0 && (
          <div className="text-muted text-xs text-center mt-8">
            No sessions yet.
          </div>
        )}
      </div>

      {/* Bottom bar: connection status + settings */}
      <div className="px-3 py-2 border-t border-overlay flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded ${
          connected
            ? 'text-green bg-green/10'
            : 'text-red bg-red/10'
        }`}>
          {connected ? 'connected' : 'disconnected'}
        </span>
        <button
          onClick={onOpenSettings}
          className="text-muted hover:text-text transition-colors p-1"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
