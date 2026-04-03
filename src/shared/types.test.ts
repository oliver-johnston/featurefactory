import { describe, it, expectTypeOf } from 'vitest'
import type { Session, SessionStatus, SessionWorktree, WsMessage, ModelProvider, GitStatus } from './types.js'

describe('Session shape', () => {
  it('has required fields', () => {
    const session: Session = {
      id: 'TASK-001',
      title: 'Add user auth',
      repos: ['/path/to/my-app'],
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      status: 'active',
      created_at: '2026-03-27T10:00:00Z',
      worktree: {
        root: '/path/to/.featurefactory/worktrees/TASK-001',
        branch: 'feat/TASK-001-add-user-auth',
        paths: ['/path/to/.featurefactory/worktrees/TASK-001/my-app'],
      },
    }
    expectTypeOf(session.status).toEqualTypeOf<SessionStatus>()
  })
})

describe('WsMessage discriminated union', () => {
  it('task:updated has task field', () => {
    expectTypeOf<Extract<WsMessage, { type: 'task:updated' }>>().toHaveProperty('task')
  })

  it('task:list has tasks array field', () => {
    expectTypeOf<Extract<WsMessage, { type: 'task:list' }>>().toHaveProperty('tasks')
  })

  it('task:removed has taskId field', () => {
    expectTypeOf<Extract<WsMessage, { type: 'task:removed' }>>().toHaveProperty('taskId')
  })

  it('pty:data has taskId and data fields', () => {
    expectTypeOf<Extract<WsMessage, { type: 'pty:data' }>>().toHaveProperty('taskId')
    expectTypeOf<Extract<WsMessage, { type: 'pty:data' }>>().toHaveProperty('data')
  })

  it('pty:subscribe has taskId field', () => {
    expectTypeOf<Extract<WsMessage, { type: 'pty:subscribe' }>>().toHaveProperty('taskId')
  })

  it('pty:resize has cols and rows fields', () => {
    expectTypeOf<Extract<WsMessage, { type: 'pty:resize' }>>().toHaveProperty('cols')
    expectTypeOf<Extract<WsMessage, { type: 'pty:resize' }>>().toHaveProperty('rows')
  })
})

describe('Session type', () => {
  it('has sessionState field', () => {
    expectTypeOf<Session['sessionState']>().toMatchTypeOf<
      'idle' | 'running' | 'waiting_for_input' | 'needs_permission' | undefined
    >()
  })

  it('has provider and model fields', () => {
    expectTypeOf<Session['provider']>().toMatchTypeOf<ModelProvider>()
    expectTypeOf<Session['model']>().toMatchTypeOf<string>()
  })

  it('has providerSessionId field', () => {
    expectTypeOf<Session['providerSessionId']>().toMatchTypeOf<string | undefined>()
  })

  it('has multi-repo shape with repos array and worktree paths', () => {
    expectTypeOf<Session['repos']>().toEqualTypeOf<string[]>()
    expectTypeOf<Session['worktree']>().toEqualTypeOf<SessionWorktree | null>()
    expectTypeOf<SessionWorktree['root']>().toEqualTypeOf<string>()
    expectTypeOf<SessionWorktree['paths']>().toEqualTypeOf<string[]>()
    expectTypeOf<SessionWorktree['branch']>().toEqualTypeOf<string>()
  })
})

describe('WsMessage', () => {
  it('includes chat message types', () => {
    const msg: WsMessage = { type: 'chat:message', taskId: 'TASK-001', text: 'hello' }
    expectTypeOf(msg).toMatchTypeOf<WsMessage>()
  })

  it('includes file:updated type', () => {
    const msg: WsMessage = { type: 'file:updated', taskId: 'TASK-001', fileType: 'todos', content: '[]' }
    expectTypeOf(msg).toMatchTypeOf<WsMessage>()
  })

  it('includes chat:queue:add type', () => {
    const msg: WsMessage = { type: 'chat:queue:add', taskId: 'TASK-001', text: 'hello' }
    expectTypeOf(msg).toMatchTypeOf<WsMessage>()
  })

  it('includes chat:queue:remove type', () => {
    const msg: WsMessage = { type: 'chat:queue:remove', taskId: 'TASK-001', index: 0 }
    expectTypeOf(msg).toMatchTypeOf<WsMessage>()
  })

  it('includes chat:queue:force-send type', () => {
    const msg: WsMessage = { type: 'chat:queue:force-send', taskId: 'TASK-001' }
    expectTypeOf(msg).toMatchTypeOf<WsMessage>()
  })

  it('includes chat:queue:state type', () => {
    const msg: WsMessage = { type: 'chat:queue:state', taskId: 'TASK-001', messages: ['hello', 'world'] }
    expectTypeOf(msg).toMatchTypeOf<WsMessage>()
  })
})

describe('GitStatus type', () => {
  it('has the expected shape', () => {
    expectTypeOf<GitStatus>().toEqualTypeOf<{
      ahead: number
      behind: number
      uncommitted: number
      untracked: number
    }>()
  })
})

describe('WsMessage git:status variant', () => {
  it('accepts a git:status message', () => {
    const msg: WsMessage = {
      type: 'git:status',
      taskId: 'TASK-001',
      status: { ahead: 3, behind: 0, uncommitted: 1, untracked: 2 },
    }
    expectTypeOf(msg).toMatchTypeOf<WsMessage>()
  })
})
