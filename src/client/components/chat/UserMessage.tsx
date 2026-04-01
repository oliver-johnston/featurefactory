interface Props {
  text: string
}

export function UserMessage({ text }: Props) {
  return (
    <div className="mb-3">
      <div className="bg-surface/40 border-l-[3px] border-l-indigo text-text text-sm rounded-lg px-4 py-3 whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )
}
