import React, { useState, useEffect, useRef } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { NODE_DEFS } from "./nodeTypes";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function NodeConfig({ node, onChange, onClose }) {
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // Sincroniza campos locais com o nó selecionado
  const data = node?.data || {};
  const isImage = node?.type === "image";

  const def = NODE_DEFS.find((d) => d.type === node?.type);

  const update = (field, value) => {
    onChange(node.id, { [field]: value });
  };

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
      const dataUrl = ev.target.result;
      const b64 = dataUrl.split(",")[1];
      onChange(node.id, { imageB64: b64, imageType: file.type });
    };
    reader.readAsDataURL(file);
    // Limpa o input para permitir re-upload do mesmo arquivo
    e.target.value = "";
  };

  const removeImage = () => {
    onChange(node.id, { imageB64: null, imageType: null });
  };

  if (!node) return null;

  return (
    <div className="w-64 shrink-0 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-base">{def?.icon || "📦"}</span>
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

      {/* Campos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Upload de imagem (só para nó tipo image) */}
        {isImage && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Imagem</p>

            {data.imageB64 ? (
              <div className="space-y-2">
                <img
                  src={`data:${data.imageType || "image/png"};base64,${data.imageB64}`}
                  alt="preview"
                  className="w-full h-32 object-cover rounded-lg border border-border"
                />
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
                  className="w-full h-24 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-muted-foreground hover:text-indigo-600"
                >
                  <Upload size={20} className="mb-1" />
                  <span className="text-xs">Clique para enviar</span>
                  <span className="text-[10px] mt-0.5 text-muted-foreground">
                    JPG, PNG, WebP, GIF — máx. 5 MB
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
        )}

        {/* Nome da etapa */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Nome da etapa
          </label>
          <input
            type="text"
            value={data.label || ""}
            onChange={(e) => update("label", e.target.value)}
            placeholder={def?.label || "Nome..."}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* URL / Slug */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            URL / Slug
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
