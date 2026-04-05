import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Settings, Sun, Moon, Globe, Bot, Zap, FlaskConical, CheckCircle2, XCircle, Loader2, Sparkles, Key, Eye, EyeOff, Save, MessageCircle, Copy, CheckCheck, CalendarClock, Share2, Instagram, Users, UserPlus, Trash2, Crown, User, ChevronDown, ChevronRight, Shield } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("agenciaos_token")}` };
}

function WebhookSection({ title, icon: Icon, description, settingKey, testLabel, payloadPreview }) {
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

function WhatsAppWebhookSection() {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
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

function MeetingWebhookSection() {
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

function ApiKeysSection() {
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

function MembersSection({ currentUser }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");
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
      const res = await axios.post(`${API}/org/members/invite`, { email: email.trim(), name: name.trim(), role }, { headers: getAuthHeader() });
      const token = res.data.invite_token;
      const link = `${window.location.origin}/aceitar-convite?token=${token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success(`Convite criado! Link copiado para área de transferência.`, { duration: 6000 });
      setEmail(""); setName("");
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
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[140px] text-sm" />
            <Input placeholder="email@agencia.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleInvite()} className="flex-1 min-w-[180px] text-sm" />
            <select value={role} onChange={e => setRole(e.target.value)} className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground">
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </select>
            <Button onClick={handleInvite} disabled={inviting || !email.trim()} className="gap-2">
              {inviting ? <><Loader2 size={14} className="animate-spin" />Enviando...</> : <><UserPlus size={14} />Convidar</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">O link de aceite será copiado automaticamente. Envie para o funcionário.</p>
        </div>
      )}
    </div>
  );
}

function InstagramApiSection() {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
  const webhookUrl = `${backendUrl}/api/webhook/instagram`;
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
        const res = await axios.get(`${API}/settings/instagram-api`, { headers: getAuthHeader() });
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
      await axios.put(`${API}/settings/instagram-api`, form, { headers: getAuthHeader() });
      toast.success("Configurações do Instagram salvas!");
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
    <div className="bg-card border border-border rounded-lg p-5 mb-4" data-testid="instagram-api-section">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
          <Share2 size={16} />
          Instagram API
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Conecte sua conta Instagram para receber e responder mensagens diretamente do sistema.
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
              data-testid="instagram-page-access-token"
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

        {/* Instagram Account ID */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">ID da Conta Instagram</Label>
          <Input
            placeholder="17841xxxxxxxxxx"
            value={form.instagram_account_id}
            onChange={e => setForm(f => ({ ...f, instagram_account_id: e.target.value }))}
            className="max-w-md font-mono text-sm"
            data-testid="instagram-account-id"
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
            data-testid="instagram-verify-token"
          />
          <p className="text-xs text-muted-foreground">
            Defina qualquer string aqui. Use esse valor ao configurar o webhook no painel da Meta.
          </p>
        </div>

        {/* Webhook URL (read-only) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Callback URL do Webhook (Meta)</Label>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-muted border border-border rounded px-3 py-2 font-mono truncate max-w-md" data-testid="instagram-webhook-url">
              {webhookUrl}
            </code>
            <button
              onClick={handleCopyWebhook}
              className="p-2 rounded-md border border-border hover:bg-muted transition-colors"
              data-testid="copy-instagram-webhook-url"
            >
              {copiedWebhook ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure essa URL como Callback URL no seu app da Meta.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="save-instagram-api">
          {saving
            ? <><Loader2 size={14} className="animate-spin" />Salvando...</>
            : <><Save size={14} />Salvar</>}
        </Button>
      </div>
    </div>
  );
}

function Accordion({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-heading font-semibold flex items-center gap-2">
          <Icon size={16} />
          {title}
        </span>
        {open ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
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
        <WhatsAppWebhookSection />
        <MeetingWebhookSection />
        <InstagramApiSection />
        <ApiKeysSection />
      </Accordion>
    </div>
  );
}
