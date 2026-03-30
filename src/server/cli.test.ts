import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./index.js', () => ({ main: vi.fn() }))

describe('routeCli', () => {
  let routeCli: (args?: string[]) => Promise<void>
  let mainMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const cli = await import('./cli.js')
    routeCli = cli.routeCli
    const index = await import('./index.js')
    mainMock = index.main as ReturnType<typeof vi.fn>
  })

  it('calls main() when invoked', async () => {
    await routeCli([])
    expect(mainMock).toHaveBeenCalled()
  })
})
