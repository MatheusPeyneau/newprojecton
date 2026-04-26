import { useMemo } from 'react';
import * as I from './Icons';

export function formatNumber(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function formatCurrency(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export function formatPercent(n, digits = 1) {
  if (n == null) return '—';
  return `${Number(n).toFixed(digits)}%`;
}

function DeltaPill({ value }) {
  if (value == null) return null;
  const positive = value >= 0;
  const Arrow = positive ? I.ArrowUp : I.ArrowDown;
  return (
    <span className={[
      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
      positive
        ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/10'
        : 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/10',
    ].join(' ')}>
      <Arrow size={11} stroke={2.4} />
      {Math.abs(Number(value)).toFixed(1)}%
    </span>
  );
}

function Sparkline({ data, positive }) {
  const id = useMemo(() => 'sg-' + Math.random().toString(36).slice(2, 8), []);
  if (!data || data.length === 0) return null;
  const w = 80, h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  const stroke = positive ? '#6366f1' : '#f43f5e';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-90">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <polygon fill={`url(#${id})`} points={`0,${h} ${points} ${w},${h}`} />
    </svg>
  );
}

const ICON_MAP = {
  UserPlus: I.UserPlus,
  TrendingUp: I.TrendingUp,
  CheckCircle: I.CheckCircle,
  Target: I.Target,
  Wallet: I.Wallet,
};

export function KpiCard({ kpi }) {
  const IconCmp = ICON_MAP[kpi.icon] || I.Sparkle;
  return (
    <div className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-[#111114] dark:hover:border-white/[0.10] dark:hover:bg-[#131316]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 ring-1 ring-brand-500/15 dark:text-brand-300">
            <IconCmp size={18} stroke={1.9} />
          </div>
          <div>
            <div className="text-[12px] font-medium text-zinc-500">{kpi.label}</div>
            <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500">{kpi.sublabel}</div>
          </div>
        </div>
        <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" aria-label="More">
          <I.More size={16} />
        </button>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="num text-[28px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{kpi.value}</div>
        <Sparkline data={kpi.spark} positive={(kpi.delta ?? 0) >= 0} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <DeltaPill value={kpi.delta} />
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{kpi.footnote}</span>
      </div>
    </div>
  );
}

export function KpiGrid({ kpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => <KpiCard key={k.id} kpi={k} />)}
    </div>
  );
}

export function SkeletonKpi() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111114] animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-white/[0.06]" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-white/[0.06]" />
          <div className="h-2.5 w-16 rounded bg-zinc-100 dark:bg-white/[0.06]" />
        </div>
      </div>
      <div className="mt-5 h-8 w-32 rounded bg-zinc-100 dark:bg-white/[0.06]" />
      <div className="mt-3 h-4 w-20 rounded bg-zinc-100 dark:bg-white/[0.06]" />
    </div>
  );
}
