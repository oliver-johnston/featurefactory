interface Props {
  text: string
}

export function UserMessage({ text }: Props) {
  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[80%] bg-indigo/20 border border-indigo/40 text-text text-sm rounded-2xl rounded-br-sm px-4 py-2">
        {text}
      </div>
    </div>
  )
}
