import { useState, useEffect } from 'react'
import type { Settings, SettingsModelOption, QuickAction } from '../types.js'

type SettingsTab = 'models' | 'quickActions' | 'github'

interface Props {
  onClose: () => void
  onSettingsSaved?: () => void
}

export function SettingsModal({ onClose, onSettingsSaved }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('models')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add model form state
  const [showAddModel, setShowAddModel] = useState(false)
  const [newModelProvider, setNewModelProvider] = useState('anthropic')
  const [newModelId, setNewModelId] = useState('')
  const [newModelLabel, setNewModelLabel] = useState('')

  // Add quick action form state
  const [showAddAction, setShowAddAction] = useState(false)
  const [newActionLabel, setNewActionLabel] = useState('')
  const [newActionMessage, setNewActionMessage] = useState('')

  // Edit quick action state
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null)
  const [editActionLabel, setEditActionLabel] = useState('')
  const [editActionMessage, setEditActionMessage] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Settings) => { setSettings(s); setLoading(false) })
      .catch(e => { setError((e as Error).message); setLoading(false) })
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to save settings')
      }
      onSettingsSaved?.()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // --- Model helpers ---
  const toggleModel = (provider: string, id: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      models: {
        ...settings.models,
        available: settings.models.available.map(m =>
          m.provider === provider && m.id === id ? { ...m, enabled: !m.enabled } : m
        ),
      },
    })
  }

  const setDefaultModel = (provider: string, id: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      models: { ...settings.models, default: { provider, id } },
    })
  }

  const addModel = () => {
    if (!settings || !newModelId.trim() || !newModelLabel.trim()) return
    const model: SettingsModelOption = {
      provider: newModelProvider,
      id: newModelId.trim(),
      label: newModelLabel.trim(),
      enabled: true,
      custom: true,
    }
    setSettings({
      ...settings,
      models: { ...settings.models, available: [...settings.models.available, model] },
    })
    setNewModelId('')
    setNewModelLabel('')
    setShowAddModel(false)
  }

  const deleteModel = (provider: string, id: string) => {
    if (!settings) return
    const isDefault = settings.models.default.provider === provider && settings.models.default.id === id
    const filtered = settings.models.available.filter(m => !(m.provider === provider && m.id === id))
    setSettings({
      ...settings,
      models: {
        available: filtered,
        default: isDefault ? { provider: filtered[0]?.provider ?? '', id: filtered[0]?.id ?? '' } : settings.models.default,
      },
    })
  }

  // --- Quick action helpers ---
  const addAction = () => {
    if (!settings || !newActionLabel.trim() || !newActionMessage.trim()) return
    const action: QuickAction = { label: newActionLabel.trim(), message: newActionMessage.trim() }
    setSettings({ ...settings, quickActions: [...settings.quickActions, action] })
    setNewActionLabel('')
    setNewActionMessage('')
    setShowAddAction(false)
  }

  const deleteAction = (index: number) => {
    if (!settings) return
    setSettings({ ...settings, quickActions: settings.quickActions.filter((_, i) => i !== index) })
  }

  const moveAction = (index: number, direction: -1 | 1) => {
    if (!settings) return
    const target = index + direction
    if (target < 0 || target >= settings.quickActions.length) return
    const actions = [...settings.quickActions]
    ;[actions[index], actions[target]] = [actions[target], actions[index]]
    setSettings({ ...settings, quickActions: actions })
  }

  const startEditAction = (index: number) => {
    if (!settings) return
    setEditingActionIndex(index)
    setEditActionLabel(settings.quickActions[index].label)
    setEditActionMessage(settings.quickActions[index].message)
  }

  const saveEditAction = () => {
    if (!settings || editingActionIndex === null) return
    if (!editActionLabel.trim() || !editActionMessage.trim()) return
    const actions = [...settings.quickActions]
    actions[editingActionIndex] = { label: editActionLabel.trim(), message: editActionMessage.trim() }
    setSettings({ ...settings, quickActions: actions })
    setEditingActionIndex(null)
  }

  const cancelEditAction = () => {
    setEditingActionIndex(null)
  }

  // --- Group models by provider ---
  const modelsByProvider: Record<string, SettingsModelOption[]> = {}
  if (settings) {
    for (const m of settings.models.available) {
      if (!modelsByProvider[m.provider]) modelsByProvider[m.provider] = []
      modelsByProvider[m.provider].push(m)
    }
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'models', label: 'Models' },
    { id: 'quickActions', label: 'Quick Actions' },
    { id: 'github', label: 'GitHub' },
  ]

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-overlay rounded-lg w-full max-w-2xl h-[480px] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-overlay">
          <h2 className="text-text text-base font-semibold">Settings</h2>
        </div>

        {/* Body: tabs + content */}
        <div className="flex flex-1 min-h-0">
          {/* Left: tab list */}
          <div className="w-40 shrink-0 border-r border-overlay py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-text bg-indigo/15 border-r-2 border-indigo'
                    : 'text-muted hover:text-text hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: tab content */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            {loading ? (
              <div className="text-muted text-sm">Loading settings…</div>
            ) : activeTab === 'models' && settings ? (
              /* ---- Models Tab ---- */
              <div>
                {Object.entries(modelsByProvider).map(([provider, models]) => (
                  <div key={provider} className="mb-5">
                    <h3 className="text-xs text-muted uppercase tracking-wider mb-2 font-semibold">{provider}</h3>
                    <div className="flex flex-col gap-1">
                      {models.map(m => {
                        const isDefault = settings.models.default.provider === m.provider && settings.models.default.id === m.id
                        return (
                          <div key={`${m.provider}-${m.id}`} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/5 group">
                            {/* Toggle */}
                            <button
                              onClick={() => toggleModel(m.provider, m.id)}
                              className={`w-8 h-4.5 rounded-full relative transition-colors ${m.enabled ? 'bg-indigo' : 'bg-overlay'}`}
                            >
                              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${m.enabled ? 'left-4' : 'left-0.5'}`} />
                            </button>
                            {/* Label + ID */}
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${m.enabled ? 'text-text' : 'text-muted'}`}>{m.label}</span>
                              <span className="text-xs text-muted ml-2 font-mono">{m.id}</span>
                            </div>
                            {/* Default star */}
                            <button
                              onClick={() => setDefaultModel(m.provider, m.id)}
                              className={`text-sm ${isDefault ? 'text-yellow' : 'text-overlay hover:text-muted'} transition-colors`}
                              title={isDefault ? 'Default model' : 'Set as default'}
                            >
                              {isDefault ? '★' : '☆'}
                            </button>
                            {/* Delete (custom only) */}
                            {m.custom && (
                              <button
                                onClick={() => deleteModel(m.provider, m.id)}
                                className="text-xs text-red/60 hover:text-red opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Add model form */}
                {showAddModel ? (
                  <div className="border border-overlay rounded p-3 mt-2">
                    <div className="flex gap-2 mb-2">
                      <select
                        className="bg-mantle border border-overlay rounded text-text text-sm px-2 py-1.5"
                        value={newModelProvider}
                        onChange={e => setNewModelProvider(e.target.value)}
                      >
                        <option value="anthropic">anthropic</option>
                        <option value="openai">openai</option>
                      </select>
                      <input
                        className="flex-1 bg-mantle border border-overlay rounded text-text text-sm px-2 py-1.5"
                        placeholder="Model ID"
                        value={newModelId}
                        onChange={e => setNewModelId(e.target.value)}
                      />
                    </div>
                    <input
                      className="w-full bg-mantle border border-overlay rounded text-text text-sm px-2 py-1.5 mb-2"
                      placeholder="Display label"
                      value={newModelLabel}
                      onChange={e => setNewModelLabel(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addModel}
                        disabled={!newModelId.trim() || !newModelLabel.trim()}
                        className="bg-indigo/20 border border-indigo/40 text-indigo hover:bg-indigo/30 disabled:opacity-40 transition-colors rounded px-3 py-1 text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddModel(false)}
                        className="text-muted hover:text-text text-sm px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddModel(true)}
                    className="text-sm text-indigo hover:text-indigo-light transition-colors"
                  >
                    + Add model
                  </button>
                )}
              </div>
            ) : activeTab === 'quickActions' && settings ? (
              /* ---- Quick Actions Tab ---- */
              <div>
                <div className="flex flex-col gap-1.5">
                  {settings.quickActions.map((action, i) => (
                    <div key={i}>
                      {editingActionIndex === i ? (
                        /* Edit mode */
                        <div className="border border-overlay rounded p-3">
                          <input
                            className="w-full bg-mantle border border-overlay rounded text-text text-sm px-2 py-1.5 mb-2"
                            placeholder="Button label"
                            value={editActionLabel}
                            onChange={e => setEditActionLabel(e.target.value)}
                          />
                          <textarea
                            className="w-full bg-mantle border border-overlay rounded text-text text-sm px-2 py-1.5 mb-2 resize-none"
                            placeholder="Chat message"
                            value={editActionMessage}
                            onChange={e => setEditActionMessage(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveEditAction}
                              disabled={!editActionLabel.trim() || !editActionMessage.trim()}
                              className="bg-indigo/20 border border-indigo/40 text-indigo hover:bg-indigo/30 disabled:opacity-40 transition-colors rounded px-3 py-1 text-sm"
                            >
                              Save
                            </button>
                            <button onClick={cancelEditAction} className="text-muted hover:text-text text-sm px-2">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 group">
                          {/* Reorder arrows */}
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveAction(i, -1)}
                              disabled={i === 0}
                              className="text-xs text-muted hover:text-text disabled:opacity-30 leading-none"
                            >▲</button>
                            <button
                              onClick={() => moveAction(i, 1)}
                              disabled={i === settings.quickActions.length - 1}
                              className="text-xs text-muted hover:text-text disabled:opacity-30 leading-none"
                            >▼</button>
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-text">{action.label}</div>
                            <div className="text-xs text-muted truncate">{action.message}</div>
                          </div>
                          {/* Edit + Delete */}
                          <button
                            onClick={() => startEditAction(i)}
                            className="text-xs text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAction(i)}
                            className="text-xs text-red/60 hover:text-red opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add action form */}
                {showAddAction ? (
                  <div className="border border-overlay rounded p-3 mt-3">
                    <input
                      className="w-full bg-mantle border border-overlay rounded text-text text-sm px-2 py-1.5 mb-2"
                      placeholder="Button label"
                      value={newActionLabel}
                      onChange={e => setNewActionLabel(e.target.value)}
                    />
                    <textarea
                      className="w-full bg-mantle border border-overlay rounded text-text text-sm px-2 py-1.5 mb-2 resize-none"
                      placeholder="Chat message to send"
                      value={newActionMessage}
                      onChange={e => setNewActionMessage(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addAction}
                        disabled={!newActionLabel.trim() || !newActionMessage.trim()}
                        className="bg-indigo/20 border border-indigo/40 text-indigo hover:bg-indigo/30 disabled:opacity-40 transition-colors rounded px-3 py-1 text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddAction(false)}
                        className="text-muted hover:text-text text-sm px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddAction(true)}
                    className="text-sm text-indigo hover:text-indigo-light transition-colors mt-3"
                  >
                    + Add action
                  </button>
                )}
              </div>
            ) : activeTab === 'github' && settings ? (
              /* ---- GitHub Tab ---- */
              <div>
                <h3 className="text-xs text-muted uppercase tracking-wider mb-2 font-semibold">GitHub Hosts</h3>
                <p className="text-xs text-muted mb-2">One host per line. PR URLs from these hosts will be auto-detected. Default: github.com</p>
                <textarea
                  className="w-full bg-mantle border border-overlay rounded text-text text-sm px-2 py-1.5 resize-none font-mono"
                  rows={5}
                  value={settings.githubHosts.join('\n')}
                  onChange={e => {
                    const hosts = e.target.value.split('\n').map(h => h.trim()).filter(Boolean)
                    setSettings({ ...settings, githubHosts: hosts.length > 0 ? hosts : ['github.com'] })
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-overlay flex items-center justify-between">
          {error && <p className="text-red text-xs flex-1">{error}</p>}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="bg-transparent border border-overlay text-muted hover:text-text hover:border-muted transition-colors rounded px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-indigo hover:bg-indigo-light disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors rounded px-4 py-2 text-sm font-semibold"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
