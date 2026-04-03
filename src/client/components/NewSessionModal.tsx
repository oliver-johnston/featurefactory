import { useState, useEffect } from 'react'
import type { ModelOption, ModelProvider } from '../types.js'

interface RepoDetection {
  isSingleRepo: boolean
  repos: string[]
}

type ModelOptionsByProvider = Record<string, ModelOption[]>

function pickDefaultModel(provider: string, options: ModelOptionsByProvider): string {
  const models = options[provider] ?? []
  if (models.length === 0) return ''
  if (provider === 'openai') {
    const preferred = models.find(option => option.id === 'gpt-5-codex')
    if (preferred) return preferred.id
  }
  return models[0].id
}

interface Props {
  modelOptions: ModelOptionsByProvider | null
  modelsError: string | null
  defaultModel?: { provider: string; id: string } | null
  onCreated: (title: string, repos: string[], provider: ModelProvider, model: string, workflow: 'free' | 'full') => Promise<unknown>
  onClose: () => void
}

export function NewSessionModal({ modelOptions, modelsError, defaultModel, onCreated, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [workflow, setWorkflow] = useState<'free' | 'full'>('full')
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [providerOptions, setProviderOptions] = useState<ModelOptionsByProvider>({})
  const [provider, setProvider] = useState<ModelProvider>('')
  const [model, setModel] = useState('')
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

    const providers = Object.keys(modelOptions)
    if (providers.length === 0) {
      setError('OpenCode returned no models')
      return
    }

    const defaultProvider = providers.includes('anthropic') ? 'anthropic' : providers[0]
    setProviderOptions(modelOptions)
    const initialProvider = defaultModel?.provider && providers.includes(defaultModel.provider)
      ? defaultModel.provider
      : defaultProvider
    setProvider(current => current || initialProvider)
    const initialModel = defaultModel?.id && modelOptions[initialProvider]?.some(m => m.id === defaultModel.id)
      ? defaultModel.id
      : pickDefaultModel(initialProvider, modelOptions)
    setModel(current => current || initialModel)
  }, [modelOptions, modelsError])

  const loadingModels = !modelOptions && !modelsError

  const handleSubmit = async () => {
    if (loadingModels) { setError('Models are still loading'); return }
    if (!provider) { setError('Provider is required'); return }
    if (!model.trim()) { setError('Model is required'); return }
    if (workflow === 'full') {
      if (!title.trim()) { setError('Title is required'); return }
      if (selectedRepos.length === 0) { setError('Select at least one repository'); return }
    }
    setSubmitting(true)
    setError(null)
    try {
      const effectiveTitle = workflow === 'full' ? title.trim() : ''
      const effectiveRepos = workflow === 'full' ? selectedRepos : []
      await onCreated(effectiveTitle, effectiveRepos, provider, model.trim(), workflow)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const providers = Object.keys(providerOptions)
  const selectedProviderModels = providerOptions[provider] ?? []

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-overlay rounded-lg p-7 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-text text-base font-semibold mb-5">New Session</h2>

        <div className="mb-5">
          <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Workflow *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setWorkflow('free')}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-colors text-center ${
                workflow === 'free'
                  ? 'border-indigo bg-indigo/10 text-text'
                  : 'border-overlay bg-mantle text-muted hover:border-muted'
              }`}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <span className="text-sm font-semibold">Free</span>
              <span className="text-xs text-muted leading-tight">Open session in your working directory</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkflow('full')}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-colors text-center ${
                workflow === 'full'
                  ? 'border-indigo bg-indigo/10 text-text'
                  : 'border-overlay bg-mantle text-muted hover:border-muted'
              }`}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
              <span className="text-sm font-semibold">Full</span>
              <span className="text-xs text-muted leading-tight">Worktree isolation with guided workflow</span>
            </button>
          </div>
        </div>

        {workflow === 'full' && (
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
          <span className="text-xs text-muted mt-1 block">⌘+Enter to submit</span>
        </div>
        )}

        {workflow === 'full' && repos && repos.repos.length > 0 && (
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
              <select
                className="flex-1 bg-mantle border border-overlay rounded text-text text-sm px-3 py-2 focus:outline-none focus:border-indigo cursor-pointer"
                value=""
                onChange={e => {
                  const val = e.target.value
                  if (val && !selectedRepos.includes(val)) {
                    setSelectedRepos(prev => [...prev, val])
                  }
                }}
              >
                <option value="">Add a repository…</option>
                {repos.repos
                  .filter(r => !selectedRepos.includes(r))
                  .map(r => (
                    <option key={r} value={r}>{r.split('/').pop()}</option>
                  ))}
              </select>
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

        <div className="mb-4">
          <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Provider *</label>
          <select
            className="w-full bg-mantle border border-overlay rounded text-text text-sm px-3 py-2 focus:outline-none focus:border-indigo cursor-pointer"
            value={provider}
            onChange={e => {
              const nextProvider = e.target.value as ModelProvider
              setProvider(nextProvider)
              setModel(pickDefaultModel(nextProvider, providerOptions))
            }}
            disabled={loadingModels || providers.length === 0}
          >
            {providers.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">Model *</label>
          <select
            className="w-full bg-mantle border border-overlay rounded text-text text-sm px-3 py-2 focus:outline-none focus:border-indigo cursor-pointer"
            value={model}
            onChange={e => setModel(e.target.value)}
            disabled={loadingModels || selectedProviderModels.length === 0}
          >
            {selectedProviderModels.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
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
            disabled={submitting || loadingModels || providers.length === 0 || selectedProviderModels.length === 0}
            className="bg-indigo hover:bg-indigo-light disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors rounded px-4 py-2 text-sm font-semibold"
          >
            {submitting ? 'Starting…' : loadingModels ? 'Loading models…' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
