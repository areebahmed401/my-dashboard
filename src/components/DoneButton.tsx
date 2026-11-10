import { Check } from 'lucide-react'
import { FOCUS_RING } from '../theme'

interface Props {
  title: string
  onClick: () => void
  className?: string
}

// Round "mark done" button for task rows
export default function DoneButton({ title, onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mark "${title}" done`}
      title="Mark done"
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-neutral-300 text-transparent transition-colors duration-150 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 dark:border-neutral-600 dark:hover:text-emerald-400 ${FOCUS_RING} focus-visible:ring-emerald-500/50 ${className}`}
    >
      <Check className="size-3" strokeWidth={3} aria-hidden />
    </button>
  )
}
