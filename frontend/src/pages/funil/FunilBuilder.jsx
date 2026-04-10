import React, { useState, useCallback, useRef, useEffect } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { nodeTypes } from "./nodeTypes";
import NodePalette from "./NodePalette";
import NodeConfig from "./NodeConfig";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("fluxscale_token")}`,
});

let nodeIdCounter = 1;
const newId = () => `node_${Date.now()}_${nodeIdCounter++}`;

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

  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);

  // Carrega funil da API
  useEffect(() => {
    if (!funnelId) { setLoading(false); return; }
    fetch(`${API}/api/funnels/${funnelId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setFunnelName(data.name);
        if (data.flow_data?.nodes) setNodes(data.flow_data.nodes);
        if (data.flow_data?.edges) setEdges(data.flow_data.edges);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [funnelId]);

  // Salva funil
  const handleSave = async () => {
    if (!rfInstance || !funnelId) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const flow = rfInstance.toObject();
      await fetch(`${API}/api/funnels/${funnelId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ name: funnelName, flow_data: flow }),
      });
      setSaveMsg("Salvo!");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  // Conectar nós — edge curva azul com seta
  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
          },
          eds
        )
      ),
    [setEdges]
  );

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
      const newNode = {
        id: newId(),
        type,
        position: pos,
        data: { label: "", url: "", notes: "", imageB64: null, imageType: null },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
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
        <NodePalette />

        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
          </ReactFlow>
        </div>

        {selectedNode && (
          <NodeConfig
            node={selectedNode}
            onChange={updateNodeData}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
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
