import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Settings, Users } from "lucide-react";
import { MembersSection } from "./Configuracoes";

export default function ConfiguracoesMembros() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Área de Membros</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie os membros e permissões da sua organização</p>
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

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-heading font-semibold mb-4 flex items-center gap-2">
          <Users size={16} />
          Membros da Organização
        </h2>
        <MembersSection currentUser={user} />
      </div>
    </div>
  );
}
