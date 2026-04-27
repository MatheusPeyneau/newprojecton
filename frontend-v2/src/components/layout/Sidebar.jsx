import { NavLink } from 'react-router-dom';
import * as I from '../shared/Icons';

const NAV_MAIN = [
  { id: 'dashboard',    label: 'Overview',      icon: I.Layout,    to: '/dashboard' },
  { id: 'leads',        label: 'Leads',         icon: I.UserPlus,  to: '/leads' },
  { id: 'pipeline',     label: 'Pipeline',      icon: I.Pipeline,  to: '/pipeline' },
  { id: 'clientes',     label: 'Clientes',      icon: I.Users,     to: '/clientes' },
  { id: 'operacional',  label: 'Operacional',   icon: I.Briefcase, to: '/operacional' },
  { id: 'financeiro',   label: 'Financeiro',    icon: I.Wallet,    to: '/financeiro' },
  { id: 'conteudo',     label: 'Conteúdo',      icon: I.FileText,  to: '/conteudo' },
  { id: 'funil',        label: 'Funil',         icon: I.Funnel,       to: '/funil' },
  { id: 'conversas',   label: 'Conversas',     icon: I.MessageSquare, to: '/conversas' },
];

const NAV_FOOTER = [
  { id: 'configuracoes', label: 'Configurações', icon: I.Settings,   to: '/configuracoes' },
  { id: 'admin',         label: 'Admin',          icon: I.Shield,     to: '/admin' },
];

function Logo({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="relative h-9 w-9 shrink-0 rounded-[10px] bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-[0_6px_20px_-4px_rgba(99,102,241,0.55)]">
        <span className="absolute inset-[7px] rounded-[5px] border border-white/35" />
        <span className="absolute h-[5px] w-[14px] rounded-full bg-white" />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">FluxScale</span>
          <span className="text-[10px] mt-1 font-medium uppercase tracking-[0.16em] text-zinc-500">Operations OS</span>
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed }) {
  const IconCmp = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.04]',
          collapsed ? 'justify-center' : '',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-brand-500" />
          )}
          <IconCmp size={17} stroke={isActive ? 1.9 : 1.6} />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, user }) {
  const isAdmin = user?.role === 'admin';
  const adminEmail = import.meta.env.VITE_ADMIN_EMAILS || '';
  const isSuperAdmin = adminEmail.split(',').map(e => e.trim()).includes(user?.email || '');

  return (
    <aside
      className={[
        'relative flex flex-col border-r transition-[width] duration-200 shrink-0',
        'border-zinc-200 bg-white',
        'dark:border-white/[0.06] dark:bg-[#0c0c0e]',
        collapsed ? 'w-[76px]' : 'w-[244px]',
      ].join(' ')}
    >
      <div className={`flex items-center px-4 pt-5 pb-5 ${collapsed ? 'justify-center' : ''}`}>
        <Logo collapsed={collapsed} />
      </div>

      {!collapsed && (
        <div className="px-5 pb-2 pt-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Main menu</div>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 px-3 pb-4 pt-1">
        {NAV_MAIN.map((item) => (
          <NavItem key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mx-4 my-2 border-t border-zinc-200 dark:border-white/[0.06]" />

      {!collapsed && (
        <div className="px-5 pb-2 pt-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Preferências</div>
        </div>
      )}

      <nav className="space-y-0.5 px-3 pb-4 pt-1">
        {NAV_FOOTER.filter(item => item.id !== 'admin' || isSuperAdmin).map((item) => (
          <NavItem key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="px-3 pb-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-[12px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.05]"
        >
          {collapsed ? <I.ChevronRight size={14} /> : <><I.ChevronLeft size={14} /><span>Colapsar</span></>}
        </button>
      </div>
    </aside>
  );
}
