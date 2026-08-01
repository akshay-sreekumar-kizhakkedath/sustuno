interface RingGaugeProps {
  value: number
  size?: number
  stroke?: number
  color?: string
  label?: string
  sublabel?: string
}

export function RingGauge({
  value,
  size = 120,
  stroke = 10,
  color = 'var(--color-primary)',
  label,
  sublabel,
}: RingGaugeProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#eef0f6"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono-data text-[22px] font-semibold leading-none text-on-surface">
          {label ?? `${value}%`}
        </span>
        {sublabel && (
          <span className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}
