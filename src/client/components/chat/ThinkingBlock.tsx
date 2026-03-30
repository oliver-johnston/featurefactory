import { useEffect, useRef, useState } from 'react'

interface Props {
  thinking: string
  durationSeconds?: number
  streaming?: boolean
}

export function ThinkingBlock({ thinking, durationSeconds, streaming }: Props) {
  const [open, setOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const mountedAt = useRef(Date.now())

  useEffect(() => {
    if (!streaming || durationSeconds != null) return
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - mountedAt.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [streaming, durationSeconds])

  let label: string
  if (durationSeconds != null) {
    label = `Thought for ${durationSeconds}s`
  } else if (streaming) {
    label = `Thinking … (${elapsed}s)`
  } else {
    label = 'Thought'
  }

  return (
    <div className="my-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-muted flex items-center gap-1 hover:text-subtext transition-colors"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>{label}</span>
      </button>
      {open && (
        <pre className="mt-1 text-xs text-muted bg-mantle rounded p-2 whitespace-pre-wrap font-mono overflow-x-auto">
          {thinking}
        </pre>
      )}
    </div>
  )
}
