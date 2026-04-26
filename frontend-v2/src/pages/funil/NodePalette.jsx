import React, { useRef } from "react";
import { Plus, X } from "lucide-react";
import { NODE_DEFS } from "./nodeTypes";

const grouped = NODE_DEFS.reduce((acc, def) => {
  if (!acc[def.category]) acc[def.category] = [];
  acc[def.category].push(def);
  return acc;
}, {});

export default function NodePalette({ customIcons = [], saveCustomIcon, deleteCustomIcon }) {
  const fileInputRef = useRef(null);

  const onDragStart = (e, nodeType) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragStartCustom = (e, icon) => {
    e.dataTransfer.setData("application/reactflow", "custom");
    e.dataTransfer.setData(
      "application/reactflow-icon",
      JSON.stringify({ imageB64: icon.image_b64, imageType: icon.image_type, label: icon.name })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target.result.split(",")[1];
      const name = file.name.replace(/\.[^/.]+$/, "");
      await saveCustomIcon(name, b64, file.type, "#64748b");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="w-44 shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-3 py-3 border-b border-border">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Etapas
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Meus Ícones */}
        <div>
          <div className="flex items-center px-1 mb-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">
              Meus Ícones
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Adicionar ícone"
              className="w-4 h-4 rounded flex items-center justify-center bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
            >
              <Plus size={10} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleIconUpload}
            />
          </div>

          {customIcons.length === 0 ? (
            <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
              Nenhum ícone ainda.{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline"
              >
                Adicionar
              </button>
            </p>
          ) : (
            <div className="space-y-1">
              {customIcons.map((icon) => (
                <div
                  key={icon.icon_id}
                  draggable
                  onDragStart={(e) => onDragStartCustom(e, icon)}
                  className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-muted cursor-grab active:cursor-grabbing select-none transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-white overflow-hidden"
                    style={{ background: icon.bg_color || "#64748b", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
                  >
                    <img
                      src={`data:${icon.image_type};base64,${icon.image_b64}`}
                      alt={icon.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight flex-1 truncate">
                    {icon.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCustomIcon(icon.icon_id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground transition-all shrink-0"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tipos padrão por categoria */}
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
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-white"
                    style={{
                      background: def.bg,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    }}
                  >
                    <def.Icon size={14} color="white" />
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
