import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { FF_DIR } from './paths.js'
import { CURATED_MODELS } from './runner/models.js'
import type { Settings, SettingsModelOption, QuickAction } from '../shared/settingsTypes.js'

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

  return { models: { available, default: defaultModel }, quickActions }
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
