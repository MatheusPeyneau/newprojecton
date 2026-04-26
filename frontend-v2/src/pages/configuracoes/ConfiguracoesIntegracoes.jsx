import React from "react";
import { useTheme } from "@/lib/theme";
import { Sun, Moon, Globe, Sparkles } from "lucide-react";
import {
  WebhookSection,
  WhatsAppWebhookSection,
  MeetingWebhookSection,
  ApiKeysSection,
  InstagramApiSection,
} from "./Configuracoes";

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
          <Sun size={16} />
          Aparência
        </h2>
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
    </div>
  );
}
