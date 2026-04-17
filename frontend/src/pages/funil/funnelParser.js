// funnelParser.js — converte texto descritivo em nodes + edges do React Flow

const TYPE_MAP = [
  { type: "landing",   kws: ["landing page", "página de vendas", "pagina de vendas", "vsl", "página de captura", "pagina de captura", "sales page"] },
  { type: "purchase",  kws: ["upsell", "downsell", "order bump", "orderbump", "checkout", "compra", "assinatura", "oferta", "purchase"] },
  { type: "forms",     kws: ["formulário", "formulario", "form", "opt-in", "optin", "captura"] },
  { type: "facebook",  kws: ["facebook ads", "facebook", "meta ads", "meta"] },
  { type: "google",    kws: ["google ads", "google"] },
  { type: "tiktok",    kws: ["tiktok"] },
  { type: "instagram", kws: ["instagram"] },
  { type: "youtube",   kws: ["youtube"] },
  { type: "linkedin",  kws: ["linkedin"] },
  { type: "whatsapp",  kws: ["whatsapp", "zap"] },
  { type: "gmail",     kws: ["gmail", "email", "e-mail"] },
  { type: "telefone",  kws: ["telefone", "ligação", "ligacao", "call"] },
  { type: "clique",    kws: ["clique", "botão", "botao", "cta", "click"] },
  { type: "webhook",   kws: ["webhook", "integração", "integracao"] },
];

function detectType(text) {
  const lower = text.toLowerCase();
  for (const { type, kws } of TYPE_MAP) {
    if (kws.some((kw) => lower.includes(kw))) return type;
  }
  return "custom";
}

function extractCondition(line) {
  const m = line.match(/\(([^)]+)\)/);
  return m ? m[1] : null;
}

// Detecta ↓ no final de qualquer linha (bullet ou plain)
// Retorna { clean, condition, hasArrow }
function stripTrailingArrow(line) {
  const m = line.match(/↓\s*(\([^)]+\))?\s*$/);
  if (!m) return { clean: line, condition: null, hasArrow: false };
  const condition = m[1] ? m[1].replace(/^\(|\)$/g, "").trim() : null;
  return { clean: line.slice(0, m.index).trim(), condition, hasArrow: true };
}

let _counter = 0;
function genId() {
  return `gen_${Date.now()}_${++_counter}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export function parseFunnelText(rawText) {
  const lines = rawText.split("\n");

  // ── Pass 1: collect raw steps ────────────────────────────────────────────
  const steps = []; // { title, notes[], condition }
  let current = null;
  let pendingCond = null;
  let awaitNext = false;  // true after any ↓ arrow
  let skippedFirst = false; // skip header line if it's not a step

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Arrow separator (↓ …) on its own line
    if (/^↓/.test(line)) {
      pendingCond = extractCondition(line);
      awaitNext = true;
      continue;
    }

    // Numbered step: "1. title" or "1) title"
    const nm = line.match(/^(\d+)[\.\)]\s+(.+)/);
    if (nm) {
      const { clean, condition, hasArrow } = stripTrailingArrow(nm[2].trim());
      if (current) steps.push(current);
      current = { title: clean, notes: [], condition: pendingCond };
      pendingCond = null;
      awaitNext = false;
      skippedFirst = true;
      if (hasArrow) { pendingCond = condition; awaitNext = true; }
      continue;
    }

    // Sub-bullet: "- note" or "• note"
    if (/^[-•*]\s/.test(line)) {
      const text = line.replace(/^[-•*]\s+/, "").trim();
      const { clean, condition, hasArrow } = stripTrailingArrow(text);
      if (current && clean) current.notes.push(clean);
      if (hasArrow) { pendingCond = condition; awaitNext = true; }
      continue;
    }

    // Plain line
    if (!skippedFirst && !awaitNext && !current) {
      skippedFirst = true;
      continue;
    }
    skippedFirst = true;

    const { clean: cleanLine, condition: trailCond, hasArrow } = stripTrailingArrow(line);

    if (awaitNext || !current) {
      if (current) steps.push(current);
      current = { title: cleanLine, notes: [], condition: pendingCond };
      pendingCond = null;
      awaitNext = false;
    } else {
      if (cleanLine) current.notes.push(cleanLine);
    }
    if (hasArrow) { pendingCond = trailCond; awaitNext = true; }
  }
  if (current) steps.push(current);
  if (steps.length === 0) return { nodes: [], edges: [] };

  // ── Pass 2: layout + build nodes/edges ──────────────────────────────────
  const STEP_H   = 160;
  const MAIN_X   = 240;
  const BRANCH_X = 530;

  const nodes = [];
  const edges = [];

  let mainIdx  = 0; // counter for main-column steps
  let inBranch = false;
  let branchY  = 0;

  steps.forEach((step) => {
    const id   = genId();
    const type = detectType(step.title);

    let x, y;

    if (step.condition) {
      if (!inBranch) {
        // First branch: same Y as previous node, shifted right
        const prev = nodes[nodes.length - 1];
        branchY = prev ? prev.position.y : 0;
        inBranch = true;
      } else {
        // Continue branch downward
        branchY += STEP_H;
      }
      x = BRANCH_X;
      y = branchY;
    } else {
      x = MAIN_X;
      y = mainIdx * STEP_H;
      mainIdx++;
      inBranch = false;
    }

    nodes.push({
      id,
      type,
      position: { x, y },
      data: {
        label: step.title,
        notes: step.notes.join("\n"),
        url: "",
        imageB64: null,
        imageType: null,
      },
    });

    // Annotation text node for notes
    if (step.notes.length > 0) {
      const isBranch = Boolean(step.condition);
      const NOTE_W = 160;
      const noteX = isBranch ? x + 110 : x - NOTE_W - 20;
      const noteY = y + 8;
      const richContent = step.notes.map((n) => `<p>${n}</p>`).join("");
      nodes.push({
        id: genId(),
        type: "text",
        position: { x: noteX, y: noteY },
        style: { width: NOTE_W },
        data: { richContent, label: "", notes: "", url: "", imageB64: null, imageType: null },
      });
    }

    // Edge from previous node (skip annotation nodes — always last 2 real nodes)
    const realNodes = nodes.filter((n) => n.type !== "text");
    if (realNodes.length > 1) {
      const prev = realNodes[realNodes.length - 2];
      const dx = x - prev.position.x;
      const dy = y - prev.position.y;
      const isConditional = Boolean(step.condition);
      const color = isConditional ? "#f97316" : "#3b82f6";

      // Pick handles based on relative direction
      let srcHandle, tgtHandle;
      if (Math.abs(dx) >= Math.abs(dy)) {
        srcHandle = dx >= 0 ? "right" : "left";
        tgtHandle = dx >= 0 ? "left"  : "right";
      } else {
        srcHandle = dy >= 0 ? "bottom" : "top";
        tgtHandle = dy >= 0 ? "top"    : "bottom";
      }

      edges.push({
        id: `e_${realNodes.length}`,
        source: prev.id,
        target: id,
        sourceHandle: srcHandle,
        targetHandle: tgtHandle,
        type: "default",
        animated: true,
        label: step.condition || undefined,
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: "arrowclosed", color },
        labelStyle: { fontSize: 10, fill: "#ea580c", fontWeight: 600 },
        labelBgStyle: { fill: "#fff7ed", fillOpacity: 0.95, borderRadius: 4 },
      });
    }
  });

  return { nodes, edges };
}

// Hint table exported for UI
export const KEYWORD_HINTS = [
  { icon: "🎵", label: "TikTok",        kws: "tiktok" },
  { icon: "📘", label: "Facebook/Meta", kws: "facebook, meta ads, meta" },
  { icon: "📸", label: "Instagram",     kws: "instagram" },
  { icon: "▶️",  label: "YouTube",       kws: "youtube" },
  { icon: "💼", label: "LinkedIn",      kws: "linkedin" },
  { icon: "🔵", label: "Google Ads",    kws: "google ads, google" },
  { icon: "💬", label: "WhatsApp",      kws: "whatsapp, zap" },
  { icon: "📧", label: "Gmail/E-mail",  kws: "gmail, email, e-mail" },
  { icon: "📞", label: "Telefone",      kws: "telefone, ligação" },
  { icon: "🖥️",  label: "Landing Page",  kws: "landing page, vsl, página de vendas" },
  { icon: "🖱️",  label: "Clique/CTA",    kws: "clique, botão, cta" },
  { icon: "📋", label: "Formulário",    kws: "form, formulário, opt-in" },
  { icon: "🛒", label: "Compra/Upsell", kws: "compra, checkout, upsell, oferta, assinatura" },
  { icon: "🔗", label: "Webhook",       kws: "webhook, integração" },
];
