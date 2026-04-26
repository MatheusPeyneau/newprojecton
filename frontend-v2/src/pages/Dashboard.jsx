import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KpiGrid, SkeletonKpi, formatCurrency, formatNumber, formatPercent } from '../components/shared/KpiCard';
import MrrChart from '../components/shared/MrrChart';
import LeadsTable from '../components/shared/LeadsTable';
import api from '../lib/api';
import * as I from '../components/shared/Icons';

const PERIODS = [
  { id: '24h', label: 'Últimas 24h' },
  { id: 'week', label: 'Última semana' },
  { id: 'month', label: 'Último mês' },
  { id: 'year', label: 'Último ano' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [chartRange, setChartRange] = useState('6m');
  const [kpis, setKpis] = useState(null);
  const [mrrTrend, setMrrTrend] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/kpis').catch(() => ({ data: null })),
      api.get('/dashboard/mrr-trend').catch(() => ({ data: [] })),
      api.get('/leads').catch(() => ({ data: [] })),
    ]).then(([kpiRes, mrrRes, leadsRes]) => {
      const k = kpiRes.data;
      if (k) {
        setKpis([
          {
            id: 'leads',
            label: 'Total de Leads',
            sublabel: 'Captados no período',
            icon: 'UserPlus',
            value: formatNumber(k.leads_count ?? k.total_leads ?? 0),
            delta: k.leads_delta ?? null,
            footnote: '',
            spark: k.leads_spark || [],
          },
          {
            id: 'mrr',
            label: 'MRR',
            sublabel: 'Receita recorrente',
            icon: 'TrendingUp',
            value: formatCurrency(k.mrr ?? 0),
            delta: k.mrr_delta ?? null,
            footnote: k.mrr_meta ? `meta ${formatCurrency(k.mrr_meta)}` : '',
            spark: k.mrr_spark || [],
          },
          {
            id: 'clients',
            label: 'Clientes Ativos',
            sublabel: 'Assinaturas vigentes',
            icon: 'CheckCircle',
            value: formatNumber(k.clients_count ?? k.total_clients ?? 0),
            delta: k.clients_delta ?? null,
            footnote: '',
            spark: k.clients_spark || [],
          },
          {
            id: 'conversion',
            label: 'Taxa de Conversão',
            sublabel: 'Lead → Cliente',
            icon: 'Target',
            value: formatPercent(k.conversion_rate ?? 0),
            delta: k.conversion_delta ?? null,
            footnote: 'média 30 d',
            spark: k.conversion_spark || [],
          },
        ]);
      }

      const trend = Array.isArray(mrrRes.data) ? mrrRes.data : [];
      setMrrTrend(trend);

      const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []);
      setLeads(leadsData.slice(0, 8));
    }).finally(() => setLoading(false));
  }, [period]);

  const currentMrr = mrrTrend.length ? mrrTrend[mrrTrend.length - 1].value : 0;
  const firstMrr = mrrTrend.length ? mrrTrend[0].value : 0;
  const mrrDelta = firstMrr ? ((currentMrr - firstMrr) / firstMrr) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Visão geral</h2>
          <p className="text-[12.5px] text-zinc-500">Resumo dos seus canais de aquisição e receita.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-white/[0.06] dark:bg-white/[0.02]">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={[
                  'relative rounded-lg px-3 py-1.5 text-[12px] font-medium transition',
                  period === p.id
                    ? 'bg-brand-500 text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.55)]'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-300 dark:hover:bg-white/[0.05]">
            <I.Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map(i => <SkeletonKpi key={i} />)}
        </div>
      ) : kpis ? (
        <KpiGrid kpis={kpis} />
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-[13px] text-zinc-400 dark:border-white/[0.06] dark:bg-white/[0.02]">
          Não foi possível carregar os KPIs. Verifique a conexão com o servidor.
        </div>
      )}

      {/* MRR Chart */}
      <MrrChart
        data={mrrTrend}
        currentValue={currentMrr}
        currentDelta={mrrDelta}
        range={chartRange}
        onRangeChange={setChartRange}
      />

      {/* Leads Table */}
      <LeadsTable
        leads={leads}
        title="Últimos leads"
        onViewAll={() => navigate('/leads')}
      />
    </div>
  );
}
