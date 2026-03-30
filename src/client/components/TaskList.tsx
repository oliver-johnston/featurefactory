interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
}

interface Props {
  todos: TodoItem[]
}

export function TaskList({ todos }: Props) {
  if (todos.length === 0) return null

  return (
    <div>
      <ul className="px-4 py-2 space-y-1.5">
        {todos.map((todo, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0">
              {todo.status === 'completed' && (
                <span className="text-green">✓</span>
              )}
              {todo.status === 'in_progress' && (
                <span className="inline-block w-3.5 h-3.5 border-2 border-indigo rounded-sm animate-pulse" />
              )}
              {todo.status === 'pending' && (
                <span className="inline-block w-3.5 h-3.5 border border-muted rounded-full" />
              )}
            </span>
            <span className={
              todo.status === 'completed' ? 'text-muted line-through' :
              todo.status === 'in_progress' ? 'text-text' :
              'text-subtext'
            }>
              {todo.status === 'in_progress' ? todo.activeForm : todo.content}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
