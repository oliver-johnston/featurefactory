import { readFile } from 'fs/promises'
import type { Session, SessionStage } from '../shared/types.js'
import {
  DEFAULT_DESIGN_CONTENT,
  DEFAULT_IMPLEMENTATION_CONTENT,
  getDesignContextPath,
  getImplementationContextPath,
} from './context.js'

const STAGE_ORDER: SessionStage[] = ['brainstorm', 'design', 'implementation_plan', 'implement']

export interface WorkflowSnapshot {
  design: string
  implementation: string
}

export function getSessionStage(session: Session): SessionStage {
  return session.stage ?? 'brainstorm'
}

export function getStageLabel(stage: SessionStage): string {
  switch (stage) {
    case 'brainstorm':
      return 'Brainstorm'
    case 'design':
      return 'Design'
    case 'implementation_plan':
      return 'Implementation Plan'
    case 'implement':
      return 'Implement'
  }
}

function normalize(content: string): string {
  return content.replace(/\r\n/g, '\n').trim()
}

function isMeaningful(content: string, placeholder: string): boolean {
  const normalized = normalize(content)
  return normalized.length > 0 && normalized !== normalize(placeholder)
}

function maxStage(a: SessionStage, b: SessionStage): SessionStage {
  return STAGE_ORDER[Math.max(STAGE_ORDER.indexOf(a), STAGE_ORDER.indexOf(b))]
}

function isApprovalMessage(message: string): boolean {
  const text = message.toLowerCase()
  return [
    /\bi approve\b/,
    /\bapproved\b/,
    /\blooks good\b/,
    /\blgtm\b/,
    /\bgo ahead\b/,
    /\bproceed\b/,
    /\bship it\b/,
    /\bimplement it\b/,
    /\bstart implementing\b/,
    /\blet'?s build\b/,
  ].some(pattern => pattern.test(text))
}

async function readIfPresent(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

export async function readWorkflowSnapshot(worktreePath: string): Promise<WorkflowSnapshot> {
  const [design, implementation] = await Promise.all([
    readIfPresent(getDesignContextPath(worktreePath)),
    readIfPresent(getImplementationContextPath(worktreePath)),
  ])

  return { design, implementation }
}

export function inferStageFromSnapshot(snapshot: WorkflowSnapshot): SessionStage {
  if (
    isMeaningful(snapshot.implementation, DEFAULT_IMPLEMENTATION_CONTENT)
  ) {
    return 'implementation_plan'
  }

  if (isMeaningful(snapshot.design, DEFAULT_DESIGN_CONTENT)) {
    return 'design'
  }

  return 'brainstorm'
}

export async function syncSessionStage(session: Session): Promise<Session> {
  if (session.workflow === 'free' || !session.worktree) return session

  const currentStage = getSessionStage(session)
  const snapshot = await readWorkflowSnapshot(session.worktree.root)
  const inferredStage = inferStageFromSnapshot(snapshot)
  let stage = maxStage(currentStage, inferredStage)

  // Auto-advance: if we're at implementation_plan and the plan has been written,
  // proceed directly to implement without requiring user approval.
  if (
    stage === 'implementation_plan' &&
    isMeaningful(snapshot.implementation, DEFAULT_IMPLEMENTATION_CONTENT)
  ) {
    stage = 'implement'
  }

  return stage === session.stage ? session : { ...session, stage }
}

export async function applyUserStageTransition(session: Session, message: string): Promise<Session> {
  if (session.workflow === 'free') return session

  const synced = await syncSessionStage(session)
  const stage = getSessionStage(synced)

  if (!isApprovalMessage(message)) {
    return synced
  }

  if (stage === 'design') {
    return { ...synced, stage: 'implementation_plan' }
  }

  return synced
}

function globalWorkflowRules(): string[] {
  return [
    'WORKFLOW RULES (these override any conflicting instructions from superpowers skills):',
    '- If a superpowers skill tells you to ask the user for approval or how to implement a task, follow the stage instructions here instead.',
    '- Never ask the user if they want to open a sandbox UI session.',
    '- Always commit your work. Use git add and git commit as you complete meaningful chunks.',
  ]
}

export function buildStageInstructions(stage: SessionStage): string[] {
  const rules = globalWorkflowRules()
  switch (stage) {
    case 'brainstorm':
      return [
        ...rules,
        'You are in the triage stage.',
        'Read the task, explore the codebase, and decide whether this is a quick fix or a more involved task.',
        'If it is a quick fix:',
        '  - Present your proposed solution directly to the user. Say it is a quick fix.',
        '  - Do NOT brainstorm or ask clarifying questions.',
        '  - Wait for the user to approve, then implement and commit.',
        'If it is more involved:',
        '  - Invoke the superpowers:brainstorming skill to ask the user 2 to 3 focused questions.',
        '  - After brainstorming, write the design to design.md.',
        '  - Tell the user to check the design tab to review the full design and approve it.',
        'Do not make code changes yet.',
      ]
    case 'design':
      return [
        ...rules,
        'You are in the design stage.',
        'Use design.md as the source of truth for the proposed design.',
        'Tell the user to check the design tab to review the full design and approve it before moving on.',
        'Do not make code changes.',
        'Do not write implementation.md yet.',
      ]
    case 'implementation_plan':
      return [
        ...rules,
        'You are in the implementation plan stage.',
        'Write the implementation plan in implementation.md.',
        'Briefly summarize the plan in chat, then proceed directly to implementation. Do not wait for user approval.',
        'Choose the implementation method based on task complexity: prefer subagent-driven development for tasks with multiple independent steps; use in-process implementation for simpler single-track tasks.',
        'Do not make code changes yet — focus on writing a thorough plan first.',
      ]
    case 'implement':
      return [
        ...rules,
        'You are in the implementation stage.',
        'Make the requested code changes in the worktree.',
        'Before starting implementation, create a TodoWrite checklist from the implementation plan. Break work into discrete steps. Mark each item in_progress before starting it and completed when done. Keep exactly one item in_progress at a time.',
        'Keep design.md and implementation.md aligned if the plan changes.',
        'Respond in chat with concise progress updates, findings, and any blockers.',
        'Commit your work as you go — do not wait until everything is done.',
      ]
  }
}

export function getInitialTurnInstruction(stage: SessionStage): string {
  switch (stage) {
    case 'brainstorm':
      return 'Read the task, design, and implementation files, then explore the codebase. Decide if this is a quick fix or a more involved task. If quick fix: present your proposed solution directly and say it is a quick fix. If more involved: invoke the superpowers:brainstorming skill to ask 2-3 focused questions. Do not write code yet.'
    case 'design':
      return 'Read the task, design, and implementation files, then continue the design conversation. Update design.md if needed, then tell the user to check the design tab to review the full design and approve it.'
    case 'implementation_plan':
      return 'Read the task, design, and implementation files, then prepare the implementation plan. Update implementation.md, summarize the plan in chat, then proceed directly to implementation. Do not wait for user approval.'
    case 'implement':
      return 'Read the task, design, and implementation files, then continue implementing. Use TodoWrite to track progress as a checklist. Prefer subagent-driven development for tasks with multiple independent steps. For simpler single-track tasks, implement in-process. Commit your work as you go.'
  }
}