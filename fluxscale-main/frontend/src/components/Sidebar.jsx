import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

const navItems = [
  { label: "Dashboard",    icon: LayoutDashboard, href: "/dashboard",       testId: "nav-dashboard" },
  {
    label: "Comercial", icon: Kanban, testId: "nav-comercial",
    children: [
      { label: "Leads",    href: "/comercial/leads",    testId: "nav-leads" },
      { label: "Pipeline", href: "/comercial/pipeline", testId: "nav-pipeline" },
    ],
  },
  { label: "Clientes",     icon: Users,           href: "/clientes",        testId: "nav-clientes" },
  { label: "Financeiro",   icon: DollarSign,      href: "/financeiro",      testId: "nav-financeiro" },
  { label: "Operacional",  icon: ClipboardList,   href: "/operacional",     testId: "nav-operacional" },
  { label: "Conteúdo",     icon: Image,           href: "/conteudo",        testId: "nav-conteudo" },
  { label: "WhatsApp",     icon: MessageCircle,   href: "/whatsapp",        testId: "nav-whatsapp" },
  { label: "RH",           icon: UserCog,         href: "/rh",              testId: "nav-rh" },
  { label: "Configurações",icon: Settings,        href: "/configuracoes",   testId: "nav-configuracoes" },
];

function NavItem({ item, onClose }) {
  const [open, setOpen] = useState(true);

  if (item.children) {
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
            {item.children.map(child => (
              <NavLink
                key={child.href}
                to={child.href}
                onClick={onClose}
                data-testid={child.testId}
                className={({ isActive }) =>
                  cn(
                    "nav-item",
                    isActive && "nav-item-active"
                  )
                }
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
        {navItems.map(item => (
          <NavItem key={item.testId} item={item} onClose={onClose} />
        ))}
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
