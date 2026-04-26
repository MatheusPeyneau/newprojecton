import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, GitBranch, Trash2, Edit2, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("fluxscale.token")}`,
});

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function FunilList() {
  const navigate = useNavigate();
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/funnels`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setFunnels(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleNew = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/funnels`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: "Novo Funil", flow_data: {} }),
      });
      const data = await res.json();
      navigate(`/funil/${data.funnel_id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Excluir este funil?")) return;
    setDeletingId(id);
    try {
      await fetch(`${API}/api/funnels/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setFunnels((prev) => prev.filter((f) => f.funnel_id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Funis de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crie e visualize funis com drag-and-drop
          </p>
        </div>
        <button
          onClick={handleNew}
          disabled={creating}
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Novo Funil
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      ) : funnels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GitBranch size={40} className="text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum funil criado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em "Novo Funil" para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map((f) => {
            const nodeCount = f.flow_data?.nodes?.length || 0;
            return (
              <div
                key={f.funnel_id}
                onClick={() => navigate(`/funil/${f.funnel_id}`)}
                className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GitBranch size={18} className="text-primary" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/funil/${f.funnel_id}`); }}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(f.funnel_id, e)}
                      disabled={deletingId === f.funnel_id}
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      {deletingId === f.funnel_id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground text-sm leading-snug mb-1 truncate">
                  {f.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {nodeCount} {nodeCount === 1 ? "etapa" : "etapas"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Atualizado em {fmtDate(f.updated_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
