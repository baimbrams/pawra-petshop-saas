import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils/cn'

export const controlClasses =
  'bg-surface text-ink border-line-strong placeholder:text-ink-subtle w-full rounded-md border px-3 py-1.5 text-[0.8125rem] transition-colors focus:border-brand-500 focus:outline-none disabled:bg-surface-inset disabled:opacity-60'

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-ink block text-xs font-medium">
        {label}
        {required ? <span className="text-critical-600 ms-0.5">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-critical-600 block text-xs">{error}</span>
      ) : hint ? (
        <span className="text-ink-subtle block text-xs">{hint}</span>
      ) : null}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, 'h-9', className)} {...props} />
}

export interface SelectOption {
  value: string
  label: string
}

export function Select({
  options,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options?: readonly SelectOption[] }) {
  return (
    <select className={cn(controlClasses, 'h-9', className)} {...props}>
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  )
}

export function Textarea({ className, rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(controlClasses, 'py-2', className)} {...props} />
}
