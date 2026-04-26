import { useNavigate } from 'react-router-dom';
import * as I from '../shared/Icons';
import { clearToken } from '../../lib/auth';

export default function Topbar({ user, theme, onToggleTheme, notificationCount = 0 }) {
  const navigate = useNavigate();
  const u = user || { full_name: 'Usuário', role: '', email: '' };
  const initial = (u.full_name || u.email || 'U')[0].toUpperCase();
  const firstName = (u.full_name || '').split(' ')[0] || 'Usuário';

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-4 border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#0a0a0a]/70">
      <div className="flex flex-col">
        <h1 className="text-[18px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Bem-vindo de volta, {firstName}
        </h1>
        <p className="text-[12.5px] text-zinc-500">Acompanhe seus indicadores em tempo real</p>
      </div>

      <div className="ml-6 flex-1 max-w-[460px]">
        <label className="group flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 transition focus-within:border-brand-500/60 focus-within:bg-white dark:border-white/[0.06] dark:bg-white/[0.025] dark:focus-within:bg-white/[0.04]">
          <I.Search size={16} stroke={1.7} className="text-zinc-400" />
          <input
            type="text"
            placeholder="Busque leads, clientes, transações…"
            className="w-full bg-transparent text-[13px] text-zinc-900 placeholder:text-zinc-500 outline-none dark:text-zinc-100"
          />
          <kbd className="hidden md:inline-flex items-center rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-white/[0.08] dark:bg-white/[0.03]">⌘K</kbd>
        </label>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-zinc-100"
        >
          {theme === 'dark' ? <I.Sun size={16} /> : <I.Moon size={16} />}
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-zinc-100"
        >
          <I.Bell size={16} />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-brand-500 px-1 text-[9.5px] font-semibold text-white ring-2 ring-white dark:ring-[#0a0a0a]">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        <div className="group relative ml-1">
          <button className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white py-1 pl-1 pr-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-[11.5px] font-semibold text-white">
              {initial}
            </div>
            <div className="hidden sm:flex flex-col leading-tight pr-1">
              <span className="text-[12.5px] font-medium text-zinc-900 dark:text-zinc-100">{u.full_name || u.email}</span>
              <span className="text-[10.5px] text-zinc-500">{u.role === 'admin' ? 'Admin' : 'Membro'}</span>
            </div>
            <I.ChevronDown size={14} className="text-zinc-400" />
          </button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-44 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#16161a]">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] text-zinc-700 hover:bg-zinc-50 rounded-xl dark:text-zinc-300 dark:hover:bg-white/[0.04]"
            >
              <I.LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
