import { spawn } from 'child_process'
import { join } from 'path'

const cwd = process.cwd()
const isWindows = process.platform === 'win32'

function binPath(name) {
  return join(cwd, 'node_modules', '.bin', isWindows ? `${name}.cmd` : name)
}

function startProcess(label, command, args) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    detached: !isWindows,
    env: process.env,
  })

  child.on('error', (error) => {
    console.error(`[dev:${label}] failed to start: ${error.message}`)
  })

  return child
}

function terminateProcess(child, signal = 'SIGTERM') {
  if (!child || child.killed || child.exitCode !== null) return

  try {
    if (isWindows) {
      child.kill(signal)
      return
    }
    process.kill(-child.pid, signal)
  } catch {
    // Process already exited.
  }
}

const children = [
  { label: 'server', child: startProcess('server', binPath('tsx'), ['watch', 'src/server/index.ts']) },
  { label: 'vite', child: startProcess('vite', binPath('vite'), []) },
]

let shuttingDown = false

function shutdown(signal = 'SIGTERM', exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true

  for (const { child } of children) {
    terminateProcess(child, signal)
  }

  setTimeout(() => {
    for (const { child } of children) {
      terminateProcess(child, 'SIGKILL')
    }
  }, 1500).unref()

  setTimeout(() => {
    process.exit(exitCode)
  }, 1600).unref()
}

for (const { label, child } of children) {
  child.on('exit', (code, signal) => {
    if (shuttingDown) return

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`
    console.log(`[dev] ${label} exited with ${reason}; shutting down the rest`)

    const exitCode = typeof code === 'number' ? code : 0
    shutdown('SIGTERM', exitCode)
  })
}

process.on('SIGINT', () => shutdown('SIGINT', 0))
process.on('SIGTERM', () => shutdown('SIGTERM', 0))
process.on('exit', () => shutdown('SIGTERM', 0))
