interface Props {
  messages: string[]
  running: boolean
  onRemove: (index: number) => void
  onForceSend: () => void
}

export function MessageQueue({ messages, running, onRemove, onForceSend }: Props) {
  if (messages.length === 0) return null

  return (
    <div className="border-t border-overlay bg-mantle/50 px-3 py-2 flex items-start gap-2">
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {messages.map((text, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 bg-surface border border-overlay rounded-lg px-2.5 py-1 text-xs text-text max-w-full"
          >
            <span className="truncate flex-1">{text}</span>
            <button
              onClick={() => onRemove(i)}
              className="text-muted hover:text-red shrink-0 text-xs leading-none"
              title="Remove queued message"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {running && (
        <button
          onClick={onForceSend}
          className="bg-amber/20 border border-amber/40 text-amber hover:bg-amber/30 transition-colors rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 whitespace-nowrap"
          title="Stop AI and send queued messages"
        >
          Force Send
        </button>
      )}
    </div>
  )
}
