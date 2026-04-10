import React from "react";
import { NODE_DEFS } from "./nodeTypes";

const COLOR_ICON_BG = {
  blue:   "bg-blue-100 text-blue-600",
  green:  "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
  yellow: "bg-yellow-100 text-yellow-600",
  pink:   "bg-pink-100 text-pink-600",
  gray:   "bg-gray-100 text-gray-600",
  indigo: "bg-indigo-100 text-indigo-600",
};

export default function NodePalette() {
  const onDragStart = (e, nodeType) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-44 shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-3 py-3 border-b border-border">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Etapas
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {NODE_DEFS.map((def) => (
          <div
            key={def.type}
            draggable
            onDragStart={(e) => onDragStart(e, def.type)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg border border-border bg-background hover:bg-muted cursor-grab active:cursor-grabbing select-none transition-colors"
          >
            <span
              className={`w-7 h-7 rounded-md flex items-center justify-center text-base shrink-0 ${COLOR_ICON_BG[def.color] || COLOR_ICON_BG.gray}`}
            >
              {def.icon}
            </span>
            <span className="text-xs font-medium text-foreground leading-tight">
              {def.label}
            </span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Arraste para o canvas
        </p>
      </div>
    </div>
  );
}
