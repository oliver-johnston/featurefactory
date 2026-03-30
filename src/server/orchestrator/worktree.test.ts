import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, rm, mkdir } from 'fs/promises'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { execSync } from 'child_process'
import { ensureWorktree, ensureWorktrees, worktreeExists, verifyGitRepo, removeWorktree, removeWorktrees } from './worktree.js'

let testRepoDir: string
let testRepoDir2: string

function initRepo(dir: string): void {
  execSync('git init', { cwd: dir })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })
  writeFileSync(join(dir, 'README.md'), 'init\n')
  execSync('git add .', { cwd: dir })
  execSync('git commit -m "init"', { cwd: dir })
}

beforeAll(async () => {
  // Create temp git repos to test against
  testRepoDir = await mkdtemp(join(tmpdir(), 'ff-test-'))
  initRepo(testRepoDir)
  testRepoDir2 = await mkdtemp(join(tmpdir(), 'ff-test2-'))
  initRepo(testRepoDir2)
})

afterAll(async () => {
  await rm(testRepoDir, { recursive: true, force: true })
  await rm(testRepoDir2, { recursive: true, force: true })
})

describe('worktreeExists', () => {
  it('returns false for a path that does not exist', () => {
    expect(worktreeExists(join(testRepoDir, '.featurefactory/worktrees/TASK-001'))).toBe(false)
  })
})

describe('ensureWorktree', () => {
  it('creates a worktree and branch for a new task', async () => {
    const worktreePath = join(testRepoDir, '.featurefactory/worktrees/TASK-001')
    const branch = 'feat/TASK-001-test'
    await ensureWorktree(testRepoDir, worktreePath, branch)
    expect(worktreeExists(worktreePath)).toBe(true)
  })

  it('does not throw if worktree already exists (idempotent)', async () => {
    const worktreePath = join(testRepoDir, '.featurefactory/worktrees/TASK-001')
    const branch = 'feat/TASK-001-test'
    await expect(ensureWorktree(testRepoDir, worktreePath, branch)).resolves.not.toThrow()
  })
})

describe('verifyGitRepo', () => {
  it('resolves when called inside a git repository', async () => {
    await expect(verifyGitRepo(testRepoDir)).resolves.not.toThrow()
  })

  it('throws when called outside a git repository', async () => {
    const nonRepoDir = await mkdtemp(join(tmpdir(), 'ff-nongit-'))
    try {
      await expect(verifyGitRepo(nonRepoDir)).rejects.toThrow(/is not inside a Git repository/)
    } finally {
      await rm(nonRepoDir, { recursive: true, force: true })
    }
  })
})

describe('removeWorktree', () => {
  it('removes a real worktree directory from disk', async () => {
    const worktreePath = join(testRepoDir, '.featurefactory/worktrees/TASK-remove-test')
    await ensureWorktree(testRepoDir, worktreePath, 'feat/TASK-remove-test')
    expect(worktreeExists(worktreePath)).toBe(true)

    await removeWorktree(testRepoDir, worktreePath)

    expect(worktreeExists(worktreePath)).toBe(false)
  })

  it('does nothing when the worktree directory does not exist', async () => {
    const nonExistentPath = join(testRepoDir, '.featurefactory/worktrees/TASK-nonexistent')
    await expect(removeWorktree(testRepoDir, nonExistentPath)).resolves.not.toThrow()
  })

  it('does not throw when git worktree remove fails on a non-worktree directory', async () => {
    const dir = join(testRepoDir, '.featurefactory/worktrees/TASK-plain-dir')
    await mkdir(dir, { recursive: true })
    await expect(removeWorktree(testRepoDir, dir)).resolves.not.toThrow()
  })
})

describe('ensureWorktrees', () => {
  it('creates worktrees for multiple repos and returns their paths', async () => {
    const rootPath = join(testRepoDir, '.featurefactory/worktrees/multi')
    const branch = 'feat/TASK-multi-test'
    const repos = [testRepoDir, testRepoDir2]

    const { paths } = await ensureWorktrees(repos, rootPath, branch)

    expect(paths).toHaveLength(2)
    for (const p of paths) {
      expect(worktreeExists(p)).toBe(true)
    }
    // Paths should use basename of each repo dir
    expect(paths[0]).toContain(rootPath)
    expect(paths[1]).toContain(rootPath)
  })

  it('is idempotent when called again with the same repos', async () => {
    const rootPath = join(testRepoDir, '.featurefactory/worktrees/multi')
    const branch = 'feat/TASK-multi-test'
    const repos = [testRepoDir, testRepoDir2]

    await expect(ensureWorktrees(repos, rootPath, branch)).resolves.not.toThrow()
  })
})

describe('removeWorktrees', () => {
  it('removes all worktrees created by ensureWorktrees', async () => {
    const rootPath = join(testRepoDir, '.featurefactory/worktrees/multi-rm')
    const branch = 'feat/TASK-multi-rm'
    const repos = [testRepoDir, testRepoDir2]

    const { paths } = await ensureWorktrees(repos, rootPath, branch)
    for (const p of paths) {
      expect(worktreeExists(p)).toBe(true)
    }

    await removeWorktrees(repos, paths)

    for (const p of paths) {
      expect(worktreeExists(p)).toBe(false)
    }
  })
})
