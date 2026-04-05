import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Kanban,
  DollarSign,
  Image,
  ClipboardList,
  UserCog,
  MessageCircle,
  Settings,
  X,
  ChevronDown,
  Building2,
  ShieldCheck,
} from "lucide-react";

const allNavItems = [
  { label: "Dashboard",    icon: LayoutDashboard, href: "/dashboard",       testId: "nav-dashboard",     module: null },
  {
    label: "Comercial", icon: Kanban, testId: "nav-comercial", module: null,
    children: [
      { label: "Leads",    href: "/comercial/leads",    testId: "nav-leads",    module: "leads" },
      { label: "Pipeline", href: "/comercial/pipeline", testId: "nav-pipeline", module: "pipeline" },
    ],
  },
  { label: "Clientes",     icon: Users,           href: "/clientes",        testId: "nav-clientes",      module: "clientes" },
  { label: "Financeiro",   icon: DollarSign,      href: "/financeiro",      testId: "nav-financeiro",    module: "financeiro" },
  { label: "Operacional",  icon: ClipboardList,   href: "/operacional",     testId: "nav-operacional",   module: "operacional" },
  { label: "Conteúdo",     icon: Image,           href: "/conteudo",        testId: "nav-conteudo",      module: "conteudo" },
  { label: "WhatsApp",     icon: MessageCircle,   href: "/whatsapp",        testId: "nav-whatsapp",      module: "whatsapp" },
  { label: "RH",           icon: UserCog,         href: "/rh",              testId: "nav-rh",            module: "rh" },
  { label: "Configurações",icon: Settings,        href: "/configuracoes",   testId: "nav-configuracoes", module: null },
];

function hasAccess(item, user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!item.module) return true; // Dashboard, Configurações always visible
  const perms = user.permissions || [];
  return perms.includes(item.module);
}

function NavItem({ item, onClose, user }) {
  const [open, setOpen] = useState(true);

  if (item.children) {
    const visibleChildren = item.children.filter(c => hasAccess(c, user));
    if (visibleChildren.length === 0) return null;
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className="nav-item"
          data-testid={item.testId}
          style={{ justifyContent: "flex-start" }}
        >
          <item.icon size={18} strokeWidth={1.75} className="shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            size={14}
            strokeWidth={2}
            style={{ transition: "transform 0.2s ease", transform: open ? "rotate(0deg)" : "rotate(-90deg)", opacity: 0.6 }}
          />
        </button>

        {open && (
          <div
            className="mt-1 ml-4 space-y-0.5"
            style={{ paddingLeft: "12px", borderLeft: "1px solid hsl(var(--sidebar-border))" }}
          >
            {visibleChildren.map(child => (
              <NavLink
                key={child.href}
                to={child.href}
                onClick={onClose}
                data-testid={child.testId}
                className={({ isActive }) => cn("nav-item", isActive && "nav-item-active")}
                style={{ fontSize: "13.5px" }}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!hasAccess(item, user)) return null;

  return (
    <NavLink
      to={item.href}
      onClick={onClose}
      data-testid={item.testId}
      className={({ isActive }) => cn("nav-item", isActive && "nav-item-active")}
    >
      <item.icon size={18} strokeWidth={1.75} className="shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ onClose }) {
  const { user } = useAuth();

  const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
  const isSuperAdmin = user && adminEmails.includes(user.email);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "hsl(var(--sidebar-bg))", borderRight: "1px solid hsl(var(--sidebar-border))" }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between shrink-0 px-5"
        style={{ height: "60px", borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)" }}
          >
            <Building2 size={16} strokeWidth={2} color="#fff" />
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="font-heading font-bold tracking-tight"
              style={{ fontSize: "15px", color: "hsl(var(--foreground))" }}
            >
              AgênciaOS
            </span>
            <span style={{ fontSize: "11px", color: "hsl(var(--sidebar-item-normal-text))", letterSpacing: "0.2px" }}>
              Painel de Gestão
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md"
            style={{ color: "hsl(var(--sidebar-item-normal-text))", transition: "background 0.2s ease" }}
            onMouseEnter={e => e.currentTarget.style.background = "hsl(var(--sidebar-item-hover-bg))"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            data-testid="sidebar-close"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto scrollbar-hidden"
        style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: "2px" }}
      >
        {allNavItems.map(item => (
          <NavItem key={item.testId} item={item} onClose={onClose} user={user} />
        ))}
        {isSuperAdmin && (
          <NavLink
            to="/admin"
            onClick={onClose}
            data-testid="nav-admin"
            className={({ isActive }) => cn("nav-item", isActive && "nav-item-active")}
          >
            <ShieldCheck size={18} strokeWidth={1.75} className="shrink-0" />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div
        className="shrink-0 px-4 py-3 flex items-center gap-2"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span style={{ fontSize: "12px", color: "hsl(var(--sidebar-item-normal-text))", letterSpacing: "0.2px" }}>
          v2.0 — Tudo operacional
        </span>
      </div>
    </div>
  );
}
