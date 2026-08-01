import { useId } from 'react'

export interface ChartSeries {
  name: string
  color: string
  data: number[]
  dashed?: boolean
  area?: boolean
}

interface LineChartProps {
  series: ChartSeries[]
  height?: number
  xLabels?: string[]
  yMin?: number
  yMax?: number
  className?: string
}

const PAD = 8

function buildSmoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export function LineChart({
  series,
  height = 240,
  xLabels,
  yMin,
  yMax,
  className = '',
}: LineChartProps) {
  const gradId = useId().replace(/[:]/g, '')
  const width = 1000
  const all = series.flatMap((s) => s.data)
  const min = yMin ?? Math.min(...all)
  const max = yMax ?? Math.max(...all)
  const range = max - min || 1
  const plotH = height - 2 * PAD

  const toPoints = (data: number[]) =>
    data.map((v, i) => ({
      x: PAD + (i * (width - 2 * PAD)) / (data.length - 1),
      y: PAD + ((max - v) / range) * plotH,
    }))

  return (
    <div className={`w-full ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
      >
        <defs>
          {series.map((s) => {
            if (!s.area) return null
            const gid = `${gradId}-${s.name.replace(/\s/g, '')}`
            return (
              <linearGradient id={gid} key={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            )
          })}
        </defs>

        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PAD}
            x2={width - PAD}
            y1={PAD + (1 - t) * plotH}
            y2={PAD + (1 - t) * plotH}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}

        {series.map((s) => {
          const pts = toPoints(s.data)
          const line = buildSmoothPath(pts)
          const gid = `${gradId}-${s.name.replace(/\s/g, '')}`
          return (
            <g key={s.name}>
              {s.area && (
                <path
                  d={`${line} L ${pts[pts.length - 1].x} ${height - 1} L ${pts[0].x} ${
                    height - 1
                  } Z`}
                  fill={`url(#${gid})`}
                  stroke="none"
                />
              )}
              <path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? 2 : 2.5}
                strokeDasharray={s.dashed ? '8 4' : undefined}
                strokeOpacity={s.dashed ? 0.65 : 1}
                strokeLinecap="round"
              />
            </g>
          )
        })}
      </svg>

      {xLabels && (
        <div className="mt-1 flex justify-between px-1">
          {xLabels.map((l) => (
            <span key={l} className="text-[10.5px] font-medium text-outline">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
