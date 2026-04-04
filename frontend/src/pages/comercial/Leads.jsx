import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Search, Pencil, Trash2, Users,
  CheckCircle2, Kanban, ArrowRight, CreditCard, DollarSign, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("agenciaos_token")}` };
}
function formatCurrency(v) {
  return v > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : null;
}

const STATUS_CONFIG = {
  novo: { label: "Novo", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  qualificado: { label: "Qualificado", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  em_atendimento: { label: "Em Atendimento", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  desqualificado: { label: "Desqualificado", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "google", label: "Google" },
  { value: "formulario", label: "Formulário" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

const BILLING_OPTIONS = [
  { value: "BOLETO", label: "Boleto" },
  { value: "CREDIT_CARD", label: "Cartão" },
  { value: "PIX", label: "PIX" },
];

const EMPTY_FORM = {
  name: "", email: "", phone: "", company: "",
  cpf_cnpj: "", billing_type: "BOLETO", value: 0, due_date: "",
  source: "manual", status: "novo", score: 50, notes: "",
};

// ——— Per-cell click-to-edit hook ———
function useCellEdit(setLeads) {
  const [editingCell, setEditingCell] = useState(null); // { leadId, field }
  const [cellValue, setCellValue] = useState("");
  const cancelRef = useRef(false);

  const isEditing = (leadId, field) =>
    editingCell?.leadId === leadId && editingCell?.field === field;

  const startEdit = (leadId, field, value) => {
    cancelRef.current = false;
    setEditingCell({ leadId, field });
    setCellValue(String(value ?? ""));
  };

  const commitEdit = useCallback(async () => {
    if (cancelRef.current || !editingCell) { setEditingCell(null); return; }
    const { leadId, field } = editingCell;
    const numFields = ["value", "score"];
    const val = numFields.includes(field) ? (Number(cellValue) || 0) : cellValue;
    setEditingCell(null); // clear immediately for snappy UX
    try {
      const res = await axios.put(`${API}/leads/${leadId}`, { [field]: val }, { headers: getAuthHeader() });
      setLeads(prev => prev.map(l => l.lead_id === leadId ? res.data : l));
    } catch { toast.error("Erro ao salvar campo"); }
  }, [editingCell, cellValue, setLeads]);

  const cancelEdit = useCallback(() => {
    cancelRef.current = true;
    setEditingCell(null);
  }, []);

  const saveSelect = async (leadId, field, value) => {
    try {
      const res = await axios.put(`${API}/leads/${leadId}`, { [field]: value }, { headers: getAuthHeader() });
      setLeads(prev => prev.map(l => l.lead_id === leadId ? res.data : l));
    } catch { toast.error("Erro ao salvar"); }
  };

  return { isEditing, startEdit, commitEdit, cancelEdit, cellValue, setCellValue, saveSelect };
}

// ——— Inline text cell ———
function TextCell({ leadId, field, value, display, type = "text", className, cellEdit }) {
  const { isEditing, startEdit, commitEdit, cancelEdit, cellValue, setCellValue } = cellEdit;
  const editing = isEditing(leadId, field);

  return (
    <div
      className={cn(
        "rounded transition-colors min-h-[22px] px-1 -mx-1",
        editing ? "ring-1 ring-primary/50 bg-primary/5" : "cursor-text hover:bg-muted/40 group",
        className
      )}
      onClick={() => !editing && startEdit(leadId, field, value)}
      data-testid={editing ? `cell-editing-${leadId}-${field}` : `cell-${leadId}-${field}`}
    >
      {editing ? (
        <input
          autoFocus
          type={type}
          value={cellValue}
          className="w-full bg-transparent text-sm outline-none py-0.5 min-w-[80px]"
          onChange={e => setCellValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelEdit(); }
          }}
        />
      ) : (
        <span className={cn("text-sm", !display && "text-muted-foreground/40 italic")}>{display || "—"}</span>
      )}
    </div>
  );
}

// ——— Inline select cell (always rendered as styled trigger) ———
function SelectCell({ leadId, field, value, options, renderValue, cellEdit }) {
  const { saveSelect } = cellEdit;
  return (
    <Select
      value={value || ""}
      onValueChange={v => saveSelect(leadId, field, v)}
    >
      <SelectTrigger
        className="cursor-pointer h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 focus-visible:ring-0 hover:opacity-75 transition-opacity w-auto [&>svg]:hidden"
        data-testid={`cell-select-${leadId}-${field}`}
      >
        {renderValue(value)}
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ——— Lead table row ———
function LeadRow({ lead, onDelete, onEdit, cellEdit }) {
  const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;

  return (
    <TableRow
      className="hover:bg-muted/20 transition-colors"
      data-testid={`lead-row-${lead.lead_id}`}
    >
      {/* Nome */}
      <TableCell className="font-medium py-2">
        <TextCell leadId={lead.lead_id} field="name" value={lead.name} display={lead.name} cellEdit={cellEdit} />
      </TableCell>

      {/* Email + Telefone */}
      <TableCell className="py-2 hidden md:table-cell">
        <TextCell leadId={lead.lead_id} field="email" value={lead.email} display={lead.email} className="mb-0.5" cellEdit={cellEdit} />
        <TextCell leadId={lead.lead_id} field="phone" value={lead.phone} display={lead.phone} className="mt-0.5" cellEdit={cellEdit} />
      </TableCell>

      {/* Empresa */}
      <TableCell className="py-2 hidden lg:table-cell">
        <TextCell leadId={lead.lead_id} field="company" value={lead.company} display={lead.company} cellEdit={cellEdit} />
      </TableCell>

      {/* CPF/CNPJ */}
      <TableCell className="py-2 hidden xl:table-cell">
        <TextCell leadId={lead.lead_id} field="cpf_cnpj" value={lead.cpf_cnpj} display={lead.cpf_cnpj} className="font-mono" cellEdit={cellEdit} />
      </TableCell>

      {/* Cobrança */}
      <TableCell className="py-2 hidden lg:table-cell">
        <SelectCell
          leadId={lead.lead_id} field="billing_type" value={lead.billing_type}
          options={BILLING_OPTIONS}
          renderValue={v => (
            <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
              {BILLING_OPTIONS.find(b => b.value === v)?.label || v || "—"}
            </span>
          )}
          cellEdit={cellEdit}
        />
      </TableCell>

      {/* Valor */}
      <TableCell className="py-2 hidden md:table-cell">
        <TextCell
          leadId={lead.lead_id} field="value" value={lead.value} type="number"
          display={lead.value > 0 ? formatCurrency(lead.value) : null}
          className="text-primary font-semibold"
          cellEdit={cellEdit}
        />
      </TableCell>

      {/* Origem */}
      <TableCell className="py-2 hidden md:table-cell">
        <SelectCell
          leadId={lead.lead_id} field="source" value={lead.source}
          options={SOURCES}
          renderValue={v => (
            <span className="text-sm text-muted-foreground capitalize">
              {SOURCES.find(s => s.value === v)?.label || v}
            </span>
          )}
          cellEdit={cellEdit}
        />
      </TableCell>

      {/* Status */}
      <TableCell className="py-2">
        <SelectCell
          leadId={lead.lead_id} field="status" value={lead.status}
          options={Object.entries(STATUS_CONFIG).map(([k, c]) => ({ value: k, label: c.label }))}
          renderValue={v => {
            const cfg = STATUS_CONFIG[v] || STATUS_CONFIG.novo;
            return (
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap", cfg.cls)}>
                {cfg.label}
              </span>
            );
          }}
          cellEdit={cellEdit}
        />
      </TableCell>

      {/* Score */}
      <TableCell className="py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <TextCell
            leadId={lead.lead_id} field="score" value={lead.score} type="number"
            display={String(lead.score ?? 50)}
            className="w-10 text-right font-medium"
            cellEdit={cellEdit}
          />
          <div className="w-10 bg-muted rounded-full h-1 hidden sm:block shrink-0">
            <div className="bg-primary h-1 rounded-full" style={{ width: `${lead.score ?? 50}%` }} />
          </div>
        </div>
      </TableCell>

      {/* Ações */}
      <TableCell className="py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(lead)}
            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Editar completo"
            data-testid={`edit-lead-${lead.lead_id}`}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(lead)}
            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Remover lead"
            data-testid={`delete-lead-${lead.lead_id}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ——— Full edit modal (pencil) ———
function LeadEditModal({ open, onClose, lead, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) setForm({
      name: lead.name || "", email: lead.email || "", phone: lead.phone || "",
      company: lead.company || "", cpf_cnpj: lead.cpf_cnpj || "",
      billing_type: lead.billing_type || "BOLETO", value: lead.value || 0,
      due_date: lead.due_date || "", source: lead.source || "manual",
      status: lead.status || "novo", score: lead.score || 50, notes: lead.notes || "",
    });
  }, [lead]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await axios.put(`${API}/leads/${lead.lead_id}`, form, { headers: getAuthHeader() });
      onSaved(res.data);
      onClose();
      toast.success("Lead atualizado!");
    } catch { toast.error("Erro ao salvar"); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="lead-edit-modal">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Pencil size={15} className="text-primary" />
            Editar Lead — {lead?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="edit-modal-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="edit-modal-email" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="edit-modal-phone" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} data-testid="edit-modal-company" />
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Financeiros</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="flex items-center gap-1.5"><CreditCard size={12} />CPF / CNPJ</Label>
                <Input value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: e.target.value })} data-testid="edit-modal-cpf" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Cobrança</Label>
                <Select value={form.billing_type} onValueChange={v => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger data-testid="edit-modal-billing"><SelectValue /></SelectTrigger>
                  <SelectContent>{BILLING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><DollarSign size={12} />Valor (R$)</Label>
                <Input type="number" min={0} value={form.value} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} data-testid="edit-modal-value" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="flex items-center gap-1.5"><Calendar size={12} />Data de Vencimento</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} data-testid="edit-modal-duedate" />
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Classificação</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger data-testid="edit-modal-source"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="edit-modal-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Score (0–100)</Label>
                <Input type="number" min={0} max={100} value={form.score} onChange={e => setForm({ ...form, score: parseInt(e.target.value) || 0 })} data-testid="edit-modal-score" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} data-testid="edit-modal-notes" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} data-testid="edit-modal-save">
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ——— Main Leads Page ———
export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Full edit modal (pencil)
  const [editModalLead, setEditModalLead] = useState(null);

  // Pipeline step
  const [showPipelineStep, setShowPipelineStep] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState(null);
  const [stages, setStages] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [addingToPipeline, setAddingToPipeline] = useState(false);

  // Per-cell editing hook
  const cellEdit = useCellEdit(setLeads);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leads`, { headers: getAuthHeader() });
      setLeads(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchStages = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/pipeline/stages`, { headers: getAuthHeader() });
      setStages(res.data);
      if (res.data.length > 0) setSelectedStageId(res.data[0].stage_id);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLeads(); fetchStages(); }, [fetchLeads, fetchStages]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/leads`, form, { headers: getAuthHeader() });
      setCreatedLeadId(res.data.lead_id);
      setLeads(prev => [res.data, ...prev]);
      setShowPipelineStep(true);
    } catch { toast.error("Erro ao criar lead."); }
    setSaving(false);
  };

  const handleAddToPipeline = async () => {
    if (!selectedStageId || !createdLeadId) return;
    setAddingToPipeline(true);
    try {
      await axios.post(`${API}/leads/${createdLeadId}/pipeline`, { stage_id: selectedStageId }, { headers: getAuthHeader() });
      handleCloseCreate();
      toast.success("Lead adicionado ao pipeline!", {
        action: { label: "Ver Pipeline", onClick: () => (window.location.href = "/comercial/pipeline") },
      });
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao adicionar ao pipeline"); }
    setAddingToPipeline(false);
  };

  const handleCloseCreate = () => { setCreateOpen(false); setShowPipelineStep(false); setCreatedLeadId(null); };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Remover "${lead.name}"?`)) return;
    try {
      await axios.delete(`${API}/leads/${lead.lead_id}`, { headers: getAuthHeader() });
      setLeads(prev => prev.filter(l => l.lead_id !== lead.lead_id));
      toast.success("Lead removido.");
    } catch { /* ignore */ }
  };

  const handleEditSaved = useCallback((updated) => {
    setLeads(prev => prev.map(l => l.lead_id === updated.lead_id ? updated : l));
  }, []);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const match = l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) || l.phone?.includes(q) || l.cpf_cnpj?.includes(q);
    return match && (statusFilter === "all" || l.status === statusFilter);
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} — clique em qualquer célula para editar direto na tabela
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setShowPipelineStep(false); setCreateOpen(true); }} data-testid="create-lead-button">
          <Plus size={16} className="mr-2" />Novo Lead
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar nome, email, empresa, CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="leads-search-input" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="leads-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={36} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Nenhum lead encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || statusFilter !== "all" ? "Ajuste os filtros" : "Clique em 'Novo Lead' para começar"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                  <TableHead className="hidden xl:table-cell">CPF/CNPJ</TableHead>
                  <TableHead className="hidden lg:table-cell">Cobrança</TableHead>
                  <TableHead className="hidden md:table-cell">Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(lead => (
                  <LeadRow
                    key={lead.lead_id}
                    lead={lead}
                    onDelete={handleDelete}
                    onEdit={setEditModalLead}
                    cellEdit={cellEdit}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Lead Modal */}
      <Dialog open={createOpen} onOpenChange={handleCloseCreate}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="lead-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">{showPipelineStep ? "Adicionar ao Pipeline" : "Novo Lead"}</DialogTitle>
          </DialogHeader>
          {showPipelineStep ? (
            <div className="py-2 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200/50">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Lead criado com sucesso!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Adicionar ao pipeline agora?</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Etapa do Pipeline</Label>
                <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                  <SelectTrigger data-testid="pipeline-stage-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.stage_id} value={s.stage_id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nome *</Label>
                  <Input placeholder="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="lead-name-input" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="lead-email-input" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="lead-phone-input" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Empresa</Label>
                  <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} data-testid="lead-company-input" />
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Financeiros</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="flex items-center gap-1.5"><CreditCard size={12} />CPF / CNPJ</Label>
                    <Input placeholder="CPF ou CNPJ" value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: e.target.value })} data-testid="lead-cpf-cnpj-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de Cobrança</Label>
                    <Select value={form.billing_type} onValueChange={v => setForm({ ...form, billing_type: v })}>
                      <SelectTrigger data-testid="lead-billing-type"><SelectValue /></SelectTrigger>
                      <SelectContent>{BILLING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><DollarSign size={12} />Valor (R$)</Label>
                    <Input type="number" min={0} value={form.value} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} data-testid="lead-value-input" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Calendar size={12} />Data de Vencimento</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} data-testid="lead-due-date-input" />
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Classificação</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Origem</Label>
                    <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                      <SelectTrigger data-testid="lead-source-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger data-testid="lead-status-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Score (0–100)</Label>
                    <Input type="number" min={0} max={100} value={form.score} onChange={e => setForm({ ...form, score: parseInt(e.target.value) || 0 })} data-testid="lead-score-input" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Notas</Label>
                    <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} data-testid="lead-notes-input" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {showPipelineStep ? (
              <>
                <Button variant="outline" onClick={handleCloseCreate} data-testid="pipeline-step-skip">Pular</Button>
                <Button onClick={handleAddToPipeline} disabled={addingToPipeline || !selectedStageId} data-testid="pipeline-step-add">
                  {addingToPipeline ? "Adicionando..." : <><Kanban size={14} className="mr-2" />Adicionar ao Pipeline</>}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseCreate} data-testid="lead-modal-cancel">Cancelar</Button>
                <Button onClick={handleCreate} disabled={saving || !form.name.trim()} data-testid="lead-modal-save">
                  {saving ? "Salvando..." : <><span>Criar lead</span><ArrowRight size={14} className="ml-2" /></>}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Edit Modal (pencil) */}
      <LeadEditModal
        open={!!editModalLead}
        onClose={() => setEditModalLead(null)}
        lead={editModalLead}
        onSaved={handleEditSaved}
      />
    </div>
  );
}
