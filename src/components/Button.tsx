import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { buttonClass } from './classes'
import type { ButtonSize, ButtonVariant } from './classes'
import type { AccentKey } from '../theme'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  accent?: AccentKey
  icon?: LucideIcon
  children?: ReactNode
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  accent = 'home',
  icon: Icon,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${buttonClass({ variant, size, accent })} ${className}`} {...rest}>
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />}
      {children}
    </button>
  )
}
