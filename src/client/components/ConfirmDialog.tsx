interface Props {
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
      onClick={onCancel}
    >
      <div
        className="bg-surface border border-overlay rounded-lg p-5 max-w-sm mx-4 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm text-text">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="bg-transparent border border-overlay text-muted hover:text-text hover:border-muted transition-colors rounded px-3 py-1.5 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="bg-green/20 border border-green/40 text-green hover:bg-green/30 transition-colors rounded px-3 py-1.5 text-sm font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
