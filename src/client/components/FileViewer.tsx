import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  placeholder?: string
}

export function FileViewer({ content, placeholder = 'No content yet.' }: Props) {
  if (!content.trim()) {
    return <p className="text-muted text-sm italic p-4">{placeholder}</p>
  }
  return (
    <div className="prose prose-sm prose-invert max-w-none p-4 overflow-y-auto h-full text-text">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
