import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { getToken, getUser } from '../../lib/auth';
import api from '../../lib/api';

export default function AppLayout() {
  const [theme, setTheme] = useState(() => localStorage.getItem('fluxscale.theme') || 'dark');
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('fluxscale.theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!user) {
      api.get('/auth/me').then(r => {
        setUser(r.data);
        localStorage.setItem('fluxscale.user', JSON.stringify(r.data));
      }).catch(() => {});
    }
  }, []);

  if (!getToken()) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-[#0a0a0a] dark:text-zinc-100">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          notificationCount={0}
        />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
