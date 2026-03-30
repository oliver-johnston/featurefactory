import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const GIT_TIMEOUT = 30000

export interface GitStatus {
  ahead: number
  behind: number
  uncommitted: number
  untracked: number
}

export async function detectDefaultBranch(repoRoot: string): Promise<string> {
  // Try symbolic-ref first (works when remote HEAD is set)
  try {
    const { stdout } = await execFileAsync(
      'git', ['symbolic-ref', 'refs/remotes/origin/HEAD'],
      { cwd: repoRoot, timeout: GIT_TIMEOUT },
    )
    const ref = stdout.trim()
    return ref.split('/').pop() ?? 'main'
  } catch {
    // No remote or no origin/HEAD
  }

  // Check if 'main' branch exists locally
  try {
    await execFileAsync('git', ['rev-parse', '--verify', 'main'], { cwd: repoRoot, timeout: GIT_TIMEOUT })
    return 'main'
  } catch {
    // not found
  }

  // Check if 'master' branch exists locally
  try {
    await execFileAsync('git', ['rev-parse', '--verify', 'master'], { cwd: repoRoot, timeout: GIT_TIMEOUT })
    return 'master'
  } catch {
    // not found
  }

  return 'main'
}

export async function getGitStatus(worktreePath: string, repoRoot: string): Promise<GitStatus> {
  const defaultBranch = await detectDefaultBranch(repoRoot)

  let ahead = 0
  let behind = 0
  try {
    const { stdout } = await execFileAsync(
      'git', ['rev-list', '--left-right', '--count', `${defaultBranch}...HEAD`],
      { cwd: worktreePath, timeout: GIT_TIMEOUT },
    )
    const parts = stdout.trim().split(/\s+/)
    behind = parseInt(parts[0], 10) || 0
    ahead = parseInt(parts[1], 10) || 0
  } catch {
    // comparison fails, leave as 0
  }

  let uncommitted = 0
  let untracked = 0
  try {
    const { stdout } = await execFileAsync(
      'git', ['status', '--porcelain'],
      { cwd: worktreePath, timeout: GIT_TIMEOUT },
    )
    for (const line of stdout.split('\n').filter(Boolean)) {
      if (line.startsWith('??')) {
        untracked++
      } else {
        uncommitted++
      }
    }
  } catch {
    // status failed
  }

  return { ahead, behind, uncommitted, untracked }
}

export async function pullMain(repoRoot: string): Promise<{ ok: boolean; warning?: string }> {
  const defaultBranch = await detectDefaultBranch(repoRoot)
  try {
    await execFileAsync(
      'git', ['pull', 'origin', defaultBranch],
      { cwd: repoRoot, timeout: GIT_TIMEOUT },
    )
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[git] Failed to pull ${defaultBranch} in ${repoRoot}: ${message}`)
    return { ok: false, warning: `Could not pull ${defaultBranch}: ${message}` }
  }
}

export async function mergeToMainAndPush(
  repoRoot: string,
  branch: string,
): Promise<{ success: boolean; error?: string }> {
  const defaultBranch = await detectDefaultBranch(repoRoot)

  let originalBranch: string
  try {
    const { stdout } = await execFileAsync(
      'git', ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd: repoRoot, timeout: GIT_TIMEOUT },
    )
    originalBranch = stdout.trim()
  } catch {
    return { success: false, error: 'Failed to determine current branch' }
  }

  try {
    await execFileAsync('git', ['checkout', defaultBranch], { cwd: repoRoot, timeout: GIT_TIMEOUT })

    try {
      await execFileAsync('git', ['merge', branch], { cwd: repoRoot, timeout: GIT_TIMEOUT })
    } catch (err) {
      await execFileAsync('git', ['merge', '--abort'], { cwd: repoRoot, timeout: GIT_TIMEOUT }).catch(() => {})
      await execFileAsync('git', ['checkout', originalBranch], { cwd: repoRoot, timeout: GIT_TIMEOUT }).catch(() => {})
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Merge failed: ${message}` }
    }

    try {
      await execFileAsync('git', ['push', 'origin', defaultBranch], { cwd: repoRoot, timeout: GIT_TIMEOUT })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await execFileAsync('git', ['checkout', originalBranch], { cwd: repoRoot, timeout: GIT_TIMEOUT }).catch(() => {})
      return { success: false, error: `Merge succeeded but push failed: ${message}` }
    }

    await execFileAsync('git', ['checkout', originalBranch], { cwd: repoRoot, timeout: GIT_TIMEOUT }).catch(() => {})
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await execFileAsync('git', ['checkout', originalBranch], { cwd: repoRoot, timeout: GIT_TIMEOUT }).catch(() => {})
    return { success: false, error: message }
  }
}

export async function pushAndCreatePR(
  repoRoot: string,
  branch: string,
  title: string,
): Promise<{ success: boolean; error?: string; prUrl?: string }> {
  try {
    await execFileAsync('git', ['push', '-u', 'origin', branch], { cwd: repoRoot, timeout: GIT_TIMEOUT })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Push failed: ${message}` }
  }

  try {
    const { stdout } = await execFileAsync(
      'gh', ['pr', 'create', '--title', title, '--body', `Feature branch: ${branch}`, '--head', branch],
      { cwd: repoRoot, timeout: GIT_TIMEOUT },
    )
    const prUrl = stdout.trim()
    return { success: true, prUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `Push succeeded but PR creation failed: ${message}` }
  }
}
