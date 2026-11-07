import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 px-6 py-10 text-center dark:border-neutral-800 ${className}`}
    >
      {Icon && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
      {description && <div className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
