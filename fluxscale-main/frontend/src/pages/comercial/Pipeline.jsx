import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, GripVertical, Trash2, Settings2, Pencil, Mail, Phone,
  Building2, DollarSign, BarChart2, FileText, User, Settings,
  CheckCircle2, XCircle, Loader2, Webhook, Clock, ChevronDown,
  ChevronUp, CreditCard, Calendar, Trophy, CalendarClock,
  MessageSquare, Send, Instagram, RefreshCw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STAGE_COLORS = [
  { hex: "#3b82f6", label: "Azul" },
  { hex: "#22c55e", label: "Verde" },
  { hex: "#eab308", label: "Amarelo" },
  { hex: "#ef4444", label: "Vermelho" },
  { hex: "#8b5cf6", label: "Roxo" },
  { hex: "#f97316", label: "Laranja" },
  { hex: "#6b7280", label: "Cinza" },
  { hex: "#ec4899", label: "Rosa" },
];
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return { Authorization: `Bearer ${token}` };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const EMPTY_DEAL = {
  title: "", value: 0, stage_id: "", contact_name: "", company: "",
  email: "", phone: "", cpf_cnpj: "", billing_type: "BOLETO",
  due_date: "", probability: 50, notes: "",
};

const BILLING_OPTIONS = [
  { value: "BOLETO", label: "Boleto" },
  { value: "CREDIT_CARD", label: "Cartão de Crédito" },
  { value: "PIX", label: "PIX" },
];

// ——— Webhook Status Badge ———
function WebhookBadge({ status }) {
  if (!status) return null;
  if (status === "firing") return (
    <span className="flex items-center gap-0.5 text-xs text-yellow-500" title="Disparando webhook...">
      <Loader2 size={10} className="animate-spin" />
    </span>
  );
  if (status === "success") return (
    <span className="flex items-center gap-0.5 text-xs text-emerald-500" title="Webhook disparado com sucesso">
      <CheckCircle2 size={11} />
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-destructive" title={typeof status === "object" ? status.error : "Erro no webhook"}>
      <XCircle size={11} />
    </span>
  );
}

// ——— Draggable deal card ———
function DealCard({ deal, isOverlay = false, onDelete, onEdit, webhookStatus }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.deal_id, data: { deal } });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={cn(
        "bg-background border border-border p-3.5 rounded-md cursor-grab active:cursor-grabbing group",
        isDragging && "opacity-40",
        isOverlay && "shadow-xl opacity-100 rotate-1"
      )}
      data-testid={`deal-card-${deal.deal_id}`}
      onClick={() => { if (!isDragging) onEdit(deal); }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading font-semibold text-sm leading-tight flex-1">{deal.title}</p>
        <div className="flex items-center gap-1">
          <WebhookBadge status={webhookStatus} />
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); onEdit(deal); }}
            data-testid={`edit-deal-${deal.deal_id}`}
            title="Editar lead"
          >
            <Pencil size={12} />
          </button>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            onClick={(e) => { e.stopPropagation(); onDelete(deal); }}
            data-testid={`delete-deal-${deal.deal_id}`}
          >
            <Trash2 size={12} />
          </button>
          <GripVertical size={14} className="text-muted-foreground shrink-0" />
        </div>
      </div>
      {deal.company && <p className="text-xs text-muted-foreground mt-1">{deal.company}</p>}
      {deal.contact_name && <p className="text-xs text-muted-foreground">{deal.contact_name}</p>}
      {deal.email && <p className="text-xs text-muted-foreground">{deal.email}</p>}
      {deal.cpf_cnpj && (
        <p className="text-xs text-muted-foreground font-mono">{deal.cpf_cnpj}</p>
      )}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <p className="text-sm font-semibold text-primary">{formatCurrency(deal.value)}</p>
        <div className="flex items-center gap-1.5">
          {deal.billing_type && deal.billing_type !== "BOLETO" && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {deal.billing_type === "CREDIT_CARD" ? "Cartão" : deal.billing_type}
            </span>
          )}
          <div className="w-12 bg-muted rounded-full h-1">
            <div className="bg-primary h-1 rounded-full" style={{ width: `${deal.probability || 50}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{deal.probability || 50}%</span>
        </div>
      </div>
    </div>
  );
}

// ——— New Stage Dialog ———
function NewStageDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [isWon, setIsWon] = useState(false);
  const [isMeeting, setIsMeeting] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(""); setColor("#3b82f6"); setIsWon(false); setIsMeeting(false); };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/pipeline/stages`, {
        name: name.trim(), color, is_won_stage: isWon, is_meeting_stage: isMeeting,
      }, { headers: getAuthHeader() });
      onCreated(res.data);
      toast.success(`Etapa "${name}" criada!`);
      reset();
      onClose();
    } catch { toast.error("Erro ao criar etapa"); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm" data-testid="new-stage-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus size={15} />Nova Etapa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nome da etapa *</Label>
            <Input
              autoFocus placeholder="Ex: Proposta Enviada" value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              data-testid="new-stage-name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {STAGE_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    color === c.hex ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  data-testid={`color-${c.hex}`}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className={cn("flex items-center justify-between p-3 rounded-lg border transition-colors",
              isWon ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30" : "bg-muted/30 border-border"
            )}>
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Trophy size={13} className={isWon ? "text-emerald-500" : "text-muted-foreground"} />
                  Etapa de fechamento (ganho)?
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Cria cliente automaticamente ao mover deal</p>
              </div>
              <Switch checked={isWon} onCheckedChange={v => { setIsWon(v); if (v) setIsMeeting(false); }} data-testid="new-stage-is-won" />
            </div>
            <div className={cn("flex items-center justify-between p-3 rounded-lg border transition-colors",
              isMeeting ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30" : "bg-muted/30 border-border"
            )}>
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <CalendarClock size={13} className={isMeeting ? "text-blue-500" : "text-muted-foreground"} />
                  Etapa de reunião?
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Abre agendamento ao mover deal para cá</p>
              </div>
              <Switch checked={isMeeting} onCheckedChange={v => { setIsMeeting(v); if (v) setIsWon(false); }} data-testid="new-stage-is-meeting" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()} data-testid="new-stage-create">
            {saving ? <><Loader2 size={13} className="animate-spin mr-1.5" />Criando...</> : "Criar Etapa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ——— Meeting Schedule Dialog ———
function MeetingScheduleDialog({ open, pendingMove, onConfirm, onCancel }) {
  const deal = pendingMove?.deal;
  const [form, setForm] = useState({ email: "", date: "", startTime: "09:00", endTime: "10:00", title: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && deal) {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      setForm({
        email: deal.email || "",
        date: tomorrow,
        startTime: "09:00",
        endTime: "10:00",
        title: `Reunião — ${deal.contact_name || deal.title || "Lead"}`,
        notes: "",
      });
    }
  }, [open, deal]);

  const handleStartTimeChange = (val) => {
    setForm(f => {
      const [h, m] = val.split(":").map(Number);
      const endH = String(Math.min(h + 1, 23)).padStart(2, "0");
      return { ...f, startTime: val, endTime: `${endH}:${String(m).padStart(2, "0")}` };
    });
  };

  const handleConfirm = async () => {
    if (!form.email || !form.date) { toast.error("Email e data são obrigatórios"); return; }
    setSaving(true);
    await onConfirm(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-md" data-testid="meeting-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock size={16} className="text-primary" />
            Agendar Reunião
          </DialogTitle>
          {deal && <p className="text-xs text-muted-foreground">Lead: {deal.title}</p>}
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Título da Reunião</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="meeting-title" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Mail size={12} />Email do Lead *
            </Label>
            <Input
              type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@cliente.com"
              data-testid="meeting-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar size={12} />Data *
            </Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} data-testid="meeting-date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Hora início</Label>
              <Input type="time" value={form.startTime} onChange={e => handleStartTimeChange(e.target.value)} data-testid="meeting-start-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Hora término</Label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} data-testid="meeting-end-time" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Pauta / Notas</Label>
            <Textarea
              placeholder="Objetivos da reunião..."
              value={form.notes} rows={3}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              data-testid="meeting-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="meeting-cancel">Cancelar movimento</Button>
          <Button onClick={handleConfirm} disabled={saving || !form.email || !form.date} data-testid="meeting-confirm">
            {saving ? <><Loader2 size={13} className="animate-spin mr-1.5" />Agendando...</> : <><CalendarClock size={13} className="mr-1.5" />Confirmar Reunião</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ——— Stage Webhook Config Modal ———
function StageWebhookModal({ open, onClose, stage, onSaved }) {
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [isWon, setIsWon] = useState(false);
  const [isMeeting, setIsMeeting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && stage) {
      setUrl(stage.webhook_url || "");
      setEnabled(stage.webhook_enabled ?? true);
      setIsWon(stage.is_won_stage ?? false);
      setIsMeeting(stage.is_meeting_stage ?? false);
    }
  }, [open, stage]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/pipeline/stages/${stage.stage_id}/webhook`,
        { webhook_url: url, webhook_enabled: enabled, is_won_stage: isWon, is_meeting_stage: isMeeting },
        { headers: getAuthHeader() }
      );
      toast.success("Configuração da coluna salva!");
      onSaved({ ...stage, webhook_url: url, webhook_enabled: enabled, is_won_stage: isWon, is_meeting_stage: isMeeting });
      onClose();
    } catch {
      toast.error("Erro ao salvar configuração");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-testid="stage-webhook-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={15} />
            Configurar Coluna — {stage?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reunião toggle */}
          <div className={cn(
            "flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors",
            isMeeting ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30" : "bg-muted/30 border-border"
          )}>
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarClock size={14} className={isMeeting ? "text-blue-500" : "text-muted-foreground"} />
                Etapa de Reunião
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Abre popup de agendamento ao mover um deal para esta coluna.
              </p>
            </div>
            <Switch checked={isMeeting} onCheckedChange={v => { setIsMeeting(v); if (v) setIsWon(false); }} data-testid="stage-is-meeting-toggle" className="shrink-0 mt-0.5" />
          </div>

          {/* Ganho toggle */}
          <div className={cn(
            "flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors",
            isWon ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30" : "bg-muted/30 border-border"
          )}>
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} className={isWon ? "text-emerald-500" : "text-muted-foreground"} />
                Etapa de Negócio Fechado (Ganho)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ao mover um lead para esta coluna, ele será cadastrado automaticamente como cliente na aba Clientes com todos os seus dados.
              </p>
            </div>
            <Switch checked={isWon} onCheckedChange={setIsWon} data-testid="stage-is-won-toggle" className="shrink-0 mt-0.5" />
          </div>

          {/* Webhook URL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Webhook size={13} />Webhook N8N (opcional)
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{enabled ? "Ativo" : "Inativo"}</span>
                <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="stage-webhook-enabled-toggle" />
              </div>
            </div>
            <Input
              placeholder="https://seu-n8n.exemplo.com/webhook/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="stage-webhook-url-input"
            />
            <p className="text-xs text-muted-foreground">
              POST disparado automaticamente ao arrastar um lead para esta coluna.
            </p>
          </div>

          {url && (
            <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-semibold mb-1 text-foreground">Payload enviado:</p>
              <pre className="font-mono text-xs leading-relaxed overflow-x-auto">{`{
  "name": "Nome do Lead",
  "cpfCnpj": "00000000000000",
  "email": "email@exemplo.com",
  "mobilePhone": "11999999999",
  "billingType": "BOLETO",
  "value": 500.00,
  "dueDate": "2025-12-01"
}`}</pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="stage-webhook-save">
            {saving ? <><Loader2 size={13} className="animate-spin mr-1.5" />Salvando...</> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DroppableColumn({ stage, deals, onAddDeal, onDeleteDeal, onEditDeal, onConfigWebhook, webhookStatuses }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.stage_id });
  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);
  const hasWebhook = !!(stage.webhook_url && stage.webhook_enabled);
  const isWon = !!stage.is_won_stage;
  const isMeeting = !!stage.is_meeting_stage;

  return (
    <div
      className={cn(
        "w-[290px] shrink-0 flex flex-col gap-3 bg-muted/30 border border-border p-4 rounded-lg transition-all",
        isOver && "bg-muted/60 border-primary/40 ring-1 ring-primary/20",
        isWon && "border-emerald-500/30",
        isMeeting && !isWon && "border-blue-500/30"
      )}
      data-testid={`kanban-column-${stage.stage_id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
          <h3 className="font-heading font-semibold text-sm truncate">{stage.name}</h3>
          {isWon && <Trophy size={11} className="text-emerald-500 shrink-0" title="Etapa de ganho — cria cliente automaticamente" />}
          {isMeeting && <CalendarClock size={11} className="text-blue-500 shrink-0" title="Etapa de reunião — abre agendamento" />}
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">{deals.length}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onConfigWebhook(stage)}
                  className={cn(
                    "p-1 rounded hover:bg-muted transition-colors",
                    (hasWebhook || isWon || isMeeting) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`webhook-config-${stage.stage_id}`}
                >
                  <Settings size={13} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {isWon ? "Etapa Ganho" : isMeeting ? "Etapa Reunião" : hasWebhook ? "Webhook N8N ativo" : "Configurar coluna"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div ref={setNodeRef} className="flex flex-col gap-2.5 min-h-[80px]">
        {deals.map((deal) => (
          <DealCard
            key={deal.deal_id}
            deal={deal}
            onDelete={onDeleteDeal}
            onEdit={onEditDeal}
            webhookStatus={webhookStatuses[deal.deal_id]}
          />
        ))}
      </div>
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 px-2 py-1.5 rounded-md hover:bg-muted/50 w-full"
        onClick={() => onAddDeal(stage.stage_id)}
        data-testid={`add-deal-${stage.stage_id}`}
      >
        <Plus size={13} />
        Adicionar deal
      </button>
    </div>
  );
}

// ——— Webhook Log Section inside drawer ———
function WebhookLogSection({ dealId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!dealId) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/pipeline/deals/${dealId}/webhook-logs`, { headers: getAuthHeader() });
        setLogs(res.data || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [dealId]);

  if (loading) return null;
  if (logs.length === 0) return (
    <div className="text-xs text-muted-foreground text-center py-2">
      Nenhum disparo de webhook registrado para este lead.
    </div>
  );

  return (
    <div className="space-y-1.5">
      <button
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        onClick={() => setExpanded(v => !v)}
      >
        <Clock size={12} />
        Histórico de disparos ({logs.length})
        {expanded ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
      </button>
      {expanded && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.log_id}
              className={cn(
                "flex items-start justify-between gap-2 p-2.5 rounded-md border text-xs",
                log.status === "success"
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30"
                  : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {log.status === "success"
                    ? <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                    : <XCircle size={11} className="text-destructive shrink-0" />}
                  <span className="font-medium truncate">{log.stage_name}</span>
                  {log.status_code > 0 && (
                    <span className="text-muted-foreground shrink-0">HTTP {log.status_code}</span>
                  )}
                </div>
                <p className="text-muted-foreground">{formatDateTime(log.fired_at)}</p>
                {log.status === "error" && log.response && (
                  <p className="text-destructive mt-0.5 truncate">{log.response}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ——— Sortable stage row (Edit modal) ———
function SortableStageRow({ stage, deals, onRename, onDeleteDeal }) {
  const [name, setName] = useState(stage.name);
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.stage_id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const commitRename = () => {
    if (name.trim() && name !== stage.name) onRename(stage.stage_id, name.trim());
    setEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-lg border border-border bg-muted/20 overflow-hidden", isDragging && "opacity-50 z-50")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button {...listeners} {...attributes} className="cursor-grab p-0.5 text-muted-foreground hover:text-foreground">
          <GripVertical size={14} />
        </button>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && commitRename()} autoFocus className="flex-1 h-7 text-sm" />
        ) : (
          <button className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors"
            onClick={() => setEditing(true)} data-testid={`rename-stage-${stage.stage_id}`}>{name}</button>
        )}
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {deals.length} deal{deals.length !== 1 ? "s" : ""}
        </span>
      </div>
      {deals.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5">
          {deals.map((deal) => (
            <div key={deal.deal_id}
              className="flex items-center justify-between gap-2 px-3 py-1.5 bg-background rounded border border-border text-xs">
              <div className="min-w-0">
                <p className="font-medium truncate">{deal.title}</p>
                {deal.company && <p className="text-muted-foreground truncate">{deal.company}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-primary font-semibold">{formatCurrency(deal.value)}</span>
                <button onClick={() => onDeleteDeal(deal)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  data-testid={`edit-modal-delete-deal-${deal.deal_id}`}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ——— Edit Deal Drawer ———
function EditDealDrawer({ open, onClose, deal, stages, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deal) {
      setForm({
        title: deal.title || "",
        value: deal.value || 0,
        stage_id: deal.stage_id || "",
        contact_name: deal.contact_name || "",
        company: deal.company || "",
        email: deal.email || "",
        phone: deal.phone || "",
        cpf_cnpj: deal.cpf_cnpj || "",
        billing_type: deal.billing_type || "BOLETO",
        due_date: deal.due_date || "",
        probability: deal.probability ?? 50,
        notes: deal.notes || "",
      });
    }
  }, [deal]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await axios.put(`${API}/pipeline/deals/${deal.deal_id}`, form, { headers: getAuthHeader() });
      onSaved(res.data);
      toast.success("Lead atualizado!");
      onClose();
    } catch {
      toast.error("Erro ao atualizar lead.");
    }
    setSaving(false);
  };

  if (!form) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-hidden" data-testid="edit-deal-drawer">
        <SheetHeader className="pb-4 border-b border-border shrink-0">
          <SheetTitle className="font-heading flex items-center gap-2">
            <Pencil size={16} className="text-primary" />
            Editar Lead
          </SheetTitle>
          {deal && <p className="text-xs text-muted-foreground">{deal.title}</p>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><User size={13} className="text-muted-foreground" />Nome do Lead *</Label>
            <Input placeholder="Ex: João Silva" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="edit-deal-title-input" />
          </div>
          {/* Contato */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><User size={13} className="text-muted-foreground" />Nome do Contato</Label>
            <Input placeholder="Nome do contato" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} data-testid="edit-deal-contact-input" />
          </div>
          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><Mail size={13} className="text-muted-foreground" />Email</Label>
            <Input type="email" placeholder="contato@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="edit-deal-email-input" />
          </div>
          {/* Telefone */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><Phone size={13} className="text-muted-foreground" />Telefone</Label>
            <Input type="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="edit-deal-phone-input" />
          </div>
          {/* Empresa */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><Building2 size={13} className="text-muted-foreground" />Empresa</Label>
            <Input placeholder="Nome da empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="edit-deal-company-input" />
          </div>

          {/* Separator - Dados Financeiros */}
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Financeiros</p>
            {/* CPF/CNPJ */}
            <div className="space-y-1.5 mb-4">
              <Label className="text-sm font-medium flex items-center gap-1.5"><CreditCard size={13} className="text-muted-foreground" />CPF / CNPJ</Label>
              <Input
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
                value={form.cpf_cnpj}
                onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                data-testid="edit-deal-cpf-cnpj-input"
              />
            </div>
            {/* Tipo de Cobrança */}
            <div className="space-y-1.5 mb-4">
              <Label className="text-sm font-medium flex items-center gap-1.5"><DollarSign size={13} className="text-muted-foreground" />Tipo de Cobrança</Label>
              <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                <SelectTrigger data-testid="edit-deal-billing-type">
                  <SelectValue placeholder="Tipo de cobrança" />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Valor */}
            <div className="space-y-1.5 mb-4">
              <Label className="text-sm font-medium flex items-center gap-1.5"><DollarSign size={13} className="text-muted-foreground" />Valor (R$)</Label>
              <Input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} data-testid="edit-deal-value-input" />
            </div>
            {/* Data de Vencimento */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5"><Calendar size={13} className="text-muted-foreground" />Data de Vencimento</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="edit-deal-due-date-input" />
            </div>
          </div>

          {/* Etapa */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><BarChart2 size={13} className="text-muted-foreground" />Etapa</Label>
            <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
              <SelectTrigger data-testid="edit-deal-stage-select"><SelectValue placeholder="Selecionar etapa" /></SelectTrigger>
              <SelectContent>{stages.map((s) => (
                <SelectItem key={s.stage_id} value={s.stage_id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
                  </div>
                </SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
          {/* Probabilidade */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><BarChart2 size={13} className="text-muted-foreground" />Probabilidade (%)</Label>
            <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) || 0 })} data-testid="edit-deal-probability-input" />
          </div>
          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5"><FileText size={13} className="text-muted-foreground" />Observações</Label>
            <Textarea placeholder="Informações adicionais..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} data-testid="edit-deal-notes-input" />
          </div>

          {/* Webhook Logs */}
          {deal?.deal_id && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico de Webhooks</p>
              <WebhookLogSection dealId={deal.deal_id} />
            </div>
          )}
        </div>

        <SheetFooter className="pt-4 border-t border-border shrink-0 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="edit-deal-cancel">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="flex-1" data-testid="edit-deal-save">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ——— Pipeline Edit Modal ———
function PipelineEditModal({ open, onClose, stages, deals, onStagesUpdated, onDealDeleted, onStageCreated }) {
  const [localStages, setLocalStages] = useState(stages);
  const [newStageOpen, setNewStageOpen] = useState(false);
  useEffect(() => { setLocalStages(stages); }, [stages]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localStages.findIndex((s) => s.stage_id === active.id);
    const newIdx = localStages.findIndex((s) => s.stage_id === over.id);
    const reordered = arrayMove(localStages, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
    setLocalStages(reordered);
    try {
      await axios.patch(`${API}/pipeline/stages/reorder`,
        { stages: reordered.map((s) => ({ stage_id: s.stage_id, order: s.order })) },
        { headers: getAuthHeader() });
      onStagesUpdated(reordered);
      toast.success("Etapas reordenadas.");
    } catch {
      setLocalStages(stages);
      toast.error("Erro ao reordenar etapas.");
    }
  };

  const handleRename = async (stageId, newName) => {
    try {
      await axios.patch(`${API}/pipeline/stages/${stageId}`, { name: newName }, { headers: getAuthHeader() });
      const updated = localStages.map((s) => s.stage_id === stageId ? { ...s, name: newName } : s);
      setLocalStages(updated);
      onStagesUpdated(updated);
      toast.success("Etapa renomeada.");
    } catch {
      toast.error("Erro ao renomear etapa.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col" data-testid="pipeline-edit-modal">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Settings2 size={16} />Gerenciar Pipeline</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">Arraste para reordenar. Clique no nome para renomear.</p>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-2">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={localStages.map((s) => s.stage_id)} strategy={verticalListSortingStrategy}>
              {localStages.map((stage) => (
                <SortableStageRow key={stage.stage_id} stage={stage}
                  deals={deals.filter((d) => d.stage_id === stage.stage_id)}
                  onRename={handleRename} onDeleteDeal={onDealDeleted} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setNewStageOpen(true)} data-testid="add-stage-button" className="gap-1.5">
            <Plus size={13} />Nova Etapa
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
      <NewStageDialog
        open={newStageOpen}
        onClose={() => setNewStageOpen(false)}
        onCreated={stage => { onStageCreated(stage); setLocalStages(prev => [...prev, stage]); }}
      />
    </Dialog>
  );
}

// ——— Default Pipeline Board (Principal) ———
function DefaultPipelineBoard() {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [form, setForm] = useState(EMPTY_DEAL);
  // Webhook config modal
  const [webhookModalStage, setWebhookModalStage] = useState(null);
  // Per-deal webhook status: { deal_id: "firing" | "success" | { error: "..." } | null }
  const [webhookStatuses, setWebhookStatuses] = useState({});
  // Meeting scheduling
  const [pendingMeetingMove, setPendingMeetingMove] = useState(null);

  const deletedTimers = useRef({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const fetchData = async () => {
    try {
      const [stR, dR] = await Promise.all([
        axios.get(`${API}/pipeline/stages`, { headers: getAuthHeader() }),
        axios.get(`${API}/pipeline/deals`, { headers: getAuthHeader() }),
      ]);
      setStages(stR.data);
      setDeals(dR.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Fire webhook for a deal moved to a stage
  const fireWebhook = useCallback(async (dealId, targetStage) => {
    if (!targetStage.webhook_url || !targetStage.webhook_enabled) return;
    setWebhookStatuses(prev => ({ ...prev, [dealId]: "firing" }));
    try {
      const res = await axios.post(
        `${API}/pipeline/deals/${dealId}/fire-webhook`,
        { stage_id: targetStage.stage_id },
        { headers: getAuthHeader() }
      );
      const { status } = res.data;
      if (status === "success") {
        setWebhookStatuses(prev => ({ ...prev, [dealId]: "success" }));
        toast.success(`Webhook disparado para "${targetStage.name}"!`);
      } else if (status === "skipped") {
        // No notification for skipped
      } else {
        const errMsg = res.data.error || `HTTP ${res.data.status_code}`;
        setWebhookStatuses(prev => ({ ...prev, [dealId]: { error: errMsg } }));
        toast.error(`Webhook falhou: ${errMsg}`);
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Erro de conexão";
      setWebhookStatuses(prev => ({ ...prev, [dealId]: { error: errMsg } }));
      toast.error(`Erro no webhook: ${errMsg}`);
    }
    // Clear status after 8 seconds
    setTimeout(() => setWebhookStatuses(prev => {
      const next = { ...prev }; delete next[dealId]; return next;
    }), 8000);
  }, []);

  const handleSoftDeleteDeal = useCallback((deal) => {
    setDeals((prev) => prev.filter((d) => d.deal_id !== deal.deal_id));
    const timer = setTimeout(async () => {
      try {
        await axios.delete(`${API}/pipeline/deals/${deal.deal_id}`, { headers: getAuthHeader() });
      } catch { setDeals((prev) => [...prev, deal]); }
      delete deletedTimers.current[deal.deal_id];
    }, 5000);
    deletedTimers.current[deal.deal_id] = timer;
    toast("Deal removido", {
      description: deal.title,
      action: {
        label: "Desfazer",
        onClick: () => {
          clearTimeout(deletedTimers.current[deal.deal_id]);
          delete deletedTimers.current[deal.deal_id];
          setDeals((prev) => [deal, ...prev]);
        },
      },
      duration: 5000,
    });
  }, []);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const targetStage = stages.find((s) => s.stage_id === over.id);
    if (!targetStage) return;

    // Get the dragged deal
    const movedDeal = deals.find(d => d.deal_id === active.id);
    const prevStageId = movedDeal?.stage_id;
    if (prevStageId === targetStage.stage_id) return;

    // Check if meeting stage
    const isMeetingStage = targetStage.is_meeting_stage ||
      targetStage.name?.toLowerCase().includes("reunião");

    if (isMeetingStage) {
      // Pause drag — show meeting scheduling dialog (don't move yet)
      setPendingMeetingMove({ dealId: active.id, targetStage, deal: movedDeal });
      return;
    }

    // Normal move
    setDeals((prev) => prev.map((d) => d.deal_id === active.id ? { ...d, stage_id: targetStage.stage_id } : d));
    try {
      const res = await axios.put(`${API}/pipeline/deals/${active.id}`, { stage_id: targetStage.stage_id }, { headers: getAuthHeader() });
      if (res.data._client_auto_created) {
        toast.success(`Cliente criado automaticamente!`, {
          description: `"${targetStage.name}" — ${movedDeal?.title || "Lead"} foi adicionado à aba Clientes.`,
          action: { label: "Ver Clientes", onClick: () => (window.location.href = "/clientes") },
          duration: 8000,
        });
      }
      fireWebhook(active.id, targetStage);
    } catch {
      toast.error("Erro ao mover deal.");
      fetchData();
    }
  };

  const handleConfirmMeeting = async (meetingForm) => {
    if (!pendingMeetingMove) return;
    const { dealId, targetStage, deal } = pendingMeetingMove;

    // Optimistic move
    setDeals(prev => prev.map(d => d.deal_id === dealId ? { ...d, stage_id: targetStage.stage_id } : d));

    const now = new Date().toISOString();
    const payload = {
      dealId,
      contactName: deal?.contact_name || deal?.title || "",
      email: meetingForm.email,
      meetingTitle: meetingForm.title,
      meetingDate: meetingForm.date,
      startTime: meetingForm.startTime,
      endTime: meetingForm.endTime,
      notes: meetingForm.notes || "",
      scheduledAt: now,
    };

    try {
      const res = await axios.put(
        `${API}/pipeline/deals/${dealId}`,
        { stage_id: targetStage.stage_id, meeting_date: meetingForm.date, meeting_email: meetingForm.email },
        { headers: getAuthHeader() }
      );
      // Forward to N8N via meeting webhook (public endpoint)
      axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/webhook/meeting-schedule`, payload).catch(() => {});
      // Auto-client creation toast
      if (res.data._client_auto_created) {
        toast.success("Cliente criado automaticamente!", {
          action: { label: "Ver Clientes", onClick: () => (window.location.href = "/clientes") },
        });
      }
      fireWebhook(dealId, targetStage);
      toast.success("Reunião agendada!", {
        description: `${meetingForm.date} das ${meetingForm.startTime} às ${meetingForm.endTime}`,
      });
    } catch {
      toast.error("Erro ao confirmar reunião.");
      fetchData();
    }
    setPendingMeetingMove(null);
  };

  const handleCancelMeeting = () => setPendingMeetingMove(null);

  const openAddDeal = (stageId) => {
    setForm({ ...EMPTY_DEAL, stage_id: stageId });
    setCreateModalOpen(true);
  };

  const handleOpenEditDeal = (deal) => { setEditingDeal(deal); setEditDrawerOpen(true); };
  const handleDealSaved = (updated) => setDeals((prev) => prev.map((d) => d.deal_id === updated.deal_id ? updated : d));

  const handleSaveDeal = async () => {
    if (!form.title.trim() || !form.stage_id) return;
    try {
      const res = await axios.post(`${API}/pipeline/deals`, form, { headers: getAuthHeader() });
      setDeals((prev) => [res.data, ...prev]);
      setCreateModalOpen(false);
      toast.success("Deal criado!");
    } catch { toast.error("Erro ao criar deal."); }
  };

  const handleStageWebhookSaved = (updatedStage) => {
    setStages(prev => prev.map(s => s.stage_id === updatedStage.stage_id ? updatedStage : s));
  };

  const handleStageCreated = (newStage) => {
    setStages(prev => [...prev, newStage]);
  };

  const activeDeal = activeId ? deals.find((d) => d.deal_id === activeId) : null;
  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <p className="text-sm text-muted-foreground">
          {deals.length} deal{deals.length !== 1 ? "s" : ""} &bull; Total: {formatCurrency(totalValue)}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} data-testid="pipeline-edit-button">
            <Settings2 size={15} className="mr-1.5" />Gerenciar
          </Button>
          <Button onClick={() => { setForm({ ...EMPTY_DEAL, stage_id: stages[0]?.stage_id || "" }); setCreateModalOpen(true); }} data-testid="create-deal-button">
            <Plus size={16} className="mr-2" />Novo Deal
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hidden flex-1" data-testid="kanban-board">
          {stages.map((stage) => (
            <DroppableColumn
              key={stage.stage_id}
              stage={stage}
              deals={deals.filter((d) => d.stage_id === stage.stage_id)}
              onAddDeal={openAddDeal}
              onDeleteDeal={handleSoftDeleteDeal}
              onEditDeal={handleOpenEditDeal}
              onConfigWebhook={setWebhookModalStage}
              webhookStatuses={webhookStatuses}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} isOverlay onDelete={() => {}} onEdit={() => {}} />}
        </DragOverlay>
      </DndContext>

      {/* Create Deal Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="deal-modal">
          <DialogHeader><DialogTitle className="font-heading">Novo Deal</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Título *</Label>
              <Input placeholder="Ex: Gestão de tráfego — Empresa X" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="deal-title-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Valor (R$)</Label>
                <Input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} data-testid="deal-value-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Probabilidade (%)</Label>
                <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) || 0 })} data-testid="deal-probability-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contato</Label>
              <Input placeholder="Nome do contato" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} data-testid="deal-contact-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Empresa</Label>
              <Input placeholder="Nome da empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="deal-company-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">CPF / CNPJ</Label>
                <Input placeholder="CPF ou CNPJ" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} data-testid="deal-cpf-cnpj-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Cobrança</Label>
                <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger data-testid="deal-billing-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{BILLING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Etapa</Label>
              <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
                <SelectTrigger data-testid="deal-stage-select"><SelectValue placeholder="Selecionar etapa" /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s.stage_id} value={s.stage_id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notas</Label>
              <Textarea placeholder="Observações..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} data-testid="deal-notes-input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} data-testid="deal-modal-cancel">Cancelar</Button>
            <Button onClick={handleSaveDeal} disabled={!form.title.trim() || !form.stage_id} data-testid="deal-modal-save">Criar deal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pipeline Edit Modal */}
      <PipelineEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        stages={stages}
        deals={deals}
        onStagesUpdated={setStages}
        onDealDeleted={handleSoftDeleteDeal}
        onStageCreated={handleStageCreated}
      />

      {/* Edit Deal Drawer */}
      <EditDealDrawer
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); setEditingDeal(null); }}
        deal={editingDeal}
        stages={stages}
        onSaved={handleDealSaved}
      />

      {/* Stage Webhook Config Modal */}
      <StageWebhookModal
        open={!!webhookModalStage}
        onClose={() => setWebhookModalStage(null)}
        stage={webhookModalStage}
        onSaved={handleStageWebhookSaved}
      />

      {/* Meeting Schedule Dialog */}
      <MeetingScheduleDialog
        open={!!pendingMeetingMove}
        pendingMove={pendingMeetingMove}
        onConfirm={handleConfirmMeeting}
        onCancel={handleCancelMeeting}
      />
    </div>
  );
}


// ——— Instagram Chat Panel (Sheet) ———
function InstagramChatPanel({ deal, open, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadConversation = useCallback(async () => {
    if (!deal) return;
    setLoadingConv(true);
    try {
      // Find or create conversation by instagram_scoped_id or deal
      const res = await axios.get(`${API}/instagram/conversations`, { headers: getAuthHeader() });
      const handle = deal.instagram_handle?.replace("@", "") || "";
      // Try to find by handle or lead_id
      const found = res.data.find(c =>
        c.instagram_handle?.replace("@", "") === handle ||
        c.lead_id === deal.lead_id
      );
      if (found) {
        const detail = await axios.get(`${API}/instagram/conversations/${found.conversation_id}`, { headers: getAuthHeader() });
        setConversation(detail.data);
        // Mark all as read
        await axios.patch(`${API}/instagram/conversations/${found.conversation_id}/read-all`, {}, { headers: getAuthHeader() });
      } else {
        setConversation(null);
      }
    } catch { setConversation(null); }
    setLoadingConv(false);
  }, [deal]);

  useEffect(() => {
    if (open && deal) { loadConversation(); }
    if (!open) { setConversation(null); setMessage(""); }
  }, [open, deal, loadConversation]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const handleSend = async () => {
    if (!message.trim() || !conversation) return;
    setSending(true);
    try {
      const res = await axios.post(
        `${API}/instagram/conversations/${conversation.conversation_id}/messages`,
        { text: message.trim() },
        { headers: getAuthHeader() }
      );
      setConversation(prev => ({
        ...prev,
        messages: [...(prev?.messages || []), res.data],
      }));
      setMessage("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao enviar mensagem");
    }
    setSending(false);
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0" data-testid="instagram-chat-panel">
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-semibold flex items-center gap-2">
                <Instagram size={15} className="text-purple-500" />
                {deal?.instagram_handle || deal?.contact_name || deal?.title}
              </SheetTitle>
              {deal?.contact_name && deal?.instagram_handle && (
                <p className="text-xs text-muted-foreground">{deal.contact_name}</p>
              )}
            </div>
            <button
              onClick={loadConversation}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Recarregar"
              data-testid="refresh-conversation"
            >
              <RefreshCw size={14} className={loadingConv ? "animate-spin" : ""} />
            </button>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loadingConv ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  <div className="h-10 w-48 bg-muted rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          ) : !conversation ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Instagram size={32} className="text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
              <p className="text-xs text-muted-foreground mt-1">
                As mensagens aparecerão aqui quando o lead responder via Instagram.
              </p>
            </div>
          ) : (
            <>
              {conversation.messages?.map(msg => (
                <div
                  key={msg.message_id}
                  className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}
                  data-testid={`chat-msg-${msg.message_id}`}
                >
                  <div className={cn(
                    "max-w-[75%] px-3 py-2 rounded-lg text-sm",
                    msg.direction === "outbound"
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                    <p>{msg.text}</p>
                    <p className={cn(
                      "text-[10px] mt-0.5",
                      msg.direction === "outbound" ? "text-purple-200" : "text-muted-foreground"
                    )}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <SheetFooter className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex gap-2 w-full">
            <Input
              placeholder={conversation ? "Digite uma mensagem..." : "Conversa não encontrada"}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={!conversation || sending}
              className="flex-1"
              data-testid="chat-message-input"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || !conversation || sending}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="chat-send-button"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ——— Instagram Deal Card ———
function InstagramDealCard({ deal, unreadCount, onClick }) {
  return (
    <div
      className="bg-background border border-purple-200 dark:border-purple-800/40 p-3.5 rounded-md cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition-colors group"
      onClick={onClick}
      data-testid={`ig-deal-card-${deal.deal_id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading font-semibold text-sm leading-tight flex-1">{deal.title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium">
            Instagram
          </span>
          <button
            className="flex items-center gap-0.5 text-xs rounded p-1 bg-muted hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            data-testid={`ig-chat-btn-${deal.deal_id}`}
          >
            <MessageSquare size={13} className="text-purple-500" />
            {unreadCount > 0 && (
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 min-w-[1ch]">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
      {deal.instagram_handle && (
        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{deal.instagram_handle}</p>
      )}
      {deal.contact_name && deal.contact_name !== deal.title && (
        <p className="text-xs text-muted-foreground">{deal.contact_name}</p>
      )}
    </div>
  );
}

// ——— Instagram Pipeline Board ———
function InstagramPipelineBoard() {
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [newStageOpen, setNewStageOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [stR, dR, convR] = await Promise.all([
        axios.get(`${API}/pipeline/stages?type=instagram`, { headers: getAuthHeader() }),
        axios.get(`${API}/pipeline/deals?pipeline_type=instagram`, { headers: getAuthHeader() }),
        axios.get(`${API}/instagram/conversations`, { headers: getAuthHeader() }).catch(() => ({ data: [] })),
      ]);
      setStages(stR.data);
      setDeals(dR.data);
      setConversations(convR.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUnreadCount = (deal) => {
    const handle = deal.instagram_handle?.replace("@", "") || "";
    const conv = conversations.find(c =>
      c.instagram_handle?.replace("@", "") === handle ||
      c.lead_id === deal.lead_id
    );
    return conv?.unread_count || 0;
  };

  const handleOpenChat = (deal) => {
    setSelectedDeal(deal);
    setChatOpen(true);
  };

  const handleStageCreated = (stage) => {
    setStages(prev => [...prev, stage]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <p className="text-sm text-muted-foreground">
            {deals.length} lead{deals.length !== 1 ? "s" : ""} no pipeline Instagram
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewStageOpen(true)}
            data-testid="ig-add-stage-button"
          >
            <Plus size={13} className="mr-1.5" />
            Nova Etapa
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            data-testid="ig-refresh-button"
          >
            <RefreshCw size={13} className="mr-1.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Instagram size={40} className="text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nenhuma etapa ainda</p>
          <p className="text-xs text-muted-foreground mb-4">Crie etapas para organizar seus leads do Instagram</p>
          <Button size="sm" onClick={() => setNewStageOpen(true)} data-testid="ig-create-first-stage">
            <Plus size={13} className="mr-1.5" />Criar primeira etapa
          </Button>
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-4 flex-1 scrollbar-hidden" data-testid="ig-kanban-board">
          {stages.map(stage => {
            const stageDeals = deals.filter(d => d.stage_id === stage.stage_id);
            return (
              <div
                key={stage.stage_id}
                className="flex-shrink-0 w-72 flex flex-col"
                data-testid={`ig-stage-column-${stage.stage_id}`}
              >
                <div
                  className="flex items-center justify-between mb-2 px-1"
                  style={{ borderBottom: `2px solid ${stage.color || "#8b5cf6"}` }}
                >
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-sm font-semibold">{stage.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                      {stageDeals.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {stageDeals.map(deal => (
                    <InstagramDealCard
                      key={deal.deal_id}
                      deal={deal}
                      unreadCount={getUnreadCount(deal)}
                      onClick={() => handleOpenChat(deal)}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="h-16 border-2 border-dashed border-border rounded-md flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">Nenhum lead aqui</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Stage Dialog for Instagram */}
      <NewInstagramStageDialog
        open={newStageOpen}
        onClose={() => setNewStageOpen(false)}
        onCreated={handleStageCreated}
      />

      {/* Chat Panel */}
      <InstagramChatPanel
        deal={selectedDeal}
        open={chatOpen}
        onClose={() => { setChatOpen(false); setSelectedDeal(null); fetchData(); }}
      />
    </div>
  );
}

// ——— New Instagram Stage Dialog ———
function NewInstagramStageDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const res = await axios.post(
        `${API}/pipeline/stages`,
        { name: name.trim(), color, pipeline_type: "instagram", order: 0 },
        { headers: getAuthHeader() }
      );
      onCreated(res.data);
      toast.success(`Etapa "${name}" criada!`);
      setName(""); setColor("#8b5cf6");
      onClose();
    } catch { toast.error("Erro ao criar etapa"); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setName(""); onClose(); } }}>
      <DialogContent className="max-w-sm" data-testid="ig-new-stage-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram size={15} className="text-purple-500" />
            Nova Etapa — Pipeline Instagram
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome da etapa *</Label>
            <Input
              autoFocus placeholder="Ex: Nova mensagem" value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              data-testid="ig-new-stage-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {STAGE_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className={cn("w-7 h-7 rounded-full border-2 transition-all",
                    color === c.hex ? "border-foreground scale-110" : "border-transparent hover:scale-105")}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="ig-new-stage-create"
          >
            {saving ? <><Loader2 size={13} className="animate-spin mr-1.5" />Criando...</> : "Criar Etapa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ——— Main Pipeline Export with Tabs ———
export default function Pipeline() {
  return (
    <div className="p-6 h-full flex flex-col">
      <Tabs defaultValue="default" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h1 className="text-2xl font-heading font-bold tracking-tight">Pipeline de Vendas</h1>
          <TabsList data-testid="pipeline-tabs">
            <TabsTrigger value="default" data-testid="tab-pipeline-principal">Pipeline Principal</TabsTrigger>
            <TabsTrigger value="instagram" data-testid="tab-pipeline-instagram">
              <Instagram size={13} className="mr-1.5 text-purple-500" />
              Pipeline Instagram
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="default" className="flex-1 min-h-0 mt-0">
          <DefaultPipelineBoard />
        </TabsContent>
        <TabsContent value="instagram" className="flex-1 min-h-0 mt-0">
          <InstagramPipelineBoard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
