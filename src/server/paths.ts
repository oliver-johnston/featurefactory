import { join } from 'path'

export const FF_DIR = join(process.cwd(), '.featurefactory')
export const TASKS_DIR = join(FF_DIR, 'tasks')
export const WORKTREES_DIR = join(FF_DIR, 'worktrees')
