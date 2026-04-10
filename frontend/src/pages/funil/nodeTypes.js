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
    <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#94a3b8", width: 8, height: 8, top: -4 }}
      />

      <div
        className="flex items-center justify-center rounded-full border-2 border-white"
        style={{
          width: 56,
          height: 56,
          background: hasImage ? "#fff" : bg,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
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
  NODE_DEFS.map(({ type, label, Icon, bg }) => [
    type,
    function GeneratedNode({ data }) {
      return <CircleNode data={data} Icon={Icon} bg={bg} defaultLabel={label} />;
    },
  ])
);
