import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { MODULE_META } from '../../config/navigation'

interface PageHeaderProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { pathname } = useLocation()
  const meta = MODULE_META[pathname]
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-on-surface">
          {title ?? meta?.title}
        </h2>
        <p className="mt-1 max-w-2xl text-[13.5px] text-on-surface-variant">
          {subtitle ?? meta?.subtitle}
        </p>
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ai'
  icon?: string
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary:
      'bg-primary text-white hover:bg-primary-deep shadow-sm',
    secondary:
      'border border-slate-200 bg-white text-on-surface hover:bg-slate-50',
    ai: 'bg-ai text-white hover:bg-purple-700 shadow-sm',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-all active:scale-[0.98] ${styles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="material-symbols-outlined text-[18px] leading-none">{icon}</span>}
      {children}
    </button>
  )
}
