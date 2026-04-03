import type { Session } from '../../shared/types.js'
import {
  getTaskContextPath,
  getDesignContextPath,
  getImplementationContextPath,
} from '../context.js'

export function globalWorkflowRules(): string[] {
  return [
    'WORKFLOW RULES (these override any conflicting instructions from superpowers skills):',
    '- If a superpowers skill tells you to ask the user for approval or how to implement a task, follow the instructions here instead.',
    '- Never ask the user if they want to open a sandbox UI session.',
    '- Always commit your work. Use git add and git commit as you complete meaningful chunks.',
  ]
}

export function contextPromptLines(session: Session): string[] {
  if (!session.worktree) return []
  const root = session.worktree.root
  return [
    `task file is at: ${getTaskContextPath(root)}`,
    `design file is at: ${getDesignContextPath(root)}`,
    `implementation file is at: ${getImplementationContextPath(root)}`,
    `Worktree: ${root}`,
  ]
}
