import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Globe, Sparkles, CreditCard, HardDrive, CalendarDays, FileText, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import {
  WebhookSection,
  WhatsAppWebhookSection,
  MeetingWebhookSection,
  ApiKeysSection,
  InstagramApiSection,
} from "./Configuracoes";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("fluxscale_token")}` };
}

// ─── Asaas Section ─────────────────────────────────────────────────────────────

function AsaasSection() {
  const [apiKey, setApiKey] = useState("");
  const [sandbox, setSandbox] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/asaas`, { headers: authHeader() }).then(r => {
      setMaskedKey(r.data.api_key_masked || "");
      setSandbox(r.data.sandbox ?? true);
      setEnabled(r.data.enabled ?? false);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/asaas`, { api_key: apiKey || maskedKey, sandbox, enabled }, { headers: authHeader() });
      toast.success("Configuração Asaas salva!");
      if (apiKey) { setMaskedKey("•".repeat(Math.max(0, apiKey.length - 4)) + apiKey.slice(-4)); setApiKey(""); }
    } catch { toast.error("Erro ao salvar"); } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await axios.post(`${API}/settings/asaas/test`, {}, { headers: authHeader() });
      toast.success("Conexão com Asaas OK!");
    } catch (e) { toast.error(e.response?.data?.detail || "Erro na conexão"); } finally { setTesting(false); }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4">
      <h2 className="text-sm font-semibold mb-1 flex items-center gap-2"><CreditCard size={16} />Asaas — Cobrança</h2>
      <p className="text-xs text-muted-foreground mb-4">Ao criar um cliente, cadastra no Asaas e gera cobrança automaticamente (boleto/PIX/cartão).</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey || maskedKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="$aact_..."
                className="w-full text-sm border border-border rounded-lg px-3 py-2 pr-9 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={() => setShowKey(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sandbox} onChange={e => setSandbox(e.target.checked)} className="rounded" />
            <span className="text-xs text-muted-foreground">Modo Sandbox (teste)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer ml-4">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="rounded" />
            <span className="text-xs text-muted-foreground">Ativar integração</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors">
            {saving && <Loader2 size={12} className="animate-spin" />} Salvar
          </button>
          <button onClick={handleTest} disabled={testing} className="flex items-center gap-1.5 text-xs border border-border hover:bg-muted px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors">
            {testing && <Loader2 size={12} className="animate-spin" />} Testar conexão
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Google Integration Section ────────────────────────────────────────────────

function GoogleIntegrationSection() {
  const [saJson, setSaJson] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [hasSA, setHasSA] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/google-integration`, { headers: authHeader() }).then(r => {
      setHasSA(r.data.has_service_account);
      setDriveFolderId(r.data.drive_root_folder_id || "");
      setCalendarId(r.data.calendar_id || "primary");
      setDriveEnabled(r.data.drive_enabled ?? false);
      setCalendarEnabled(r.data.calendar_enabled ?? false);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/google-integration`, {
        service_account_json: saJson,
        drive_root_folder_id: driveFolderId,
        calendar_id: calendarId || "primary",
        drive_enabled: driveEnabled,
        calendar_enabled: calendarEnabled,
      }, { headers: authHeader() });
      toast.success("Configuração Google salva!");
      if (saJson) { setHasSA(true); setSaJson(""); setShowJson(false); }
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar"); } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4">
      <h2 className="text-sm font-semibold mb-1 flex items-center gap-2"><HardDrive size={16} />Google — Drive + Calendar</h2>
      <p className="text-xs text-muted-foreground mb-4">Cria pasta no Drive ao cadastrar cliente, gera contrato e agenda reuniões no Calendar. Requer Service Account com permissões de Drive e Calendar.</p>

      <div className="space-y-3">
        {/* Service Account */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">Service Account JSON</label>
            {hasSA && <span className="text-[10px] text-emerald-600 font-medium">✓ Configurada</span>}
          </div>
          {showJson ? (
            <textarea
              value={saJson}
              onChange={e => setSaJson(e.target.value)}
              placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
              rows={6}
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            />
          ) : (
            <button onClick={() => setShowJson(true)} className="text-xs text-primary hover:underline">
              {hasSA ? "Substituir Service Account" : "Colar JSON da Service Account"}
            </button>
          )}
        </div>

        {/* Drive */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">ID da Pasta Raiz no Drive</label>
          <input
            type="text"
            value={driveFolderId}
            onChange={e => setDriveFolderId(e.target.value)}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2..."
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Extraia da URL: drive.google.com/drive/folders/<strong>ID_AQUI</strong></p>
        </div>

        {/* Calendar */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">ID do Calendário Google</label>
          <input
            type="text"
            value={calendarId}
            onChange={e => setCalendarId(e.target.value)}
            placeholder="primary ou email@group.calendar.google.com"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={driveEnabled} onChange={e => setDriveEnabled(e.target.checked)} className="rounded" />
            <span className="text-xs text-muted-foreground">Ativar Drive</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={calendarEnabled} onChange={e => setCalendarEnabled(e.target.checked)} className="rounded" />
            <span className="text-xs text-muted-foreground">Ativar Calendar</span>
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors">
          {saving && <Loader2 size={12} className="animate-spin" />} Salvar
        </button>
      </div>
    </div>
  );
}

// ─── Contract Template Section ─────────────────────────────────────────────────

const DEFAULT_TEMPLATE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{nome}}
CPF/CNPJ: {{cpf_cnpj}}
E-mail: {{email}}
Telefone: {{telefone}}
Empresa: {{empresa}}

CONTRATADA: [Nome da sua agência]

OBJETO: Prestação de serviços de marketing digital.

VALOR MENSAL: {{valor}}

DATA DE INÍCIO: {{data}}

Declaro que li e aceito os termos deste contrato.

_______________________________
Assinatura do Contratante

_______________________________
Assinatura da Contratada`;

function ContractTemplateSection() {
  const [template, setTemplate] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/settings/contract-template`, { headers: authHeader() }).then(r => {
      setTemplate(r.data.template || DEFAULT_TEMPLATE);
      setEnabled(r.data.enabled ?? false);
    }).catch(() => { setTemplate(DEFAULT_TEMPLATE); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/contract-template`, { template, enabled }, { headers: authHeader() });
      toast.success("Template de contrato salvo!");
    } catch { toast.error("Erro ao salvar"); } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4">
      <h2 className="text-sm font-semibold mb-1 flex items-center gap-2"><FileText size={16} />Contrato — Template PDF</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Template do contrato gerado automaticamente ao criar cliente. Variáveis disponíveis:&nbsp;
        <code className="bg-muted px-1 rounded text-[10px]">{"{{nome}}"}</code>&nbsp;
        <code className="bg-muted px-1 rounded text-[10px]">{"{{cpf_cnpj}}"}</code>&nbsp;
        <code className="bg-muted px-1 rounded text-[10px]">{"{{email}}"}</code>&nbsp;
        <code className="bg-muted px-1 rounded text-[10px]">{"{{valor}}"}</code>&nbsp;
        <code className="bg-muted px-1 rounded text-[10px]">{"{{data}}"}</code>&nbsp;
        <code className="bg-muted px-1 rounded text-[10px]">{"{{empresa}}"}</code>
      </p>
      <textarea
        value={template}
        onChange={e => setTemplate(e.target.value)}
        rows={14}
        className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring font-mono mb-3"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="rounded" />
          <span className="text-xs text-muted-foreground">Gerar PDF ao criar cliente (requer Drive ativo)</span>
        </label>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors">
          {saving && <Loader2 size={12} className="animate-spin" />} Salvar template
        </button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function ConfiguracoesIntegracoes() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">Webhooks, chaves de API e aparência</p>
      </div>

      {/* Aparência */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Sun size={16} />Aparência
        </h2>
        <div className="flex gap-3">
          {[{ value: "light", label: "Claro", icon: Sun }, { value: "dark", label: "Escuro", icon: Moon }].map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${theme === t.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
            >
              <t.icon size={15} />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integrações nativas */}
      <AsaasSection />
      <GoogleIntegrationSection />
      <ContractTemplateSection />

      {/* Webhooks N8N (legado) */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Webhooks N8N (legado)</p>
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
      </div>

      <InstagramApiSection />
      <ApiKeysSection />
    </div>
  );
}
