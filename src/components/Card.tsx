import type { HTMLAttributes, ReactNode } from 'react'
import { FOCUS_RING, SURFACE } from '../theme'

interface CardProps extends HTMLAttributes<HTMLElement> {
  href?: string // makes the whole card a link with hover lift
  padded?: boolean
  children?: ReactNode
}

export default function Card({ href, padded = true, className = '', children, ...rest }: CardProps) {
  const pad = padded ? 'p-4 sm:p-5' : ''
  if (href) {
    return (
      <a
        href={href}
        className={`group block ${SURFACE} ${pad} transition-colors duration-150 hover:border-neutral-300 dark:hover:border-neutral-700 ${FOCUS_RING} focus-visible:ring-neutral-500/40 ${className}`}
        {...rest}
      >
        {children}
      </a>
    )
  }
  return (
    <div className={`${SURFACE} ${pad} ${className}`} {...rest}>
      {children}
    </div>
  )
}
