import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Logo } from './components/Logo.js'
import { SessionCard } from './components/SessionCard.js'
import { Sidebar } from './components/Sidebar.js'
import { NewSessionModal } from './components/NewSessionModal.js'
import { SettingsModal } from './components/SettingsModal.js'
import { SessionDetail } from './components/SessionDetail.js'
import { useSessionSocket } from './hooks/useTaskSocket.js'
import type { ModelOption, Session, Settings } from './types.js'

type ModelOptionsByProvider = Record<string, ModelOption[]>

export function App() {
  const { sessions, connected, subscribeToSession, sendChatMessage, sendStopMessage, sendQueueAdd, sendQueueRemove, sendQueueForceSend, createSession, markDone, setOnHold, getGitStatusForSession } = useSessionSocket()
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showNewSession, setShowNewSession] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [modelOptions, setModelOptions] = useState<ModelOptionsByProvider | null>(null)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [defaultModel, setDefaultModel] = useState<{ provider: string; id: string } | null>(null)

  const loadModels = () => {
    fetch('/api/settings')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(body.error ?? 'Failed to load settings')
        }
        return body as Settings
      })
      .then(settings => {
        const byProvider: ModelOptionsByProvider = {}
        for (const m of settings.models.available) {
          if (!m.enabled) continue
          if (!byProvider[m.provider]) byProvider[m.provider] = []
          byProvider[m.provider].push({ id: m.id, label: m.label })
        }
        setModelOptions(byProvider)
        setDefaultModel(settings.models.default)
      })
      .catch((error: Error) => {
        setModelsError(error.message)
      })
  }

  useEffect(() => {
    loadModels()
  }, [])

  const currentSession = selectedSession
    ? sessions.find(s => s.id === selectedSession.id) ?? selectedSession
    : null

  return (
    <div className="bg-bg text-text font-sans flex flex-col overflow-hidden" style={{ height: 'var(--app-height, 100vh)' }}>
      {/* Mobile header (no desktop header — logo/title live in sidebar now) */}
      <header className="sm:hidden px-4 py-3 border-b border-overlay flex items-center gap-3 shrink-0">
        <Logo />
        <span className="font-bold text-base text-white">Feature Factory</span>
        <button
          onClick={() => setShowNewSession(true)}
          className="ml-auto bg-indigo border border-indigo text-white hover:brightness-90 transition-all rounded px-3 py-1 text-xs font-semibold"
        >
          + New Session
        </button>
      </header>

      {/* Main layout area */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Sidebar — desktop only */}
        <div className="hidden sm:block w-80 shrink-0">
          <Sidebar
            sessions={sessions}
            selectedSessionId={selectedSession?.id ?? null}
            onSelectSession={setSelectedSession}
            onNewSession={() => setShowNewSession(true)}
            connected={connected}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>

        {/* Content area: session detail OR session list (mobile) / empty state (desktop) */}
        {currentSession ? (
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <SessionDetail
              session={currentSession}
              onClose={() => setSelectedSession(null)}
              onMarkDone={async () => {
                await markDone(selectedSession!.id)
                setSelectedSession(null)
              }}
              onSetOnHold={async () => {
                await setOnHold(selectedSession!.id)
              }}
              subscribeToSession={subscribeToSession}
              sendChatMessage={sendChatMessage}
              sendStopMessage={sendStopMessage}
              sendQueueAdd={sendQueueAdd}
              sendQueueRemove={sendQueueRemove}
              sendQueueForceSend={sendQueueForceSend}
              gitStatus={getGitStatusForSession(selectedSession!.id)}
            />
          </div>
        ) : (
          <>
            {/* Mobile: session list */}
            <main className="sm:hidden p-4 flex-1">
              {sessions.length === 0 ? (
                <div className="text-muted text-sm mt-10 text-center">
                  No active sessions.{' '}
                  <span
                    onClick={() => setShowNewSession(true)}
                    className="text-indigo cursor-pointer underline"
                  >
                    Start one
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onClick={() => setSelectedSession(session)}
                    />
                  ))}
                </div>
              )}
            </main>

            {/* Desktop: empty state */}
            <div className="hidden sm:flex flex-1 items-center justify-center">
              <div className="text-center">
                <Logo width={112} height={98} className="mx-auto" />
                <p className="text-muted text-xl mt-6">Select a session to get started</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Session Modal */}
      {showNewSession && (
        <NewSessionModal
          modelOptions={modelOptions}
          modelsError={modelsError}
          defaultModel={defaultModel}
          onCreated={createSession}
          onClose={() => setShowNewSession(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSettingsSaved={loadModels}
        />
      )}

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  )
}
