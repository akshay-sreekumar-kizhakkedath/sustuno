import { useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Badge } from '../ui/Badge'
import { MODULE_META } from '../../config/navigation'
import { BatchSelector } from '../workflow/BatchSelector'

export function Topbar() {
  const { pathname } = useLocation()
  const meta = MODULE_META[pathname] ?? MODULE_META['/']

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-slate-200/70 bg-surface-container-lowest/90 px-6 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h2 className="truncate text-[18px] font-bold text-on-surface">{meta.title}</h2>
        <div className="hidden items-center gap-2 xl:flex">
          <Badge tone="green" dot pulse>
            Status: Optimal
          </Badge>
          <Badge tone="blue">
            <Icon name="rss_feed" className="text-[13px]" />
            Network: Stable
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <BatchSelector />
        <div className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 md:flex">

          <Icon name="search" className="text-[18px] text-outline" />
          <input
            className="w-full bg-transparent text-[13px] text-on-surface outline-none placeholder:text-outline"
            placeholder="Search parameters..."
          />
        </div>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high"
          aria-label="Notifications"
        >
          <Icon name="notifications" className="text-[21px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high"
          aria-label="System settings"
        >
          <Icon name="settings" className="text-[21px]" />
        </button>
        <div className="ml-1 flex items-center gap-2.5 border-l border-slate-200 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[12px] font-bold text-white">
            AR
          </div>
          <div className="hidden leading-tight lg:block">
            <p className="text-[12.5px] font-semibold text-on-surface">Admin Profile</p>
            <p className="text-[11px] text-on-surface-variant">System Administrator</p>
          </div>
        </div>
      </div>
    </header>
  )
}
