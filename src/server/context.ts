import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { basename, join } from 'path'
import type { Session } from '../shared/types.js'
import * as fullPrompt from './prompts/full.js'
import * as quickPrompt from './prompts/quick.js'
import * as debugPrompt from './prompts/debug.js'

export const DEFAULT_TODOS_CONTENT = '[]'
export const DEFAULT_PRS_CONTENT = '[]'
export const DEFAULT_DESIGN_CONTENT = '# Design\n\nNo design notes yet.\n'
export const DEFAULT_IMPLEMENTATION_CONTENT = '# Implementation\n\nNo implementation plan yet.\n'

export function getContextDir(worktreePath: string): string {
  return join(worktreePath, '.featurefactory')
}

export function getTaskContextPath(worktreePath: string): string {
  return join(getContextDir(worktreePath), 'task.md')
}

export function getTodosContextPath(worktreePath: string): string {
  return join(getContextDir(worktreePath), 'todos.json')
}

export function getPrsContextPath(worktreePath: string): string {
  return join(getContextDir(worktreePath), 'prs.json')
}

export function getDesignContextPath(worktreePath: string): string {
  return join(getContextDir(worktreePath), 'design.md')
}

export function getImplementationContextPath(worktreePath: string): string {
  return join(getContextDir(worktreePath), 'implementation.md')
}

function buildTaskMarkdown(session: Session): string {
  return [
    `# ${session.title}`,
    '',
    `- Task ID: ${session.id}`,
    ...session.repos.map(r => `- Repository: ${r}`),
    `- Worktree: ${session.worktree!.root}`,
    `- Branch: ${session.worktree!.branch}`,
    `- Created: ${session.created_at}`,
    '',
    '## Notes',
    '',
    'Add the details, constraints, and goals for this task here.',
    '',
  ].join('\n')
}

async function writeIfMissing(path: string, content: string): Promise<void> {
  if (existsSync(path)) return
  await writeFile(path, content, 'utf-8')
}

async function copyIfMissing(targetPath: string, sourcePath: string): Promise<boolean> {
  if (existsSync(targetPath) || !existsSync(sourcePath)) return false
  const content = await readFile(sourcePath, 'utf-8')
  await writeFile(targetPath, content, 'utf-8')
  return true
}

function getWorkflowPrompts(workflow: string) {
  switch (workflow) {
    case 'quick': return quickPrompt
    case 'debug': return debugPrompt
    case 'full':
    default: return fullPrompt
  }
}

export async function generateClaudeMd(session: Session): Promise<void> {
  if (session.workflow === 'free' || !session.worktree) return

  const claudeMdPath = join(session.worktree.root, 'CLAUDE.md')
  const repoList = session.repos
    .map(r => `- \`${basename(r)}/\` — worktree of ${r}`)
    .join('\n')
  const rules = getWorkflowPrompts(session.workflow ?? 'full').claudeMdRules()
  const content = [
    `# ${session.title}`,
    '',
    `Task ID: ${session.id}`,
    `Branch: ${session.worktree.branch}`,
    '',
    '## Repositories',
    '',
    repoList,
    '',
    '## Context Files',
    '',
    'Task, design, and implementation files are in `.featurefactory/` in this directory (not inside any repo worktree).',
    '',
    '## Workflow Rules',
    '',
    'These rules take priority over any conflicting instructions loaded from superpowers skills.',
    '',
    ...rules,
    '',
  ].join('\n')
  await writeFile(claudeMdPath, content, 'utf-8')
}

export async function ensureSessionContextFiles(session: Session, legacyTaskDir: string): Promise<void> {
  if (session.workflow === 'free' || !session.worktree) return

  const contextDir = getContextDir(session.worktree.root)
  await mkdir(contextDir, { recursive: true })

  const taskPath = getTaskContextPath(session.worktree.root)
  const todosPath = getTodosContextPath(session.worktree.root)
  const prsPath = getPrsContextPath(session.worktree.root)
  const designPath = getDesignContextPath(session.worktree.root)
  const implementationPath = getImplementationContextPath(session.worktree.root)

  // Detect stale context: if task.md exists but belongs to a different session,
  // all files are stale (leftover from repo checkout) and must be overwritten.
  let isStale = false
  if (existsSync(taskPath)) {
    try {
      const existing = await readFile(taskPath, 'utf-8')
      isStale = !existing.includes(`Task ID: ${session.id}`)
    } catch {
      isStale = true
    }
  }

  // Always write task.md (it's session-specific metadata)
  await writeFile(taskPath, buildTaskMarkdown(session), 'utf-8')

  if (isStale) {
    // Stale files from another session — overwrite with fresh defaults
    await writeFile(todosPath, DEFAULT_TODOS_CONTENT, 'utf-8')
    await writeFile(prsPath, DEFAULT_PRS_CONTENT, 'utf-8')
    await writeFile(designPath, DEFAULT_DESIGN_CONTENT, 'utf-8')
    await writeFile(implementationPath, DEFAULT_IMPLEMENTATION_CONTENT, 'utf-8')
  } else {
    // Fresh session or resuming — write only if missing
    await writeIfMissing(todosPath, DEFAULT_TODOS_CONTENT)
    await writeIfMissing(prsPath, DEFAULT_PRS_CONTENT)
    await writeIfMissing(designPath, DEFAULT_DESIGN_CONTENT)
    await writeIfMissing(implementationPath, DEFAULT_IMPLEMENTATION_CONTENT)
  }
}
