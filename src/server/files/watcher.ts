import chokidar from 'chokidar'
import { readFile as fsReadFile } from 'fs/promises'
import type { FileType } from '../../shared/types.js'
import {
  getDesignContextPath,
  getImplementationContextPath,
  getPrsContextPath,
  getTodosContextPath,
} from '../context.js'

type OnChange = (fileType: FileType, content: string) => void

export class FileWatcher {
  private taskId: string
  private worktreeDir: string   // .featurefactory/worktrees/{id}/
  private watcher: ReturnType<typeof chokidar.watch> | null = null

  constructor(taskId: string, _taskDir: string, worktreeDir: string) {
    this.taskId = taskId
    this.worktreeDir = worktreeDir
  }

  async start(onChange: OnChange): Promise<void> {
    const todosPath = getTodosContextPath(this.worktreeDir)
    const prsPath = getPrsContextPath(this.worktreeDir)
    const designPath = getDesignContextPath(this.worktreeDir)
    const implementationPath = getImplementationContextPath(this.worktreeDir)

    const pathToType = new Map<string, FileType>([
      [todosPath, 'todos'],
      [prsPath, 'prs'],
      [designPath, 'design'],
      [implementationPath, 'implementation'],
    ])

    this.watcher = chokidar.watch(
      [todosPath, prsPath, designPath, implementationPath],
      { ignoreInitial: true, persistent: false, usePolling: true, interval: 100 },
    )
    this.watcher.on('change', async (changedPath: string) => {
      const fileType = pathToType.get(changedPath)
      if (!fileType) return
      const content = await this.readFile(fileType)
      onChange(fileType, content)
    })
    await new Promise<void>(resolve => {
      this.watcher!.on('ready', resolve)
    })
  }

  async stop(): Promise<void> {
    await this.watcher?.close()
    this.watcher = null
  }

  async readFile(fileType: FileType): Promise<string> {
    const path = await this.resolvePath(fileType)
    if (!path) return ''
    try {
      return await fsReadFile(path, 'utf-8')
    } catch {
      return ''
    }
  }

  private async resolvePath(fileType: FileType): Promise<string | null> {
    if (fileType === 'todos') {
      return getTodosContextPath(this.worktreeDir)
    }
    if (fileType === 'prs') {
      return getPrsContextPath(this.worktreeDir)
    }
    return fileType === 'design'
      ? getDesignContextPath(this.worktreeDir)
      : getImplementationContextPath(this.worktreeDir)
  }
}
