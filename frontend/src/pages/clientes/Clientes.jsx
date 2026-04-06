import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

const STATUS_CONFIG = {
  ativo:     { label: "Ativo",     className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pausado:   { label: "Pausado",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const BILLING_TYPES = [
  { value: "BOLETO",      label: "Boleto" },
  { value: "PIX",         label: "PIX" },
  { value: "CREDIT_CARD", label: "Cartão de Crédito" },
  { value: "TRANSFER",    label: "Transferência" },
];

const CONTRACT_OPTIONS = [
  { value: 3,  label: "3 meses" },
  { value: 6,  label: "6 meses" },
  { value: 12, label: "12 meses" },
];

const SOURCES = [
  { value: "manual",    label: "Manual" },
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "google",    label: "Google Ads" },
  { value: "facebook",  label: "Facebook" },
  { value: "site",      label: "Site" },
  { value: "whatsapp",  label: "WhatsApp" },
  { value: "outro",     label: "Outro" },
];

const EMPTY_FORM = {
  name: "", email: "", phone: "", company: "",
  cpf_cnpj: "", status: "ativo", monthly_value: 0,
  billing_type: "BOLETO", start_date: "", due_date: "", notes: "",
  client_type: "recorrente", contract_months: "", end_date: "",
  source: "", churn_reason: "",
};

// ——— LTV helpers ———
function addMonths(dateStr, months) {
  if (!dateStr || !months) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + parseInt(months));
  return d.toISOString().split("T")[0];
}

function monthsBetween(startStr, endStr) {
  if (!startStr) return 0;
  const start = new Date(startStr + "T00:00:00");
  const end = endStr ? new Date(endStr + "T00:00:00") : new Date();
  const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, diff);
}

function ltvContratado(c) {
  if (!c.contract_months || !c.monthly_value) return null;
  return c.monthly_value * c.contract_months;
}

function ltvRealizado(c) {
  if (!c.monthly_value || !c.start_date) return null;
  const today = new Date().toISOString().split("T")[0];
  const cap = c.contract_months || 999;
  const elapsed = Math.min(monthsBetween(c.start_date, today), cap);
  return c.monthly_value * elapsed;
}

function ltvProjetado(c) {
  if (c.status !== "ativo" || !c.monthly_value || !c.end_date) return null;
  const today = new Date().toISOString().split("T")[0];
  if (c.end_date <= today) return 0;
  const remaining = monthsBetween(today, c.end_date);
  return c.monthly_value * remaining;
}

export default function Clientes() {
  const [clients, setClients]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [sourceFilter, setSourceFilter]   = useState("all");
  const [periodFilter, setPeriodFilter]   = useState("all");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/clients`, { headers: getAuthHeader() });
      setClients(res.data);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const openCreate = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({
      name:            client.name || "",
      email:           client.email || "",
      phone:           client.phone || "",
      company:         client.company || "",
      cpf_cnpj:        client.cpf_cnpj || "",
      status:          client.status || "ativo",
      monthly_value:   client.monthly_value || 0,
      billing_type:    client.billing_type || "BOLETO",
      start_date:      client.start_date || "",
      due_date:        client.due_date || "",
      notes:           client.notes || "",
      client_type:     client.client_type || "recorrente",
      contract_months: client.contract_months || "",
      end_date:        client.end_date || "",
      source:          client.source || "",
      churn_reason:    client.churn_reason || "",
    });
    setModalOpen(true);
  };

  // Auto-calculate end_date when start_date or contract_months changes
  const setField = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if ((field === "start_date" || field === "contract_months") && next.client_type === "recorrente") {
        next.end_date = addMonths(next.start_date, next.contract_months);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name:            form.name.trim(),
        email:           form.email.trim() || null,
        phone:           form.phone.trim() || null,
        company:         form.company.trim() || null,
        cpf_cnpj:        form.cpf_cnpj.trim() || null,
        status:          form.status,
        monthly_value:   parseFloat(form.monthly_value) || 0,
        billing_type:    form.billing_type,
        start_date:      form.start_date || null,
        due_date:        form.due_date || null,
        end_date:        form.end_date || null,
        notes:           form.notes.trim() || null,
        client_type:     form.client_type,
        contract_months: form.contract_months ? parseInt(form.contract_months) : null,
        source:          form.source || null,
        churn_reason:    form.churn_reason.trim() || null,
      };
      if (editingClient) {
        await axios.put(`${API}/clients/${editingClient.client_id}`, payload, { headers: getAuthHeader() });
        toast.success("Cliente atualizado!");
      } else {
        await axios.post(`${API}/clients`, payload, { headers: getAuthHeader() });
        toast.success("Cliente criado!");
      }
      await fetchClients();
      setModalOpen(false);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : JSON.stringify(detail);
      toast.error(msg || "Erro ao salvar cliente");
      console.error("Error saving client:", err.response?.data || err);
    }
    setSaving(false);
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Remover o cliente "${client.name}"?`)) return;
    try {
      await axios.delete(`${API}/clients/${client.client_id}`, { headers: getAuthHeader() });
      setClients((prev) => prev.filter((c) => c.client_id !== client.client_id));
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSource = sourceFilter === "all" || c.source === sourceFilter;
    const matchPeriod = periodFilter === "all" || String(c.contract_months) === periodFilter;
    return matchSearch && matchStatus && matchSource && matchPeriod;
  });

  const totalMRR = clients
    .filter((c) => c.status === "ativo")
    .reduce((sum, c) => sum + (c.monthly_value || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.filter((c) => c.status === "ativo").length} ativos &bull; MRR:{" "}
            {formatCurrency(totalMRR)}
          </p>
        </div>
        <Button onClick={openCreate} data-testid="create-client-button">
          <Plus size={16} className="mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="clients-search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="clients-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos períodos</SelectItem>
            {CONTRACT_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={36} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || statusFilter !== "all" || sourceFilter !== "all" || periodFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Clique em 'Novo Cliente' para começar"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="hidden lg:table-cell text-center">Período</TableHead>
                <TableHead className="hidden lg:table-cell text-center">Saída</TableHead>
                <TableHead className="hidden xl:table-cell text-right">LTV Contratado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => {
                const statusCfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.ativo;
                const ltv = ltvContratado(client);
                return (
                  <TableRow key={client.client_id} data-testid={`client-row-${client.client_id}`}>
                    <TableCell>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.company || client.email || "—"}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground capitalize">
                      {client.client_type || "recorrente"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {SOURCES.find(s => s.value === client.source)?.label || "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(client.monthly_value)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center text-sm text-muted-foreground">
                      {client.contract_months ? `${client.contract_months}m` : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center text-sm text-muted-foreground">
                      {fmtDate(client.end_date)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-right text-sm font-medium">
                      {ltv != null ? formatCurrency(ltv) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          onClick={() => openEdit(client)}
                          data-testid={`edit-client-${client.client_id}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          onClick={() => handleDelete(client)}
                          data-testid={`delete-client-${client.client_id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="client-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingClient ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Nome */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Nome *</Label>
              <Input
                placeholder="Nome do cliente"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                data-testid="client-name-input"
              />
            </div>

            {/* Tipo + Status */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tipo</Label>
              <Select value={form.client_type} onValueChange={(v) => setField("client_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                  <SelectItem value="pontual">Pontual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger data-testid="client-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email + Telefone */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email</Label>
              <Input type="email" placeholder="email@cliente.com" value={form.email}
                onChange={(e) => setField("email", e.target.value)} data-testid="client-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Telefone</Label>
              <Input placeholder="(11) 99999-9999" value={form.phone}
                onChange={(e) => setField("phone", e.target.value)} data-testid="client-phone-input" />
            </div>

            {/* Empresa + CPF/CNPJ */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Empresa</Label>
              <Input placeholder="Nome da empresa" value={form.company}
                onChange={(e) => setField("company", e.target.value)} data-testid="client-company-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">CPF / CNPJ</Label>
              <Input placeholder="00.000.000/0001-00" value={form.cpf_cnpj}
                onChange={(e) => setField("cpf_cnpj", e.target.value)} data-testid="client-cpfcnpj-input" />
            </div>

            {/* MRR + Cobrança */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">MRR (R$/mês)</Label>
              <Input type="number" min={0} placeholder="0" value={form.monthly_value}
                onChange={(e) => setField("monthly_value", e.target.value)}
                data-testid="client-monthly-value-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tipo de Cobrança</Label>
              <Select value={form.billing_type} onValueChange={(v) => setField("billing_type", v)}>
                <SelectTrigger data-testid="client-billing-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Origem</Label>
              <Select value={form.source || "manual"} onValueChange={(v) => setField("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Período de contrato (só recorrente) */}
            {form.client_type === "recorrente" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Período de Contrato</Label>
                <Select
                  value={form.contract_months ? String(form.contract_months) : ""}
                  onValueChange={(v) => setField("contract_months", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Data de Entrada */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Data de Entrada</Label>
              <Input type="date" value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
                data-testid="client-start-date-input" />
            </div>

            {/* Data de Saída (auto ou manual) */}
            {form.client_type === "recorrente" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Data de Saída
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">(auto calculada, editável)</span>
                </Label>
                <Input type="date" value={form.end_date}
                  onChange={(e) => setField("end_date", e.target.value)} />
              </div>
            )}

            {/* Vencimento fatura */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Vencimento da fatura</Label>
              <Input type="date" value={form.due_date}
                onChange={(e) => setField("due_date", e.target.value)}
                data-testid="client-due-date-input" />
            </div>

            {/* LTV preview (readonly) */}
            {(form.monthly_value > 0 && form.contract_months) && (
              <div className="sm:col-span-2 grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg">
                {[
                  { label: "LTV Contratado", value: form.monthly_value * form.contract_months },
                  { label: "LTV Realizado", value: form.monthly_value * Math.min(monthsBetween(form.start_date, null), parseInt(form.contract_months) || 999) },
                  { label: "LTV Projetado", value: form.end_date && form.end_date > new Date().toISOString().split("T")[0] ? form.monthly_value * monthsBetween(new Date().toISOString().split("T")[0], form.end_date) : 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm font-bold">{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Motivo do churn (só cancelado) */}
            {form.status === "cancelado" && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Motivo do Churn</Label>
                <Textarea
                  placeholder="Por que o cliente cancelou?"
                  value={form.churn_reason}
                  onChange={(e) => setField("churn_reason", e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {/* Notas */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm font-medium">Notas</Label>
              <Textarea
                placeholder="Informações adicionais sobre o cliente..."
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={3}
                data-testid="client-notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} data-testid="client-modal-cancel">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              data-testid="client-modal-save"
            >
              {saving ? "Salvando..." : editingClient ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
