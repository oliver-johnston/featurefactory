import type { ModelOption } from '../../shared/types.js'

export type ModelOptionsByProvider = Record<string, ModelOption[]>

export const CURATED_MODELS: ModelOptionsByProvider = {
  anthropic: [
    { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { id: 'gpt-5-codex',  label: 'GPT-5 Codex' },
    { id: 'gpt-5.4',      label: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
  ],
}
