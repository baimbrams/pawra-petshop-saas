import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'xs' | 'sm' | 'md'

export function buttonClasses(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none'

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-ink-inverse hover:bg-brand-700 border border-brand-700/20 shadow-raised',
    secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-inset shadow-raised',
    ghost: 'bg-transparent text-ink-muted hover:bg-surface-inset hover:text-ink border border-transparent',
    danger: 'bg-critical-600 text-ink-inverse hover:bg-critical-700 border border-critical-700/20',
  }

  const sizes: Record<ButtonSize, string> = {
    xs: 'h-7 px-2.5 text-xs',
    sm: 'h-8 px-3 text-[0.8125rem]',
    md: 'h-9 px-3.5 text-[0.8125rem]',
  }

  return cn(base, variants[variant], sizes[size], className)
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  leadingIcon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props}>
      {leadingIcon ? <span className="shrink-0 [&>svg]:size-3.5">{leadingIcon}</span> : null}
      {children}
    </button>
  )
}

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: ReactNode
}

export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  leadingIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {leadingIcon ? <span className="shrink-0 [&>svg]:size-3.5">{leadingIcon}</span> : null}
      {children}
    </Link>
  )
}
