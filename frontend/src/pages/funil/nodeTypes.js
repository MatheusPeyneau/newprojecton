import React from "react";
import { Handle, Position } from "@xyflow/react";
import { FaFacebookF, FaInstagram, FaYoutube, FaWhatsapp, FaLinkedinIn, FaPhone, FaDesktop, FaShoppingCart, FaMousePointer, FaPencilAlt } from "react-icons/fa";
import { SiTiktok, SiGmail } from "react-icons/si";
import { MdDynamicForm, MdWebhook } from "react-icons/md";

// ─── Definições da paleta ─────────────────────────────────────────────────────

export const NODE_DEFS = [
  // Redes Sociais / Tráfego
  { type: "tiktok",     label: "TikTok",       Icon: SiTiktok,        bg: "#010101", category: "Tráfego" },
  { type: "facebook",   label: "Facebook Ads", Icon: FaFacebookF,     bg: "#1877f2", category: "Tráfego" },
  { type: "instagram",  label: "Instagram",    Icon: FaInstagram,     bg: "#e1306c", category: "Tráfego" },
  { type: "youtube",    label: "YouTube",      Icon: FaYoutube,       bg: "#ff0000", category: "Tráfego" },
  { type: "linkedin",   label: "LinkedIn",     Icon: FaLinkedinIn,    bg: "#0a66c2", category: "Tráfego" },
  // Comunicação
  { type: "whatsapp",   label: "WhatsApp",     Icon: FaWhatsapp,      bg: "#25d366", category: "Comunicação" },
  { type: "gmail",      label: "Gmail",        Icon: SiGmail,         bg: "#ea4335", category: "Comunicação" },
  { type: "telefone",   label: "Telefone",     Icon: FaPhone,         bg: "#16a34a", category: "Comunicação" },
  // Etapas do Funil
  { type: "landing",    label: "Landing Page", Icon: FaDesktop,       bg: "#6366f1", category: "Funil" },
  { type: "clique",     label: "Clique",       Icon: FaMousePointer,  bg: "#3b82f6", category: "Funil" },
  { type: "forms",      label: "Forms",        Icon: MdDynamicForm,   bg: "#0891b2", category: "Funil" },
  { type: "webhook",    label: "Webhook",      Icon: MdWebhook,       bg: "#f97316", category: "Funil" },
  { type: "purchase",   label: "Purchase",     Icon: FaShoppingCart,  bg: "#15803d", category: "Funil" },
  // Personalizado
  { type: "custom",     label: "Personalizado",Icon: FaPencilAlt,     bg: "#64748b", category: "Personalizado" },
];

// ─── Nó circular base ─────────────────────────────────────────────────────────

function CircleNode({ data, Icon, bg, defaultLabel }) {
  const hasImage = Boolean(data.imageB64);

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: 80, paddingTop: 6, paddingBottom: 6 }}>
      {/* Handle de entrada — topo */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#94a3b8", width: 10, height: 10, border: "2px solid #fff", top: 0 }}
      />

      {/* Círculo com ícone */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: hasImage ? "#fff" : bg,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          border: "2px solid #fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {hasImage ? (
          <img
            src={`data:${data.imageType || "image/png"};base64,${data.imageB64}`}
            alt="icon"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Icon size={22} color="white" />
        )}
      </div>

      {/* Label abaixo */}
      <span
        style={{
          marginTop: 6,
          fontSize: 11,
          fontWeight: 500,
          color: "#374151",
          textAlign: "center",
          maxWidth: 88,
          wordBreak: "break-word",
          lineHeight: 1.3,
        }}
      >
        {data.label || defaultLabel}
      </span>

      {/* Handle de saída — base */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#94a3b8", width: 10, height: 10, border: "2px solid #fff", bottom: 0 }}
      />
    </div>
  );
}

// ─── Geração automática de nodeTypes ─────────────────────────────────────────

export const nodeTypes = Object.fromEntries(
  NODE_DEFS.map(({ type, label, Icon, bg }) => [
    type,
    function GeneratedNode({ data }) {
      return <CircleNode data={data} Icon={Icon} bg={bg} defaultLabel={label} />;
    },
  ])
);
