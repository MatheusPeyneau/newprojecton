import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

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
    valorProposta: "",
    visao12: "",
    visao3: "",
    objetivo: "",
    dataInicio: "",
    periodicidade: 7,
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

function AbaOKR({ okr, onChange, meses }) {
  const semanas = useMemo(
    () => gerarSemanas(okr.dataInicio, okr.periodicidade),
    [okr.dataInicio, okr.periodicidade]
  );

  const updateKR = (idx, field, val) => {
    const krs = okr.keyResults.map((k, i) => (i === idx ? { ...k, [field]: val } : k));
    onChange({ ...okr, keyResults: krs });
  };

  const updateKRSemanal = (krIdx, semIdx, val) => {
    const krs = okr.keyResults.map((k, i) => {
      if (i !== krIdx) return k;
      const sem = [...(k.semanal || [])];
      sem[semIdx] = val;
      return { ...k, semanal: sem };
    });
    onChange({ ...okr, keyResults: krs });
  };

  const addKR = () => {
    const novo = { id: Date.now(), nome: "Novo KR", formula: "", base: "", meta: "", semanal: [] };
    onChange({ ...okr, keyResults: [...okr.keyResults, novo] });
  };

  const removeKR = (idx) => {
    onChange({ ...okr, keyResults: okr.keyResults.filter((_, i) => i !== idx) });
  };

  // Calcular valor atual de cada KR a partir dos dados mensais
  const getValorAtual = (kr) => {
    const nome = kr.nome.toLowerCase();
    let total = 0;
    Object.values(meses).forEach((m) => {
      const met = calcMetricas(m.funil);
      const fin = calcFinanceiro(m.financeiro, met.inv);
      if (nome.includes("receita")) total += fin.fatTotal;
      else if (nome.includes("roas")) total += met.inv > 0 ? fin.fatTotal / met.inv : 0;
      else if (nome.includes("lucro líquido")) total += fin.lucro1;
      else if (nome.includes("margem")) total += fin.lucro1;
      else if (nome.includes("conversão") || nome.includes("conv")) total += met.conv;
    });
    return parseN(kr.semanal?.slice(-1)[0]) || total;
  };

  return (
    <div>
      {/* Campos de texto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[
          { label: "Proposta de Valor", key: "valorProposta", placeholder: 'Ajudamos [PESSOAS] a alcançar [OBJETIVO]' },
          { label: "Visão 12 Meses", key: "visao12", placeholder: "Onde a empresa estará em 12 meses?" },
          { label: "Visão 3 Meses", key: "visao3", placeholder: "O que conquista em 3 meses?" },
          { label: "Objetivo do Trimestre", key: "objetivo", placeholder: "Qual o foco deste trimestre?" },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            <textarea
              value={okr[key]}
              onChange={(e) => onChange({ ...okr, [key]: e.target.value })}
              placeholder={placeholder}
              rows={2}
              className="w-full text-sm bg-blue-50 dark:bg-blue-950/20 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Data de Início</label>
          <input
            type="date"
            value={okr.dataInicio}
            onChange={(e) => onChange({ ...okr, dataInicio: e.target.value })}
            className="w-full text-sm bg-blue-50 dark:bg-blue-950/20 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Periodicidade de acompanhamento (dias)</label>
          <input
            type="number"
            value={okr.periodicidade}
            onChange={(e) => onChange({ ...okr, periodicidade: parseInt(e.target.value) || 7 })}
            className="w-full text-sm bg-blue-50 dark:bg-blue-950/20 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tabela KRs */}
      <SectionTitle>Key Results</SectionTitle>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left px-3 py-2 font-medium min-w-[140px]">KR</th>
              <th className="text-left px-3 py-2 font-medium min-w-[160px]">Fórmula</th>
              <th className="text-center px-3 py-2 font-medium w-24">Base</th>
              <th className="text-center px-3 py-2 font-medium w-24">Meta</th>
              <th className="text-center px-3 py-2 font-medium w-24">Atual</th>
              <th className="text-center px-3 py-2 font-medium min-w-[140px]">% Atingimento</th>
              {semanas.map((s, i) => (
                <th key={i} className="text-center px-2 py-2 font-medium w-20 whitespace-nowrap">{s}</th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {okr.keyResults.map((kr, idx) => {
              const atual = getValorAtual(kr);
              return (
                <tr key={kr.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-1.5">
                    <input
                      value={kr.nome}
                      onChange={(e) => updateKR(idx, "nome", e.target.value)}
                      className="w-full bg-blue-50 dark:bg-blue-950/20 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={kr.formula}
                      onChange={(e) => updateKR(idx, "formula", e.target.value)}
                      className="w-full bg-blue-50 dark:bg-blue-950/20 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <CellInput value={kr.base} onChange={(v) => updateKR(idx, "base", v)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <CellInput value={kr.meta} onChange={(v) => updateKR(idx, "meta", v)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <ReadCell value={fmtNum(atual)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <ProgressBar valor={atual} meta={parseN(kr.meta)} />
                  </td>
                  {semanas.map((_, si) => (
                    <td key={si} className="px-1 py-1.5">
                      <CellInput
                        value={kr.semanal?.[si] ?? ""}
                        onChange={(v) => updateKRSemanal(idx, si, v)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeKR(idx)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        onClick={addKR}
        className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <Plus size={13} /> Adicionar KR
      </button>
    </div>
  );
}

// ─── Aba Mês ─────────────────────────────────────────────────────────────────

function AbaMes({ mesIdx, mes, onChange }) {
  const nDias = diasDoMes(mesIdx);
  const nomeMes = MESES_COMPLETOS[mesIdx];

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
  const fin = calcFinanceiro(mes.financeiro, met.inv);

  const LINHAS_FUNIL = [
    { key: "investimento", label: "R$ Investimento", prefix: "R$" },
    { key: "impressoes", label: "# Impressões", prefix: "" },
    { key: "cliques", label: "# Cliques", prefix: "" },
    { key: "mensagens", label: "# Mensagens", prefix: "" },
    { key: "interessados", label: "# Interessados", prefix: "" },
    { key: "conversao", label: "# Conversão", prefix: "" },
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
              return (
                <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-3 py-1.5 font-medium sticky left-0 bg-card">{label}</td>
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
        {[
          { label: "R$ CPM", value: fmtBRL(met.cpm) },
          { label: "R$ CPC", value: fmtBRL(met.cpc) },
          { label: "R$ Custo/Mensagem", value: fmtBRL(met.custoMsg) },
          { label: "R$ Custo/Agendamento", value: fmtBRL(met.custoAg) },
          { label: "R$ Custo/Realizado", value: fmtBRL(met.custoReal) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/40 rounded-xl p-3 border border-border">
            <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Bloco 4 — Financeiro */}
      <SectionTitle>Financeiro</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Faturamento Mensal Recorrente (R$)", key: "faturamentoRecorrente" },
          { label: "Faturamento Único / Ticket (R$)", key: "faturamentoUnico" },
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

  const [abaAtiva, setAbaAtiva] = useState("okr");

  // Salvar no localStorage sempre que data mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

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
          <AbaOKR okr={data.okr} onChange={updateOKR} meses={data.meses} />
        )}
        {MESES.map((_, i) =>
          abaAtiva === String(i) ? (
            <AbaMes
              key={i}
              mesIdx={i}
              mes={data.meses[String(i)]}
              onChange={(m) => updateMes(i, m)}
            />
          ) : null
        )}
        {abaAtiva === "resumo" && <AbaResumo meses={data.meses} />}
      </div>
    </div>
  );
}
