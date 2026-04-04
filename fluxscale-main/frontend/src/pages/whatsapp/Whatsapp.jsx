import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageCircle,
  Plus,
  Play,
  Square,
  Trash2,
  Pencil,
  Loader2,
  Phone,
  Link,
  Power,
  PowerOff,
  Copy,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("agenciaos_token")}` };
}

function AgentCard({ agent, onToggle, onEdit, onDelete, loading }) {
  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-5 transition-all",
        agent.is_active ? "border-emerald-500/40 shadow-sm shadow-emerald-500/10" : "border-border"
      )}
      data-testid={`agent-card-${agent.agent_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            "p-2 rounded-lg shrink-0 mt-0.5",
            agent.is_active ? "bg-emerald-500/10" : "bg-muted"
          )}>
            <MessageCircle size={18} className={agent.is_active ? "text-emerald-500" : "text-muted-foreground"} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate">{agent.name}</h3>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                agent.is_active
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {agent.is_active ? "Ativo" : "Parado"}
              </span>
            </div>
            {agent.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {agent.phone_number && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone size={10} /> {agent.phone_number}
                </span>
              )}
              {agent.n8n_webhook_url && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
                  <Link size={10} /> N8N configurado
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant={agent.is_active ? "destructive" : "default"}
            onClick={() => onToggle(agent)}
            disabled={loading === agent.agent_id}
            data-testid={`toggle-agent-${agent.agent_id}`}
            className="gap-1.5"
          >
            {loading === agent.agent_id ? (
              <Loader2 size={13} className="animate-spin" />
            ) : agent.is_active ? (
              <><PowerOff size={13} />Parar</>
            ) : (
              <><Power size={13} />Ativar</>
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(agent)} data-testid={`edit-agent-${agent.agent_id}`}>
            <Pencil size={13} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(agent)} data-testid={`delete-agent-${agent.agent_id}`}
            className="text-destructive hover:text-destructive">
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AgentDialog({ open, onClose, agent, onSaved }) {
  const [form, setForm] = useState({ name: "", description: "", phone_number: "", n8n_webhook_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name || "",
        description: agent.description || "",
        phone_number: agent.phone_number || "",
        n8n_webhook_url: agent.n8n_webhook_url || "",
      });
    } else {
      setForm({ name: "", description: "", phone_number: "", n8n_webhook_url: "" });
    }
  }, [agent, open]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      if (agent) {
        await axios.patch(`${API}/whatsapp/agents/${agent.agent_id}`, form, { headers: getAuthHeader() });
        toast.success("Agente atualizado!");
      } else {
        await axios.post(`${API}/whatsapp/agents`, form, { headers: getAuthHeader() });
        toast.success("Agente criado!");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao salvar agente");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-testid="agent-dialog">
        <DialogHeader>
          <DialogTitle>{agent ? "Editar Agente" : "Novo Agente WhatsApp"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome do Agente *</Label>
            <Input
              placeholder="Ex: Atendimento Inicial"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              data-testid="agent-name-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              placeholder="Descrição opcional"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              data-testid="agent-description-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Número WhatsApp</Label>
            <Input
              placeholder="5511999998888"
              value={form.phone_number}
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
              data-testid="agent-phone-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Webhook N8N (ativar/parar)</Label>
            <Input
              placeholder="https://n8n.exemplo.com/webhook/..."
              value={form.n8n_webhook_url}
              onChange={e => setForm(f => ({ ...f, n8n_webhook_url: e.target.value }))}
              data-testid="agent-webhook-input"
            />
            <p className="text-xs text-muted-foreground">
              URL do N8N que será chamada ao ativar ou parar este agente
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="agent-save-button">
            {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Salvando...</> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Whatsapp() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [webhookUrl] = useState(`${process.env.REACT_APP_BACKEND_URL}/api/webhook/whatsapp-lead`);
  const [copied, setCopied] = useState(false);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${API}/whatsapp/agents`, { headers: getAuthHeader() });
      setAgents(res.data);
    } catch (e) {
      toast.error("Erro ao carregar agentes");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleToggle = async (agent) => {
    setToggleLoading(agent.agent_id);
    try {
      const res = await axios.post(`${API}/whatsapp/agents/${agent.agent_id}/toggle`, {}, { headers: getAuthHeader() });
      const newStatus = res.data.is_active;
      toast.success(newStatus ? `Agente "${agent.name}" ativado!` : `Agente "${agent.name}" parado!`);
      fetchAgents();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao alternar agente");
    }
    setToggleLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API}/whatsapp/agents/${deleteTarget.agent_id}`, { headers: getAuthHeader() });
      toast.success("Agente removido");
      setDeleteTarget(null);
      fetchAgents();
    } catch (e) {
      toast.error("Erro ao remover agente");
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCount = agents.filter(a => a.is_active).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie agentes de automação e receba leads via WhatsApp
          </p>
        </div>
        <Button onClick={() => { setEditAgent(null); setDialogOpen(true); }} className="gap-2" data-testid="new-agent-button">
          <Plus size={15} />
          Novo Agente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total de Agentes</p>
          <p className="text-2xl font-bold mt-1" data-testid="total-agents-count">{agents.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Agentes Ativos</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1" data-testid="active-agents-count">{activeCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className={cn("text-sm font-semibold mt-1", activeCount > 0 ? "text-emerald-500" : "text-muted-foreground")}>
            {activeCount > 0 ? `${activeCount} agente(s) em execução` : "Nenhum ativo"}
          </p>
        </div>
      </div>

      {/* Webhook URL Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6" data-testid="webhook-url-info">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
          URL para configurar no N8N
        </p>
        <p className="text-xs text-muted-foreground mb-2">
          Configure esta URL no seu fluxo N8N para que as mensagens do WhatsApp criem leads automaticamente em AgênciaOS:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 font-mono truncate text-foreground" data-testid="webhook-url-display">
            {webhookUrl}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopyUrl} data-testid="copy-webhook-url">
            {copied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Payload esperado: <code className="font-mono bg-background px-1 rounded">POST</code> com{" "}
          <code className="font-mono bg-background px-1 rounded">{`{ name, phone, message, source: "whatsapp" }`}</code>
        </p>
      </div>

      {/* Agents List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center" data-testid="empty-agents">
          <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
            <MessageCircle size={28} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nenhum agente cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Crie um agente para conectar seu WhatsApp via N8N
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gap-2" data-testid="empty-new-agent-btn">
            <Plus size={14} /> Criar primeiro agente
          </Button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="agents-list">
          {agents.map(agent => (
            <AgentCard
              key={agent.agent_id}
              agent={agent}
              onToggle={handleToggle}
              onEdit={a => { setEditAgent(a); setDialogOpen(true); }}
              onDelete={setDeleteTarget}
              loading={toggleLoading}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AgentDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditAgent(null); }}
        agent={editAgent}
        onSaved={fetchAgents}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Agente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o agente "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-delete-agent">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
