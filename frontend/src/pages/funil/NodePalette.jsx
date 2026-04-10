import React from "react";
import { NODE_DEFS } from "./nodeTypes";

// Agrupa os nós por categoria
const grouped = NODE_DEFS.reduce((acc, def) => {
  if (!acc[def.category]) acc[def.category] = [];
  acc[def.category].push(def);
  return acc;
}, {});

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

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {Object.entries(grouped).map(([category, defs]) => (
          <div key={category}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
              {category}
            </p>
            <div className="space-y-1">
              {defs.map((def) => (
                <div
                  key={def.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, def.type)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-muted cursor-grab active:cursor-grabbing select-none transition-colors"
                >
                  {/* Mini círculo com cor */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm"
                    style={{ background: def.bg }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{def.emoji}</span>
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {def.label}
                  </span>
                </div>
              ))}
            </div>
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
