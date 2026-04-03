import { useState, useEffect } from 'react'
import type { ModelOption, ModelProvider } from '../types.js'
import { Select } from './Select'

interface RepoDetection {
  isSingleRepo: boolean
  repos: string[]
}

type ModelOptionsByProvider = Record<string, ModelOption[]>

function pickDefaultCombined(options: ModelOptionsByProvider, defaultModel?: { provider: string; id: string } | null): string {
  if (defaultModel) {
    const models = options[defaultModel.provider] ?? []
    if (models.some(m => m.id === defaultModel.id)) {
      return `${defaultModel.provider}/${defaultModel.id}`
    }
  }
  if (options['anthropic']?.length) return `anthropic/${options['anthropic'][0].id}`
  const firstProvider = Object.keys(options)[0]
  if (firstProvider && options[firstProvider].length) return `${firstProvider}/${options[firstProvider][0].id}`
  return ''
}

interface Props {
  modelOptions: ModelOptionsByProvider | null
  modelsError: string | null
  defaultModel?: { provider: string; id: string } | null
  onCreated: (title: string, repos: string[], provider: ModelProvider, model: string, workflow: 'free' | 'quick' | 'full' | 'debug') => Promise<unknown>
  onClose: () => void
}

export function NewSessionModal({ modelOptions, modelsError, defaultModel, onCreated, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [workflow, setWorkflow] = useState<'free' | 'quick' | 'full' | 'debug'>('full')
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [providerOptions, setProviderOptions] = useState<ModelOptionsByProvider>({})
  const [combined, setCombined] = useState('')
  const [repos, setRepos] = useState<RepoDetection | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRepos = (url: string) => {
    fetch(url)
      .then(r => r.json())
      .then((d: RepoDetection) => {
        setRepos(d)
        if (d.repos.length === 1) setSelectedRepos(d.repos)
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadRepos('/api/repos')
  }, [])

  const handleRefreshRepos = () => {
    setRefreshing(true)
    fetch('/api/repos/refresh', { method: 'POST' })
      .then(r => r.json())
      .then((d: RepoDetection) => {
        setRepos(d)
        if (d.repos.length === 1) setSelectedRepos(d.repos)
      })
      .catch(() => {})
      .finally(() => setRefreshing(false))
  }

  useEffect(() => {
    if (modelsError) {
      setError(modelsError)
      return
    }
    if (!modelOptions) return

    if (Object.keys(modelOptions).length === 0) {
      setError('OpenCode returned no models')
      return
    }

    setProviderOptions(modelOptions)
    setCombined(current => current || pickDefaultCombined(modelOptions, defaultModel))
  }, [modelOptions, modelsError])

  const loadingModels = !modelOptions && !modelsError

  const handleSubmit = async () => {
    if (loadingModels) { setError('Models are still loading'); return }
    if (!combined) { setError('Model is required'); return }
    const slashIdx = combined.indexOf('/')
    const provider = combined.substring(0, slashIdx)
    const model = combined.substring(slashIdx + 1)
    if (!provider || !model) { setError('Model is required'); return }
    if (workflow !== 'free') {
      if (!title.trim()) { setError('Title is required'); return }
      if (selectedRepos.length === 0) { setError('Select at least one repository'); return }
    }
    setSubmitting(true)
    setError(null)
    try {
      const effectiveTitle = workflow !== 'free' ? title.trim() : ''
      const effectiveRepos = workflow !== 'free' ? selectedRepos : []
      await onCreated(effectiveTitle, effectiveRepos, provider, model, workflow)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const allModels: { value: string; label: string }[] = []
  for (const [prov, models] of Object.entries(providerOptions)) {
    for (const m of models) {
      allModels.push({ value: `${prov}/${m.id}`, label: `${prov}/${m.id}` })
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4"
    >
      <div
        className="bg-surface border border-overlay rounded-lg p-7 w-full max-w-xl"
      >
        <h2 className="text-text text-base font-semibold mb-5">New Session</h2>

        <div className="mb-5">
          <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Workflow *</label>
          <div className="grid grid-cols-4 gap-3">
            {([
              {
                id: 'free' as const,
                label: 'Free',
                desc: 'Open session in your working directory',
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                ),
              },
              {
                id: 'quick' as const,
                label: 'Quick',
                desc: 'Explore, plan, approve, implement',
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                ),
              },
              {
                id: 'full' as const,
                label: 'Full',
                desc: 'Brainstorm, design, plan, implement',
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="3" x2="6" y2="15" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="M18 9a9 9 0 0 1-9 9" />
                  </svg>
                ),
              },
              {
                id: 'debug' as const,
                label: 'Debug',
                desc: 'Systematic debugging with superpowers',
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v1h4" />
                    <path d="M18 8h-2V6a4 4 0 0 0-4-4" />
                    <rect x="8" y="10" width="8" height="10" rx="2" />
                    <path d="M4 11h2" /><path d="M18 11h2" />
                    <path d="M4 15h2" /><path d="M18 15h2" />
                    <line x1="12" y1="10" x2="12" y2="20" />
                  </svg>
                ),
              },
            ]).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setWorkflow(opt.id)}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-colors text-center ${
                  workflow === opt.id
                    ? 'border-indigo bg-indigo/10 text-text'
                    : 'border-overlay bg-mantle text-muted hover:border-muted'
                }`}
              >
                {opt.icon}
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-xs text-muted leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {workflow !== 'free' && (
        <div className="mb-4">
          <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Description *</label>
          <textarea
            className="w-full bg-mantle border border-overlay rounded text-text text-sm px-3 py-2 focus:outline-none focus:border-indigo resize-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.metaKey) handleSubmit()
            }}
            placeholder="Describe what you want to build or fix…"
            rows={3}
            autoFocus
          />
        </div>
        )}

        {workflow !== 'free' && repos && repos.repos.length > 0 && (
          <div className="mb-5">
            <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
              Repositories *
            </label>

            {selectedRepos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedRepos.map(r => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 bg-indigo/20 border border-indigo/40 text-indigo text-xs rounded-full px-2.5 py-1"
                  >
                    {r.split('/').pop()}
                    <button
                      type="button"
                      onClick={() => setSelectedRepos(prev => prev.filter(x => x !== r))}
                      className="hover:text-white transition-colors text-xs leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Select
                className="flex-1"
                value=""
                onChange={(val) => {
                  if (val && !selectedRepos.includes(val)) {
                    setSelectedRepos(prev => [...prev, val])
                  }
                }}
                options={[
                  { value: '', label: 'Add a repository\u2026' },
                  ...repos.repos
                    .filter(r => !selectedRepos.includes(r))
                    .map(r => ({ value: r, label: r.split('/').pop()! })),
                ]}
                placeholder="Add a repository\u2026"
              />
              <button
                type="button"
                onClick={handleRefreshRepos}
                disabled={refreshing}
                className="bg-mantle border border-overlay rounded text-muted hover:text-text hover:border-muted transition-colors px-2.5 py-2 text-sm disabled:opacity-60"
                title="Refresh repositories"
              >
                {refreshing ? '...' : '↻'}
              </button>
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Model *</label>
          <Select
            value={combined}
            onChange={setCombined}
            options={allModels}
            disabled={loadingModels || allModels.length === 0}
          />
        </div>

        {error && <p className="text-red text-xs mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-transparent border border-overlay text-muted hover:text-text hover:border-muted transition-colors rounded px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loadingModels || allModels.length === 0}
            className="bg-indigo hover:bg-indigo-light disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors rounded px-4 py-2 text-sm font-semibold"
          >
            {submitting ? 'Starting…' : loadingModels ? 'Loading models…' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
