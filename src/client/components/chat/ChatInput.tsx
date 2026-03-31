import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  onSend: (text: string) => void
  onStop: () => void
  running: boolean
  autoFocus?: boolean
}

function isMobile() {
  return window.innerWidth < 640
}

export function ChatInput({ onSend, onStop, running, autoFocus = true }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Resize app to visual viewport (shrinks when mobile keyboard opens)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      document.documentElement.style.setProperty('--app-height', `${vv.height}px`)
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
    if (autoFocus && !isMobile()) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [text, autoResize])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    if (isMobile()) {
      inputRef.current?.blur()
    } else {
      inputRef.current?.focus()
    }
  }

  return (
    <div className="border-t border-overlay bg-mantle px-3 py-2 flex gap-2 items-end">
      <textarea
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          // Desktop: Enter sends, Shift+Enter inserts newline
          // Mobile: Enter always inserts newline
          if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
            e.preventDefault()
            handleSend()
          }
        }}
        placeholder="Message Claude…"
        rows={1}
        className="flex-1 bg-surface border border-overlay rounded-lg px-3 py-2 text-sm text-text placeholder-muted resize-none focus:outline-none focus:border-indigo"
        style={{ minHeight: 40, maxHeight: 200 }}
      />
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
    </div>
  )
}
