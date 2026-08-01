import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function Layout() {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <Topbar />
        <main className="mx-auto w-full max-w-[1560px] flex-1 px-6 py-6">
          <div className="animate-rise">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-slate-200/70 px-6 py-4">
          <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 text-[12px] text-on-surface-variant">
            <span>© 2026 AquaTex AI Industrial Systems. All Rights Reserved.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="transition hover:text-primary">Support</a>
              <a href="#" className="transition hover:text-primary">Documentation</a>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
                API Status: Operational
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
