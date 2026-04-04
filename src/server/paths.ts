import { join } from 'path'

export const FF_DIR = join(process.cwd(), '.featurefactory')
export const TASKS_DIR = join(FF_DIR, 'tasks')

export function repoSlug(repoPath: string): string {
  return repoPath.replace(/^\//, '').replace(/\//g, '-')
}

export function repoSettingsDir(repoPath: string): string {
  return join(FF_DIR, 'repos', repoSlug(repoPath))
}

export function repoSettingsPath(repoPath: string): string {
  return join(repoSettingsDir(repoPath), 'settings.json')
}
