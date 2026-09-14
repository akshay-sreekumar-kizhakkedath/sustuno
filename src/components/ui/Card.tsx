import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface CardProps {
  children: ReactNode
  className?: string
  accent?: string
  hover?: boolean
}

export function Card({ children, className = '', accent, hover = false }: CardProps) {
  return (
    <div
      className={`relative rounded-lg bg-white shadow-card ${
        hover
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover'
          : ''
      } ${className}`}
    >
      {accent && (
        <span
          className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
          style={{ backgroundColor: accent }}
        />
      )}
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  icon?: string
  badge?: ReactNode
  actions?: ReactNode
}

export function CardHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-container-low text-primary">
            <Icon name={icon} className="text-[20px]" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-on-surface">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-on-surface-variant">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: string
  accent?: string
  badge?: ReactNode
  progress?: { value: number; color: string }
  className?: string
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'var(--color-primary)',
  badge,
  progress,
  className = '',
}: StatCardProps) {
  return (
    <Card accent={accent} hover className={className}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {label}
            </p>
            <p className="mt-1.5 font-mono-data text-[26px] font-semibold leading-none text-on-surface">
              {value}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
            <Icon name={icon} className="text-[22px]" />
          </div>
        </div>
        {sub && <div className="mt-3 text-[12.5px] text-on-surface-variant">{sub}</div>}
        {badge && <div className="mt-3">{badge}</div>}
        {progress && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress.value}%`,
                backgroundColor: progress.color,
              }}
            />
          </div>
        )}
      </div>
    </Card>
  )
}

interface InfoRowProps {
  label: string
  value: ReactNode
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] text-on-surface-variant">{label}</span>
      <span className="text-[13.5px] font-semibold text-on-surface">{value}</span>
    </div>
  )
}
