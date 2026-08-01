import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { NAV_ITEMS, type NavItem } from '../../config/navigation'

function NavLinkItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-primary text-white shadow-sm'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
        }`
      }
    >
      <Icon
        name={item.icon}
        className={`text-[20px] ${item.badge === 'AI' ? 'group-hover:text-ai' : ''}`}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${
            item.badge === 'AI'
              ? 'bg-ai text-white'
              : 'bg-secondary text-white'
          }`}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[264px] flex-col border-r border-slate-200/70 bg-white px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <Icon name="water_drop" filled />
        </div>
        <div>
          <h1 className="text-[17px] font-bold leading-tight text-primary">AquaTex AI</h1>
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-on-surface-variant">
            All Systems Operational
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLinkItem key={item.path} item={item} />
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-slate-200/70 pt-4">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-ai px-3 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98]"
        >
          <Icon name="auto_awesome" className="text-[18px]" />
          Generate Optimization
        </button>
        <NavLink
          to="/analytics"
          className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
        >
          <Icon name="settings" className="text-[20px]" />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
