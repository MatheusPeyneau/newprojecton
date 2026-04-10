import React from "react";
import { Handle, Position } from "@xyflow/react";

// ─── Paleta de tipos ─────────────────────────────────────────────────────────

export const NODE_DEFS = [
  { type: "landingPage", label: "Landing Page",       icon: "🖥️",  color: "blue"   },
  { type: "optin",       label: "Opt-in / Captura",   icon: "📋",  color: "green"  },
  { type: "salesPage",   label: "Página de Vendas",   icon: "💰",  color: "purple" },
  { type: "checkout",    label: "Checkout",            icon: "🛒",  color: "orange" },
  { type: "orderBump",   label: "Order Bump",          icon: "➕",  color: "yellow" },
  { type: "upsell",      label: "Upsell / Downsell",  icon: "📈",  color: "pink"   },
  { type: "thankYou",    label: "Página de Obrigado", icon: "🎉",  color: "gray"   },
  { type: "image",       label: "Imagem",              icon: "🖼️",  color: "indigo" },
];

// Mapa de cor → classes Tailwind (estático para evitar purge)
const COLOR_CLASSES = {
  blue:   { border: "border-blue-400",   bg: "bg-blue-50",   text: "text-blue-700",   header: "bg-blue-400"   },
  green:  { border: "border-green-400",  bg: "bg-green-50",  text: "text-green-700",  header: "bg-green-400"  },
  purple: { border: "border-purple-400", bg: "bg-purple-50", text: "text-purple-700", header: "bg-purple-400" },
  orange: { border: "border-orange-400", bg: "bg-orange-50", text: "text-orange-700", header: "bg-orange-400" },
  yellow: { border: "border-yellow-400", bg: "bg-yellow-50", text: "text-yellow-700", header: "bg-yellow-400" },
  pink:   { border: "border-pink-400",   bg: "bg-pink-50",   text: "text-pink-700",   header: "bg-pink-400"   },
  gray:   { border: "border-gray-400",   bg: "bg-gray-50",   text: "text-gray-700",   header: "bg-gray-400"   },
  indigo: { border: "border-indigo-400", bg: "bg-indigo-50", text: "text-indigo-700", header: "bg-indigo-400" },
};

// ─── Componente base de nó ────────────────────────────────────────────────────

function BaseNode({ data, color, icon, defaultLabel, children }) {
  const c = COLOR_CLASSES[color] || COLOR_CLASSES.gray;
  const selected = data.selected;
  return (
    <div
      className={`rounded-xl border-2 ${c.border} ${c.bg} shadow-md min-w-[160px] transition-shadow ${
        selected ? "shadow-lg ring-2 ring-offset-1 ring-blue-400" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className={`${c.header} rounded-t-[10px] px-3 py-1.5 flex items-center gap-2`}>
        <span className="text-base leading-none">{icon}</span>
        <span className="text-xs font-semibold text-white truncate">
          {data.label || defaultLabel}
        </span>
      </div>
      {children && <div className="px-3 py-2">{children}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

// ─── Nó de Imagem ────────────────────────────────────────────────────────────

function ImageNode({ data }) {
  const c = COLOR_CLASSES.indigo;
  return (
    <div
      className={`rounded-xl border-2 ${c.border} ${c.bg} shadow-md min-w-[160px] transition-shadow`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className={`${c.header} rounded-t-[10px] px-3 py-1.5 flex items-center gap-2`}>
        <span className="text-base leading-none">🖼️</span>
        <span className="text-xs font-semibold text-white truncate">
          {data.label || "Imagem"}
        </span>
      </div>
      <div className="px-3 py-2">
        {data.imageB64 ? (
          <img
            src={`data:${data.imageType || "image/png"};base64,${data.imageB64}`}
            alt="preview"
            className="w-full h-20 object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-20 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-indigo-300 text-indigo-400">
            <span className="text-2xl">📷</span>
            <span className="text-[10px] mt-1">Clique para enviar</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

// ─── Nós simples (usam BaseNode) ─────────────────────────────────────────────

const make = (color, defaultLabel, icon) =>
  function CustomNode({ data }) {
    return <BaseNode data={data} color={color} icon={icon} defaultLabel={defaultLabel} />;
  };

export const nodeTypes = {
  landingPage: make("blue",   "Landing Page",       "🖥️"),
  optin:       make("green",  "Opt-in / Captura",   "📋"),
  salesPage:   make("purple", "Página de Vendas",   "💰"),
  checkout:    make("orange", "Checkout",            "🛒"),
  orderBump:   make("yellow", "Order Bump",          "➕"),
  upsell:      make("pink",   "Upsell / Downsell",  "📈"),
  thankYou:    make("gray",   "Página de Obrigado", "🎉"),
  image:       ImageNode,
};
