import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ArrowLeft, Save, Loader2, Upload, FileText, X, MousePointer2, Hand, Image as ImageIcon } from "lucide-react";
import { nodeTypes as NODE_TYPES, NODE_DEFS } from "./nodeTypes";
import NodePalette from "./NodePalette";
import NodeConfig from "./NodeConfig";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("fluxscale_token")}`,
});

let nodeIdCounter = 1;
const newId = () => `node_${Date.now()}_${nodeIdCounter++}`;

// ─── Edge com botão de deletar ao clicar ──────────────────────────────────────

function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, selected }) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        {selected && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <button
              onClick={() => setEdges((eds) => eds.filter((e) => e.id !== id))}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#ef4444",
                color: "white",
                border: "2px solid #fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: "bold",
                lineHeight: 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              ×
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { default: DeletableEdge };

// ─── Modal de quick-add (soltar seta no canvas vazio) ─────────────────────────

function QuickAddModal({ position, onAdd, onClose }) {
  const [tab, setTab] = useState("icons");
  const [textValue, setTextValue] = useState("");
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const initLeft = Math.min(position.x + 12, window.innerWidth - 290);
  const initTop  = Math.min(position.y - 20,  window.innerHeight - 380);
  const [pos, setPos] = useState({ x: initLeft, y: initTop });

  // Drag do modal pelo header
  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onHeaderMouseDown = (e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onDown); };
  }, [onClose]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result.split(",")[1];
      onAdd("custom", { imageB64: b64, imageType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const tabBtn = (key, label) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      style={{
        flex: 1,
        padding: "5px 0",
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        background: tab === key ? "#3b82f6" : "#f3f4f6",
        color: tab === key ? "#fff" : "#6b7280",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={modalRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 1000,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        width: 272,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Header — arrastável */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{ display: "flex", alignItems: "center", padding: "10px 12px 8px", borderBottom: "1px solid #f3f4f6", cursor: "grab", background: "#fafafa" }}
      >
        <span style={{ fontSize: 11, color: "#9ca3af", marginRight: 6, letterSpacing: 1 }}>⠿</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", flex: 1 }}>Adicionar etapa</span>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1, padding: "0 2px" }}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>
        {tabBtn("icons", "Ícones")}
        {tabBtn("text", "Texto")}
        {tabBtn("upload", "Upload")}
      </div>

      {/* Ícones */}
      {tab === "icons" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: 10, maxHeight: 260, overflowY: "auto" }}>
          {NODE_DEFS.filter((d) => d.type !== "text").map((def) => (
            <button
              key={def.type}
              onClick={() => onAdd(def.type)}
              title={def.label}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                background: "none", border: "1px solid #f3f4f6", borderRadius: 8,
                padding: "6px 4px", cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#f3f4f6"; }}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: def.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <def.Icon size={14} color="white" />
              </div>
              <span style={{ fontSize: 8.5, color: "#6b7280", textAlign: "center", lineHeight: 1.2, wordBreak: "break-word" }}>{def.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Texto */}
      {tab === "text" && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && textValue.trim()) onAdd("text", { label: textValue.trim() }); }}
            placeholder="Digite o texto..."
            style={{
              width: "100%", border: "1px solid #e5e7eb", borderRadius: 8,
              padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => { if (textValue.trim()) onAdd("text", { label: textValue.trim() }); }}
            disabled={!textValue.trim()}
            style={{
              background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8,
              padding: "8px", fontSize: 12, fontWeight: 600,
              cursor: textValue.trim() ? "pointer" : "not-allowed",
              opacity: textValue.trim() ? 1 : 0.5,
            }}
          >
            Adicionar texto
          </button>
        </div>
      )}

      {/* Upload */}
      {tab === "upload" && (
        <div style={{ padding: 12 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%", height: 90, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 6,
              border: "2px dashed #e5e7eb", borderRadius: 10, background: "none",
              cursor: "pointer", color: "#9ca3af", fontSize: 12, transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#9ca3af"; }}
          >
            <Upload size={22} />
            <span>Enviar imagem / logo</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>JPG, PNG, WebP — máx. 5 MB</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
        </div>
      )}
    </div>
  );
}

// ─── Builder principal ────────────────────────────────────────────────────────

function FunilBuilderInner() {
  const { funnelId } = useParams();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [funnelName, setFunnelName] = useState("Novo Funil");
  const [selectedNode, setSelectedNode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState(null);
  const [strategy, setStrategy] = useState("");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [customIcons, setCustomIcons] = useState([]);
  const [tool, setTool] = useState("select"); // "select" | "pan"
  const imageInputRef = useRef(null);
  const clipboardRef = useRef(null);

  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);
  const funnelNameRef = useRef(funnelName);
  useEffect(() => { funnelNameRef.current = funnelName; }, [funnelName]);
  const strategyRef = useRef(strategy);
  useEffect(() => { strategyRef.current = strategy; }, [strategy]);

  // Undo — histórico de snapshots
  const history = useRef([]);
  const historyIdx = useRef(-1);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const snapshot = useCallback(() => {
    const snap = {
      nodes: JSON.parse(JSON.stringify(nodesRef.current)),
      edges: JSON.parse(JSON.stringify(edgesRef.current)),
    };
    history.current = history.current.slice(0, historyIdx.current + 1);
    history.current.push(snap);
    if (history.current.length > 50) history.current.shift();
    historyIdx.current = history.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    const { nodes: n, edges: e } = history.current[historyIdx.current];
    setNodes(n);
    setEdges(e);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !isTyping) {
        const selected = nodesRef.current.filter((n) => n.selected);
        if (selected.length > 0) clipboardRef.current = selected.map((n) => JSON.parse(JSON.stringify(n)));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && !isTyping) {
        if (!clipboardRef.current?.length) return;
        e.preventDefault();
        const idMap = {};
        const newNodes = clipboardRef.current.map((n) => {
          const id = newId();
          idMap[n.id] = id;
          return { ...n, id, position: { x: n.position.x + 30, y: n.position.y + 30 }, selected: true, data: { ...n.data } };
        });
        const copiedIds = new Set(clipboardRef.current.map((n) => n.id));
        const newEdges = edgesRef.current
          .filter((ed) => copiedIds.has(ed.source) && copiedIds.has(ed.target))
          .map((ed) => ({ ...ed, id: `edge_${Date.now()}_${Math.random()}`, source: idMap[ed.source], target: idMap[ed.target] }));
        setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
        snapshot();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, snapshot, setNodes, setEdges]);

  // Insere ImageNode com tamanho real (máx 600px de largura)
  const insertImageNode = useCallback((b64, imageType) => {
    const img = new window.Image();
    img.onload = () => {
      const maxW = 600;
      const w = Math.min(img.naturalWidth, maxW);
      const h = Math.round(w * (img.naturalHeight / img.naturalWidth));
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const center = rfInstance?.screenToFlowPosition({
        x: (bounds?.width ?? 600) / 2,
        y: (bounds?.height ?? 400) / 2,
      }) ?? { x: 0, y: 0 };
      setNodes((nds) => [
        ...nds,
        {
          id: newId(),
          type: "image",
          position: { x: center.x - w / 2, y: center.y - h / 2 },
          style: { width: w, height: h },
          data: { label: "", imageB64: b64, imageType },
        },
      ]);
      snapshot();
    };
    img.src = `data:${imageType};base64,${b64}`;
  }, [rfInstance, setNodes, snapshot]);

  // Colar imagem do clipboard (Ctrl+V com imagem)
  useEffect(() => {
    const handlePaste = (e) => {
      const tag = e.target?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      if (isTyping) return;
      const items = e.clipboardData?.items;
      if (!items || !rfInstance) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) break;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const b64 = ev.target.result.split(",")[1];
            insertImageNode(b64, file.type);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [rfInstance, insertImageNode]);

  // Upload de imagem via botão da toolbar
  const handleImageFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result.split(",")[1];
      insertImageNode(b64, file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // nodeTypes deve ser estável (fora do render) — memo garante referência fixa
  const nodeTypes = useMemo(() => NODE_TYPES, []);

  // Carrega funil da API + ícones customizados
  useEffect(() => {
    fetch(`${API}/api/custom-icons`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setCustomIcons(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!funnelId) { setLoading(false); return; }
    fetch(`${API}/api/funnels/${funnelId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setFunnelName(data.name);
        if (data.strategy) setStrategy(data.strategy);
        if (data.flow_data?.nodes) setNodes(data.flow_data.nodes);
        if (data.flow_data?.edges) setEdges(data.flow_data.edges);
        setTimeout(snapshot, 0); // snapshot do estado inicial
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [funnelId]);

  // Salva funil (com feedback visual)
  const handleSave = async () => {
    if (!rfInstance || !funnelId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const flow = rfInstance.toObject();
      await fetch(`${API}/api/funnels/${funnelId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ name: funnelNameRef.current, flow_data: flow, strategy }),
      });
      setSaveMsg("Salvo!");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  // Salva silenciosamente (sem feedback — usado no auto-save)
  const silentSave = useCallback(() => {
    if (!rfInstance || !funnelId) return;
    setTimeout(async () => {
      try {
        const flow = rfInstance.toObject();
        await fetch(`${API}/api/funnels/${funnelId}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ name: funnelNameRef.current, flow_data: flow, strategy: strategyRef.current }),
        });
      } catch {}
    }, 250);
  }, [rfInstance, funnelId]);

  // Conectar nós — edge bezier azul com seta + auto-save
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "default",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
          },
          eds
        )
      );
      snapshot();
      silentSave();
    },
    [setEdges, silentSave, snapshot]
  );

  // Soltar seta no canvas vazio → abrir modal
  const onConnectEnd = useCallback((event, connectionState) => {
    if (!connectionState.isValid) {
      setQuickAdd({
        screenX: event.clientX,
        screenY: event.clientY,
        fromNode: connectionState.fromNode?.id ?? null,
        fromHandle: connectionState.fromHandle?.id ?? null,
      });
    }
  }, []);

  // Adicionar nó via quick-add e conectar automaticamente
  const handleQuickAdd = useCallback((type, extraData = {}) => {
    if (!rfInstance || !quickAdd) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const pos = rfInstance.screenToFlowPosition({
      x: quickAdd.screenX - bounds.left,
      y: quickAdd.screenY - bounds.top,
    });
    const id = newId();
    const newNode = {
      id,
      type,
      position: pos,
      data: { label: "", url: "", notes: "", imageB64: null, imageType: null, ...extraData },
    };
    setNodes((nds) => [...nds, newNode]);
    if (quickAdd.fromNode) {
      setEdges((eds) =>
        addEdge(
          {
            source: quickAdd.fromNode,
            sourceHandle: "right",
            target: id,
            targetHandle: "left",
            type: "default",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
          },
          eds
        )
      );
    }
    setQuickAdd(null);
    snapshot();
    silentSave();
  }, [rfInstance, quickAdd, setNodes, setEdges, silentSave, snapshot]);

  // Custom icons — salvar e remover
  const saveCustomIcon = useCallback(async (name, imageB64, imageType, bgColor) => {
    const r = await fetch(`${API}/api/custom-icons`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name, image_b64: imageB64, image_type: imageType, bg_color: bgColor }),
    });
    const data = await r.json();
    setCustomIcons((prev) => [data, ...prev]);
  }, []);

  const deleteCustomIcon = useCallback(async (iconId) => {
    await fetch(`${API}/api/custom-icons/${iconId}`, { method: "DELETE", headers: authHeaders() });
    setCustomIcons((prev) => prev.filter((ic) => ic.icon_id !== iconId));
  }, []);

  // Drop no canvas
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow");
      if (!type || !rfInstance) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const pos = rfInstance.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      let extraData = {};
      const iconRaw = e.dataTransfer.getData("application/reactflow-icon");
      if (iconRaw) { try { extraData = JSON.parse(iconRaw); } catch {} }
      const newNode = {
        id: newId(),
        type,
        position: pos,
        data: { label: "", url: "", notes: "", imageB64: null, imageType: null, ...extraData },
      };
      setNodes((nds) => [...nds, newNode]);
      snapshot();
    },
    [rfInstance, setNodes, snapshot]
  );

  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  // Selecionar nó
  const onNodeClick = useCallback((_e, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  // Atualizar dados do nó via painel
  const updateNodeData = useCallback((nodeId, patch) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      )
    );
    setSelectedNode((prev) =>
      prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...patch } } : prev
    );
  }, [setNodes]);

  // Excluir nó e suas arestas
  const deleteNode = useCallback((nodeId) => {
    snapshot();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges, snapshot]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
        <button
          onClick={() => navigate("/funil")}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        <input
          value={funnelName}
          onChange={(e) => setFunnelName(e.target.value)}
          className="text-sm font-semibold bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-ring rounded px-2 py-1 flex-1 max-w-xs"
        />

        <div className="ml-auto flex items-center gap-2">
          {saveMsg && (
            <span className={`text-xs ${saveMsg === "Salvo!" ? "text-emerald-600" : "text-red-500"}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={() => setStrategyOpen((v) => !v)}
            title="Descrição da estratégia"
            className={`p-1.5 rounded transition-colors ${strategyOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            <FileText size={16} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>

      {/* Body: palette + canvas + config */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette customIcons={customIcons} saveCustomIcon={saveCustomIcon} deleteCustomIcon={deleteCustomIcon} />

        <div className="flex-1 relative" ref={reactFlowWrapper}>
          {/* Toolbar flutuante estilo Miro */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 2px 16px rgba(0,0,0,0.13)",
              border: "1px solid #e5e7eb",
              padding: "4px 6px",
              gap: 2,
            }}
          >
            {[
              { key: "select", icon: <MousePointer2 size={15} />, title: "Selecionar (V)" },
              { key: "pan",    icon: <Hand size={15} />,           title: "Mover canvas (H)" },
            ].map(({ key, icon, title }) => (
              <button
                key={key}
                onClick={() => setTool(key)}
                title={title}
                style={{
                  width: 32, height: 32,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: tool === key ? "#eff6ff" : "none",
                  color: tool === key ? "#3b82f6" : "#6b7280",
                  transition: "all 0.15s",
                }}
              >
                {icon}
              </button>
            ))}
            {/* Separador */}
            <div style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 2px" }} />
            {/* Inserir imagem */}
            <button
              onClick={() => imageInputRef.current?.click()}
              title="Inserir imagem do computador"
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                background: "none", color: "#6b7280", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#374151"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#6b7280"; }}
            >
              <ImageIcon size={15} />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageFileSelect}
            />
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={snapshot}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode="loose"
            selectionOnDrag={tool === "select"}
            panOnDrag={tool === "pan" ? true : [1, 2]}
            fitView
            deleteKeyCode="Delete"
          >
            <Background variant={BackgroundVariant.Lines} gap={24} lineWidth={1} color="#e5e7eb" />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        </div>

        {selectedNode && (
          <NodeConfig
            node={selectedNode}
            onChange={updateNodeData}
            onClose={() => setSelectedNode(null)}
            onDelete={deleteNode}
          />
        )}

        {strategyOpen && (
          <div className="w-72 shrink-0 border-l border-border bg-card flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <FileText size={14} className="text-muted-foreground" />
              <span className="text-sm font-semibold flex-1">Descrição da Estratégia</span>
              <button
                onClick={() => { setStrategyOpen(false); silentSave(); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <textarea
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              placeholder="Descreva o passo a passo da estratégia deste funil..."
              className="flex-1 resize-none p-4 text-sm bg-transparent focus:outline-none"
            />
            <div className="px-4 py-3 border-t border-border">
              <button
                onClick={() => { setStrategyOpen(false); silentSave(); }}
                className="w-full text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors"
              >
                Salvar e fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal quick-add */}
      {quickAdd && (
        <QuickAddModal
          position={{ x: quickAdd.screenX, y: quickAdd.screenY }}
          onAdd={handleQuickAdd}
          onClose={() => setQuickAdd(null)}
        />
      )}
    </div>
  );
}

export default function FunilBuilder() {
  return (
    <ReactFlowProvider>
      <FunilBuilderInner />
    </ReactFlowProvider>
  );
}
