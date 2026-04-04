import React, { useState } from "react";
import { DollarSign, CreditCard, FileText, TrendingUp, Clock, BarChart2 } from "lucide-react";
import OKRSheet from "./OKRSheet";

const COMING_SOON_FEATURES = [
  { icon: CreditCard, label: "Cobrança Recorrente", desc: "Automatize cobranças mensais" },
  { icon: FileText, label: "Emissão de Faturas", desc: "Gere faturas profissionais" },
  { icon: TrendingUp, label: "Controle de MRR", desc: "Acompanhe receita mensal" },
  { icon: DollarSign, label: "Gestão de Contratos", desc: "Gerencie contratos de clientes" },
];

export default function Financeiro() {
  const [showOKR, setShowOKR] = useState(false);

  if (showOKR) {
    return <OKRSheet onBack={() => setShowOKR(false)} />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestão financeira completa da sua agência
        </p>
      </div>

      {/* Card OKR — ativo e clicável */}
      <div
        onClick={() => setShowOKR(true)}
        className="bg-card border border-primary/40 rounded-xl p-5 mb-6 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
        data-testid="okr-card"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-md">
            <BarChart2 size={18} className="text-primary" />
          </div>
          <p className="font-semibold text-sm">Planilha OKR</p>
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Disponível</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Mensure resultados de campanhas de tráfego pago e acompanhe OKRs trimestrais com funil de vendas por mês.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-10 text-center mb-6">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-primary" />
        </div>
        <h2 className="text-xl font-heading font-semibold mb-2">Em desenvolvimento</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          O módulo financeiro está sendo desenvolvido e estará disponível em breve com todas as
          funcionalidades de cobrança e controle financeiro.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {COMING_SOON_FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="bg-card border border-border rounded-lg p-5 opacity-60"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-muted rounded-md">
                <feature.icon size={16} className="text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">{feature.label}</p>
            </div>
            <p className="text-xs text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
