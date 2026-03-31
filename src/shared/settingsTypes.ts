export interface SettingsModelOption {
  provider: string
  id: string
  label: string
  enabled: boolean
  custom?: boolean
}

export interface QuickAction {
  label: string
  message: string
}

export interface Settings {
  models: {
    available: SettingsModelOption[]
    default: { provider: string; id: string }
  }
  quickActions: QuickAction[]
  githubHosts: string[]
}
