import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Download, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("agenciaos_token")}` });

// ─── Utilitários ────────────────────────────────────────────────────────────

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_COMPLETOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STORAGE_KEY = "agenciaos_okr_data";

const fmtBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v, dec = 1) => `${Number(v || 0).toFixed(dec)}%`;

const fmtNum = (v) => Number(v || 0).toLocaleString("pt-BR");

const parseN = (v) => parseFloat(String(v).replace(",", ".")) || 0;

const diasDoMes = (mesIdx) => {
  const ano = new Date().getFullYear();
  return new Date(ano, mesIdx + 1, 0).getDate();
};

const somaArr = (arr) => arr.reduce((a, v) => a + parseN(v), 0);

const diasPreenchidos = (arr) => arr.filter((v) => v !== "" && v !== null && v !== undefined).length;

const somaAteHoje = (arr, mesIdx) => {
  const hoje = new Date();
  const diaHoje = hoje.getMonth() === mesIdx ? hoje.getDate() : diasDoMes(mesIdx);
  return arr.slice(0, diaHoje).reduce((a, v) => a + parseN(v), 0);
};

const calcMetricas = (funil) => {
  const inv = somaArr(funil.investimento);
  const imp = somaArr(funil.impressoes);
  const cli = somaArr(funil.cliques);
  const msg = somaArr(funil.mensagens);
  const int = somaArr(funil.interessados);
  const conv = somaArr(funil.conversao);
  return {
    cpm: imp > 0 ? (inv / imp) * 1000 : 0,
    cpc: cli > 0 ? inv / cli : 0,
    custoMsg: msg > 0 ? inv / msg : 0,
    custoAg: int > 0 ? inv / int : 0,
    custoReal: conv > 0 ? inv / conv : 0,
    inv, imp, cli, msg, int, conv,
  };
};

const calcMetricasOrcado = (orcadoTotal) => {
  const inv = parseN(orcadoTotal.investimento);
  const imp = parseN(orcadoTotal.impressoes);
  const cli = parseN(orcadoTotal.cliques);
  const msg = parseN(orcadoTotal.mensagens);
  const int = parseN(orcadoTotal.interessados);
  const conv = parseN(orcadoTotal.conversao);
  return {
    cpm: imp > 0 ? (inv / imp) * 1000 : 0,
    cpc: cli > 0 ? inv / cli : 0,
    custoMsg: msg > 0 ? inv / msg : 0,
    custoAg: int > 0 ? inv / int : 0,
    custoReal: conv > 0 ? inv / conv : 0,
  };
};

const semaforo = (real, orc) => {
  if (orc === 0) return null;
  if (real <= orc) return "🟢";
  if (real <= orc * 1.2) return "🟡";
  return "🔴";
};

const calcFinanceiro = (fin, inv) => {
  const fatTotal = parseN(fin.faturamentoRecorrente) + parseN(fin.faturamentoUnico);
  const imposto = fatTotal * (parseN(fin.imposto) / 100);
  const closer = fatTotal * (parseN(fin.comissaoCloser) / 100);
  const sdr = fatTotal * (parseN(fin.comissaoSDR) / 100);
  const lucro1 = fatTotal - inv - imposto - closer - sdr;
  const lucroRec = parseN(fin.faturamentoRecorrente) * (1 - parseN(fin.despesasFixas) / 100);
  return { fatTotal, imposto, closer, sdr, lucro1, lucroRec };
};

const gerarSemanas = (dataInicio, periodicidade, qtd = 13) => {
  if (!dataInicio) return [];
  const semanas = [];
  let d = new Date(dataInicio);
  for (let i = 0; i < qtd; i++) {
    semanas.push(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
    d = new Date(d.getTime() + periodicidade * 86400000);
  }
  return semanas;
};

// ─── Estado padrão ──────────────────────────────────────────────────────────

const KRS_PADRAO = [
  { id: 1, nome: "R$ Receita Bruta", formula: "Faturamento total do mês", base: "", meta: "", semanal: [] },
  { id: 2, nome: "# ROAS", formula: "Receita Contratada / Investimento em Ads", base: "", meta: "", semanal: [] },
  { id: 3, nome: "R$ Lucro Líquido", formula: "Faturamento - Custos totais", base: "", meta: "", semanal: [] },
  { id: 4, nome: "R$ Margem Líquida do Funil", formula: "Receita - Investimento - Despesas variáveis", base: "", meta: "", semanal: [] },
  { id: 5, nome: "% Churn", formula: "Cancelamentos / Base ativa", base: "", meta: "", semanal: [] },
  { id: 6, nome: "# NPS", formula: "Score de satisfação dos clientes", base: "", meta: "", semanal: [] },
];

const mesVazio = () => ({
  premissas: {
    ctr: { orcado: "", realizado: "" },
    msgCliques: { orcado: "", realizado: "" },
    intMsg: { orcado: "", realizado: "" },
    convInt: { orcado: "", realizado: "" },
    convReal: { orcado: "", realizado: "" },
  },
  funil: {
    investimento: Array(31).fill(""),
    impressoes: Array(31).fill(""),
    cliques: Array(31).fill(""),
    mensagens: Array(31).fill(""),
    interessados: Array(31).fill(""),
    conversao: Array(31).fill(""),
    orcadoTotal: { investimento: "", impressoes: "", cliques: "", mensagens: "", interessados: "", conversao: "" },
  },
  financeiro: {
    faturamentoRecorrente: "",
    faturamentoUnico: "",
    imposto: "",
    comissaoCloser: "",
    comissaoSDR: "",
    despesasFixas: "",
  },
});

const DEFAULT_STATE = {
  okr: {
    dataInicio: "",
    dataFim: "",
    keyResults: KRS_PADRAO,
  },
  meses: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i), mesVazio()])),
};

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function ProgressBar({ valor, meta }) {
  const pct = meta > 0 ? Math.min((valor / meta) * 100, 100) : 0;
  const color = pct < 50 ? "bg-red-500" : pct < 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-10 text-right">{fmtPct(pct)}</span>
    </div>
  );
}

function CellInput({ value, onChange, prefix = "", className = "", type = "number" }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-xs text-center border-0 outline-none bg-blue-50 dark:bg-blue-950/20 rounded px-1 py-1 focus:ring-1 focus:ring-primary ${prefix ? "pl-4" : ""} ${className}`}
      />
    </div>
  );
}

function ReadCell({ value, className = "" }) {
  return (
    <div className={`text-xs text-center px-2 py-1 bg-muted rounded text-muted-foreground ${className}`}>
      {value}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3 mt-6 first:mt-0">{children}</h3>;
}

// ─── Aba OKR Trimestral ──────────────────────────────────────────────────────

function AbaOKR({ okr, onChange, meses, systemClients = [] }) {
  const updateKR = (idx, field, val) => {
    const krs = okr.keyResults.map((k, i) => (i === idx ? { ...k, [field]: val } : k));
    onChange({ ...okr, keyResults: krs });
  };

  const addKR = () => {
    onChange({ ...okr, keyResults: [...okr.keyResults, { id: Date.now(), nome: "Novo KR", meta: "" }] });
  };

  const removeKR = (idx) => {
    onChange({ ...okr, keyResults: okr.keyResults.filter((_, i) => i !== idx) });
  };

  // Meses que se sobrepõem ao período selecionado
  const mesesNoPeriodo = useMemo(() => {
    const ano = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const mesStart = new Date(ano, i, 1);
      const mesEnd = new Date(ano, i + 1, 0);
      if (okr.dataInicio && okr.dataFim) {
        const ini = new Date(okr.dataInicio);
        const fim = new Date(okr.dataFim);
        if (mesStart > fim || mesEnd < ini) return null;
      }
      return meses[String(i)];
    }).filter(Boolean);
  }, [okr.dataInicio, okr.dataFim, meses]);

  // Calcular valor atual automaticamente por tipo de KR
  const getValorAtual = (kr) => {
    const nome = kr.nome.toLowerCase();

    if (nome.includes("nps")) return parseN(kr.npsManual || "");

    let fatTotal = 0, inv = 0, lucro = 0;
    mesesNoPeriodo.forEach((m) => {
      const met = calcMetricas(m.funil);
      const fin = calcFinanceiro(m.financeiro, met.inv);
      fatTotal += fin.fatTotal;
      inv += met.inv;
      lucro += fin.lucro1;
    });

    if (nome.includes("receita")) return fatTotal;
    if (nome.includes("roas")) return inv > 0 ? fatTotal / inv : 0;
    if (nome.includes("lucro")) return lucro;
    if (nome.includes("margem")) return fatTotal > 0 ? (lucro / fatTotal) * 100 : 0;
    if (nome.includes("churn")) {
      const cancelados = systemClients.filter((c) => {
        if (!c.end_date) return false;
        if (okr.dataInicio && c.end_date < okr.dataInicio) return false;
        if (okr.dataFim && c.end_date > okr.dataFim) return false;
        return true;
      }).length;
      const total = systemClients.length;
      return total > 0 ? (cancelados / total) * 100 : 0;
    }
    return 0;
  };

  const formatValor = (kr, val) => {
    const nome = kr.nome.toLowerCase();
    if (nome.includes("churn") || nome.includes("margem")) return fmtPct(val);
    if (nome.includes("roas")) return `${Number(val).toFixed(2)}x`;
    if (nome.includes("nps") || nome.includes("#")) return fmtNum(val);
    return fmtBRL(val);
  };

  const isNPS = (kr) => kr.nome.toLowerCase().includes("nps");
  const isAuto = (kr) => !isNPS(kr);

  const COLOR_CLASSES = {
    emerald: { bg: "bg-emerald-500", text: "text-emerald-600", card: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" },
    amber:   { bg: "bg-amber-500",   text: "text-amber-600",   card: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" },
    red:     { bg: "bg-red-500",     text: "text-red-600",     card: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" },
  };
  const colorKey = (pct) => pct >= 80 ? "emerald" : pct >= 50 ? "amber" : "red";

  // Medidor geral
  const krsComMeta = okr.keyResults.filter((kr) => parseN(kr.meta) > 0);
  const avgPct = krsComMeta.length > 0
    ? krsComMeta.reduce((sum, kr) => {
        const atual = getValorAtual(kr);
        return sum + Math.min((atual / parseN(kr.meta)) * 100, 100);
      }, 0) / krsComMeta.length
    : 0;

  const statusColors = COLOR_CLASSES[colorKey(avgPct)];
  const statusMsg = avgPct >= 80
    ? "🟢 Trimestre no caminho certo!"
    : avgPct >= 50
    ? "🟡 Atenção: alguns KRs precisam de ajuste"
    : "🔴 Período crítico: reveja suas metas";

  return (
    <div>
      {/* Seletor de Período */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Início do período</label>
          <input
            type="date"
            value={okr.dataInicio || ""}
            onChange={(e) => onChange({ ...okr, dataInicio: e.target.value })}
            className="text-sm bg-blue-50 dark:bg-blue-950/20 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-muted-foreground text-sm pb-2">→</span>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Fim do período</label>
          <input
            type="date"
            value={okr.dataFim || ""}
            onChange={(e) => onChange({ ...okr, dataFim: e.target.value })}
            className="text-sm bg-blue-50 dark:bg-blue-950/20 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {okr.dataInicio && okr.dataFim && (
          <span className="text-xs text-muted-foreground pb-2">
            {mesesNoPeriodo.length} {mesesNoPeriodo.length === 1 ? "mês" : "meses"} no período
          </span>
        )}
      </div>

      {/* Medidor Geral */}
      {krsComMeta.length > 0 && (
        <div className={`rounded-xl p-5 mb-6 border ${statusColors.card}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{statusMsg}</span>
            <span className={`text-3xl font-bold ${statusColors.text}`}>{fmtPct(avgPct, 0)}</span>
          </div>
          <div className="h-3 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${statusColors.bg}`}
              style={{ width: `${Math.min(avgPct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{krsComMeta.length} KRs com meta definida</p>
        </div>
      )}

      {/* Cards KRs */}
      <SectionTitle>Key Results</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {okr.keyResults.map((kr, idx) => {
          const atual = getValorAtual(kr);
          const meta = parseN(kr.meta);
          const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
          const auto = isAuto(kr);
          const nps = isNPS(kr);
          const cardColors = COLOR_CLASSES[colorKey(pct)];

          return (
            <div key={kr.id} className="bg-card border border-border rounded-xl p-4 relative flex flex-col gap-3">
              {/* Nome editável + delete */}
              <div className="flex items-start gap-1 pr-6">
                <input
                  value={kr.nome}
                  onChange={(e) => updateKR(idx, "nome", e.target.value)}
                  className="flex-1 text-xs font-semibold bg-transparent border-0 outline-none text-muted-foreground"
                />
                <button
                  onClick={() => removeKR(idx)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Valor atual */}
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight">{formatValor(kr, atual)}</span>
                  {auto && (
                    <RefreshCw size={11} className="text-primary flex-shrink-0" title="Calculado automaticamente do sistema" />
                  )}
                </div>
                {nps && (
                  <input
                    type="number"
                    value={kr.npsManual || ""}
                    onChange={(e) => updateKR(idx, "npsManual", e.target.value)}
                    placeholder="Digite o NPS manualmente"
                    className="mt-1.5 w-full text-xs bg-blue-50 dark:bg-blue-950/20 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>

              {/* Meta */}
              <div>
                <label className="text-[10px] text-muted-foreground">Meta</label>
                <input
                  type="number"
                  value={kr.meta || ""}
                  onChange={(e) => updateKR(idx, "meta", e.target.value)}
                  placeholder="Defina sua meta"
                  className="w-full mt-0.5 text-xs bg-blue-50 dark:bg-blue-950/20 border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Barra de progresso */}
              {meta > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">Atingimento</span>
                    <span className={`font-semibold ${cardColors.text}`}>{fmtPct(pct, 0)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cardColors.bg}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={addKR} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
        <Plus size={13} /> Adicionar KR
      </button>
    </div>
  );
}

// ─── Aba Mês ─────────────────────────────────────────────────────────────────

function AbaMes({ mesIdx, mes, onChange, systemData = null }) {
  const nDias = diasDoMes(mesIdx);
  const nomeMes = MESES_COMPLETOS[mesIdx];
  const [finOverrideMRR, setFinOverrideMRR] = useState(false);
  const [finOverrideUnico, setFinOverrideUnico] = useState(false);

  const updateFunil = (linha, diaIdx, val) => {
    const novo = { ...mes.funil, [linha]: mes.funil[linha].map((v, i) => (i === diaIdx ? val : v)) };
    onChange({ ...mes, funil: novo });
  };

  const updateOrcado = (linha, val) => {
    const novo = { ...mes.funil, orcadoTotal: { ...mes.funil.orcadoTotal, [linha]: val } };
    onChange({ ...mes, funil: novo });
  };

  const updatePremissa = (campo, tipo, val) => {
    const novo = { ...mes.premissas, [campo]: { ...mes.premissas[campo], [tipo]: val } };
    onChange({ ...mes, premissas: novo });
  };

  const updateFin = (campo, val) => {
    onChange({ ...mes, financeiro: { ...mes.financeiro, [campo]: val } });
  };

  const met = calcMetricas(mes.funil);
  // Se usando MRR do sistema, substituir no financeiro para os cálculos
  const finComMRR = {
    ...mes.financeiro,
    ...(!finOverrideMRR && systemData?.mrr > 0 ? { faturamentoRecorrente: String(systemData.mrr) } : {}),
    ...(!finOverrideUnico && systemData?.faturamentoUnico > 0 ? { faturamentoUnico: String(systemData.faturamentoUnico) } : {}),
  };
  const fin = calcFinanceiro(finComMRR, met.inv);

  const LINHAS_FUNIL = [
    { key: "investimento", label: "R$ Investimento", prefix: "R$" },
    { key: "impressoes", label: "# Impressões", prefix: "" },
    { key: "cliques", label: "# Cliques", prefix: "" },
    { key: "mensagens", label: "# Mensagens", prefix: "" },
    { key: "interessados", label: "# Interessados", prefix: "" },
    { key: "conversao", label: "# Realizados", prefix: "" },
  ];

  const exportCSV = () => {
    const rows = [["Dia", ...LINHAS_FUNIL.map((l) => l.label)]];
    for (let d = 0; d < nDias; d++) {
      rows.push([d + 1, ...LINHAS_FUNIL.map((l) => mes.funil[l.key][d] || 0)]);
    }
    rows.push(["Orçado Total", ...LINHAS_FUNIL.map((l) => mes.funil.orcadoTotal[l.key] || 0)]);
    rows.push(["Realizado Total", ...LINHAS_FUNIL.map((l) => somaArr(mes.funil[l.key]))]);
    rows.push([]);
    rows.push(["Métrica", "Valor"]);
    rows.push(["CPM", met.cpm.toFixed(2)]);
    rows.push(["CPC", met.cpc.toFixed(2)]);
    rows.push(["Custo/Mensagem", met.custoMsg.toFixed(2)]);
    rows.push(["Custo/Agendamento", met.custoAg.toFixed(2)]);
    rows.push(["Custo/Realizado", met.custoReal.toFixed(2)]);
    rows.push([]);
    rows.push(["Financeiro", "Valor"]);
    rows.push(["Faturamento Total", fin.fatTotal.toFixed(2)]);
    rows.push(["Lucro 1º Mês", fin.lucro1.toFixed(2)]);
    rows.push(["Lucro Recorrente", fin.lucroRec.toFixed(2)]);

    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `okr-funil-${nomeMes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const PREMISSAS = [
    { key: "ctr", label: "% CTR (Cliques / Impressões)" },
    { key: "msgCliques", label: "% Mensagens / Cliques" },
    { key: "intMsg", label: "% Interessados / Mensagens" },
    { key: "convInt", label: "% Conversão / Interessados" },
    { key: "convReal", label: "% Conversão / Realizado" },
  ];

  return (
    <div>
      {/* Botão Export */}
      <div className="flex justify-end mb-4">
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* Bloco 1 — Premissas */}
      <SectionTitle>Premissas (taxas de conversão esperadas)</SectionTitle>
      <div className="overflow-x-auto rounded-xl border border-border mb-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left px-3 py-2 font-medium">Métrica</th>
              <th className="text-center px-3 py-2 font-medium w-32">Orçado</th>
              <th className="text-center px-3 py-2 font-medium w-40">Orçado até a data</th>
              <th className="text-center px-3 py-2 font-medium w-40">Realizado até a data</th>
            </tr>
          </thead>
          <tbody>
            {PREMISSAS.map(({ key, label }) => {
              const diasFilled = diasPreenchidos(mes.funil.cliques.slice(0, new Date().getDate()));
              const orcadoAteData = diasFilled > 0 && parseN(mes.premissas[key]?.orcado) > 0
                ? parseN(mes.premissas[key].orcado)
                : "";
              return (
                <tr key={key} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 text-muted-foreground">{label}</td>
                  <td className="px-2 py-1.5">
                    <CellInput
                      value={mes.premissas[key]?.orcado ?? ""}
                      onChange={(v) => updatePremissa(key, "orcado", v)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <ReadCell value={orcadoAteData !== "" ? fmtPct(orcadoAteData) : "—"} />
                  </td>
                  <td className="px-2 py-1.5">
                    <CellInput
                      value={mes.premissas[key]?.realizado ?? ""}
                      onChange={(v) => updatePremissa(key, "realizado", v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bloco 2 — Funil */}
      <SectionTitle>Funil de Vendas — {nomeMes}</SectionTitle>
      <div className="overflow-x-auto rounded-xl border border-border mb-2">
        <table className="w-full text-xs" style={{ minWidth: `${180 + nDias * 56 + 3 * 100}px` }}>
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/80 min-w-[160px]">Métrica</th>
              {Array.from({ length: nDias }, (_, d) => (
                <th key={d} className="text-center px-1 py-2 font-medium w-14">{d + 1}</th>
              ))}
              <th className="text-center px-2 py-2 font-medium w-28 bg-muted/40">Orçado Total</th>
              <th className="text-center px-2 py-2 font-medium w-28 bg-muted/40">Orçado/Data</th>
              <th className="text-center px-2 py-2 font-medium w-28 bg-muted/40">Realizado/Data</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS_FUNIL.map(({ key, label }) => {
              const realizado = somaArr(mes.funil[key]);
              const realizadoAteHoje = somaAteHoje(mes.funil[key], mesIdx);
              const orcTotal = parseN(mes.funil.orcadoTotal[key]);
              const orcAteData = nDias > 0 && orcTotal > 0
                ? (orcTotal / nDias) * Math.min(new Date().getDate(), nDias)
                : 0;
              const isConversao = key === "conversao";
              const syncConversao = () => {
                if (!systemData?.conversoes) return;
                const hoje = Math.min(new Date().getDate(), nDias) - 1;
                updateFunil("conversao", hoje, String(systemData.conversoes));
              };
              return (
                <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-3 py-1.5 font-medium sticky left-0 bg-card">
                    <span className="flex items-center gap-1.5">
                      {label}
                      {isConversao && systemData?.conversoes > 0 && (
                        <button
                          onClick={syncConversao}
                          title={`Sincronizar ${systemData.conversoes} fechamentos do pipeline`}
                          className="text-primary hover:text-primary/70 flex items-center gap-0.5 text-[10px] border border-primary/30 rounded px-1 py-0.5"
                        >
                          <RefreshCw size={9} /> {systemData.conversoes}
                        </button>
                      )}
                    </span>
                  </td>
                  {Array.from({ length: nDias }, (_, d) => (
                    <td key={d} className="px-1 py-1">
                      <CellInput
                        value={mes.funil[key][d] ?? ""}
                        onChange={(v) => updateFunil(key, d, v)}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <CellInput
                      value={mes.funil.orcadoTotal[key] ?? ""}
                      onChange={(v) => updateOrcado(key, v)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <ReadCell value={fmtNum(orcAteData.toFixed(0))} />
                  </td>
                  <td className="px-2 py-1">
                    <ReadCell value={fmtNum(realizadoAteHoje.toFixed(0))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bloco 3 — Métricas calculadas */}
      <SectionTitle>Métricas Calculadas</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
        {(() => {
          const metOrc = calcMetricasOrcado(mes.funil.orcadoTotal);
          return [
            { label: "R$ CPM", value: fmtBRL(met.cpm), orcKey: "cpm", tooltip: "Custo por mil impressões. Quanto menor, mais eficiente a distribuição dos anúncios." },
            { label: "R$ CPC", value: fmtBRL(met.cpc), orcKey: "cpc", tooltip: "Custo por clique. Indica eficiência do criativo em gerar cliques." },
            { label: "R$ Custo/Mensagem", value: fmtBRL(met.custoMsg), orcKey: "custoMsg", tooltip: "Custo para cada pessoa que enviou mensagem." },
            { label: "R$ Custo/Agendamento", value: fmtBRL(met.custoAg), orcKey: "custoAg", tooltip: "Custo por agendamento/interessado qualificado." },
            { label: "R$ Custo/Realizado", value: fmtBRL(met.custoReal), orcKey: "custoReal", tooltip: "Custo por conversão efetivada (cliente fechado)." },
          ].map(({ label, value, orcKey, tooltip }) => {
            const sem = semaforo(met[orcKey === "cpm" ? "cpm" : orcKey === "cpc" ? "cpc" : orcKey === "custoMsg" ? "custoMsg" : orcKey === "custoAg" ? "custoAg" : "custoReal"], metOrc[orcKey]);
            return (
              <div key={label} title={tooltip} className="bg-muted/40 rounded-xl p-3 border border-border cursor-help">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                  {sem && <span>{sem}</span>}
                  {label}
                </p>
                <p className="text-sm font-semibold">{value}</p>
                {sem && <p className="text-[9px] text-muted-foreground mt-0.5">vs orçado</p>}
              </div>
            );
          });
        })()}
      </div>

      {/* Bloco 4 — Financeiro */}
      <SectionTitle>Financeiro</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* faturamentoRecorrente — com sync do sistema */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            Faturamento Mensal Recorrente (R$)
            {systemData?.mrr > 0 && !finOverrideMRR && (
              <span className="flex items-center gap-1 text-primary text-[10px]">
                <RefreshCw size={9} /> sistema
              </span>
            )}
          </label>
          {systemData?.mrr > 0 && !finOverrideMRR ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm bg-muted border border-border rounded-lg px-3 py-2 text-muted-foreground">
                {fmtBRL(systemData.mrr)}
              </div>
              <button
                onClick={() => setFinOverrideMRR(true)}
                className="text-[10px] text-muted-foreground hover:text-foreground underline whitespace-nowrap"
              >
                editar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={mes.financeiro.faturamentoRecorrente}
                onChange={(e) => updateFin("faturamentoRecorrente", e.target.value)}
                className="flex-1 text-sm bg-blue-50 dark:bg-blue-950/20 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {systemData?.mrr > 0 && (
                <button
                  onClick={() => { setFinOverrideMRR(false); updateFin("faturamentoRecorrente", ""); }}
                  className="text-[10px] text-primary hover:underline whitespace-nowrap"
                >
                  usar sistema
                </button>
              )}
            </div>
          )}
        </div>

        {/* faturamentoUnico — com sync do sistema */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            Faturamento Único / Ticket (R$)
            {systemData?.faturamentoUnico > 0 && !finOverrideUnico && (
              <span className="flex items-center gap-1 text-primary text-[10px]">
                <RefreshCw size={9} /> sistema
              </span>
            )}
          </label>
          {systemData?.faturamentoUnico > 0 && !finOverrideUnico ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm bg-muted border border-border rounded-lg px-3 py-2 text-muted-foreground">
                {fmtBRL(systemData.faturamentoUnico)}
              </div>
              <button
                onClick={() => setFinOverrideUnico(true)}
                className="text-[10px] text-muted-foreground hover:text-foreground underline whitespace-nowrap"
              >
                editar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={mes.financeiro.faturamentoUnico}
                onChange={(e) => updateFin("faturamentoUnico", e.target.value)}
                className="flex-1 text-sm bg-blue-50 dark:bg-blue-950/20 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {systemData?.faturamentoUnico > 0 && (
                <button
                  onClick={() => { setFinOverrideUnico(false); updateFin("faturamentoUnico", ""); }}
                  className="text-[10px] text-primary hover:underline whitespace-nowrap"
                >
                  usar sistema
                </button>
              )}
            </div>
          )}
        </div>

        {[
          { label: "Imposto (%)", key: "imposto" },
          { label: "Comissão Closer (%)", key: "comissaoCloser" },
          { label: "Comissão SDR (%)", key: "comissaoSDR" },
          { label: "Despesas Fixas (%)", key: "despesasFixas" },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="block text-xs text-muted-foreground mb-1">{label}</label>
            <input
              type="number"
              value={mes.financeiro[key]}
              onChange={(e) => updateFin(key, e.target.value)}
              className="w-full text-sm bg-blue-50 dark:bg-blue-950/20 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {[
          { label: "Faturamento Total", value: fmtBRL(fin.fatTotal), green: fin.fatTotal > 0 },
          { label: "Lucro 1º Mês", value: fmtBRL(fin.lucro1), green: fin.lucro1 > 0 },
          { label: "Lucro Recorrente", value: fmtBRL(fin.lucroRec), green: fin.lucroRec > 0 },
        ].map(({ label, value, green }) => (
          <div key={label} className="bg-muted/40 rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-lg font-bold ${green ? "text-emerald-600" : "text-red-500"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Bloco 5 — Clientes por Origem */}
      {systemData?.clientsByOrigin?.length > 0 && (
        <>
          <SectionTitle>Clientes por Origem</SectionTitle>
          <OrigemBlock data={systemData.clientsByOrigin} />
        </>
      )}
    </div>
  );
}

// ─── Bloco Clientes por Origem ───────────────────────────────────────────────

const ORIGIN_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

function OrigemBlock({ data }) {
  const pieData = data.map((d) => ({ name: d.origin || "Não informado", value: d.count }));
  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-muted/20 border border-border rounded-xl p-4 mb-2">
      <div className="flex-shrink-0" style={{ width: 200, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
              {pieData.map((_, i) => (
                <Cell key={i} fill={ORIGIN_COLORS[i % ORIGIN_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Origem</th>
              <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Clientes</th>
              <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">MRR</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-2 py-1.5 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ORIGIN_COLORS[i % ORIGIN_COLORS.length] }} />
                  {d.origin || "Não informado"}
                </td>
                <td className="px-2 py-1.5 text-center">{d.count}</td>
                <td className="px-2 py-1.5 text-center">{fmtBRL(d.mrr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Aba Resumo ──────────────────────────────────────────────────────────────

function AbaResumo({ meses }) {
  const dados = useMemo(() =>
    MESES.map((nome, i) => {
      const m = meses[String(i)];
      const met = calcMetricas(m.funil);
      const fin = calcFinanceiro(m.financeiro, met.inv);
      const roas = met.inv > 0 ? fin.fatTotal / met.inv : 0;
      const margem = fin.fatTotal > 0 ? (fin.lucro1 / fin.fatTotal) * 100 : 0;
      return {
        mes: nome,
        investimento: met.inv,
        conversoes: met.conv,
        faturamento: fin.fatTotal,
        roas,
        lucro: fin.lucro1,
        margem,
      };
    }),
    [meses]
  );

  return (
    <div>
      <SectionTitle>Comparativo Mensal</SectionTitle>
      <div className="overflow-x-auto rounded-xl border border-border mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {["Mês", "Investimento", "Conversões", "Faturamento", "ROAS", "Lucro", "Margem %"].map((h) => (
                <th key={h} className="text-center px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{d.mes}</td>
                <td className="px-3 py-2 text-center">{fmtBRL(d.investimento)}</td>
                <td className="px-3 py-2 text-center">{fmtNum(d.conversoes)}</td>
                <td className="px-3 py-2 text-center">{fmtBRL(d.faturamento)}</td>
                <td className="px-3 py-2 text-center">{d.roas.toFixed(2)}x</td>
                <td className={`px-3 py-2 text-center font-medium ${d.lucro >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {fmtBRL(d.lucro)}
                </td>
                <td className="px-3 py-2 text-center">{fmtPct(d.margem)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionTitle>Investimento vs Faturamento (R$)</SectionTitle>
          <div className="bg-card border border-border rounded-xl p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="investimento" name="Investimento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="faturamento" name="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <SectionTitle>ROAS por Mês</SectionTitle>
          <div className="bg-card border border-border rounded-xl p-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(1)}x`} />
                <Tooltip formatter={(v) => `${v.toFixed(2)}x`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  dataKey="roas"
                  name="ROAS"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#8b5cf6" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function OKRSheet({ onBack }) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_STATE;
  });

  const currentMonth = new Date().getMonth();
  const [abaAtiva, setAbaAtiva] = useState(String(currentMonth));
  const [systemData, setSystemData] = useState(null);

  // Salvar no localStorage sempre que data mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Buscar dados do sistema (MRR, conversões, clientes por origem)
  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const headers = authHeaders();
        const [clientsRes, dealsRes] = await Promise.all([
          fetch(`${API}/clients`, { headers }),
          fetch(`${API}/pipeline/deals`, { headers }),
        ]);
        if (!clientsRes.ok || !dealsRes.ok) return;

        const clients = await clientsRes.json();
        const deals = await dealsRes.json();

        const now = new Date();

        // MRR: soma de clientes ativos recorrentes
        const activeRecurring = clients.filter(
          (c) => c.status === "ativo" && c.client_type === "recorrente"
        );
        const mrr = activeRecurring.reduce((sum, c) => sum + (parseFloat(c.monthly_value) || 0), 0);

        // Faturamento Único: clientes pontuais com start_date no mês atual
        const mesAtualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const pontualMesAtual = clients.filter(
          (c) => c.status === "ativo" && c.client_type === "pontual" && (c.start_date || "").startsWith(mesAtualStr)
        );
        const faturamentoUnico = pontualMesAtual.reduce((sum, c) => sum + (parseFloat(c.monthly_value) || 0), 0);

        // Conversões: deals fechados no mês atual
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const wonDeals = deals.filter((d) => {
          const stage = d.stage || {};
          return stage.is_won_stage && d.created_at >= monthStart;
        });
        const conversoes = wonDeals.length;

        // Clientes por origem
        const originMap = {};
        clients
          .filter((c) => c.status === "ativo")
          .forEach((c) => {
            const origin = c.source || "";
            if (!originMap[origin]) originMap[origin] = { count: 0, mrr: 0 };
            originMap[origin].count += 1;
            originMap[origin].mrr += parseFloat(c.monthly_value) || 0;
          });
        const clientsByOrigin = Object.entries(originMap)
          .map(([origin, v]) => ({ origin, ...v }))
          .sort((a, b) => b.count - a.count);

        setSystemData({ mrr, faturamentoUnico, conversoes, clientsByOrigin, clients });
      } catch {}
    };
    fetchSystemData();
  }, []);

  const updateOKR = useCallback((okr) => setData((d) => ({ ...d, okr })), []);

  const updateMes = useCallback((mesIdx, mes) =>
    setData((d) => ({ ...d, meses: { ...d.meses, [String(mesIdx)]: mes } })),
    []
  );

  const ABAS = [
    { key: "okr", label: "OKR Trimestral" },
    ...MESES.map((m, i) => ({ key: String(i), label: m })),
    { key: "resumo", label: "Resumo" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-xl font-heading font-bold tracking-tight">Planilha OKR</h1>
        <span className="text-xs text-muted-foreground ml-auto">Salvo automaticamente</span>
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
        {ABAS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAbaAtiva(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              abaAtiva === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        {abaAtiva === "okr" && (
          <AbaOKR okr={data.okr} onChange={updateOKR} meses={data.meses} systemClients={systemData?.clients || []} />
        )}
        {MESES.map((_, i) =>
          abaAtiva === String(i) ? (
            <AbaMes
              key={i}
              mesIdx={i}
              mes={data.meses[String(i)]}
              onChange={(m) => updateMes(i, m)}
              systemData={i === currentMonth ? systemData : null}
            />
          ) : null
        )}
        {abaAtiva === "resumo" && <AbaResumo meses={data.meses} />}
      </div>
    </div>
  );
}
