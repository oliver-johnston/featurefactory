import { existsSync } from 'fs'
import { mkdir, readFile, appendFile, writeFile } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { pullMain } from './git.js'

const execFileAsync = promisify(execFile)

/**
 * Checks whether a worktree directory exists at the given path.
 * Uses filesystem presence as a proxy for worktree registration.
 * Note: a directory can exist without being registered in git's worktree list
 * (e.g. partial failure, manual creation). The orchestrator treats this as "exists"
 * and will not attempt to re-register it.
 */
export function worktreeExists(worktreePath: string): boolean {
  return existsSync(worktreePath)
}

export async function ensureWorktree(
  repoRoot: string,
  worktreePath: string,
  branch: string,
): Promise<void> {
  if (worktreeExists(worktreePath)) return

  // Ensure parent directory exists
  await mkdir(dirname(worktreePath), { recursive: true })

  // Check if branch already exists (separated from worktree-add so real errors surface)
  let branchExists = false
  try {
    await execFileAsync('git', ['rev-parse', '--verify', branch], { cwd: repoRoot, timeout: 30000 })
    branchExists = true
  } catch {
    // branch does not exist — will create it below
  }

  if (branchExists) {
    await execFileAsync('git', ['worktree', 'add', worktreePath, branch], { cwd: repoRoot, timeout: 30000 })
  } else {
    await execFileAsync('git', ['worktree', 'add', '-b', branch, worktreePath], { cwd: repoRoot, timeout: 30000 })
  }

  await ensureGitignoreEntries(repoRoot, ['.featurefactory/'])
  await ensureGitignoreEntries(worktreePath, ['.featurefactory/'])
}

async function ensureGitignoreEntries(dir: string, entries: string[]): Promise<void> {
  const gitignorePath = join(dir, '.gitignore')
  let content: string
  try {
    content = await readFile(gitignorePath, 'utf-8')
  } catch {
    content = ''
  }
  const lines = content.split('\n').map(line => line.trim())
  const missing = entries.filter(entry => !lines.includes(entry))
  if (missing.length === 0) return
  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : ''
  const addition = `${separator}${missing.join('\n')}\n`
  if (content.length === 0) {
    await writeFile(gitignorePath, addition)
  } else {
    await appendFile(gitignorePath, addition)
  }
}

export async function removeWorktree(repoRoot: string, worktreePath: string): Promise<void> {
  if (!existsSync(worktreePath)) return
  try {
    await execFileAsync('git', ['worktree', 'remove', '--force', worktreePath], { cwd: repoRoot, timeout: 30000 })
  } catch (err) {
    console.error(`Failed to remove worktree at ${worktreePath}:`, err)
  }
}

export async function ensureWorktrees(
  repos: string[],
  rootPath: string,
  branch: string,
): Promise<{ paths: string[]; warnings: string[] }> {
  const names = repos.map(r => basename(r))
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  if (dupes.length > 0) {
    throw new Error(`Duplicate repo basenames: ${[...new Set(dupes)].join(', ')}`)
  }

  await mkdir(rootPath, { recursive: true })

  const warnings: string[] = []
  const paths: string[] = []
  for (const repo of repos) {
    const pullResult = await pullMain(repo)
    if (!pullResult.ok && pullResult.warning) {
      warnings.push(`${basename(repo)}: ${pullResult.warning}`)
    }

    const worktreePath = join(rootPath, basename(repo))
    await ensureWorktree(repo, worktreePath, branch)
    paths.push(worktreePath)
  }
  return { paths, warnings }
}

export async function removeWorktrees(
  repos: string[],
  worktreePaths: string[],
): Promise<void> {
  for (let i = 0; i < worktreePaths.length; i++) {
    await removeWorktree(repos[i], worktreePaths[i])
  }
}

export async function verifyGitRepo(dir: string): Promise<void> {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir, timeout: 30000 })
  } catch {
    throw new Error(`${dir} is not inside a Git repository. Run 'git init' first.`)
  }
}

