import React, { useState } from "react";
import { DollarSign, CreditCard, FileText, TrendingUp, BarChart2 } from "lucide-react";
import OKRSheet from "./OKRSheet";
import GastosRecorrentes from "./GastosRecorrentes";

const COMING_SOON_FEATURES = [
  { icon: FileText,    label: "Emissão de Faturas",   desc: "Gere faturas profissionais" },
  { icon: TrendingUp,  label: "Controle de MRR",      desc: "Acompanhe receita mensal" },
  { icon: DollarSign,  label: "Gestão de Contratos",  desc: "Gerencie contratos de clientes" },
];

export default function Financeiro() {
  const [view, setView] = useState("home"); // "home" | "okr" | "gastos"

  if (view === "okr")    return <OKRSheet onBack={() => setView("home")} />;
  if (view === "gastos") return <GastosRecorrentes onBack={() => setView("home")} />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestão financeira completa da sua agência
        </p>
      </div>

      {/* Planilha OKR */}
      <div
        onClick={() => setView("okr")}
        className="bg-card border border-primary/40 rounded-xl p-5 mb-4 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
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

      {/* Gastos Recorrentes */}
      <div
        onClick={() => setView("gastos")}
        className="bg-card border border-primary/40 rounded-xl p-5 mb-6 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-md">
            <CreditCard size={18} className="text-red-600 dark:text-red-400" />
          </div>
          <p className="font-semibold text-sm">Gastos Recorrentes</p>
          <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Disponível</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Cadastre e gerencie despesas fixas da empresa. Veja o impacto no dashboard em tempo real.
        </p>
      </div>

      {/* Em breve */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
