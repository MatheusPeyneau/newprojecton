import React, { useState, useEffect } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import RichTextNode from "./RichTextNode";
import { FaFacebookF, FaInstagram, FaYoutube, FaWhatsapp, FaLinkedinIn, FaPhone, FaDesktop, FaShoppingCart, FaMousePointer, FaPencilAlt, FaFont, FaCreditCard, FaArrowCircleUp, FaArrowCircleDown, FaHeart, FaPlayCircle, FaCalendarAlt, FaRobot, FaTag, FaLock, FaEnvelope, FaUserFriends } from "react-icons/fa";
import { SiTiktok, SiGmail, SiGoogleads } from "react-icons/si";
import { MdDynamicForm, MdWebhook, MdSms } from "react-icons/md";

// ─── Definições da paleta ─────────────────────────────────────────────────────

export const NODE_DEFS = [
  // Redes Sociais / Tráfego
  { type: "tiktok",     label: "TikTok",       Icon: SiTiktok,        bg: "#010101", category: "Tráfego" },
  { type: "facebook",   label: "Facebook Ads", Icon: FaFacebookF,     bg: "#1877f2", category: "Tráfego" },
  { type: "instagram",  label: "Instagram",    Icon: FaInstagram,     bg: "#e1306c", category: "Tráfego" },
  { type: "youtube",    label: "YouTube",      Icon: FaYoutube,       bg: "#ff0000", category: "Tráfego" },
  { type: "linkedin",   label: "LinkedIn",     Icon: FaLinkedinIn,    bg: "#0a66c2", category: "Tráfego" },
  { type: "google",    label: "Google Ads",   Icon: SiGoogleads,     bg: "#4285f4", category: "Tráfego" },
  // Comunicação
  { type: "whatsapp",   label: "WhatsApp",     Icon: FaWhatsapp,      bg: "#25d366", category: "Comunicação" },
  { type: "gmail",      label: "Gmail",        Icon: SiGmail,         bg: "#ea4335", category: "Comunicação" },
  { type: "telefone",   label: "Telefone",     Icon: FaPhone,         bg: "#16a34a", category: "Comunicação" },
  // Etapas do Funil
  { type: "landing",      label: "Landing Page",   Icon: FaDesktop,         bg: "#6366f1", category: "Funil" },
  { type: "vsl",          label: "VSL / Vídeo",    Icon: FaPlayCircle,      bg: "#7c3aed", category: "Funil" },
  { type: "clique",       label: "Clique / CTA",   Icon: FaMousePointer,    bg: "#3b82f6", category: "Funil" },
  { type: "forms",        label: "Formulário",     Icon: MdDynamicForm,     bg: "#0891b2", category: "Funil" },
  { type: "oferta",       label: "Oferta",         Icon: FaTag,             bg: "#f59e0b", category: "Funil" },
  { type: "checkout",     label: "Checkout",       Icon: FaCreditCard,      bg: "#15803d", category: "Funil" },
  { type: "purchase",     label: "Compra",         Icon: FaShoppingCart,    bg: "#166534", category: "Funil" },
  { type: "upsell",       label: "Upsell",         Icon: FaArrowCircleUp,   bg: "#059669", category: "Funil" },
  { type: "downsell",     label: "Downsell",       Icon: FaArrowCircleDown, bg: "#7c3aed", category: "Funil" },
  { type: "obrigado",     label: "Pg. Obrigado",   Icon: FaHeart,           bg: "#e11d48", category: "Funil" },
  { type: "membros",      label: "Área de Membros",Icon: FaLock,            bg: "#4f46e5", category: "Funil" },
  { type: "agendamento",  label: "Agendamento",    Icon: FaCalendarAlt,     bg: "#0284c7", category: "Funil" },
  { type: "chatbot",      label: "Chatbot",        Icon: FaRobot,           bg: "#374151", category: "Funil" },
  { type: "comunidade",   label: "Comunidade",     Icon: FaUserFriends,     bg: "#9333ea", category: "Funil" },
  { type: "webhook",      label: "Webhook",        Icon: MdWebhook,         bg: "#f97316", category: "Funil" },
  // Comunicação extra
  { type: "sms",          label: "SMS",            Icon: MdSms,             bg: "#16a34a", category: "Comunicação" },
  { type: "newsletter",   label: "Newsletter",     Icon: FaEnvelope,        bg: "#ea4335", category: "Comunicação" },
  // Personalizado
  { type: "text",         label: "Texto",          Icon: FaFont,            bg: "#374151", category: "Personalizado" },
  { type: "custom",       label: "Personalizado",  Icon: FaPencilAlt,       bg: "#64748b", category: "Personalizado" },
];

// ─── Estilos compartilhados de handle ────────────────────────────────────────

const handleStyle = { background: "#94a3b8", width: 10, height: 10, border: "2px solid #fff" };

// ─── Nó circular base ─────────────────────────────────────────────────────────

function CircleNode({ data, Icon, bg, defaultLabel }) {
  const hasImage = Boolean(data.imageB64);

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: 80, paddingTop: 6, paddingBottom: 6 }}>
      {/* Handle topo */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ ...handleStyle, top: 0 }}
      />
      {/* Handle esquerda */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ ...handleStyle, left: -5, top: "50%", transform: "translateY(-50%)" }}
      />
      {/* Handle direita */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...handleStyle, right: -5, top: "50%", transform: "translateY(-50%)" }}
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

      {/* Handle base */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ ...handleStyle, bottom: 0 }}
      />
    </div>
  );
}

// ─── Nó especial: Landing Page com preview de site ────────────────────────────

function LandingPageNode({ data }) {
  const url = data.url || "";
  const [screenshotUrl, setScreenshotUrl] = useState("");

  useEffect(() => {
    if (!url) {
      setScreenshotUrl("");
      return;
    }
    const t = setTimeout(() => {
      setScreenshotUrl(
        `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`
      );
    }, 800);
    return () => clearTimeout(t);
  }, [url]);

  return (
    <div style={{ position: "relative", width: 200 }}>
      {/* 4 handles */}
      <Handle type="source" position={Position.Top}    id="top"    style={{ ...handleStyle }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...handleStyle }} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ ...handleStyle }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ ...handleStyle }} />

      {/* Barra de browser */}
      <div
        style={{
          background: "#e5e7eb",
          borderRadius: "8px 8px 0 0",
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          gap: 4,
          boxShadow: "0 -1px 0 0 #d1d5db",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0 }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block", flexShrink: 0 }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 4,
            padding: "2px 6px",
            fontSize: 9,
            color: "#6b7280",
            marginLeft: 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            border: "1px solid #e5e7eb",
          }}
        >
          {url || "https://..."}
        </div>
      </div>

      {/* Área de preview */}
      <div
        style={{
          width: 200,
          height: 120,
          background: "#f3f4f6",
          borderRadius: "0 0 8px 8px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #e5e7eb",
          borderTop: "none",
        }}
      >
        {screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt="preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div
          style={{
            display: screenshotUrl ? "none" : "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            fontSize: 10,
            textAlign: "center",
            padding: "0 16px",
            gap: 4,
          }}
        >
          <FaDesktop size={20} color="#c4b5fd" />
          <span>{url ? "Carregando preview..." : "Adicione uma URL no painel"}</span>
        </div>
      </div>

      {/* Label */}
      <span
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 11,
          fontWeight: 500,
          color: "#374151",
          textAlign: "center",
        }}
      >
        {data.label || "Landing Page"}
      </span>
    </div>
  );
}

// ─── Nó de imagem redimensionável ────────────────────────────────────────────

function ImageNode({ data, selected }) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <NodeResizer
        isVisible={selected}
        minWidth={60}
        minHeight={40}
        lineStyle={{ border: "2px solid #3b82f6" }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: "#fff", border: "2px solid #3b82f6" }}
      />
      <Handle type="source" position={Position.Top}    id="top"    style={{ ...handleStyle }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...handleStyle }} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ ...handleStyle, left: -5, top: "50%", transform: "translateY(-50%)" }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ ...handleStyle, right: -5, top: "50%", transform: "translateY(-50%)" }} />
      {data.imageB64 ? (
        <img
          src={`data:${data.imageType || "image/png"};base64,${data.imageB64}`}
          alt={data.label || "imagem"}
          style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", borderRadius: 4, pointerEvents: "none" }}
          draggable={false}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#f3f4f6", borderRadius: 4,
          border: "2px dashed #d1d5db",
        }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>Sem imagem</span>
        </div>
      )}
    </div>
  );
}

// TextNode is now RichTextNode (imported above)

// ─── Geração automática de nodeTypes ─────────────────────────────────────────

const SPECIAL_TYPES = new Set(["landing", "text", "image"]);

const genericNodeTypes = Object.fromEntries(
  NODE_DEFS.filter((d) => !SPECIAL_TYPES.has(d.type)).map(({ type, label, Icon, bg }) => [
    type,
    function GeneratedNode({ data }) {
      return <CircleNode data={data} Icon={Icon} bg={bg} defaultLabel={label} />;
    },
  ])
);

export const nodeTypes = {
  landing: LandingPageNode,
  text: RichTextNode,
  image: ImageNode,
  ...genericNodeTypes,
};
