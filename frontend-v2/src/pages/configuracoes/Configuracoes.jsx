import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Settings, Sun, Moon, Globe, Bot, Zap, FlaskConical, CheckCircle2, XCircle, Loader2, Sparkles, Key, Eye, EyeOff, Save, MessageCircle, Copy, CheckCheck, CalendarClock, Share2, Globe2, Users, UserPlus, Trash2, Crown, User, ChevronDown, ChevronRight, Shield, CreditCard, HardDrive, FileText } from "lucide-react";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("fluxscale.token")}` };
}

export function WebhookSection({ title, icon: Icon, description, settingKey, testLabel, payloadPreview }) {
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  const getEndpoint = () => (settingKey === "client" ? "webhook" : "carousel-webhook");
  const testEndpoint = settingKey === "client" ? "settings/webhook/test" : null;

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/settings/${getEndpoint()}`, { headers: getAuthHeader() });
        setUrl(res.data.webhook_url || "");
        setEnabled(res.data.enabled ?? false);
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await axios.put(
        `${API}/settings/${getEndpoint()}`,
        { webhook_url: url, enabled },
        { headers: getAuthHeader() }
      );
      setStatus("saved");
      toast.success("Webhook salvo com sucesso!");
    } catch (err) {
      setStatus("error");
      toast.error(err.response?.data?.detail || "Erro ao salvar webhook");
    }
    setSaving(false);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleTest = async () => {
    if (!testEndpoint) {
      toast.info("Teste disponível apenas para o webhook de clientes. Crie um cliente para testar o webhook de carrossel.");
      return;
    }
    setTesting(true);
    setStatus(null);
    try {
      const res = await axios.post(`${API}/${testEndpoint}`, {}, { headers: getAuthHeader() });
      setStatus("test_ok");
      toast.success(res.data.message || "Teste enviado com sucesso!");
    } catch (err) {
      setStatus("test_fail");
      toast.error(err.response?.data?.detail || "Falha no teste");
    }
    setTesting(false);
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4" data-testid={`webhook-section-${settingKey}`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
          <Icon size={16} />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{enabled ? "Ativo" : "Inativo"}</span>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            data-testid={`webhook-toggle-${settingKey}`}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">URL do Webhook (N8N)</Label>
          <Input
            placeholder="https://seu-n8n.exemplo.com/webhook/xxxxxxxx"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            data-testid={`webhook-url-${settingKey}`}
          />
        </div>

        {payloadPreview && (
          <div className="bg-muted/40 border border-border rounded-md p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-2">
              Payload enviado ao N8N (POST JSON)
            </p>
            <pre className="text-xs text-foreground/80 font-mono leading-relaxed whitespace-pre-wrap">
              {payloadPreview}
            </pre>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !url.trim()} data-testid={`webhook-save-${settingKey}`}>
            {saving ? <><Loader2 size={14} className="mr-2 animate-spin" />Salvando...</> : "Salvar webhook"}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !url.trim()}
            data-testid={`webhook-test-${settingKey}`}
          >
            {testing ? (
              <><Loader2 size={14} className="mr-2 animate-spin" />Testando...</>
            ) : (
              <><FlaskConical size={14} className="mr-2" />Testar</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppWebhookSection() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
  const inboundUrl = `${backendUrl}/api/webhook/whatsapp-lead`;
  const [copied, setCopied] = useState(false);

  const [outboundUrl, setOutboundUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/settings/whatsapp-webhook`, { headers: getAuthHeader() });
        setOutboundUrl(res.data.webhook_url || "");
        setEnabled(res.data.enabled ?? true);
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/whatsapp-webhook`, { webhook_url: outboundUrl, enabled }, { headers: getAuthHeader() });
      toast.success("Configuração WhatsApp salva!");
    } catch {
      toast.error("Erro ao salvar");
    }
    setSaving(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inboundUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copiada!");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4" data-testid="whatsapp-webhook-section">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
          <MessageCircle size={16} />
          WhatsApp — Integração via N8N
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{enabled ? "Ativo" : "Inativo"}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="whatsapp-enabled-toggle" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Configure a URL abaixo no N8N para receber mensagens do WhatsApp como Leads automaticamente.
      </p>

      {/* Inbound URL (read-only) */}
      <div className="mb-4 space-y-1.5">
        <Label className="text-xs font-semibold">URL de recepção (cole no N8N)</Label>
        <div className="flex gap-2">
          <code className="flex-1 text-xs bg-muted border border-border rounded px-3 py-2 font-mono truncate" data-testid="whatsapp-inbound-url">
            {inboundUrl}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopy} data-testid="copy-whatsapp-url">
            {copied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          POST {`{ name, phone, message, source: "whatsapp" }`}
        </p>
      </div>

      {/* Optional outbound URL */}
      <div className="space-y-1.5 mb-4">
        <Label className="text-sm font-medium">Webhook N8N de controle (opcional)</Label>
        <Input
          placeholder="https://seu-n8n.exemplo.com/webhook/..."
          value={outboundUrl}
          onChange={e => setOutboundUrl(e.target.value)}
          data-testid="whatsapp-outbound-url"
        />
        <p className="text-xs text-muted-foreground">
          URL do N8N chamada ao ativar/parar agentes na aba WhatsApp
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving} data-testid="save-whatsapp-webhook">
        {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Salvando...</> : "Salvar configuração"}
      </Button>
    </div>
  );
}

export function MeetingWebhookSection() {
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/settings/meeting-webhook`, { headers: getAuthHeader() });
        setUrl(res.data.webhook_url || "");
        setEnabled(res.data.enabled ?? true);
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/meeting-webhook`, { webhook_url: url, enabled }, { headers: getAuthHeader() });
      toast.success("Configuração de reuniões salva!");
    } catch { toast.error("Erro ao salvar"); }
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4" data-testid="meeting-webhook-section">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
          <CalendarClock size={16} />
          Webhook de Reuniões (Google Calendar)
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{enabled ? "Ativo" : "Inativo"}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="meeting-webhook-enabled" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        URL do N8N chamada ao confirmar uma reunião no Pipeline. Envia os dados para criar evento no Google Calendar.
      </p>
      <div className="space-y-1.5 mb-4">
        <Label className="text-sm font-medium">URL do Webhook N8N</Label>
        <Input
          placeholder="https://seu-n8n.exemplo.com/webhook/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          data-testid="meeting-webhook-url"
        />
      </div>
      <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground mb-4">
        <p className="font-semibold mb-1 text-foreground">Payload enviado:</p>
        <pre className="font-mono text-xs leading-relaxed overflow-x-auto">{`{
  "dealId": "deal_xxx",
  "contactName": "Nome do Contato",
  "email": "email@lead.com",
  "meetingTitle": "Reunião — Nome",
  "meetingDate": "2025-01-15",
  "startTime": "14:00",
  "endTime": "15:00",
  "notes": "Pauta da reunião",
  "scheduledAt": "ISO timestamp"
}`}</pre>
      </div>
      <Button onClick={handleSave} disabled={saving} data-testid="save-meeting-webhook">
        {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Salvando...</> : "Salvar configuração"}
      </Button>
    </div>
  );
}

export function ApiKeysSection() {
  const PROVIDERS = [
    { value: "perplexity", label: "Perplexity", placeholder: "pplx-..." },
    { value: "openai", label: "OpenAI", placeholder: "sk-..." },
    { value: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
    { value: "gemini", label: "Gemini", placeholder: "AIza..." },
    { value: "groq", label: "Groq", placeholder: "gsk_..." },
  ];

  const [maskedKeys, setMaskedKeys] = useState({});
  const [selected, setSelected] = useState("perplexity");
  const [keyValue, setKeyValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadKeys = async () => {
    try {
      const res = await axios.get(`${API}/settings/api-keys`, { headers: getAuthHeader() });
      setMaskedKeys(res.data);
    } catch {}
  };

  useEffect(() => { loadKeys(); }, []);

  const handleSelect = (val) => {
    setSelected(val);
    setKeyValue("");
    setVisible(false);
  };

  const handleSave = async () => {
    if (!keyValue.trim()) {
      toast.info("Insira uma chave para salvar");
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API}/settings/api-keys`, { [`${selected}_key`]: keyValue.trim() }, { headers: getAuthHeader() });
      await loadKeys();
      setKeyValue("");
      const label = PROVIDERS.find(p => p.value === selected)?.label || selected;
      toast.success(`Chave ${label} salva com sucesso!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao salvar chave");
    }
    setSaving(false);
  };

  const current = PROVIDERS.find(p => p.value === selected);
  const currentMasked = maskedKeys[`${selected}_key`];

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4" data-testid="api-keys-section">
      <h2 className="text-sm font-heading font-semibold mb-1 flex items-center gap-2">
        <Key size={16} />
        Chaves de API — Agentes de IA
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Usadas na aba Conteúdo para geração de carrosséis multi-agente. Selecione o provedor e insira sua chave.
      </p>

      {/* Provider pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PROVIDERS.map(p => {
          const isConfigured = !!maskedKeys[`${p.value}_key`];
          const isSelected = selected === p.value;
          return (
            <button
              key={p.value}
              onClick={() => handleSelect(p.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                isSelected
                  ? "border-primary bg-primary/8 text-primary ring-1 ring-primary/20"
                  : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
              )}
              data-testid={`provider-pill-${p.value}`}
            >
              {isConfigured && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Single key input */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold">{current?.label} API Key</Label>
          {currentMasked && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded font-medium">
              Configurada
            </span>
          )}
        </div>
        {currentMasked && (
          <p className="text-xs text-muted-foreground font-mono">Atual: {currentMasked}</p>
        )}
        <div className="relative max-w-sm">
          <Input
            type={visible ? "text" : "password"}
            placeholder={current?.placeholder || "Cole sua chave aqui..."}
            value={keyValue}
            onChange={e => setKeyValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            className="pr-9 text-sm font-mono"
            data-testid={`api-key-input-${selected}`}
          />
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || !keyValue.trim()}
        className="mt-4 gap-2"
        data-testid="save-api-keys-button"
      >
        {saving
          ? <><Loader2 size={14} className="animate-spin" />Salvando...</>
          : <><Save size={14} />Salvar chave {current?.label}</>}
      </Button>
    </div>
  );
}

const ALL_MODULES = [
  { key: "leads",       label: "Leads" },
  { key: "pipeline",    label: "Pipeline" },
  { key: "clientes",    label: "Clientes" },
  { key: "financeiro",  label: "Financeiro" },
  { key: "conteudo",    label: "Conteúdo" },
  { key: "operacional", label: "Operacional" },
  { key: "rh",          label: "RH" },
  { key: "whatsapp",    label: "WhatsApp" },
];

export function MembersSection({ currentUser }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");
  const [invitePerms, setInvitePerms] = useState(ALL_MODULES.map(m => m.key));
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [editingPerms, setEditingPerms] = useState(null); // user_id being edited
  const [permEdits, setPermEdits] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const loadMembers = async () => {
    try {
      const res = await axios.get(`${API}/org/members`, { headers: getAuthHeader() });
      setMembers(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await axios.post(`${API}/org/members/invite`, { email: email.trim(), name: name.trim(), role, permissions: invitePerms }, { headers: getAuthHeader() });
      const token = res.data.invite_token;
      const link = `${window.location.origin}/aceitar-convite?token=${token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success(`Convite criado! Link copiado para área de transferência.`, { duration: 6000 });
      setEmail(""); setName(""); setInvitePerms(ALL_MODULES.map(m => m.key));
      await loadMembers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao enviar convite");
    }
    setInviting(false);
  };

  const handleRemove = async (userId) => {
    if (!window.confirm("Remover este membro da organização?")) return;
    setRemovingId(userId);
    try {
      await axios.delete(`${API}/org/members/${userId}`, { headers: getAuthHeader() });
      toast.success("Membro removido");
      setMembers(m => m.filter(x => x.user_id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao remover membro");
    }
    setRemovingId(null);
  };

  const openPermEditor = (member) => {
    setEditingPerms(member.user_id);
    setPermEdits({ [member.user_id]: member.permissions || ALL_MODULES.map(m => m.key) });
  };

  const togglePerm = (userId, moduleKey) => {
    setPermEdits(prev => {
      const current = prev[userId] || [];
      const has = current.includes(moduleKey);
      return { ...prev, [userId]: has ? current.filter(k => k !== moduleKey) : [...current, moduleKey] };
    });
  };

  const savePerms = async (userId) => {
    setSavingPerms(true);
    try {
      await axios.put(`${API}/org/members/${userId}/permissions`, { permissions: permEdits[userId] || [] }, { headers: getAuthHeader() });
      toast.success("Permissões salvas");
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, permissions: permEdits[userId] } : m));
      setEditingPerms(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao salvar permissões");
    }
    setSavingPerms(false);
  };

  return (
    <div className="space-y-3">
      {/* Member list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 size={13} className="animate-spin" /> Carregando membros...
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.user_id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-background rounded-md border border-border">
                    {m.role === "admin" ? <Crown size={13} className="text-amber-500" /> : <User size={13} className="text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.name || m.email}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.role === "admin"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {m.role === "admin" ? "Admin" : "Membro"}
                  </span>
                  {isAdmin && m.role !== "admin" && (
                    <button
                      onClick={() => editingPerms === m.user_id ? setEditingPerms(null) : openPermEditor(m)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Editar permissões"
                    >
                      <Shield size={13} />
                    </button>
                  )}
                  {isAdmin && m.user_id !== currentUser?.user_id && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      disabled={removingId === m.user_id}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remover membro"
                    >
                      {removingId === m.user_id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Permission editor */}
              {editingPerms === m.user_id && (
                <div className="border-t border-border p-3 bg-background">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-3">Módulos com acesso</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ALL_MODULES.map(mod => {
                      const enabled = (permEdits[m.user_id] || []).includes(mod.key);
                      return (
                        <button
                          key={mod.key}
                          onClick={() => togglePerm(m.user_id, mod.key)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            enabled
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {mod.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => savePerms(m.user_id)} disabled={savingPerms} className="h-7 text-xs">
                      {savingPerms ? <Loader2 size={12} className="animate-spin" /> : "Salvar permissões"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPerms(null)} className="h-7 text-xs">Cancelar</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">Nenhum membro encontrado.</p>
          )}
        </div>
      )}

      {/* Invite form — admin only */}
      {isAdmin && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-3">Convidar novo membro</p>
          <div className="flex gap-2 flex-wrap mb-4">
            <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[140px] text-sm" />
            <Input placeholder="email@agencia.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleInvite()} className="flex-1 min-w-[180px] text-sm" />
            <select value={role} onChange={e => setRole(e.target.value)} className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground">
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Módulos — só aparece quando role = member */}
          {role === "member" && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-2">Módulos com acesso</p>
              <div className="flex flex-wrap gap-2">
                {ALL_MODULES.map(mod => {
                  const enabled = invitePerms.includes(mod.key);
                  return (
                    <button
                      key={mod.key}
                      type="button"
                      onClick={() => setInvitePerms(prev =>
                        enabled ? prev.filter(k => k !== mod.key) : [...prev, mod.key]
                      )}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        enabled
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {mod.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button onClick={handleInvite} disabled={inviting || !email.trim()} className="gap-2">
            {inviting ? <><Loader2 size={14} className="animate-spin" />Enviando...</> : <><UserPlus size={14} />Convidar</>}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">O link de aceite será copiado automaticamente. Envie para o funcionário.</p>
        </div>
      )}
    </div>
  );
}

export function InstagramApiSection() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
  const webhookUrl = `${backendUrl}/api/webhook/Globe2`;
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [form, setForm] = useState({
    page_access_token: "",
    instagram_account_id: "",
    verify_token: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/settings/Globe2-api`, { headers: getAuthHeader() });
        setForm({
          page_access_token: res.data.page_access_token || "",
          instagram_account_id: res.data.instagram_account_id || "",
          verify_token: res.data.verify_token || "",
        });
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/Globe2-api`, form, { headers: getAuthHeader() });
      toast.success("Configurações do Globe2 salvas!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao salvar");
    }
    setSaving(false);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success("URL copiada!");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4" data-testid="Globe2-api-section">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
          <Share2 size={16} />
          Globe2 API
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Conecte sua conta Globe2 para receber e responder mensagens diretamente do sistema.
      </p>

      <div className="space-y-4">
        {/* Page Access Token */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Page Access Token</Label>
          <div className="relative max-w-md">
            <Input
              type={showToken ? "text" : "password"}
              placeholder="EAAxxxxx..."
              value={form.page_access_token}
              onChange={e => setForm(f => ({ ...f, page_access_token: e.target.value }))}
              className="pr-9 font-mono text-sm"
              data-testid="Globe2-page-access-token"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Globe2 Account ID */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">ID da Conta Globe2</Label>
          <Input
            placeholder="17841xxxxxxxxxx"
            value={form.instagram_account_id}
            onChange={e => setForm(f => ({ ...f, instagram_account_id: e.target.value }))}
            className="max-w-md font-mono text-sm"
            data-testid="Globe2-account-id"
          />
        </div>

        {/* Verify Token */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Verify Token (webhook)</Label>
          <Input
            placeholder="meu_token_secreto_123"
            value={form.verify_token}
            onChange={e => setForm(f => ({ ...f, verify_token: e.target.value }))}
            className="max-w-md font-mono text-sm"
            data-testid="Globe2-verify-token"
          />
          <p className="text-xs text-muted-foreground">
            Defina qualquer string aqui. Use esse valor ao configurar o webhook no painel da Meta.
          </p>
        </div>

        {/* Webhook URL (read-only) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Callback URL do Webhook (Meta)</Label>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-muted border border-border rounded px-3 py-2 font-mono truncate max-w-md" data-testid="Globe2-webhook-url">
              {webhookUrl}
            </code>
            <button
              onClick={handleCopyWebhook}
              className="p-2 rounded-md border border-border hover:bg-muted transition-colors"
              data-testid="copy-Globe2-webhook-url"
            >
              {copiedWebhook ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure essa URL como Callback URL no seu app da Meta.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="save-Globe2-api">
          {saving
            ? <><Loader2 size={14} className="animate-spin" />Salvando...</>
            : <><Save size={14} />Salvar</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Asaas Section ────────────────────────────────────────────────────────────
function NotifRow({ label, email, onEmail, sms, onSms, whatsapp, onWhatsapp }) {
  return (
    <div className="grid grid-cols-[1fr_60px_60px_80px] gap-2 items-center">
      <span className="text-xs text-foreground">{label}</span>
      <div className="flex justify-center">
        <input type="checkbox" checked={email} onChange={e => onEmail(e.target.checked)} className="rounded" />
      </div>
      <div className="flex justify-center">
        <input type="checkbox" checked={sms} onChange={e => onSms(e.target.checked)} className="rounded" />
      </div>
      <div className="flex justify-center">
        <input type="checkbox" checked={whatsapp} onChange={e => onWhatsapp(e.target.checked)} className="rounded opacity-60" title="Requer plano Asaas premium" />
      </div>
    </div>
  );
}

function AsaasSection() {
  const [apiKey, setApiKey] = useState("");
  const [sandbox, setSandbox] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notifyBeforeDueEmail, setNotifyBeforeDueEmail] = useState(false);
  const [notifyBeforeDueSms, setNotifyBeforeDueSms] = useState(false);
  const [notifyBeforeDueWa, setNotifyBeforeDueWa] = useState(false);
  const [notifyOverdueEmail, setNotifyOverdueEmail] = useState(false);
  const [notifyOverdueSms, setNotifyOverdueSms] = useState(false);
  const [notifyOverdueWa, setNotifyOverdueWa] = useState(false);
  const [notifyPaidEmail, setNotifyPaidEmail] = useState(false);
  const [notifyPaidSms, setNotifyPaidSms] = useState(false);
  const [notifyPaidWa, setNotifyPaidWa] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/asaas`, { headers: getAuthHeader() })
      .then(r => {
        setMaskedKey(r.data.api_key_masked || "");
        setSandbox(r.data.sandbox ?? true);
        setEnabled(r.data.enabled ?? false);
        setNotifyBeforeDueEmail(r.data.notify_before_due_email ?? false);
        setNotifyBeforeDueSms(r.data.notify_before_due_sms ?? false);
        setNotifyBeforeDueWa(r.data.notify_before_due_whatsapp ?? false);
        setNotifyOverdueEmail(r.data.notify_overdue_email ?? false);
        setNotifyOverdueSms(r.data.notify_overdue_sms ?? false);
        setNotifyOverdueWa(r.data.notify_overdue_whatsapp ?? false);
        setNotifyPaidEmail(r.data.notify_paid_email ?? false);
        setNotifyPaidSms(r.data.notify_paid_sms ?? false);
        setNotifyPaidWa(r.data.notify_paid_whatsapp ?? false);
      }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        sandbox, enabled,
        notify_before_due_email: notifyBeforeDueEmail,
        notify_before_due_sms: notifyBeforeDueSms,
        notify_before_due_whatsapp: notifyBeforeDueWa,
        notify_overdue_email: notifyOverdueEmail,
        notify_overdue_sms: notifyOverdueSms,
        notify_overdue_whatsapp: notifyOverdueWa,
        notify_paid_email: notifyPaidEmail,
        notify_paid_sms: notifyPaidSms,
        notify_paid_whatsapp: notifyPaidWa,
      };
      if (apiKey) body.api_key = apiKey;
      await axios.put(`${API}/settings/asaas`, body, { headers: getAuthHeader() });
      if (apiKey) { setMaskedKey(`${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`); setApiKey(""); }
      toast.success("Configurações Asaas salvas!");
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao salvar"); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await axios.post(`${API}/settings/asaas/test`, {}, { headers: getAuthHeader() });
      toast.success(res.data.message || "Conexão OK!");
    } catch (err) { toast.error(err.response?.data?.detail || "Falha na conexão"); }
    setTesting(false);
  };

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">Cria cliente e cobrança no Asaas automaticamente ao cadastrar um novo cliente.</p>
        <label className="flex items-center gap-2 cursor-pointer shrink-0 ml-3">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-xs text-muted-foreground">{enabled ? "Ativo" : "Inativo"}</span>
        </label>
      </div>
      <div className="mb-3">
        <Label className="text-xs mb-1 block">API Key do Asaas</Label>
        {maskedKey && !showKey ? (
          <div className="flex gap-2 items-center">
            <Input value={maskedKey} readOnly className="text-xs font-mono" />
            <button onClick={() => setShowKey(true)} className="text-xs text-primary underline whitespace-nowrap">alterar</button>
          </div>
        ) : (
          <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="$aact_..." className="text-xs font-mono" />
        )}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={sandbox} onCheckedChange={setSandbox} />
          <span className="text-xs text-muted-foreground">Modo sandbox (testes)</span>
        </label>
      </div>
      <div className="flex gap-2 mb-4">
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving && <Loader2 size={13} className="animate-spin mr-1" />}Salvar</Button>
        <Button size="sm" variant="outline" onClick={handleTest} disabled={testing}>{testing && <Loader2 size={13} className="animate-spin mr-1" />}Testar</Button>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notificações para o cliente</p>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_60px_60px_80px] gap-2 text-[11px] text-muted-foreground font-medium pb-1 border-b border-border">
            <span>Evento</span>
            <span className="text-center">Email</span>
            <span className="text-center">SMS</span>
            <span className="text-center">WhatsApp</span>
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Antes do vencimento</p>
          <NotifRow
            label="Criação e lembretes da cobrança"
            email={notifyBeforeDueEmail} onEmail={setNotifyBeforeDueEmail}
            sms={notifyBeforeDueSms} onSms={setNotifyBeforeDueSms}
            whatsapp={notifyBeforeDueWa} onWhatsapp={setNotifyBeforeDueWa}
          />
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Cobrança vencida</p>
          <NotifRow
            label="Atraso e lembretes de vencimento"
            email={notifyOverdueEmail} onEmail={setNotifyOverdueEmail}
            sms={notifyOverdueSms} onSms={setNotifyOverdueSms}
            whatsapp={notifyOverdueWa} onWhatsapp={setNotifyOverdueWa}
          />
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Pagamento confirmado</p>
          <NotifRow
            label="Aviso de pagamento recebido"
            email={notifyPaidEmail} onEmail={setNotifyPaidEmail}
            sms={notifyPaidSms} onSms={setNotifyPaidSms}
            whatsapp={notifyPaidWa} onWhatsapp={setNotifyPaidWa}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">* WhatsApp requer plano Asaas com mensageria ativa</p>
      </div>
    </div>
  );
}

// ─── Google Drive & Calendar Section ──────────────────────────────────────────
function GoogleIntegrationSection() {
  const [serviceAccount, setServiceAccount] = useState("");
  const [driveFolder, setDriveFolder] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/google-integration`, { headers: getAuthHeader() })
      .then(r => {
        setDriveFolder(r.data.drive_folder_id || "");
        setCalendarId(r.data.calendar_id || "");
        setDriveEnabled(r.data.drive_enabled ?? false);
        setCalendarEnabled(r.data.calendar_enabled ?? false);
        if (r.data.has_service_account) setServiceAccount("••••••••••••••••");
      }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { drive_folder_id: driveFolder, calendar_id: calendarId, drive_enabled: driveEnabled, calendar_enabled: calendarEnabled };
      if (serviceAccount && !serviceAccount.startsWith("•")) body.service_account_json = serviceAccount;
      await axios.put(`${API}/settings/google-integration`, body, { headers: getAuthHeader() });
      toast.success("Configurações Google salvas!");
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao salvar"); }
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><HardDrive size={15} />Google Drive & Calendar</h3>
      <p className="text-xs text-muted-foreground mb-3">Cria pasta no Drive por cliente e agenda reuniões no Google Calendar via Service Account.</p>
      <div className="mb-3">
        <Label className="text-xs mb-1 block">Service Account JSON</Label>
        <textarea value={serviceAccount} onChange={e => setServiceAccount(e.target.value)} rows={4}
          placeholder='{"type":"service_account","project_id":"..."}'
          className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <Label className="text-xs mb-1 block">Drive Folder ID</Label>
          <Input value={driveFolder} onChange={e => setDriveFolder(e.target.value)} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs" className="text-xs" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Calendar ID</Label>
          <Input value={calendarId} onChange={e => setCalendarId(e.target.value)} placeholder="primary" className="text-xs" />
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={driveEnabled} onCheckedChange={setDriveEnabled} />
          <span className="text-xs text-muted-foreground">Drive ativo</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={calendarEnabled} onCheckedChange={setCalendarEnabled} />
          <span className="text-xs text-muted-foreground">Calendar ativo</span>
        </label>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving}>{saving && <Loader2 size={13} className="animate-spin mr-1" />}Salvar</Button>
    </div>
  );
}

// ─── Contract Template Section ────────────────────────────────────────────────
function ContractTemplateSection() {
  const [template, setTemplate] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/contract-template`, { headers: getAuthHeader() })
      .then(r => {
        setTemplate(r.data.template || "");
        setEnabled(r.data.enabled ?? false);
      }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/contract-template`, { template, enabled }, { headers: getAuthHeader() });
      toast.success("Template de contrato salvo!");
    } catch (err) { toast.error(err.response?.data?.detail || "Erro ao salvar"); }
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><FileText size={15} />Template de Contrato</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Variáveis: <code className="bg-muted px-1 rounded text-[11px]">{"{{nome}}"}</code>{" "}
        <code className="bg-muted px-1 rounded text-[11px]">{"{{email}}"}</code>{" "}
        <code className="bg-muted px-1 rounded text-[11px]">{"{{valor}}"}</code>{" "}
        <code className="bg-muted px-1 rounded text-[11px]">{"{{data_inicio}}"}</code>
      </p>
      <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={10}
        placeholder={"CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nContratante: {{nome}}\nEmail: {{email}}\nValor: R$ {{valor}}..."}
        className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring font-mono mb-3" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-xs text-muted-foreground">Gerar PDF ao criar cliente (requer Drive ativo)</span>
        </label>
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving && <Loader2 size={13} className="animate-spin mr-1" />}Salvar template</Button>
      </div>
    </div>
  );
}

function Accordion({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-1 py-2 rounded-md hover:bg-muted/40 transition-colors text-left"
      >
        <Icon size={16} className="shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm font-heading font-semibold">{title}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="text-muted-foreground shrink-0"
          style={{ transition: "transform 0.2s ease", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {open && (
        <div className="mt-2 ml-4 space-y-0" style={{ paddingLeft: "12px", borderLeft: "1px solid hsl(var(--border))" }}>
          {children}
        </div>
      )}
    </div>
  );
}

const BOT_URL_KEY = 'fluxscale.whatsapp_bot_url';
const WA_ICON = (
  <svg viewBox="0 0 24 24" fill="#25d366" className="w-4 h-4 shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export function WhatsAppBotSection() {
  const [botUrl, setBotUrl] = useState(() => localStorage.getItem(BOT_URL_KEY) || '');
  const [inputUrl, setInputUrl] = useState(() => localStorage.getItem(BOT_URL_KEY) || 'http://localhost:3001');
  const [status, setStatus] = useState('unknown');
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [phone, setPhone] = useState(null);
  const [linking, setLinking] = useState(false);

  const fetchStatus = React.useCallback(async (url) => {
    const target = url !== undefined ? url : botUrl;
    if (!target) return;
    try {
      const res = await fetch(`${target}/api/status`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      setStatus(data.status);
      setQrDataUrl(data.qrDataUrl || null);
      setPhone(data.phone || null);
      if (data.status === 'connected') setLinking(false);
    } catch {
      setStatus('offline');
      setQrDataUrl(null);
    }
  }, [botUrl]);

  // Poll every 3s whenever URL is set
  useEffect(() => {
    if (!botUrl) return;
    fetchStatus(botUrl);
    const t = setInterval(() => fetchStatus(botUrl), 3000);
    return () => clearInterval(t);
  }, [botUrl, fetchStatus]);

  const handleSaveUrl = () => {
    const trimmed = inputUrl.trim().replace(/\/$/, '') || 'http://localhost:3001';
    setBotUrl(trimmed);
    localStorage.setItem(BOT_URL_KEY, trimmed);
    setStatus('unknown');
    setQrDataUrl(null);
    fetchStatus(trimmed);
  };

  const handleVincular = () => {
    setLinking(true);
    fetchStatus(botUrl);
  };

  const isConnected = status === 'connected';
  const hasQr = status === 'qr' && !!qrDataUrl;

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
          {WA_ICON}
          WhatsApp — Vincular Número
        </h2>
        {botUrl && status !== 'unknown' && (
          <span className={cn('text-xs font-medium',
            isConnected ? 'text-emerald-500' :
            status === 'qr' ? 'text-amber-500' :
            status === 'offline' ? 'text-red-500' : 'text-muted-foreground'
          )}>
            ● {isConnected ? 'Conectado' : status === 'qr' ? 'Aguardando scan' : status === 'offline' ? 'Offline' : 'Iniciando...'}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Conecte seu número do WhatsApp para enviar e receber mensagens na aba{' '}
        <strong>Conversas</strong>. O bot deve estar rodando localmente.
      </p>

      {/* URL input */}
      <div className="space-y-1.5 mb-5">
        <Label className="text-sm font-medium">URL da API do Bot</Label>
        <div className="flex gap-2">
          <Input
            placeholder="http://localhost:3001"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveUrl()}
          />
          <Button variant="outline" onClick={handleSaveUrl}>
            Salvar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Porta padrão: <code className="font-mono">3001</code>. Rode <code className="font-mono text-[11px]">npm start</code> na pasta do bot primeiro.
        </p>
      </div>

      {/* ── Connected ── */}
      {isConnected && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              WhatsApp conectado{phone ? ` — +${phone}` : ''}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Acesse a aba <strong>Conversas</strong> para ver as mensagens.
            </p>
          </div>
        </div>
      )}

      {/* ── QR Code visible ── */}
      {hasQr && (
        <div className="flex flex-col items-center gap-4 border border-border rounded-xl p-6 bg-muted/20">
          <div className="text-center">
            <p className="text-sm font-semibold">Escaneie o QR Code</p>
            <p className="text-xs text-muted-foreground mt-1">
              Abra o WhatsApp no celular → <strong>···</strong> → Dispositivos conectados → Conectar dispositivo
            </p>
          </div>
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-border">
            <img src={qrDataUrl} alt="QR Code WhatsApp" className="w-52 h-52" />
          </div>
          <p className="text-[11px] text-muted-foreground">O QR expira em ~60 s. Atualize se necessário.</p>
          <button
            onClick={() => fetchStatus(botUrl)}
            className="text-xs text-primary hover:underline"
          >
            ↻ Atualizar QR
          </button>
        </div>
      )}

      {/* ── Waiting for QR (bot starting / linking mode) ── */}
      {!isConnected && !hasQr && linking && (
        <div className="flex flex-col items-center gap-3 border border-border rounded-xl p-6 bg-muted/20">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Aguardando QR Code...</p>
            <p className="text-xs text-muted-foreground mt-1">
              {status === 'offline'
                ? 'Não foi possível conectar ao bot. Verifique se ele está rodando.'
                : 'O bot está iniciando. O QR aparecerá aqui em instantes.'}
            </p>
          </div>
          {status === 'offline' && (
            <div className="bg-muted rounded-lg px-4 py-3 text-xs font-mono text-foreground/80 text-left w-full max-w-xs">
              <p className="text-muted-foreground mb-1">Na pasta do bot, execute:</p>
              <p>npm install</p>
              <p>npm start</p>
            </div>
          )}
        </div>
      )}

      {/* ── Primary action button ── */}
      {!isConnected && !linking && (
        <Button
          className="w-full"
          onClick={handleVincular}
          disabled={!botUrl}
          style={{ background: '#25d366', color: '#fff' }}
        >
          {WA_ICON}
          <span className="ml-2">Vincular número</span>
        </Button>
      )}

      {/* ── Reset when connecting ── */}
      {!isConnected && linking && (
        <button
          onClick={() => setLinking(false)}
          className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground text-center"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}

export default function Configuracoes() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Preferências e integrações da sua conta</p>
      </div>

      {/* Profile */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Settings size={16} />
          Perfil
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.1em] font-semibold">Nome</p>
            <p className="text-sm font-medium mt-0.5">{user?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.1em] font-semibold">Email</p>
            <p className="text-sm font-medium mt-0.5">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.1em] font-semibold">Função</p>
            <p className="text-sm font-medium mt-0.5 capitalize">{user?.role || "admin"}</p>
          </div>
        </div>
      </div>

      {/* Accordion — Gerenciar Membros */}
      <Accordion title="Gerenciar Membros" icon={Users} defaultOpen={user?.role === "admin"}>
        <MembersSection currentUser={user} />
      </Accordion>

      {/* Accordion — Asaas */}
      <Accordion title="Asaas — Cobrança" icon={CreditCard} defaultOpen={false}>
        <AsaasSection />
      </Accordion>

      {/* Accordion — Integrações */}
      <Accordion title="Integrações" icon={Globe} defaultOpen={false}>
        {/* Appearance */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-3 flex items-center gap-2"><Sun size={13} />Aparência</p>
          <div className="flex gap-3">
            {[{ value: "light", label: "Claro", icon: Sun }, { value: "dark", label: "Escuro", icon: Moon }].map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${theme === t.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
                data-testid={`theme-${t.value}-button`}
              >
                <t.icon size={15} />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Integrações Nativas */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Integrações Nativas</p>
        <GoogleIntegrationSection />
        <ContractTemplateSection />

        {/* Webhooks N8N (legado) */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-2">Webhooks N8N (legado)</p>
        <WebhookSection
          title="N8N — Webhook de Clientes"
          icon={Globe}
          description="Ao cadastrar um novo cliente, envia automaticamente um POST JSON para o N8N com os dados de cobrança."
          settingKey="client"
          payloadPreview={`{\n  "name": "Nome do Cliente",\n  "cpfCnpj": "00000000000000",\n  "email": "cliente@exemplo.com",\n  "mobilePhone": "11999999999",\n  "billingType": "BOLETO",\n  "value": 500.00,\n  "dueDate": "2025-12-01"\n}`}
        />
        <WebhookSection
          title="N8N — Webhook de Carrossel"
          icon={Sparkles}
          description="Usado na aba Conteúdo para gerar carrosséis. Envia dados do cliente (nicho + notas) ao N8N e recebe os slides gerados."
          settingKey="carousel"
          payloadPreview={`{\n  "jobId": "job_abc123",\n  "clientId": "uuid",\n  "clientName": "Nome do Cliente",\n  "niche": "Empresa / Segmento",\n  "notes": "Notas do nicho...",\n  "email": "cliente@exemplo.com",\n  "requestedAt": "2025-01-01T00:00:00Z"\n}`}
        />
        <WhatsAppBotSection />
        <WhatsAppWebhookSection />
        <MeetingWebhookSection />
        <InstagramApiSection />
        <ApiKeysSection />
      </Accordion>
    </div>
  );
}
