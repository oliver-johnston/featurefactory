import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  onSend: (text: string) => void
  onStop: () => void
  running: boolean
  autoFocus?: boolean
}

export function ChatInput({ onSend, onStop, running, autoFocus = true }: Props) {
  const [text, setText] = useState('')
  const [composing, setComposing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Keep input above virtual keyboard using visualViewport
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const offset = window.innerHeight - (vv.offsetTop + vv.height)
      document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // Auto-focus textarea on mount for desktop only
  useEffect(() => {
    if (autoFocus && window.innerWidth >= 640) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  // Only enter composing mode on mobile (< 640px)
  const handleFocus = useCallback(() => {
    if (window.innerWidth < 640) setComposing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setComposing(false)
  }, [])

  // Lock body scroll when composing to prevent background scrolling
  useEffect(() => {
    if (composing) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [composing])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    if (window.innerWidth < 640) {
      inputRef.current?.blur()
    } else {
      inputRef.current?.focus()
    }
  }

  const handleCancel = () => {
    inputRef.current?.blur()
  }

  return (
    <div
      className={
        composing
          ? 'fixed inset-0 z-50 bg-mantle flex flex-col'
          : 'border-t border-overlay bg-mantle px-3 py-2 flex gap-2 items-end'
      }
      style={composing ? undefined : { marginBottom: 'var(--keyboard-offset, 0px)' }}
    >
      {composing && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-overlay shrink-0">
          <button
            onMouseDown={e => { e.preventDefault(); handleCancel() }}
            className="text-sm text-muted hover:text-text"
          >
            Cancel
          </button>
          {running ? (
            <div className="flex gap-2">
              <button
                onClick={onStop}
                className="bg-red hover:bg-red/80 text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
                title="Stop"
              >
                ■
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); handleSend() }}
                disabled={!text.trim()}
                className="bg-indigo hover:bg-indigo-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
              >
                Send
              </button>
            </div>
          ) : (
            <button
              onMouseDown={e => { e.preventDefault(); handleSend() }}
              disabled={!text.trim()}
              className="bg-indigo hover:bg-indigo-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
            >
              Send
            </button>
          )}
        </div>
      )}
      <textarea
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
        }}
        placeholder="Message Claude…"
        rows={1}
        className={
          composing
            ? 'flex-1 bg-mantle px-3 py-3 text-sm text-text placeholder-muted resize-none focus:outline-none'
            : 'flex-1 bg-surface border border-overlay rounded-lg px-3 py-2 text-sm text-text placeholder-muted resize-none focus:outline-none focus:border-indigo'
        }
        style={composing ? undefined : { minHeight: 40, maxHeight: 120 }}
      />
      {!composing && (
        <div className="flex gap-2 items-end">
          {running && (
            <button
              onClick={onStop}
              className="bg-red hover:bg-red/80 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors shrink-0"
              title="Stop"
            >
              ■
            </button>
          )}
          <button
            onMouseDown={e => { e.preventDefault(); handleSend() }}
            disabled={!text.trim()}
            className="bg-indigo hover:bg-indigo-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors shrink-0"
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}
