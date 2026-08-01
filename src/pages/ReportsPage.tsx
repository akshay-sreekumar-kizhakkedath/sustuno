import { useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import {
  reportTypes,
  facilitySegments,
  exportFormats,
  recentReports,
  insightsSummary,
  type ReportType,
} from '../data/reports'

const chipTone: Record<string, string> = {
  red: 'bg-red-100 text-red-700',
  green: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
}

const iconToneClass: Record<string, string> = {
  red: 'text-red-600',
  blue: 'text-blue-600',
  green: 'text-emerald-600',
  gray: 'text-slate-500',
}

export function ReportsPage() {
  const [types, setTypes] = useState<ReportType[]>(reportTypes)

  const toggleType = (label: string) => {
    setTypes((prev) =>
      prev.map((t) => (t.label === label ? { ...t, active: !t.active } : t)),
    )
  }

  return (
    <>
      <PageHeader
        actions={
          <Button variant="secondary" icon="history">
            View Audit Log
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Report generator */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Report Generator"
            subtitle="Select parameters to compile a new intelligence report"
            icon="analytics"
          />
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {types.map((t) => {
                const accent =
                  t.accent === 'purple'
                    ? 'text-secondary border-secondary bg-secondary/5'
                    : t.accent === 'green'
                      ? 'text-emerald-600 border-emerald-500 bg-emerald-50'
                      : t.active
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 text-on-surface-variant hover:border-primary/40'
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => toggleType(t.label)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-4 transition ${accent}`}
                  >
                    <Icon name={t.icon} filled={t.active} className="text-[22px]" />
                    <span className="text-[11.5px] font-semibold">{t.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">
                  Facility Segment
                </span>
                <select className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                  {facilitySegments.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">
                    Start Date
                  </span>
                  <input
                    type="date"
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">
                    End Date
                  </span>
                  <input
                    type="date"
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-[11.5px] text-on-surface-variant">
                Compiles compliance, predictive, and sustainability sections.
              </p>
              <Button variant="primary" icon="auto_awesome">
                Compile Report
              </Button>
            </div>
          </div>
        </Card>

        {/* Export center */}
        <Card>
          <CardHeader title="Export Center" subtitle="Choose your output format" icon="output" />
          <div className="space-y-3 p-5">
            {exportFormats.map((f) => (
              <button
                key={f.label}
                type="button"
                className="group flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3.5 text-left transition hover:border-primary/40 hover:shadow-card"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-[20px] ${chipTone[f.chip]}`}>
                  <Icon name={f.icon} />
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold text-on-surface">{f.label}</span>
                  <span className="block text-[11.5px] text-on-surface-variant">{f.sub}</span>
                </span>
                <Icon name="download" className="text-[19px] text-outline transition group-hover:text-primary" />
              </button>
            ))}
            <div className="mt-1 grid grid-cols-2 gap-3">
              <Button variant="secondary" icon="print">
                Print
              </Button>
              <Button variant="secondary" icon="mail">
                Email
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent reports table */}
      <Card className="mt-6">
        <CardHeader
          title="Recent Reports"
          subtitle="History of the last 30 days"
          icon="history"
          actions={
            <>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-slate-100">
                <Icon name="filter_list" className="text-[20px]" />
              </button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-slate-100">
                <Icon name="refresh" className="text-[20px]" />
              </button>
            </>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-5 py-3 font-semibold">Report Name</th>
                <th className="px-5 py-3 font-semibold">Generated Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((r) => (
                <tr key={r.name} className="border-b border-slate-50 transition hover:bg-surface-container-low">
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-2.5">
                      <Icon name={r.icon} className={`text-[19px] ${iconToneClass[r.iconTone]}`} />
                      <span className="font-mono-data text-[12.5px] font-medium text-on-surface">
                        {r.name}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant">{r.date}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={r.typeTone}>{r.type}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone="green" dot>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary">
                        <Icon name="download" className="text-[19px]" />
                      </button>
                      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary">
                        <Icon name="more_vert" className="text-[19px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-[11.5px] text-on-surface-variant">Showing 4 of 28 reports</span>
          <div className="flex items-center gap-1">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-[12.5px] font-semibold text-on-surface-variant transition hover:bg-slate-100">
              1
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[12.5px] font-semibold text-white">
              2
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-[12.5px] font-semibold text-on-surface-variant transition hover:bg-slate-100">
              3
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-on-surface-variant transition hover:bg-slate-100">
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
        </div>
      </Card>

      {/* Insights summary */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {insightsSummary.map((s) => (
          <Card key={s.label} hover className="p-5 text-center">
            <p className="font-mono-data text-[26px] font-semibold text-primary">{s.value}</p>
            <p className="mt-1 text-[12.5px] text-on-surface-variant">{s.label}</p>
          </Card>
        ))}
      </div>
    </>
  )
}
