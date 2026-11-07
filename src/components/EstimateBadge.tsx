import { Clock } from 'lucide-react'
import { FAINT_TEXT } from '../theme'
import { formatEstimate } from '../ui'

export default function EstimateBadge({ minutes }: { minutes: number }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs whitespace-nowrap tabular-nums ${FAINT_TEXT}`} title="Estimate">
      <Clock className="size-3" aria-hidden />
      {formatEstimate(minutes)}
    </span>
  )
}
