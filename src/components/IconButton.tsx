import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { iconButtonClass } from './classes'
import type { AccentKey } from '../theme'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon
  label: string // aria-label and tooltip
  accent?: AccentKey
  size?: 'sm' | 'md'
  active?: boolean
  href?: string // renders a link instead of a button
}

export default function IconButton({
  icon: Icon,
  label,
  accent = 'home',
  size = 'md',
  active = false,
  href,
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  const cls = `${iconButtonClass(size, accent, active)} ${className}`
  const icon = <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} aria-hidden />
  if (href) {
    return (
      <a href={href} aria-label={label} title={label} className={cls} aria-current={active ? 'page' : undefined}>
        {icon}
      </a>
    )
  }
  return (
    <button type={type} aria-label={label} title={label} className={cls} {...rest}>
      {icon}
    </button>
  )
}
