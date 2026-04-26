import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from './KpiCard';
import * as I from './Icons';

function MrrTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg dark:border-white/[0.08] dark:bg-[#16161a]">
      <div className="text-[10.5px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="num mt-0.5 text-[13px] font-semibold text-zinc-900 dark:text-zinc-50">
        {formatCurrency(payload[0].value)}
      </div>
    </div>
  );
}

function DeltaPill({ value }) {
  if (value == null) return null;
  const positive = value >= 0;
  const Arrow = positive ? I.ArrowUp : I.ArrowDown;
  return (
    <span className={[
      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
      positive
        ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400'
        : 'text-rose-600 bg-rose-500/10 dark:text-rose-400',
    ].join(' ')}>
      <Arrow size={11} stroke={2.4} />
      {Math.abs(Number(value)).toFixed(1)}%
    </span>
  );
}

const valueFmt = (v) => {
  if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$${Math.round(v / 1000)}k`;
  return `R$${v}`;
};

const RANGES = [
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '12 meses' },
  { id: 'ytd', label: 'YTD' },
];

export default function MrrChart({ data = [], currentValue, currentDelta, range, onRangeChange }) {
  return (
    <div className="card-hover flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111114]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">MRR — Receita Recorrente</h3>
            <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">live</span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-zinc-500">Evolução mensal — últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => onRangeChange?.(r.id)}
              className={[
                'rounded-md px-2.5 py-1 text-[11.5px] font-medium transition',
                range === r.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div className="num text-[34px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {formatCurrency(currentValue)}
        </div>
        <div className="mb-2">
          <DeltaPill value={currentDelta} />
        </div>
      </div>

      <div className="mt-2 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#6366f1" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 4" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} padding={{ left: 8, right: 8 }} />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} tickFormatter={valueFmt} width={56} />
            <Tooltip content={<MrrTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2.2}
              fill="url(#mrrFill)"
              activeDot={{ r: 5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
              dot={{ r: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
