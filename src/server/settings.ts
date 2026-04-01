import { readFile, writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { FF_DIR, repoSettingsDir, repoSettingsPath } from './paths.js'
import { CURATED_MODELS } from './runner/models.js'
import type { Settings, SettingsModelOption, QuickAction, RepoSettings, SettingsOverrides } from '../shared/settingsTypes.js'

const SETTINGS_PATH = join(FF_DIR, 'settings.json')

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { label: 'Merge to Master and Push', message: 'Merge to master locally and push to origin' },
  { label: 'Push and Create PR', message: 'Push this worktree to origin and create a PR' },
]

function buildDefaultModels(): SettingsModelOption[] {
  const models: SettingsModelOption[] = []
  for (const [provider, options] of Object.entries(CURATED_MODELS)) {
    for (const opt of options) {
      models.push({ provider, id: opt.id, label: opt.label, enabled: true })
    }
  }
  return models
}

function getDefaults(): Settings {
  return {
    models: {
      available: buildDefaultModels(),
      default: { provider: 'anthropic', id: 'claude-opus-4-6' },
    },
    quickActions: [...DEFAULT_QUICK_ACTIONS],
    githubHosts: ['github.com'],
  }
}

function mergeWithDefaults(saved: Partial<Settings>): Settings {
  const defaults = getDefaults()

  // Merge models: ensure all curated models are present
  let available = saved.models?.available ?? defaults.models.available
  const curatedModels = buildDefaultModels()
  for (const curated of curatedModels) {
    const exists = available.find(m => m.provider === curated.provider && m.id === curated.id)
    if (!exists) {
      available.push(curated)
    }
  }

  const defaultModel = saved.models?.default ?? defaults.models.default
  const quickActions = saved.quickActions ?? defaults.quickActions

  const githubHosts = saved.githubHosts ?? defaults.githubHosts

  return { models: { available, default: defaultModel }, quickActions, githubHosts }
}

export async function readSettings(): Promise<Settings> {
  try {
    const raw = await readFile(SETTINGS_PATH, 'utf-8')
    const saved = JSON.parse(raw) as Partial<Settings>
    return mergeWithDefaults(saved)
  } catch {
    return getDefaults()
  }
}

export async function writeSettings(settings: Settings): Promise<void> {
  await mkdir(FF_DIR, { recursive: true })
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8')
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export async function readRepoSettings(repoPath: string): Promise<RepoSettings> {
  try {
    const raw = await readFile(repoSettingsPath(repoPath), 'utf-8')
    return JSON.parse(raw) as RepoSettings
  } catch {
    return {}
  }
}

export async function readEffectiveSettings(repoPath: string): Promise<Settings> {
  const global = await readSettings()
  const repo = await readRepoSettings(repoPath)
  return {
    models: repo.models ?? global.models,
    quickActions: repo.quickActions ?? global.quickActions,
    githubHosts: repo.githubHosts ?? global.githubHosts,
  }
}

export async function writeRepoSettings(repoPath: string, submitted: Settings): Promise<void> {
  const global = await readSettings()
  const overrides: RepoSettings = {}

  if (!deepEqual(submitted.models, global.models)) overrides.models = submitted.models
  if (!deepEqual(submitted.quickActions, global.quickActions)) overrides.quickActions = submitted.quickActions
  if (!deepEqual(submitted.githubHosts, global.githubHosts)) overrides.githubHosts = submitted.githubHosts

  const dir = repoSettingsDir(repoPath)
  const path = repoSettingsPath(repoPath)

  if (Object.keys(overrides).length === 0) {
    await rm(path, { force: true }).catch(() => {})
    return
  }

  await mkdir(dir, { recursive: true })
  await writeFile(path, JSON.stringify(overrides, null, 2) + '\n', 'utf-8')
}

export async function getOverrides(repoPath: string): Promise<SettingsOverrides> {
  const repo = await readRepoSettings(repoPath)
  return {
    models: repo.models !== undefined,
    quickActions: repo.quickActions !== undefined,
    githubHosts: repo.githubHosts !== undefined,
  }
}
