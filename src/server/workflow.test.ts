import { describe, expect, it } from 'vitest'
import type { Session } from '../shared/types.js'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { getDesignContextPath, getImplementationContextPath } from './context.js'
import {
  applyUserStageTransition,
  buildStageInstructions,
  getInitialTurnInstruction,
  getSessionStage,
  inferStageFromSnapshot,
  syncSessionStage,
} from './workflow.js'

async function createSession(stage?: Session['stage']): Promise<{ root: string; session: Session }> {
  const root = await mkdtemp(join(tmpdir(), 'ff-workflow-test-'))
  const worktree = join(root, 'worktree')
  await mkdir(join(worktree, '.featurefactory'), { recursive: true })

  return {
    root,
    session: {
      id: 'TASK-001',
      title: 'Improve chat window',
      repos: ['/repo'],
      provider: 'openai',
      model: 'gpt-5-codex',
      status: 'active',
      stage,
      created_at: '2026-03-28T10:00:00Z',
      worktree: {
        root: worktree,
        branch: 'feat/TASK-001-improve-chat-window',
        paths: [join(worktree, 'repo')],
      },
    },
  }
}

describe('workflow stage helpers', () => {
  it('defaults missing session stage to brainstorm', () => {
    expect(getSessionStage({} as Session)).toBe('brainstorm')
  })

  it('infers design stage when design doc is substantive', () => {
    expect(inferStageFromSnapshot({
      design: '# Design\n\nUse a split chat layout.',
      implementation: '# Implementation\n\nNo implementation plan yet.\n',
    })).toBe('design')
  })

  it('infers implementation plan when implementation exists', () => {
    expect(inferStageFromSnapshot({
      design: '# Design\n\nApproved',
      implementation: '# Implementation\n\n1. Update websocket flow.',
    })).toBe('implementation_plan')
  })

  it('includes triage instruction for brainstorm stage', () => {
    expect(buildStageInstructions('brainstorm').join('\n')).toContain('quick fix or a more involved task')
  })

  it('implementation_plan instructions do not ask for user approval', () => {
    const joined = buildStageInstructions('implementation_plan').join(' ')
    expect(joined).not.toContain('ask the user for explicit approval')
    expect(joined).toContain('proceed directly')
  })

  it('implementation_plan instructions mention subagent-driven development', () => {
    const joined = buildStageInstructions('implementation_plan').join(' ')
    expect(joined).toContain('subagent-driven development')
  })
})

describe('syncSessionStage', () => {
  it('advances from brainstorm to design after a design doc is written', async () => {
    const { root, session } = await createSession('brainstorm')
    try {
      await writeFile(getDesignContextPath(session.worktree.root), '# Design\n\nAdopt a staged workflow.\n')
      const updated = await syncSessionStage(session)
      expect(updated.stage).toBe('design')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('does not regress an implementation session back to brainstorm', async () => {
    const { root, session } = await createSession('implement')
    try {
      const updated = await syncSessionStage(session)
      expect(updated.stage).toBe('implement')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('auto-advances from implementation_plan to implement when plan is written', async () => {
    const { root, session } = await createSession('implementation_plan')
    try {
      await writeFile(getDesignContextPath(session.worktree.root), '# Design\n\nApproved design.\n')
      await writeFile(getImplementationContextPath(session.worktree.root), '# Implementation\n\n1. Update prompts.\n')
      const updated = await syncSessionStage(session)
      expect(updated.stage).toBe('implement')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('does not auto-advance from implementation_plan when plan is default', async () => {
    const { root, session } = await createSession('implementation_plan')
    try {
      await writeFile(getDesignContextPath(session.worktree.root), '# Design\n\nApproved design.\n')
      await writeFile(getImplementationContextPath(session.worktree.root), '# Implementation\n\nNo implementation plan yet.\n')
      const updated = await syncSessionStage(session)
      expect(updated.stage).toBe('implementation_plan')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('applyUserStageTransition', () => {
  it('moves from design to implementation plan on approval', async () => {
    const { root, session } = await createSession('design')
    try {
      await writeFile(getDesignContextPath(session.worktree.root), '# Design\n\nLooks solid.\n')
      const updated = await applyUserStageTransition(session, 'Looks good, go ahead')
      expect(updated.stage).toBe('implementation_plan')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('does not advance from implementation_plan on approval message', async () => {
    const { root, session } = await createSession('implementation_plan')
    try {
      await writeFile(getDesignContextPath(session.worktree.root), '# Design\n\nApproved.\n')
      await writeFile(getImplementationContextPath(session.worktree.root), '# Implementation\n\n1. Update prompts.\n')
      const updated = await applyUserStageTransition(session, 'Approve the plan and start implementing')
      // Auto-advance via syncSessionStage handles this now, not approval messages.
      // syncSessionStage is called internally and will advance to implement because
      // implementation.md has meaningful content.
      expect(updated.stage).toBe('implement')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('getInitialTurnInstruction', () => {
  it('implementation_plan does not mention asking for approval', () => {
    const instruction = getInitialTurnInstruction('implementation_plan')
    expect(instruction).not.toContain('ask for approval')
    expect(instruction).toContain('proceed directly')
  })

  it('implement mentions subagent-driven development', () => {
    const instruction = getInitialTurnInstruction('implement')
    expect(instruction).toContain('subagent-driven development')
  })
})
