import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Users, Briefcase, TrendingUp } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("agenciaos_token")}` };
}

const PLAN_COLORS = {
  free:    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pro:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [edits, setEdits] = useState({});

  const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

  useEffect(() => {
    if (user && !adminEmails.includes(user.email)) {
      navigate("/dashboard");
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/admin/orgs`, { headers: getAuthHeader() });
        setOrgs(res.data);
        const initial = {};
        res.data.forEach(o => { initial[o.org_id] = { plan: o.plan || "free", plan_status: o.plan_status || "active" }; });
        setEdits(initial);
      } catch {
        toast.error("Acesso negado ou erro ao carregar orgs");
        navigate("/dashboard");
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async (org_id) => {
    setSaving(s => ({ ...s, [org_id]: true }));
    try {
      await axios.put(`${API}/admin/orgs/${org_id}`, edits[org_id], { headers: getAuthHeader() });
      toast.success("Org atualizada");
      setOrgs(prev => prev.map(o => o.org_id === org_id ? { ...o, ...edits[org_id] } : o));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao salvar");
    }
    setSaving(s => ({ ...s, [org_id]: false }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck size={22} className="text-primary" />
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Painel Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orgs.length} organizações cadastradas</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Organização</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Plano</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                <Users size={13} className="inline mr-1" />Usuários
              </th>
              <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                <Briefcase size={13} className="inline mr-1" />Clientes
              </th>
              <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                <TrendingUp size={13} className="inline mr-1" />Leads
              </th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Criado em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orgs.map((org, i) => {
              const edit = edits[org.org_id] || {};
              const changed = edit.plan !== org.plan || edit.plan_status !== org.plan_status;
              return (
                <tr key={org.org_id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{org.name || "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{org.org_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={edit.plan || "free"}
                      onChange={e => setEdits(prev => ({ ...prev, [org.org_id]: { ...prev[org.org_id], plan: e.target.value } }))}
                      className={`px-2 py-1 rounded-md text-xs font-medium border-0 cursor-pointer ${PLAN_COLORS[edit.plan || "free"]}`}
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={edit.plan_status || "active"}
                      onChange={e => setEdits(prev => ({ ...prev, [org.org_id]: { ...prev[org.org_id], plan_status: e.target.value } }))}
                      className="px-2 py-1 rounded-md text-xs font-medium border border-border bg-background cursor-pointer"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{org._user_count ?? 0}</td>
                  <td className="px-4 py-3 text-center text-sm">{org._client_count ?? 0}</td>
                  <td className="px-4 py-3 text-center text-sm">{org._lead_count ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {org.created_at ? new Date(org.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {changed && (
                      <Button
                        size="sm"
                        onClick={() => handleSave(org.org_id)}
                        disabled={saving[org.org_id]}
                        className="text-xs h-7"
                      >
                        {saving[org.org_id] ? <Loader2 size={12} className="animate-spin" /> : "Salvar"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orgs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma organização encontrada.</p>
        )}
      </div>
    </div>
  );
}
