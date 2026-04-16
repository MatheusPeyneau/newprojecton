import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer, useReactFlow } from "@xyflow/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

// ─── FontSize via TextStyle ───────────────────────────────────────────────────

const FontSize = TextStyle.extend({
  name: "textStyle",
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize?.replace("px", "") || null,
        renderHTML: (attrs) =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}px` } : {},
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
    };
  },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = [
  { label: "Inter",     value: "Inter, sans-serif" },
  { label: "Arial",     value: "Arial, sans-serif" },
  { label: "Georgia",   value: "Georgia, serif" },
  { label: "Courier",   value: "'Courier New', monospace" },
  { label: "Impact",    value: "Impact, fantasy" },
  { label: "Trebuchet", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana",   value: "Verdana, sans-serif" },
];

const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 96];

// 5 colunas × 8 linhas = 40 cores
const PALETTE = [
  // Neutros
  "#000000", "#434343", "#666666", "#999999", "#ffffff",
  // Tons escuros
  "#1a1a2e", "#16213e", "#0f3460", "#533483", "#2b2d42",
  // Vermelhos / Rosas
  "#ef4444", "#dc2626", "#be123c", "#e91e63", "#ff69b4",
  // Laranjas / Amarelos
  "#f97316", "#ea580c", "#fbbf24", "#fcd34d", "#fef08a",
  // Verdes
  "#22c55e", "#16a34a", "#15803d", "#86efac", "#bbf7d0",
  // Azuis
  "#3b82f6", "#2563eb", "#1d4ed8", "#60a5fa", "#bfdbfe",
  // Roxos / Índigos
  "#8b5cf6", "#7c3aed", "#6d28d9", "#a78bfa", "#ddd6fe",
  // Cyans / Teals
  "#06b6d4", "#0891b2", "#0e7490", "#67e8f9", "#cffafe",
];

const handleStyle = { background: "#94a3b8", width: 10, height: 10, border: "2px solid #fff" };

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sep() {
  return (
    <div style={{ width: 1, height: 22, background: "#e5e7eb", margin: "0 4px", flexShrink: 0 }} />
  );
}

function Btn({ active, onMouseDown, children, title, extraStyle = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        minWidth: 28, height: 28,
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "#eff6ff" : hov ? "#f3f4f6" : "transparent",
        color: active ? "#2563eb" : "#374151",
        fontSize: 13, fontWeight: 700,
        flexShrink: 0,
        transition: "background 0.1s",
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

function StyledSelect({ value, onChange, options, width = 90 }) {
  return (
    <select
      value={value}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={onChange}
      style={{
        fontSize: 12, border: "1px solid #d1d5db", borderRadius: 6,
        padding: "3px 6px", cursor: "pointer", width, height: 28,
        background: "#fff", color: "#374151", outline: "none",
        appearance: "auto",
      }}
    >
      {options}
    </select>
  );
}

// ─── Color Picker Panel ───────────────────────────────────────────────────────

function ColorPanel({ editor, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onDown); };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        zIndex: 1100,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
        padding: 12,
        minWidth: 156,
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        Cores
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
        {PALETTE.map((color) => {
          const active = editor.isActive("textStyle", { color });
          return (
            <button
              key={color}
              title={color}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                editor.chain().focus().setColor(color).run();
                onClose();
              }}
              style={{
                width: 22, height: 22, borderRadius: 5,
                background: color,
                border: color === "#ffffff"
                  ? "1px solid #d1d5db"
                  : active
                  ? "2.5px solid #2563eb"
                  : "2px solid transparent",
                cursor: "pointer",
                transition: "transform 0.1s",
                transform: active ? "scale(1.15)" : "scale(1)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RichTextNode({ data, selected, id, width, height }) {
  const [editing, setEditing] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const containerRef = useRef(null);
  const { setNodes } = useReactFlow();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, code: false }),
      Underline,
      FontSize,
      FontFamily,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: data.richContent || "<p>Digite aqui...</p>",
    editable: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, richContent: html } } : n
        )
      );
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing);
    if (editing) setTimeout(() => editor.commands.focus("end"), 0);
  }, [editing, editor]);

  useEffect(() => {
    if (!editing) return;
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setEditing(false);
        setShowColors(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onDown); };
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e) => { if (e.key === "Escape") { setEditing(false); setShowColors(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editing]);

  if (!editor) return null;

  const fontSize = editor.getAttributes("textStyle")?.fontSize || "16";
  const fontFamily = editor.getAttributes("textStyle")?.fontFamily || FONTS[0].value;
  const currentColor = editor.getAttributes("textStyle")?.color || "#000000";

  const w = width  || 160;
  const h = height || undefined;

  return (
    <div ref={containerRef} style={{ position: "relative", width: w, height: h, minHeight: 40 }}>
      <NodeResizer
        isVisible={selected && !editing}
        minWidth={80}
        minHeight={30}
        lineStyle={{ border: "1.5px solid #3b82f6" }}
        handleStyle={{ width: 7, height: 7, borderRadius: 2, background: "#fff", border: "2px solid #3b82f6" }}
      />
      <Handle type="source" position={Position.Top}    id="top"    style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ ...handleStyle, left: -5, top: "50%", transform: "translateY(-50%)" }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ ...handleStyle, right: -5, top: "50%", transform: "translateY(-50%)" }} />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {editing && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
            padding: "4px 8px",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          {/* Font family */}
          <StyledSelect
            value={fontFamily}
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            width={102}
            options={FONTS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          />

          {/* Font size */}
          <StyledSelect
            value={fontSize}
            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
            width={56}
            options={SIZES.map((s) => (
              <option key={s} value={String(s)}>{s}</option>
            ))}
          />

          <Sep />

          {/* Bold */}
          <Btn
            active={editor.isActive("bold")}
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            title="Negrito (Ctrl+B)"
            extraStyle={{ fontWeight: 900, fontSize: 14 }}
          >B</Btn>

          {/* Italic */}
          <Btn
            active={editor.isActive("italic")}
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
            title="Itálico (Ctrl+I)"
            extraStyle={{ fontStyle: "italic" }}
          >I</Btn>

          {/* Underline */}
          <Btn
            active={editor.isActive("underline")}
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
            title="Sublinhado (Ctrl+U)"
            extraStyle={{ textDecoration: "underline" }}
          >U</Btn>

          {/* Strikethrough */}
          <Btn
            active={editor.isActive("strike")}
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
            title="Riscado"
            extraStyle={{ textDecoration: "line-through", fontWeight: 400 }}
          >S</Btn>

          <Sep />

          {/* Alignment */}
          <Btn active={editor.isActive({ textAlign: "left" })}   onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign("left").run(); }}   title="Alinhar à esquerda"><AlignLeft size={14} /></Btn>
          <Btn active={editor.isActive({ textAlign: "center" })} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign("center").run(); }} title="Centralizar"><AlignCenter size={14} /></Btn>
          <Btn active={editor.isActive({ textAlign: "right" })}  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign("right").run(); }}  title="Alinhar à direita"><AlignRight size={14} /></Btn>

          <Sep />

          {/* Color button */}
          <div style={{ position: "relative" }}>
            <button
              title="Cor do texto"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowColors((v) => !v); }}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 1,
                background: showColors ? "#f3f4f6" : "#fff", padding: 0,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", lineHeight: 1 }}>A</span>
              <span style={{ width: 16, height: 3, borderRadius: 2, background: currentColor, display: "block" }} />
            </button>

            {showColors && (
              <ColorPanel
                editor={editor}
                onClose={() => setShowColors(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Editor area ──────────────────────────────────────────────────── */}
      <div
        onDoubleClick={() => setEditing(true)}
        onKeyDown={(e) => editing && e.stopPropagation()}
        style={{
          cursor: editing ? "text" : "default",
          width: "100%",
          height: h ? "100%" : "auto",
          minHeight: 40,
          padding: "6px 10px",
          boxSizing: "border-box",
          outline: editing
            ? "2px solid #3b82f6"
            : selected
            ? "1.5px dashed #94a3b8"
            : "none",
          borderRadius: 6,
          outlineOffset: 2,
          overflow: "hidden",
        }}
      >
        <EditorContent
          editor={editor}
          style={{ outline: "none", height: h ? "100%" : "auto" }}
        />
      </div>
    </div>
  );
}
