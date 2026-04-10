import React, { useRef, useState } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { NODE_DEFS } from "./nodeTypes";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function NodeConfig({ node, onChange, onClose }) {
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const data = node?.data || {};
  const def = NODE_DEFS.find((d) => d.type === node?.type);

  const update = (field, value) => onChange(node.id, { [field]: value });

  const handleImageUpload = (e) => {
    setUploadError("");
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError("Imagem muito grande. Máximo: 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result.split(",")[1];
      onChange(node.id, { imageB64: b64, imageType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeImage = () => onChange(node.id, { imageB64: null, imageType: null });

  if (!node) return null;

  return (
    <div className="w-64 shrink-0 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Mini círculo colorido */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center border border-white shadow-sm shrink-0"
            style={{ background: def?.bg || "#64748b" }}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>{def?.emoji || "📦"}</span>
          </div>
          <span className="text-sm font-semibold text-foreground truncate">
            {def?.label || node.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Ícone personalizado — disponível para qualquer nó */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Ícone personalizado
          </p>

          {data.imageB64 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={`data:${data.imageType || "image/png"};base64,${data.imageB64}`}
                  alt="ícone"
                  className="w-14 h-14 rounded-full object-cover border-2 border-border shadow"
                />
                <div className="text-xs text-muted-foreground">
                  <p>Imagem personalizada</p>
                  <p className="text-[10px]">substitui o ícone padrão</p>
                </div>
              </div>
              <button
                onClick={removeImage}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 size={12} /> Remover imagem
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
              >
                <Upload size={18} className="mb-1" />
                <span className="text-xs">Enviar imagem/logo</span>
                <span className="text-[10px] mt-0.5 opacity-70">
                  JPG, PNG, WebP — máx. 5 MB
                </span>
              </button>
              {uploadError && (
                <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Nome do nó */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Nome / Label
          </label>
          <input
            type="text"
            value={data.label || ""}
            onChange={(e) => update("label", e.target.value)}
            placeholder={def?.label || "Nome..."}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* URL */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            URL / Link
          </label>
          <input
            type="text"
            value={data.url || ""}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://..."
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Observações
          </label>
          <textarea
            value={data.notes || ""}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Anotações sobre esta etapa..."
            rows={4}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
