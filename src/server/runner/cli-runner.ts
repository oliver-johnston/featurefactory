import { spawn } from 'child_process'
import { createInterface } from 'readline'
import type { ChatRunner, HistoryEntry, OnDone, OnError, OnEvent, ProviderStrategy } from './types.js'

export class CliRunner implements ChatRunner {
  private providerSessionId: string | null = null
  private killing = false
  private running = false
  private history: HistoryEntry[] = []
  private proc: ReturnType<typeof spawn> | null = null
  private rl: ReturnType<typeof createInterface> | null = null

  constructor(
    private taskId: string,
    private cwd: string,
    private strategy: ProviderStrategy,
    private model: string,
    private systemPrompt: string,
    private initialPrompt: string,
  ) {}

  start(onEvent: OnEvent, onDone: OnDone, onError: OnError): void {
    this.runPrompt(this.initialPrompt, onEvent, onDone, onError)
  }

  sendMessage(text: string, onEvent: OnEvent, onDone: OnDone, onError: OnError): void {
    this.runPrompt(text, onEvent, onDone, onError)
  }

  setPrompts(systemPrompt: string, initialPrompt: string): void {
    this.systemPrompt = systemPrompt
    this.initialPrompt = initialPrompt
  }

  kill(): void {
    this.killing = true
    this.rl?.close()
    this.rl = null
    this.proc?.kill()
    this.proc = null
  }

  killAsync(): Promise<void> {
    if (!this.running) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const proc = this.proc
      this.killing = true
      this.rl?.close()
      this.rl = null
      if (proc) {
        proc.on('close', () => {
          resolve()
        })
        proc.kill()
      } else {
        resolve()
      }
      this.proc = null
    })
  }

  getProviderSessionId(): string | null {
    return this.providerSessionId
  }

  setProviderSessionId(id: string): void {
    this.providerSessionId = id
  }

  getHistory(): HistoryEntry[] {
    return [...this.history]
  }

  recordUserMessage(text: string): void {
    this.history.push({ kind: 'user', text })
  }

  recordDone(): void {
    this.history.push({ kind: 'done' })
  }

  recordError(error: string): void {
    this.history.push({ kind: 'error', error })
  }

  private log(msg: string): void {
    console.log(`[runner:${this.taskId}] ${msg}`)
  }

  private runPrompt(
    prompt: string,
    onEvent: OnEvent,
    onDone: OnDone,
    onError: OnError,
  ): void {
    if (this.running) {
      onError('A turn is already in progress')
      return
    }
    this.killing = false
    this.running = true
    let doneCalled = false

    this.strategy.resolveCommand().then((command) => {
      const args = this.providerSessionId
        ? this.strategy.buildResumeArgs({ sessionId: this.providerSessionId, model: this.model, prompt })
        : this.strategy.buildArgs({ model: this.model, systemPrompt: this.systemPrompt, prompt })

      this.log(`spawning ${command} ${args.slice(0, 4).join(' ')}...`)
      const proc = spawn(command, args, { cwd: this.cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
      this.proc = proc

      const rl = createInterface({ input: proc.stdout })
      this.rl = rl
      rl.on('line', (line) => {
        const parsed = this.strategy.parseLine(line)
        if (!parsed) return
        if (parsed.type === 'session_id') {
          this.providerSessionId = parsed.id
          this.log(`session id: ${parsed.id}`)
        } else if (parsed.type === 'event') {
          this.history.push({ kind: 'event', event: parsed.event })
          onEvent(parsed.event)
        } else if (parsed.type === 'done') {
          this.running = false
          this.proc = null
          if (!this.killing && !doneCalled) {
            doneCalled = true
            onDone()
          }
        }
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        console.error(`[runner:${this.taskId}] stderr:`, chunk.toString())
      })

      proc.on('close', (code) => {
        this.rl?.close()
        this.rl = null
        this.running = false
        this.proc = null
        if (this.killing) return
        if (code === 0 || code === null) {
          if (!doneCalled) {
            doneCalled = true
            onDone()
          }
        } else {
          onError(`Process exited with code ${code}`)
        }
      })

      proc.on('error', (err: Error) => {
        this.running = false
        this.proc = null
        if (!this.killing) onError(err.message)
      })
    }).catch((err: unknown) => {
      this.running = false
      onError(err instanceof Error ? err.message : String(err))
    })
  }
}
