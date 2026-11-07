import Pill from './Pill'
import { priorityPill } from '../theme'
import type { Priority } from '../data/types'

export default function PriorityPill({ priority, className = '' }: { priority: Priority; className?: string }) {
  return (
    <Pill className={`${priorityPill(priority)} ${className}`}>
      <span title={['', 'Urgent', 'High', 'Normal', 'Someday'][priority]}>P{priority}</span>
    </Pill>
  )
}
