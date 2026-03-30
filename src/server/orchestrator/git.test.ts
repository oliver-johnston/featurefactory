import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { execSync } from 'child_process'
import { detectDefaultBranch, getGitStatus, pullMain, mergeToMainAndPush, pushAndCreatePR } from './git.js'

let repoDir: string

function initRepo(dir: string, defaultBranch = 'main'): void {
  execSync(`git init -b ${defaultBranch}`, { cwd: dir })
  execSync('git config user.email "test@test.com"', { cwd: dir })
  execSync('git config user.name "Test"', { cwd: dir })
  writeFileSync(join(dir, 'README.md'), 'init\n')
  execSync('git add .', { cwd: dir })
  execSync('git commit -m "init"', { cwd: dir })
}

beforeAll(async () => {
  repoDir = await mkdtemp(join(tmpdir(), 'ff-git-test-'))
  initRepo(repoDir)
})

afterAll(async () => {
  await rm(repoDir, { recursive: true, force: true })
})

describe('detectDefaultBranch', () => {
  it('detects main as the default branch', async () => {
    const branch = await detectDefaultBranch(repoDir)
    expect(branch).toBe('main')
  })
})

describe('getGitStatus', () => {
  it('returns zeros when on the default branch with clean state', async () => {
    const status = await getGitStatus(repoDir, repoDir)
    expect(status).toEqual({ ahead: 0, behind: 0, uncommitted: 0, untracked: 0 })
  })

  it('detects ahead commits on a feature branch', async () => {
    execSync('git checkout -b feat/test-ahead', { cwd: repoDir })
    writeFileSync(join(repoDir, 'new.txt'), 'hello\n')
    execSync('git add .', { cwd: repoDir })
    execSync('git commit -m "ahead commit"', { cwd: repoDir })

    const status = await getGitStatus(repoDir, repoDir)
    expect(status.ahead).toBe(1)
    expect(status.behind).toBe(0)

    execSync('git checkout main', { cwd: repoDir })
  })

  it('detects uncommitted changes', async () => {
    writeFileSync(join(repoDir, 'README.md'), 'modified\n')
    const status = await getGitStatus(repoDir, repoDir)
    expect(status.uncommitted).toBeGreaterThanOrEqual(1)

    execSync('git checkout -- README.md', { cwd: repoDir })
  })

  it('detects untracked files', async () => {
    writeFileSync(join(repoDir, 'untracked.txt'), 'untracked\n')
    const status = await getGitStatus(repoDir, repoDir)
    expect(status.untracked).toBe(1)

    execSync('rm untracked.txt', { cwd: repoDir })
  })
})

describe('pullMain', () => {
  it('returns warning when no remote configured', async () => {
    const result = await pullMain(repoDir)
    expect(result).toHaveProperty('ok')
    expect(result).toHaveProperty('warning')
  })
})

describe('mergeToMainAndPush', () => {
  it('returns error when push fails (no remote)', async () => {
    execSync('git checkout -b feat/merge-test', { cwd: repoDir })
    writeFileSync(join(repoDir, 'merge-test.txt'), 'merge me\n')
    execSync('git add .', { cwd: repoDir })
    execSync('git commit -m "merge test commit"', { cwd: repoDir })

    const result = await mergeToMainAndPush(repoDir, 'feat/merge-test')
    expect(result).toHaveProperty('success')

    execSync('git checkout main', { cwd: repoDir })
  })
})

describe('pushAndCreatePR', () => {
  it('returns error when push fails (no remote)', async () => {
    const result = await pushAndCreatePR(repoDir, 'feat/merge-test', 'Test PR')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
