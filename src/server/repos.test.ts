import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { detectRepos } from './repos.js'

const exec = promisify(execFile)

async function initGitRepo(dir: string): Promise<void> {
  await exec('git', ['init'], { cwd: dir })
  await exec('git', ['commit', '--allow-empty', '-m', 'init'], { cwd: dir })
}

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ff-repos-test-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('detectRepos', () => {
  it('returns single-repo mode when CWD is a git repo', async () => {
    await initGitRepo(tmp)
    const result = await detectRepos(tmp)
    expect(result.isSingleRepo).toBe(true)
    expect(result.repos).toEqual([tmp])
  })

  it('scans child folders when CWD is not a git repo', async () => {
    const child = join(tmp, 'my-app')
    await mkdir(child)
    await initGitRepo(child)
    const result = await detectRepos(tmp)
    expect(result.isSingleRepo).toBe(true)
    expect(result.repos).toContain(child)
  })

  it('ignores non-git child folders', async () => {
    const child = join(tmp, 'not-a-repo')
    await mkdir(child)
    const result = await detectRepos(tmp)
    expect(result.isSingleRepo).toBe(false)
    expect(result.repos).toEqual([])
  })

  it('does not include plain child dirs when CWD is a git repo', async () => {
    await initGitRepo(tmp)
    const plain = join(tmp, 'not-a-repo')
    await mkdir(plain)
    const result = await detectRepos(tmp)
    expect(result.isSingleRepo).toBe(true)
    expect(result.repos).toEqual([tmp])
  })

  it('includes CWD and child repos when CWD is a git repo with git children', async () => {
    await initGitRepo(tmp)
    const child = join(tmp, 'sub-repo')
    await mkdir(child)
    await initGitRepo(child)
    const result = await detectRepos(tmp)
    expect(result.isSingleRepo).toBe(false)
    expect(result.repos).toEqual([tmp, child])
  })
})
