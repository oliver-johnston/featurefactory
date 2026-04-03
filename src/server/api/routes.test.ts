import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify from 'fastify'
import type { Session } from '../../shared/types.js'

// --- Mocks ---

const sessionStore = new Map<string, Session>()
let nextIdCounter = 1

vi.mock('../store.js', () => ({
  listSessions: vi.fn(async (_dir: string) => Array.from(sessionStore.values())),
  readSession: vi.fn(async (_dir: string, id: string) => {
    const s = sessionStore.get(id)
    if (!s) throw new Error(`Session ${id} not found`)
    return s
  }),
  writeSession: vi.fn(async (_dir: string, session: Session) => {
    sessionStore.set(session.id, session)
  }),
  nextSessionId: vi.fn(async (_dir: string) => {
    const id = `TASK-${String(nextIdCounter).padStart(3, '0')}`
    nextIdCounter++
    return id
  }),
  deleteSession: vi.fn(async () => {}),
}))

vi.mock('../repos.js', () => ({
  getCachedRepos: vi.fn(() => ({
    isSingleRepo: false,
    repos: ['/fake/repo'],
  })),
  refreshRepos: vi.fn(async (_cwd: string) => ({
    isSingleRepo: false,
    repos: ['/fake/repo'],
  })),
}))

vi.mock('../orchestrator/worktree.js', () => ({
  ensureWorktrees: vi.fn(async () => ({ paths: [], warnings: [] })),
  removeWorktrees: vi.fn(async () => {}),
}))


vi.mock('./ws.js', () => ({
  broadcastSessionUpdate: vi.fn(),
  broadcastSessionRemove: vi.fn(),
}))

vi.mock('../orchestrator/git.js', () => ({
  getGitStatus: vi.fn(async () => ({ ahead: 2, behind: 0, uncommitted: 1, untracked: 0 })),
}))

vi.mock('../slug.js', () => ({
  generateSlug: vi.fn(async (desc: string) =>
    desc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  ),
}))

// --- Helpers ---

async function buildApp() {
  // Import after mocks are set up
  const { registerRoutes } = await import('./routes.js')
  const app = Fastify()
  await registerRoutes(app, {
    cwd: '/test/cwd',
    onSpawn: vi.fn(async () => {}),
    onKill: vi.fn(),
    onUpdate: vi.fn(),
    onGitOperation: vi.fn(async () => {}),
  })
  await app.ready()
  return app
}

// --- Tests ---

describe('GET /api/info', () => {
  it('returns cwd', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/info' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ cwd: '/test/cwd' })
    await app.close()
  })
})

describe('GET /api/repos', () => {
  it('returns repo detection result', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/repos' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.repos).toBeDefined()
    expect(Array.isArray(body.repos)).toBe(true)
    await app.close()
  })
})

describe('GET /api/models', () => {
  it('returns curated model options', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/models' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({
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
    })
    await app.close()
  })
})

describe('GET /api/sessions', () => {
  beforeEach(() => {
    sessionStore.clear()
    nextIdCounter = 1
  })

  it('returns sessions list', async () => {
    const session: Session = {
      id: 'TASK-001',
      title: 'Test',
      repos: ['/repo'],
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      status: 'active',
      stage: 'brainstorm',
      created_at: new Date().toISOString(),
      worktree: { root: '/wt/TASK-001', branch: 'feat/TASK-001-test', paths: ['/wt/TASK-001/repo'] },
    }
    sessionStore.set('TASK-001', session)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/sessions' })
    expect(res.statusCode).toBe(200)
    const sessions = JSON.parse(res.body) as Session[]
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe('TASK-001')
    await app.close()
  })

  it('returns empty array when no sessions', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/sessions' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual([])
    await app.close()
  })
})

describe('POST /api/sessions', () => {
  beforeEach(() => {
    sessionStore.clear()
    nextIdCounter = 1
  })

  it('creates and returns a session with status 201', async () => {
    const onSpawn = vi.fn(async () => {})
    const { registerRoutes } = await import('./routes.js')
    const app = Fastify()
    await registerRoutes(app, {
      cwd: '/test/cwd',
      onSpawn,
      onKill: vi.fn(),
      onUpdate: vi.fn(),
      onGitOperation: vi.fn(async () => {}),
      })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: {
        title: 'My Feature',
        repos: ['/home/user/myrepo'],
        provider: 'openai',
        model: 'gpt-5',
      },
    })

    expect(res.statusCode).toBe(201)
    const session = JSON.parse(res.body) as Session
    expect(session.id).toMatch(/^TASK-\d{3}$/)
    expect(session.title).toBe('My Feature')
    expect(session.repos).toEqual(['/home/user/myrepo'])
    expect(session.provider).toBe('openai')
    expect(session.model).toBe('gpt-5')
    expect(session.status).toBe('active')
    expect(session.stage).toBe('brainstorm')
    expect(session.worktree!.branch).toMatch(/^feat\/TASK-\d{3}-my-feature$/)
    expect(onSpawn).toHaveBeenCalledOnce()
    await app.close()
  })

  it('returns 400 when title is missing', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { repos: ['/home/user/myrepo'], provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toMatch(/title/)
    await app.close()
  })

  it('returns 400 when title is blank', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: '   ', repos: ['/home/user/myrepo'], provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toMatch(/title/)
    await app.close()
  })

  it('returns 400 when repos is missing', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'My Feature', provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toMatch(/repos/)
    await app.close()
  })

  it('returns 400 when repos is empty', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'My Feature', repos: [], provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toMatch(/repos/)
    await app.close()
  })

  it('returns 400 when provider is missing', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'My Feature', repos: ['/home/user/myrepo'], model: 'gpt-5' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toMatch(/provider/)
    await app.close()
  })

  it('returns 400 when model is missing', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'My Feature', repos: ['/home/user/myrepo'], provider: 'openai' },
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toMatch(/model/)
    await app.close()
  })
})

describe('PATCH /api/sessions/:id', () => {
  beforeEach(() => {
    sessionStore.clear()
    nextIdCounter = 1
  })

  it('updates session status and returns 200', async () => {
    const existing: Session = {
      id: 'TASK-001',
      title: 'Patch me',
      repos: ['/repo'],
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      status: 'active',
      created_at: new Date().toISOString(),
      worktree: { root: '/wt/TASK-001', branch: 'feat/TASK-001-patch-me', paths: ['/wt/TASK-001/repo'] },
    }
    sessionStore.set('TASK-001', existing)

    const app = await buildApp()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/sessions/TASK-001',
      payload: { status: 'done' },
    })

    expect(res.statusCode).toBe(200)
    const updated = JSON.parse(res.body) as Session
    expect(updated.status).toBe('done')
    expect(updated.id).toBe('TASK-001')
    expect(updated.title).toBe('Patch me')
    await app.close()
  })

  it('returns 404 for missing session', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/sessions/TASK-999',
      payload: { status: 'done' },
    })
    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.body).error).toMatch(/TASK-999/)
    await app.close()
  })
})

describe('PATCH /api/sessions/:id (mark done removes worktrees)', () => {
  beforeEach(() => {
    sessionStore.clear()
    nextIdCounter = 1
  })

  it('calls removeWorktrees when marking as done', async () => {
    const { removeWorktrees } = await import('../orchestrator/worktree.js')
    vi.mocked(removeWorktrees).mockClear()

    const existing: Session = {
      id: 'TASK-001',
      title: 'Done test',
      repos: ['/repo'],
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      status: 'active',
      created_at: new Date().toISOString(),
      worktree: { root: '/wt/TASK-001', branch: 'feat/TASK-001-done', paths: ['/wt/TASK-001/repo'] },
    }
    sessionStore.set('TASK-001', existing)

    const app = await buildApp()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/sessions/TASK-001',
      payload: { status: 'done' },
    })
    expect(res.statusCode).toBe(200)
    expect(removeWorktrees).toHaveBeenCalledWith(['/repo'], ['/wt/TASK-001/repo'])
    await app.close()
  })
})

describe('DELETE /api/sessions/:id', () => {
  beforeEach(() => {
    sessionStore.clear()
    nextIdCounter = 1
  })

  it('deletes session and returns 200 with deleted id', async () => {
    const existing: Session = {
      id: 'TASK-001',
      title: 'Delete me',
      repos: ['/repo'],
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      status: 'active',
      created_at: new Date().toISOString(),
      worktree: { root: '/wt/TASK-001', branch: 'feat/TASK-001-delete-me', paths: ['/wt/TASK-001/repo'] },
    }
    sessionStore.set('TASK-001', existing)

    const onKill = vi.fn()
    const { registerRoutes } = await import('./routes.js')
    const app = Fastify()
    await registerRoutes(app, {
      cwd: '/test/cwd',
      onSpawn: vi.fn(async () => {}),
      onKill,
      onUpdate: vi.fn(),
      onGitOperation: vi.fn(async () => {}),
      })
    await app.ready()

    const res = await app.inject({ method: 'DELETE', url: '/api/sessions/TASK-001' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ deleted: 'TASK-001' })
    expect(onKill).toHaveBeenCalledWith('TASK-001')
    await app.close()
  })

  it('returns 404 for missing session', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'DELETE', url: '/api/sessions/TASK-999' })
    expect(res.statusCode).toBe(404)
    await app.close()
  })
})

