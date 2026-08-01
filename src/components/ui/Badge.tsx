import type { ReactNode } from 'react'

export type BadgeTone =
  | 'green'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'red'
  | 'gray'
  | 'amber'

const toneClasses: Record<BadgeTone, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-slate-200 text-slate-700',
  amber: 'bg-amber-100 text-amber-800',
}

const dotColors: Record<BadgeTone, string> = {
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-slate-400',
  amber: 'bg-amber-500',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  dot?: boolean
  pulse?: boolean
  className?: string
}

export function Badge({
  tone = 'gray',
  children,
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-semibold tracking-wide ${toneClasses[tone]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]} ${
            pulse ? 'animate-pulse-dot' : ''
          }`}
        />
      )}
      {children}
    </span>
  )
}
