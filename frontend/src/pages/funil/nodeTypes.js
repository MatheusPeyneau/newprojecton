import React from "react";
import { Handle, Position } from "@xyflow/react";

// ─── Definições da paleta ─────────────────────────────────────────────────────

export const NODE_DEFS = [
  // Tráfego / Fontes
  { type: "organic",      label: "Orgânico",        emoji: "🌐", bg: "#34a853", category: "Tráfego" },
  { type: "facebook",     label: "Facebook Ads",    emoji: "📘", bg: "#1877f2", category: "Tráfego" },
  { type: "google",       label: "Google Ads",      emoji: "🎯", bg: "#ea4335", category: "Tráfego" },
  { type: "linkedin",     label: "LinkedIn",        emoji: "💼", bg: "#0a66c2", category: "Tráfego" },
  { type: "referral",     label: "Referral",        emoji: "🔗", bg: "#f59e0b", category: "Tráfego" },
  { type: "email_in",     label: "Email Outreach",  emoji: "📧", bg: "#8b5cf6", category: "Tráfego" },
  // Etapas / Ações
  { type: "landing",      label: "Landing Page",    emoji: "🖥️", bg: "#3b82f6", category: "Etapas" },
  { type: "form",         label: "Formulário",      emoji: "📋", bg: "#06b6d4", category: "Etapas" },
  { type: "automation",   label: "Automação",       emoji: "⚡", bg: "#f97316", category: "Etapas" },
  { type: "newsletter",   label: "Newsletter",      emoji: "📰", bg: "#6366f1", category: "Etapas" },
  { type: "email_seq",    label: "Seq. de Email",   emoji: "✉️",  bg: "#7c3aed", category: "Etapas" },
  // Conversão
  { type: "meeting",      label: "Reunião",         emoji: "📅", bg: "#0891b2", category: "Conversão" },
  { type: "phone",        label: "Ligação",         emoji: "📞", bg: "#16a34a", category: "Conversão" },
  { type: "purchase",     label: "Compra",          emoji: "💰", bg: "#15803d", category: "Conversão" },
  // Personalizado
  { type: "custom",       label: "Personalizado",   emoji: "✏️",  bg: "#64748b", category: "Personalizado" },
];

// ─── Nó circular base ─────────────────────────────────────────────────────────

function CircleNode({ data, emoji, bg, defaultLabel }) {
  const hasImage = Boolean(data.imageB64);

  return (
    <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#94a3b8", width: 8, height: 8, top: -4 }}
      />

      <div
        className="flex items-center justify-center rounded-full shadow-lg border-2 border-white"
        style={{
          width: 56,
          height: 56,
          background: hasImage ? "#fff" : bg,
          overflow: "hidden",
        }}
      >
        {hasImage ? (
          <img
            src={`data:${data.imageType || "image/png"};base64,${data.imageB64}`}
            alt="icon"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 24, lineHeight: 1 }}>{emoji}</span>
        )}
      </div>

      <span
        className="text-center font-medium leading-tight mt-1.5"
        style={{
          fontSize: 11,
          color: "#374151",
          maxWidth: 88,
          wordBreak: "break-word",
        }}
      >
        {data.label || defaultLabel}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#94a3b8", width: 8, height: 8, bottom: -4 }}
      />
    </div>
  );
}

// ─── Geração automática de nodeTypes ─────────────────────────────────────────

export const nodeTypes = Object.fromEntries(
  NODE_DEFS.map(({ type, label, emoji, bg }) => [
    type,
    function GeneratedNode({ data }) {
      return (
        <CircleNode
          data={data}
          emoji={emoji}
          bg={bg}
          defaultLabel={label}
        />
      );
    },
  ])
);
