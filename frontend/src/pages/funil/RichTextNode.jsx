import React, { useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer, useReactFlow } from "@xyflow/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

// ─── FontSize custom extension (via TextStyle) ────────────────────────────────

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
  { label: "Inter",        value: "Inter, sans-serif" },
  { label: "Arial",        value: "Arial, sans-serif" },
  { label: "Georgia",      value: "Georgia, serif" },
  { label: "Courier",      value: "'Courier New', monospace" },
  { label: "Impact",       value: "Impact, fantasy" },
  { label: "Trebuchet",    value: "'Trebuchet MS', sans-serif" },
];

const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

const COLORS = [
  "#000000", "#374151", "#6b7280", "#ffffff",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
];

const handleStyle = { background: "#94a3b8", width: 10, height: 10, border: "2px solid #fff" };

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 3px", flexShrink: 0 }} />;
}

function Btn({ active, onClick, children, title, extraStyle = {} }) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        minWidth: 26, height: 26,
        borderRadius: 5,
        border: "none",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "#eff6ff" : "none",
        color: active ? "#3b82f6" : "#374151",
        fontSize: 12, fontWeight: 700,
        flexShrink: 0,
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RichTextNode({ data, selected, id }) {
  const [editing, setEditing] = useState(false);
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

  // Sync editable flag
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing);
    if (editing) setTimeout(() => editor.commands.focus("end"), 0);
  }, [editing, editor]);

  // Click outside → exit edit
  useEffect(() => {
    if (!editing) return;
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setEditing(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onDown); };
  }, [editing]);

  // Escape → exit edit
  useEffect(() => {
    if (!editing) return;
    const onKey = (e) => { if (e.key === "Escape") setEditing(false); };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [editing]);

  if (!editor) return null;

  const fontSize = editor.getAttributes("textStyle")?.fontSize || "16";
  const fontFamily = editor.getAttributes("textStyle")?.fontFamily || FONTS[0].value;

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth: 120 }}>
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

      {/* ── Floating toolbar ─────────────────────────────────────────────── */}
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
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            padding: "4px 6px",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          {/* Font family */}
          <select
            value={fontFamily}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            style={{
              fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 5,
              padding: "2px 4px", cursor: "pointer", maxWidth: 88, height: 26,
              background: "#fafafa", color: "#374151",
            }}
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Font size */}
          <select
            value={fontSize}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
            style={{
              fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 5,
              padding: "2px 2px", cursor: "pointer", width: 46, height: 26,
              background: "#fafafa", color: "#374151",
            }}
          >
            {SIZES.map((s) => <option key={s} value={String(s)}>{s}</option>)}
          </select>

          <Divider />

          {/* Bold */}
          <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito (Ctrl+B)" extraStyle={{ fontWeight: 900 }}>B</Btn>
          {/* Italic */}
          <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico (Ctrl+I)" extraStyle={{ fontStyle: "italic" }}>I</Btn>
          {/* Underline */}
          <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado (Ctrl+U)" extraStyle={{ textDecoration: "underline" }}>U</Btn>
          {/* Strike */}
          <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Riscado" extraStyle={{ textDecoration: "line-through", fontWeight: 400 }}>S</Btn>

          <Divider />

          {/* Alignment */}
          <Btn active={editor.isActive({ textAlign: "left" })}   onClick={() => editor.chain().focus().setTextAlign("left").run()}   title="Alinhar à esquerda"><AlignLeft size={13} /></Btn>
          <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centralizar"><AlignCenter size={13} /></Btn>
          <Btn active={editor.isActive({ textAlign: "right" })}  onClick={() => editor.chain().focus().setTextAlign("right").run()}  title="Alinhar à direita"><AlignRight size={13} /></Btn>

          <Divider />

          {/* Color swatches */}
          <div style={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap", maxWidth: 80 }}>
            {COLORS.map((color) => {
              const isActive = editor.isActive("textStyle", { color });
              return (
                <button
                  key={color}
                  title={color}
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(color).run(); }}
                  style={{
                    width: 14, height: 14, borderRadius: "50%", background: color, flexShrink: 0,
                    border: color === "#ffffff" ? "1px solid #d1d5db" : isActive ? "2px solid #374151" : "2px solid transparent",
                    cursor: "pointer", transition: "transform 0.1s",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Editor area ──────────────────────────────────────────────────── */}
      <div
        onDoubleClick={() => setEditing(true)}
        onKeyDown={(e) => editing && e.stopPropagation()}
        style={{
          cursor: editing ? "text" : "default",
          minWidth: 120,
          padding: "6px 10px",
          outline: editing ? "2px solid #3b82f6" : selected ? "1.5px dashed #94a3b8" : "none",
          borderRadius: 6,
          outlineOffset: 2,
        }}
      >
        <EditorContent
          editor={editor}
          style={{ outline: "none" }}
        />
      </div>
    </div>
  );
}
