import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronRight,
  DollarSign, TrendingUp, Target, Clock, ListTodo, FileWarning,
  Users, Building2, RefreshCw, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}
function fmtCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
function fmtShort(v) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtCurrency(v);
}

// ——— Skeleton ———
function Skel({ className }) {
  return <div className={cn("bg-muted animate-pulse rounded-lg", className)} />;
}

// ——— Smart Alert Banner ———
function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="mb-5 space-y-2" data-testid="alerts-section">
      {alerts.map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium",
            a.type === "critical" && "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/60 dark:text-red-400",
            a.type === "warning" && "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-400",
            a.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-400"
          )}
          data-testid={`alert-item-${i}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {a.type === "critical" && <AlertCircle size={15} className="shrink-0" />}
            {a.type === "warning" && <AlertTriangle size={15} className="shrink-0" />}
            {a.type === "success" && <CheckCircle2 size={15} className="shrink-0" />}
            <span className="truncate">{a.message}</span>
          </div>
          {a.action && (
            <button
              onClick={a.action.onClick}
              className="flex items-center gap-1 text-xs font-semibold opacity-75 hover:opacity-100 transition-opacity shrink-0"
              data-testid={`alert-action-${i}`}
            >
              {a.action.label} <ChevronRight size={12} />
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ——— KPI Card ———
function KPICard({ title, value, sub, icon: Icon, iconCls, testId }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
      className="bg-card border border-border rounded-lg p-5" data-testid={testId}>
      <div className="mb-4">
        <div className={cn("p-2 rounded-md w-fit", iconCls || "bg-primary/10")}>
          <Icon size={17} />
        </div>
      </div>
      <p className="text-2xl font-heading font-bold tracking-tight leading-none">{value}</p>
      <p className="text-sm font-medium mt-1.5">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ——— Period Selector ———
function PeriodSelector({ period, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1" data-testid="period-selector">
      {[30, 60, 90].map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-semibold transition-all",
            period === p
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-testid={`period-btn-${p}`}
        >
          {p}d
        </button>
      ))}
    </div>
  );
}

// ——— MRR Trend Chart ———
function MRRTrendChart({ data, loading }) {
  const hasData = data && data.some((d) => d.mrr > 0);
  if (loading) return <Skel className="h-[180px]" />;
  return (
    <div className="bg-card border border-border rounded-lg p-5" data-testid="mrr-trend-section">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-heading font-semibold">Tendência de MRR</h2>
          <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
        </div>
        {hasData && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <TrendingUp size={13} />
            Acumulado
          </div>
        )}
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
              formatter={(v) => [fmtCurrency(v), "MRR"]}
            />
            <Area type="monotone" dataKey="mrr" stroke="#3B82F6" strokeWidth={2}
              fill="url(#mrrGradient)" dot={{ fill: "#3B82F6", r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[140px] text-muted-foreground">
          <div className="text-center">
            <TrendingUp size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sem dados de MRR no período</p>
            <p className="text-xs mt-0.5">Adicione clientes com valor mensal</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ——— Custom Funnel ———
function FunnelViz({ stages }) {
  if (!stages || stages.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="text-center">
          <Target size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum deal no pipeline</p>
        </div>
      </div>
    );
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="space-y-2.5" data-testid="funnel-chart">
      {stages.map((stage, i) => {
        const w = Math.max((stage.count / max) * 100, stage.count > 0 ? 8 : 2);
        return (
          <div key={stage.stage_id || i} className="flex items-center gap-3">
            <div className="w-[108px] shrink-0 text-right">
              <p className="text-xs font-medium text-foreground truncate">{stage.stage}</p>
              {i > 0 && stage.conv_from_prev !== undefined && (
                <p className="text-[10px] text-muted-foreground">{stage.conv_from_prev}% conv.</p>
              )}
            </div>
            <div className="flex-1 relative h-9 bg-muted/60 rounded-md overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${w}%` }}
                transition={{ duration: 0.55, delay: i * 0.07, ease: "easeOut" }}
                className="h-full rounded-md flex items-center justify-end px-2.5"
                style={{ backgroundColor: stage.color || "#3B82F6" }}
              >
                {stage.count > 0 && <span className="text-xs font-bold text-white">{stage.count}</span>}
              </motion.div>
            </div>
            <div className="w-[72px] shrink-0 text-right">
              <p className="text-xs font-semibold">{fmtShort(stage.value)}</p>
              <p className="text-[10px] text-muted-foreground">{stage.count} deals</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ——— Source colors ———
const SRC_COLORS = ["#0044FF", "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"];
const SRC_LABELS = {
  manual: "Manual", instagram: "Instagram", google: "Google Ads",
  indicacao: "Indicação", site: "Site Orgânico", facebook: "Facebook",
  linkedin: "LinkedIn", whatsapp: "WhatsApp",
};

// ——— Build alerts from KPI data ———
function buildAlerts(data, navigate) {
  const alerts = [];
  if ((data.proposals_no_response_count || 0) > 0) {
    const n = data.proposals_no_response_count;
    alerts.push({
      type: "critical",
      message: `${n} proposta${n > 1 ? "s" : ""} sem resposta há mais de 3 dias`,
      action: { label: "Ver pipeline", onClick: () => navigate("/comercial/pipeline") },
    });
  }
  if ((data.stale_deals_count || 0) > 0) {
    const n = data.stale_deals_count;
    alerts.push({
      type: "critical",
      message: `${n} deal${n > 1 ? "s" : ""} parado${n > 1 ? "s" : ""} há mais de 7 dias sem atualização`,
      action: { label: "Ver pipeline", onClick: () => navigate("/comercial/pipeline") },
    });
  }
  if ((data.overdue_tasks_count || 0) > 0) {
    const n = data.overdue_tasks_count;
    alerts.push({
      type: "warning",
      message: `${n} tarefa${n > 1 ? "s" : ""} operacional${n > 1 ? "is" : ""} em atraso`,
      action: { label: "Ver operacional", onClick: () => navigate("/operacional") },
    });
  }
  if ((data.churn_risk_count || 0) > 0) {
    const n = data.churn_risk_count;
    alerts.push({
      type: "warning",
      message: `${n} cliente${n > 1 ? "s" : ""} sem atividade há 30+ dias — risco de churn`,
      action: { label: "Ver clientes", onClick: () => navigate("/clientes") },
    });
  }
  if (alerts.length === 0)
    alerts.push({ type: "success", message: "Tudo sob controle! Pipeline saudável e sem pendências críticas." });
  return alerts;
}

// ——— Loading Skeleton ———
function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex justify-between"><Skel className="h-8 w-44" /><Skel className="h-8 w-32" /></div>
      <Skel className="h-10" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skel key={i} className="h-28" />)}</div>
      <Skel className="h-[196px]" />
      <div className="grid grid-cols-3 gap-5"><Skel className="col-span-2 h-64" /><Skel className="h-64" /></div>
      <div className="grid grid-cols-3 gap-5">{[...Array(3)].map((_, i) => <Skel key={i} className="h-48" />)}</div>
      <div className="grid grid-cols-2 gap-5">{[...Array(2)].map((_, i) => <Skel key={i} className="h-52" />)}</div>
    </div>
  );
}

// ——— Dashboard ———
export default function Dashboard() {
  const [period, setPeriod] = useState(30);
  const [kpis, setKpis] = useState(null);
  const [mrrTrend, setMrrTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const prevAlerts = useRef({ stale: 0, proposals: 0, overdue: 0 });
  const periodRef = useRef(30);
  const navigate = useNavigate();

  const loadData = useCallback(async (p, isPolling = false) => {
    try {
      const [kpisRes, trendRes] = await Promise.all([
        axios.get(`${API}/dashboard/kpis?period=${p}`, { headers: getAuthHeader() }),
        axios.get(`${API}/dashboard/mrr-trend`, { headers: getAuthHeader() }),
      ]);
      const d = kpisRes.data;

      if (isPolling) {
        const prev = prevAlerts.current;
        const s = d.stale_deals_count || 0;
        const pr = d.proposals_no_response_count || 0;
        const ov = d.overdue_tasks_count || 0;
        if (s > prev.stale)
          toast.error(`${s} deal${s !== 1 ? "s" : ""} parado${s !== 1 ? "s" : ""} no pipeline — atenção!`, { duration: 8000 });
        if (pr > prev.proposals)
          toast.warning(`${pr} proposta${pr !== 1 ? "s" : ""} aguardando resposta`, { duration: 8000 });
        if (ov > prev.overdue)
          toast.warning(`${ov} tarefa${ov !== 1 ? "s" : ""} em atraso no operacional`, { duration: 8000 });
      }

      prevAlerts.current = {
        stale: d.stale_deals_count || 0,
        proposals: d.proposals_no_response_count || 0,
        overdue: d.overdue_tasks_count || 0,
      };

      setKpis(d);
      setMrrTrend(trendRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard error:", err);
    }
  }, []); // eslint-disable-line

  // Initial load + polling
  useEffect(() => {
    (async () => {
      await loadData(30);
      setLoading(false);
    })();
    const id = setInterval(() => loadData(periodRef.current, true), 60_000);
    return () => clearInterval(id);
  }, [loadData]);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    periodRef.current = p;
    loadData(p);
  };

  if (loading) return <DashboardSkeleton />;

  const alerts = buildAlerts(kpis || {}, navigate);
  const funnel = kpis?.deals_by_stage || [];
  const sources = (kpis?.leads_by_source || []).map((s, i) => ({
    name: SRC_LABELS[s.source] || s.source || "Outro",
    value: s.count,
    fill: SRC_COLORS[i % SRC_COLORS.length],
  }));
  const criticalCount = alerts.filter((a) => a.type === "critical" || a.type === "warning").length;

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="dashboard-main">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-2.5">
            Dashboard
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full"
                data-testid="alert-count-badge">
                <Bell size={11} />
                {criticalCount}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">Painel estratégico da sua agência</p>
            {lastUpdated && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground" data-testid="last-updated">
                <RefreshCw size={10} />
                {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector period={period} onChange={handlePeriodChange} />
          <button
            onClick={() => loadData(period)}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Atualizar dados"
            data-testid="refresh-btn"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── SECTION 1: ALERTAS ── */}
      <AlertBanner alerts={alerts} />

      {/* ── SECTION 2: FINANCIAL KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KPICard
          title="MRR Atual"
          value={fmtCurrency(kpis?.mrr)}
          sub={`${kpis?.active_clients || 0} clientes ativos`}
          icon={DollarSign}
          iconCls="bg-blue-50 dark:bg-blue-950/40 text-blue-600"
          testId="kpi-mrr"
        />
        <KPICard
          title="Receita Prevista"
          value={fmtShort(kpis?.predicted_revenue || 0)}
          sub="Pipeline × probabilidade"
          icon={TrendingUp}
          iconCls="bg-violet-50 dark:bg-violet-950/40 text-violet-600"
          testId="kpi-predicted-revenue"
        />
        <KPICard
          title="Ticket Médio"
          value={fmtCurrency(kpis?.ticket_avg || 0)}
          sub="MRR por cliente ativo"
          icon={Target}
          iconCls="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
          testId="kpi-ticket-avg"
        />
        <KPICard
          title="Risco de Churn"
          value={`${kpis?.churn_risk_count || 0} clientes`}
          sub="Sem atividade há 30+ dias"
          icon={AlertCircle}
          iconCls="bg-red-50 dark:bg-red-950/40 text-red-600"
          testId="kpi-churn-risk"
        />
      </div>

      {/* ── SECTION 2.5: MRR TREND ── */}
      <div className="mb-5">
        <MRRTrendChart data={mrrTrend} loading={false} />
      </div>

      {/* ── SECTION 3: PIPELINE FUNNEL + CONVERSION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5" data-testid="pipeline-funnel-section">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-heading font-semibold">Funil de Conversão</h2>
              <p className="text-xs text-muted-foreground">Taxa de passagem entre etapas</p>
            </div>
            <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md">
              {kpis?.total_deals || 0} deals
            </span>
          </div>
          <FunnelViz stages={funnel} />
        </div>

        <div className="bg-card border border-border rounded-lg p-5" data-testid="conversion-stats-section">
          <h2 className="text-base font-heading font-semibold mb-1">Métricas Chave</h2>
          <p className="text-xs text-muted-foreground mb-4">Últimos {period} dias</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Conversão Geral</span>
                <span className="font-bold">{kpis?.conversion_rate || 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(kpis?.conversion_rate || 0, 100)}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {[
                { label: "Tempo Médio", value: `${kpis?.avg_closing_days || 0}d`, sub: "de fechamento" },
                { label: "Deals Ganhos", value: kpis?.won_deals || 0, sub: "fechados" },
                { label: "Total Leads", value: kpis?.total_leads || 0, sub: "cadastrados" },
                { label: `Últimos ${period}d`, value: kpis?.leads_this_period || 0, sub: "novos leads", testId: "leads-this-period" },
              ].map((m, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-3 text-center" data-testid={m.testId}>
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">{m.label}</p>
                  <p className="text-xl font-heading font-bold leading-none">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>
            <div className="pt-1 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Valor total no pipeline</span>
                <span className="text-sm font-bold text-primary">{fmtShort(kpis?.pipeline_value || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: OPERATIONAL HEALTH ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

        {/* Leads Parados */}
        <div className="bg-card border border-border rounded-lg p-5" data-testid="stale-deals-section">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-amber-500 shrink-0" />
            <h2 className="text-sm font-heading font-semibold">Leads Parados</h2>
            {(kpis?.stale_deals_count || 0) > 0 && (
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                {kpis.stale_deals_count}
              </span>
            )}
          </div>
          {(kpis?.stale_deals || []).length > 0 ? (
            <div>
              {kpis.stale_deals.map((d) => (
                <div key={d.deal_id} className="flex items-center justify-between gap-2 py-2.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.stage}</p>
                  </div>
                  <span className={cn("text-xs font-bold shrink-0 tabular-nums",
                    d.days_stale >= 14 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  )}>
                    {d.days_stale}d
                  </span>
                </div>
              ))}
              {kpis.stale_deals_count > 5 && (
                <button onClick={() => navigate("/comercial/pipeline")}
                  className="text-xs text-primary hover:underline mt-3 flex items-center gap-1" data-testid="stale-see-all">
                  Ver todos ({kpis.stale_deals_count}) <ChevronRight size={11} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Nenhum lead parado.<br />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Pipeline saudável!</span>
              </p>
            </div>
          )}
        </div>

        {/* Tarefas Atrasadas */}
        <div className="bg-card border border-border rounded-lg p-5" data-testid="overdue-tasks-section">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo size={14} className="text-red-500 shrink-0" />
            <h2 className="text-sm font-heading font-semibold">Tarefas Atrasadas</h2>
          </div>
          <div className="flex flex-col items-center justify-center h-[100px] gap-2">
            <p className={cn("text-5xl font-heading font-bold leading-none",
              (kpis?.overdue_tasks_count || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            )} data-testid="overdue-tasks-count">
              {kpis?.overdue_tasks_count || 0}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {(kpis?.overdue_tasks_count || 0) > 0 ? "tarefas em atraso no operacional" : "Operacional em dia!"}
            </p>
            {(kpis?.overdue_tasks_count || 0) > 0 && (
              <button onClick={() => navigate("/operacional")}
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1" data-testid="goto-operacional-btn">
                Ver operacional <ChevronRight size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Propostas sem Resposta */}
        <div className="bg-card border border-border rounded-lg p-5" data-testid="proposals-no-response-section">
          <div className="flex items-center gap-2 mb-4">
            <FileWarning size={14} className="text-red-500 shrink-0" />
            <h2 className="text-sm font-heading font-semibold">Propostas sem Resposta</h2>
            {(kpis?.proposals_no_response_count || 0) > 0 && (
              <span className="ml-auto text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
                {kpis.proposals_no_response_count}
              </span>
            )}
          </div>
          {(kpis?.proposals_no_response || []).length > 0 ? (
            <div>
              {kpis.proposals_no_response.map((d) => (
                <div key={d.deal_id} className="flex items-center justify-between gap-2 py-2.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.company || "Sem empresa"}</p>
                  </div>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 shrink-0 tabular-nums">{d.days_waiting}d</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Sem propostas aguardando.<br />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ótimo trabalho!</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 5: SOURCES + VALUE CHART ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Sources donut */}
        <div className="bg-card border border-border rounded-lg p-5" data-testid="lead-sources-section">
          <h2 className="text-base font-heading font-semibold mb-1">Leads por Origem</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribuição das fontes de captação</p>
          {sources.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="shrink-0">
                <PieChart width={150} height={150}>
                  <Pie data={sources} cx={70} cy={70} innerRadius={42} outerRadius={68}
                    dataKey="value" stroke="none" paddingAngle={2}>
                    {sources.map((s, i) => <Cell key={i} fill={s.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                </PieChart>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {sources.slice(0, 6).map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{s.name}</span>
                    <span className="text-xs font-bold tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <div className="text-center">
                <Users size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum lead cadastrado</p>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline value bar chart */}
        <div className="bg-card border border-border rounded-lg p-5" data-testid="pipeline-value-chart">
          <h2 className="text-base font-heading font-semibold mb-1">Valor por Etapa</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribuição financeira no pipeline</p>
          {funnel.filter((s) => s.value > 0).length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={funnel.filter((s) => s.count > 0)} margin={{ top: 0, right: 0, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v) => [fmtCurrency(v), "Valor"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnel.map((e, i) => <Cell key={i} fill={e.color || "hsl(var(--primary))"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[190px] text-muted-foreground">
              <div className="text-center">
                <Building2 size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sem valor nos deals do pipeline</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
