import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../lib/api';
import { setToken, setUser, isAuthenticated } from '../lib/auth';
import * as I from '../components/shared/Icons';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated()) return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'register') {
        await api.post('/auth/register', { name: form.full_name, email: form.email, password: form.password });
      }
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password });
      setToken(data.token || data.access_token);
      const me = await api.get('/auth/me');
      setUser(me.data);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Erro ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#0a0a0a] p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-12 w-12 rounded-[14px] bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center shadow-[0_8px_24px_-4px_rgba(99,102,241,0.55)] mb-4">
            <span className="absolute inset-[9px] rounded-[6px] border border-white/35" />
            <span className="absolute h-[6px] w-[18px] rounded-full bg-white" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">FluxScale</h1>
          <p className="text-[13px] text-zinc-500 mt-1">Operations OS</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.06] dark:bg-[#111114]">
          {/* Tabs */}
          <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 mb-6 dark:border-white/[0.06] dark:bg-white/[0.03]">
            {[['login', 'Entrar'], ['register', 'Criar conta']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setTab(id); setError(''); }}
                className={[
                  'flex-1 rounded-lg py-2 text-[13px] font-medium transition',
                  tab === id
                    ? 'bg-white shadow-sm text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={set('full_name')}
                  placeholder="Seu nome"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-brand-500 focus:bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:bg-white/[0.06]"
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={set('email')}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-brand-500 focus:bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:bg-white/[0.06]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 pr-10 text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-brand-500 focus:bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-100 dark:focus:bg-white/[0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showPw ? <I.EyeOff size={15} /> : <I.Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-[12.5px] text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400">
                <I.AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-500 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.6)] hover:bg-brand-600 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
