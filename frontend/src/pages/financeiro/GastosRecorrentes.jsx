import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("fluxscale_token")}`,
});

const FREQUENCIES = [
  { value: "mensal",  label: "Mensal" },
  { value: "semanal", label: "Semanal" },
  { value: "anual",   label: "Anual" },
];

const CATEGORIES = [
  "Infraestrutura", "Pessoal", "Marketing", "Ferramentas", "Impostos",
  "Aluguel", "Serviços", "Outros",
];

function toMonthly(value, frequency) {
  if (frequency === "semanal") return value * 4.33;
  if (frequency === "anual")   return value / 12;
  return value;
}

function fmtCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

const EMPTY_FORM = {
  name: "", value: "", frequency: "mensal", due_day: "",
  due_date: "", category: "Outros", description: "", show_in_dashboard: true,
};

export default function GastosRecorrentes({ onBack }) {
  const [expenses, setExpenses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [error, setError]         = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/recurring-expenses`, { headers: authHeaders() });
      const data = await r.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setError(""); setShowForm(true); };
  const openEdit   = (exp) => {
    setForm({
      name: exp.name, value: String(exp.value), frequency: exp.frequency,
      due_day: exp.due_day ?? "", due_date: exp.due_date ?? "",
      category: exp.category, description: exp.description ?? "",
      show_in_dashboard: exp.show_in_dashboard,
    });
    setEditId(exp.expense_id);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.value || !form.category) {
      setError("Preencha nome, valor e categoria.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        value: parseFloat(form.value),
        frequency: form.frequency,
        due_day: form.due_day ? parseInt(form.due_day) : null,
        due_date: form.due_date || null,
        category: form.category,
        description: form.description || null,
        show_in_dashboard: form.show_in_dashboard,
      };
      const url    = editId ? `${API}/api/recurring-expenses/${editId}` : `${API}/api/recurring-expenses`;
      const method = editId ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!r.ok) throw new Error("Erro ao salvar.");
      setShowForm(false);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir este gasto recorrente?")) return;
    await fetch(`${API}/api/recurring-expenses/${id}`, { method: "DELETE", headers: authHeaders() });
    await load();
  };

  const toggleDashboard = async (exp) => {
    await fetch(`${API}/api/recurring-expenses/${exp.expense_id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ show_in_dashboard: !exp.show_in_dashboard }),
    });
    setExpenses((prev) =>
      prev.map((e) => e.expense_id === exp.expense_id ? { ...e, show_in_dashboard: !e.show_in_dashboard } : e)
    );
  };

  const totalMensal = expenses.reduce((sum, e) => sum + toMonthly(e.value, e.frequency), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Gastos Recorrentes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cadastre e gerencie despesas fixas da empresa</p>
        </div>
        <button
          onClick={openCreate}
          className="ml-auto flex items-center gap-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} /> Novo gasto
        </button>
      </div>

      {/* Totalizador */}
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-5 mb-6">
        <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Total mensal estimado</p>
        <p className="text-3xl font-heading font-bold text-red-700 dark:text-red-400">{fmtCurrency(totalMensal)}</p>
        <p className="text-xs text-red-500 dark:text-red-500 mt-1">{expenses.length} gasto{expenses.length !== 1 ? "s" : ""} recorrente{expenses.length !== 1 ? "s" : ""} cadastrado{expenses.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold mb-4">{editId ? "Editar gasto" : "Novo gasto recorrente"}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nome do gasto *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Aluguel, Assinatura AWS..."
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Valor (R$) *</label>
                <input
                  type="number" min="0" step="0.01"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="0,00"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Frequência</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {FREQUENCIES.map((fr) => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Categoria *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Dia do vencimento</label>
                <input
                  type="number" min="1" max="31"
                  value={form.due_day}
                  onChange={(e) => setForm((f) => ({ ...f, due_day: e.target.value }))}
                  placeholder="Ex: 5 (dia do mês)"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Data fixa (opcional)</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Descrição / observação</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Opcional..."
                rows={2}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, show_in_dashboard: !f.show_in_dashboard }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.show_in_dashboard ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.show_in_dashboard ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <span className="text-xs text-muted-foreground">Exibir no Dashboard</span>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                {editId ? "Salvar alterações" : "Cadastrar gasto"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listagem */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum gasto recorrente cadastrado ainda.</p>
          <button onClick={openCreate} className="mt-3 text-sm text-primary hover:underline">Adicionar o primeiro</button>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => {
            const monthly = toMonthly(exp.value, exp.frequency);
            return (
              <div key={exp.expense_id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{exp.name}</p>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{exp.category}</span>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full capitalize">{exp.frequency}</span>
                    {exp.due_day && <span className="text-[10px] text-muted-foreground">vence dia {exp.due_day}</span>}
                  </div>
                  {exp.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{exp.description}</p>}
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">
                    {fmtCurrency(exp.value)}
                    {exp.frequency !== "mensal" && (
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        (≈ {fmtCurrency(monthly)}/mês)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleDashboard(exp)}
                    title={exp.show_in_dashboard ? "Ocultar do dashboard" : "Exibir no dashboard"}
                    className={`p-1.5 rounded hover:bg-muted transition-colors ${exp.show_in_dashboard ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {exp.show_in_dashboard ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => openEdit(exp)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(exp.expense_id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-600 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
