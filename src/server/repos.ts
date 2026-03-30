import { execFile } from 'child_process'
import { promisify } from 'util'
import { access, readdir, stat } from 'fs/promises'
import { join } from 'path'

const execFileAsync = promisify(execFile)

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir, timeout: 5000 })
    return true
  } catch {
    return false
  }
}

async function isGitRepoRoot(dir: string): Promise<boolean> {
  try {
    await access(join(dir, '.git'))
    return true
  } catch {
    return false
  }
}

export interface RepoDetection {
  isSingleRepo: boolean
  repos: string[]           // absolute paths
}

let cachedRepos: RepoDetection | null = null

export function getCachedRepos(): RepoDetection | null {
  return cachedRepos
}

export async function refreshRepos(cwd: string): Promise<RepoDetection> {
  cachedRepos = await detectRepos(cwd)
  return cachedRepos
}

export async function detectRepos(cwd: string): Promise<RepoDetection> {
  const cwdIsRepo = await isGitRepo(cwd)

  let entries: string[]
  try {
    entries = await readdir(cwd)
  } catch {
    const repos = cwdIsRepo ? [cwd] : []
    return { isSingleRepo: repos.length === 1, repos }
  }

  const repos: string[] = []
  if (cwdIsRepo) repos.push(cwd)

  for (const entry of entries) {
    if (entry.startsWith('.')) continue
    const fullPath = join(cwd, entry)
    try {
      const s = await stat(fullPath)
      if (s.isDirectory() && await isGitRepoRoot(fullPath)) {
        repos.push(fullPath)
      }
    } catch {
      // skip
    }
  }

  return { isSingleRepo: repos.length === 1, repos }
}
