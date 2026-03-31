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
  const buttonsRef = useRef<HTMLDivElement>(null)

  // Resize app to visual viewport only when mobile keyboard is open
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      if (isMobile() && vv.height < window.innerHeight - 50) {
        // Keyboard is open — shrink app to visible area
        document.documentElement.style.setProperty('--app-height', `${vv.height}px`)
        window.scrollTo(0, 0)
      } else {
        // No keyboard — let 100dvh handle it
        document.documentElement.style.removeProperty('--app-height')
      }
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

  // On desktop: auto-resize textarea to fit content
  // On mobile: match textarea height to buttons column
  const syncHeight = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    if (isMobile()) {
      const buttons = buttonsRef.current
      if (buttons) {
        el.style.height = `${buttons.offsetHeight}px`
      }
    } else {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }
  }, [])

  useEffect(() => {
    syncHeight()
  }, [text, running, syncHeight])

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
    <div className="border-t border-overlay bg-mantle px-3 py-2 flex gap-2 items-stretch">
      <textarea
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
            e.preventDefault()
            handleSend()
          }
        }}
        placeholder="Message Claude…"
        rows={1}
        className="flex-1 bg-surface border border-overlay rounded-lg px-3 py-2 text-sm text-text placeholder-muted resize-none focus:outline-none focus:border-indigo"
        style={isMobile() ? undefined : { minHeight: 40, maxHeight: 200 }}
      />
      <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile: always show stop, dimmed when not running. Desktop: only show when running */}
        <button
          onClick={onStop}
          disabled={!running}
          className={`${running ? 'bg-red hover:bg-red/80' : 'bg-red/30 cursor-not-allowed'} text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors w-16 ${running ? 'sm:inline-flex' : 'sm:hidden'} sm:w-auto`}
          title="Stop"
        >
          ■
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); handleSend() }}
          disabled={!text.trim()}
          className="bg-indigo hover:bg-indigo-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:shrink-0 w-16 sm:w-auto"
        >
          Send
        </button>
      </div>
    </div>
  )
}
