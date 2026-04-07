import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, ChevronRight, Printer } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const storageKey = (clientId) => `agenciaos_briefing_${clientId}`;

function makeDefault() {
  return {
    projeto: "",
    atend: "",
    // Seção 1
    resp_setup_nome: "", resp_setup_tel: "", resp_setup_email: "",
    resp_ads_nome: "", resp_ads_tel: "", resp_ads_email: "",
    // Seção 2
    acesso_gmn: null, acesso_fb: null, acesso_merchant: null, acesso_website: null,
    // Seção 3
    logomarca: null,
    nome_fantasia: "", categoria: "", endereco: "",
    horario_seg_sex: "", horario_sab: "", horario_dom: "",
    tel_gmb: "", whatsapp_gmb: "", website_gmb: "",
    data_abertura: "",
    descricao_gmb: "",
    redes_sociais: "",
    // Seção 4
    meta_vendas: false, meta_leads: false, meta_trafego: false,
    url_campanha: "",
    produto1: "", produto2: "", produto3: "",
    meses_desafiadores: "", meses_melhores: "",
    classe_social: "", idade: "", genero: "",
    regiao_bairros: false, regiao_cidades: false, regiao_estados: false,
    regiao_quais: "",
    ticket_medio: "", margem_lucro: "",
    roi_atual: "", cpa_atual: "",
    roi_medio: "", roi_bom: "", roi_otimo: "",
    cpa_medio: "", cpa_bom: "", cpa_otimo: "",
    leads_mensais: "", compradores_mensais: "",
    faturamento_mensal: "",
    diferencial: "",
    orcamento_1500: false, orcamento_3000: false,
    orcamento_5000: false, orcamento_outros: false,
    orcamento_outros_val: "",
  };
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function InlineField({ label, value, onChange, placeholder = "", type = "text", className = "" }) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      {label && <span className="text-xs font-medium text-gray-500 whitespace-nowrap shrink-0 print:text-gray-700">{label}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || (label ? `${label}...` : "—")}
        className="flex-1 min-w-0 text-sm text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-300 focus:border-gray-500 focus:outline-none pb-0.5 placeholder:text-gray-300 print:border-gray-400"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder = "", rows = 3 }) {
  return (
    <div>
      {label && <p className="text-xs font-medium text-gray-500 mb-1 print:text-gray-700">{label}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-sm text-gray-800 bg-gray-50 rounded border border-dashed border-gray-200 focus:border-gray-400 focus:outline-none p-2 resize-none placeholder:text-gray-300 print:bg-white print:border-gray-400"
      />
    </div>
  );
}

function SimNao({ value, onChange }) {
  return (
    <span className="inline-flex gap-3">
      {["SIM", "NÃO"].map((opt) => (
        <label key={opt} className="inline-flex items-center gap-1 cursor-pointer select-none">
          <span
            onClick={() => onChange(opt)}
            className={`w-4 h-4 border rounded-sm flex items-center justify-center text-[10px] transition-colors cursor-pointer ${
              value === opt
                ? "bg-gray-800 border-gray-800 text-white"
                : "border-gray-300 hover:border-gray-500"
            }`}
          >
            {value === opt && "✓"}
          </span>
          <span className="text-sm text-gray-700">{opt}</span>
        </label>
      ))}
    </span>
  );
}

function CheckOpt({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
      <span
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 border rounded-sm flex items-center justify-center text-[10px] transition-colors cursor-pointer ${
          checked ? "bg-gray-800 border-gray-800 text-white" : "border-gray-300 hover:border-gray-500"
        }`}
      >
        {checked && "✓"}
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function Section({ num, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left group mb-3 print:pointer-events-none"
      >
        <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-600 group-hover:bg-gray-200 transition-colors">
          {num}
        </span>
        <span className="text-sm font-semibold text-gray-800 tracking-wide uppercase">{title}</span>
        <span className="text-gray-400 ml-auto print:hidden">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && <div className="pl-8 space-y-4">{children}</div>}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {label && <span className="text-xs text-gray-500 w-full print:text-gray-700">{label}</span>}
      {children}
    </div>
  );
}

function SubLabel({ children }) {
  return <p className="text-xs font-semibold text-gray-500 mt-3 mb-1 uppercase tracking-wider print:text-gray-600">{children}</p>;
}

function Divider() {
  return <hr className="border-dashed border-gray-200 my-4" />;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ClientBriefing({ clientId, clientName, onClose }) {
  const [d, setD] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(clientId));
      if (saved) return { ...makeDefault(), ...JSON.parse(saved) };
    } catch {}
    return { ...makeDefault(), projeto: clientName || "" };
  });

  // Auto-save
  useEffect(() => {
    localStorage.setItem(storageKey(clientId), JSON.stringify(d));
  }, [d, clientId]);

  const set = useCallback((field) => (val) => setD((prev) => ({ ...prev, [field]: val })), []);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 print:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col print:static print:shadow-none print:max-w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 print:hidden">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Briefing</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2.5 py-1.5 transition-colors"
            >
              <Printer size={13} /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 print:overflow-visible">

          {/* Header */}
          <div className="mb-8">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 print:text-gray-500">
              Briefing de Cliente
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-bold text-gray-700 w-16 shrink-0">PROJETO:</span>
                <input
                  value={d.projeto}
                  onChange={(e) => set("projeto")(e.target.value)}
                  placeholder="Nome do projeto..."
                  className="flex-1 text-base font-semibold text-gray-900 bg-transparent border-0 border-b border-dashed border-gray-300 focus:border-gray-600 focus:outline-none pb-0.5 placeholder:text-gray-300"
                />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-bold text-gray-700 w-16 shrink-0">ATEND.:</span>
                <input
                  value={d.atend}
                  onChange={(e) => set("atend")(e.target.value)}
                  placeholder="Nome do atendente..."
                  className="flex-1 text-sm text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-300 focus:border-gray-600 focus:outline-none pb-0.5 placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>

          {/* ── 1. RESPONSÁVEIS ── */}
          <Section num="1" title="Responsáveis">
            <div>
              <SubLabel>Conteúdos adicionais / Dúvidas no SETUP Inicial</SubLabel>
              <div className="grid grid-cols-1 gap-2">
                <InlineField label="Nome" value={d.resp_setup_nome} onChange={set("resp_setup_nome")} />
                <InlineField label="Telefone" value={d.resp_setup_tel} onChange={set("resp_setup_tel")} />
                <InlineField label="E-mail" value={d.resp_setup_email} onChange={set("resp_setup_email")} />
              </div>
            </div>
            <Divider />
            <div>
              <SubLabel>Aprovação da campanha Google Ads</SubLabel>
              <div className="grid grid-cols-1 gap-2">
                <InlineField label="Nome" value={d.resp_ads_nome} onChange={set("resp_ads_nome")} />
                <InlineField label="Telefone" value={d.resp_ads_tel} onChange={set("resp_ads_tel")} />
                <InlineField label="E-mail" value={d.resp_ads_email} onChange={set("resp_ads_email")} />
              </div>
            </div>
          </Section>

          {/* ── 2. ACESSOS ── */}
          <Section num="2" title="Acessos de Contas">
            {[
              { key: "acesso_gmn", label: "2.1 Acesso à conta GMN" },
              { key: "acesso_fb", label: "2.2 Acesso ao Facebook Ads" },
              { key: "acesso_merchant", label: "2.3 Acesso ao Merchant Center" },
              { key: "acesso_website", label: "2.4 Login e senha do website" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4">
                <span className="text-sm text-gray-700 flex-1">{label}</span>
                <SimNao value={d[key]} onChange={set(key)} />
              </div>
            ))}
          </Section>

          {/* ── 3. GOOGLE MEU NEGÓCIO ── */}
          <Section num="3" title="Google Meu Negócio">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 flex-1">3.1 Logomarca e 10 fotos</span>
              <SimNao value={d.logomarca} onChange={set("logomarca")} />
            </div>

            <Divider />
            <SubLabel>3.2 Dados do Estabelecimento</SubLabel>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">A) Identificação</p>
              <div className="space-y-2">
                <InlineField label="Nome Fantasia" value={d.nome_fantasia} onChange={set("nome_fantasia")} />
                <InlineField label="Categoria" value={d.categoria} onChange={set("categoria")} />
                <InlineField label="Endereço" value={d.endereco} onChange={set("endereco")} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">B) Horário</p>
              <div className="space-y-2">
                <InlineField label="Seg–Sex" value={d.horario_seg_sex} onChange={set("horario_seg_sex")} placeholder="ex: 08:00 às 18:00" />
                <InlineField label="Sábado" value={d.horario_sab} onChange={set("horario_sab")} />
                <InlineField label="Domingo" value={d.horario_dom} onChange={set("horario_dom")} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">C) Contato</p>
              <div className="space-y-2">
                <InlineField label="Telefone" value={d.tel_gmb} onChange={set("tel_gmb")} />
                <InlineField label="WhatsApp" value={d.whatsapp_gmb} onChange={set("whatsapp_gmb")} />
                <InlineField label="Website" value={d.website_gmb} onChange={set("website_gmb")} />
              </div>
            </div>

            <InlineField label="D) Data de Abertura" value={d.data_abertura} onChange={set("data_abertura")} placeholder="dd/mm/aaaa" />
            <TextArea label="E) Descrição" value={d.descricao_gmb} onChange={set("descricao_gmb")} rows={3} />
            <TextArea label="F) Redes Sociais" value={d.redes_sociais} onChange={set("redes_sociais")} placeholder="Instagram, Facebook, LinkedIn..." rows={2} />
          </Section>

          {/* ── 4. MARKETING ── */}
          <Section num="4" title="Marketing e Desenvolvimento">

            <Row label="4.1 Meta da campanha">
              <CheckOpt label="Vendas" checked={d.meta_vendas} onChange={set("meta_vendas")} />
              <CheckOpt label="Leads" checked={d.meta_leads} onChange={set("meta_leads")} />
              <CheckOpt label="Tráfego" checked={d.meta_trafego} onChange={set("meta_trafego")} />
            </Row>

            <InlineField label="4.2 URL da campanha" value={d.url_campanha} onChange={set("url_campanha")} placeholder="https://..." />

            <div>
              <p className="text-xs text-gray-500 mb-2">4.3 Principais produtos / serviços</p>
              <div className="space-y-2">
                {["produto1", "produto2", "produto3"].map((k, i) => (
                  <InlineField key={k} label={`${i + 1}.`} value={d[k]} onChange={set(k)} placeholder="Produto ou serviço..." />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">4.4 Sazonalidade</p>
              <div className="space-y-2">
                <InlineField label="Meses desafiadores" value={d.meses_desafiadores} onChange={set("meses_desafiadores")} placeholder="Jan, Fev..." />
                <InlineField label="Meses melhores" value={d.meses_melhores} onChange={set("meses_melhores")} placeholder="Nov, Dez..." />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">4.5 Público-alvo</p>
              <div className="space-y-2">
                <InlineField label="Classe Social" value={d.classe_social} onChange={set("classe_social")} placeholder="A, B, C..." />
                <InlineField label="Idade" value={d.idade} onChange={set("idade")} placeholder="ex: 25–45 anos" />
                <InlineField label="Gênero" value={d.genero} onChange={set("genero")} placeholder="M / F / Todos" />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">4.6 Regiões de interesse</p>
              <div className="flex flex-wrap gap-3 mb-2">
                <CheckOpt label="Bairros" checked={d.regiao_bairros} onChange={set("regiao_bairros")} />
                <CheckOpt label="Cidades" checked={d.regiao_cidades} onChange={set("regiao_cidades")} />
                <CheckOpt label="Estados" checked={d.regiao_estados} onChange={set("regiao_estados")} />
              </div>
              <InlineField label="Quais:" value={d.regiao_quais} onChange={set("regiao_quais")} placeholder="Liste as regiões..." />
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">4.7 Valores</p>
              <div className="space-y-2">
                <InlineField label="Ticket Médio" value={d.ticket_medio} onChange={set("ticket_medio")} placeholder="R$ 0,00" />
                <InlineField label="Margem de Lucro" value={d.margem_lucro} onChange={set("margem_lucro")} placeholder="%" />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">4.8 Métricas</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <InlineField label="ROI Atual" value={d.roi_atual} onChange={set("roi_atual")} />
                <InlineField label="CPA Atual" value={d.cpa_atual} onChange={set("cpa_atual")} />
                <InlineField label="ROI Médio" value={d.roi_medio} onChange={set("roi_medio")} />
                <InlineField label="CPA Médio" value={d.cpa_medio} onChange={set("cpa_medio")} />
                <InlineField label="ROI Bom" value={d.roi_bom} onChange={set("roi_bom")} />
                <InlineField label="CPA Bom" value={d.cpa_bom} onChange={set("cpa_bom")} />
                <InlineField label="ROI Ótimo" value={d.roi_otimo} onChange={set("roi_otimo")} />
                <InlineField label="CPA Ótimo" value={d.cpa_otimo} onChange={set("cpa_otimo")} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">4.9 Volume mensal</p>
              <div className="space-y-2">
                <InlineField label="Leads" value={d.leads_mensais} onChange={set("leads_mensais")} placeholder="Qtd de leads por mês" />
                <InlineField label="Compradores" value={d.compradores_mensais} onChange={set("compradores_mensais")} placeholder="Qtd de compradores por mês" />
              </div>
            </div>

            <InlineField label="4.10 Faturamento mensal" value={d.faturamento_mensal} onChange={set("faturamento_mensal")} placeholder="R$ 0,00" />

            <TextArea label="4.11 Diferencial / Autoridade" value={d.diferencial} onChange={set("diferencial")} placeholder="O que diferencia este cliente da concorrência?" rows={3} />

            <div>
              <p className="text-xs text-gray-500 mb-2">4.12 Orçamento 1º mês</p>
              <div className="flex flex-wrap gap-3 mb-2">
                <CheckOpt label="R$ 1.500" checked={d.orcamento_1500} onChange={set("orcamento_1500")} />
                <CheckOpt label="R$ 3.000" checked={d.orcamento_3000} onChange={set("orcamento_3000")} />
                <CheckOpt label="R$ 5.000" checked={d.orcamento_5000} onChange={set("orcamento_5000")} />
                <CheckOpt label="Outros" checked={d.orcamento_outros} onChange={set("orcamento_outros")} />
              </div>
              {d.orcamento_outros && (
                <InlineField label="Valor:" value={d.orcamento_outros_val} onChange={set("orcamento_outros_val")} placeholder="R$ ..." />
              )}
            </div>

          </Section>

          <div className="h-8" />
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(.briefing-print-root) { display: none !important; }
          .print\\:hidden { display: none !important; }
          .fixed { position: static !important; }
          .overflow-y-auto { overflow: visible !important; }
          .shadow-2xl { box-shadow: none !important; }
          .max-w-2xl { max-width: 100% !important; }
          .bg-black\\/40 { display: none !important; }
        }
      `}</style>
    </>
  );
}
