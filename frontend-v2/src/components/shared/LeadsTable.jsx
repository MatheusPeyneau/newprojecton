import { useMemo } from 'react';
import { formatCurrency } from './KpiCard';
import * as I from './Icons';

const STATUS_STYLES = {
  novo:        'bg-brand-500/10 text-brand-600 ring-brand-500/20 dark:text-brand-300',
  qualificado: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
  reuniao:     'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-300',
  proposta:    'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-300',
  perdido:     'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
  default:     'bg-zinc-500/10 text-zinc-600 ring-zinc-500/15 dark:text-zinc-300',
};
const STATUS_LABEL = {
  novo: 'Novo', qualificado: 'Qualificado', reuniao: 'Reunião',
  proposta: 'Proposta', perdido: 'Perdido',
};
const SOURCE_DOT = {
  google: 'bg-blue-500', meta: 'bg-cyan-500', linkedin: 'bg-sky-600',
  organic: 'bg-emerald-500', indicacao: 'bg-amber-500', outbound: 'bg-violet-500',
  default: 'bg-zinc-400',
};

function StatusPill({ status }) {
  const s = status?.toLowerCase() || 'default';
  const cls = STATUS_STYLES[s] || STATUS_STYLES.default;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[s] || status}
    </span>
  );
}

function SourceDot({ source }) {
  const key = (source || '').toLowerCase();
  const dot = SOURCE_DOT[key] || SOURCE_DOT.default;
  const label = source ? source.charAt(0).toUpperCase() + source.slice(1) : '—';
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-zinc-700 dark:text-zinc-300">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  const hue = useMemo(() => {
    let h = 0;
    for (const c of name || '') h = c.charCodeAt(0) + ((h << 5) - h);
    return Math.abs(h) % 360;
  }, [name]);
  return (
    <div
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold text-white"
      style={{ background: `oklch(0.55 0.10 ${hue})` }}
    >
      {initials}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function LeadsTable({ leads = [], title = 'Últimos leads', onViewAll }) {
  return (
    <div className="card-hover flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-white/[0.06] dark:bg-[#111114]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-white/[0.06]">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h3>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">{leads.length} contatos</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-300 dark:hover:bg-white/[0.05]">
            <I.Filter size={13} /> Filtrar
          </button>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.6)] hover:bg-brand-600"
            >
              Ver todos <I.ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              <th className="px-5 py-3">Lead</th>
              <th className="px-5 py-3">Fonte</th>
              <th className="px-5 py-3">Valor estimado</th>
              <th className="px-5 py-3">Recebido</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
            {leads.map((lead) => (
              <tr key={lead._id || lead.id} className="group transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={lead.name} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{lead.name}</div>
                      <div className="truncate text-[11.5px] text-zinc-500">{lead.email || lead.phone || '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5"><SourceDot source={lead.source} /></td>
                <td className="num px-5 py-3.5 text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                  {lead.value != null ? formatCurrency(lead.value) : '—'}
                </td>
                <td className="px-5 py-3.5 text-[12.5px] text-zinc-500">{timeAgo(lead.created_at || lead.receivedAt)}</td>
                <td className="px-5 py-3.5"><StatusPill status={lead.status} /></td>
                <td className="px-5 py-3.5 text-right">
                  <button className="rounded-md p-1 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-zinc-700 dark:hover:text-zinc-200">
                    <I.More size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[13px] text-zinc-400">Nenhum lead encontrado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
