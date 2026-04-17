// funnelParser.js — converte texto descritivo em nodes + edges do React Flow

const TYPE_MAP = [
  // Tráfego
  { type: "facebook",     kws: ["facebook ads", "facebook", "meta ads", "meta"] },
  { type: "google",       kws: ["google ads", "google"] },
  { type: "tiktok",       kws: ["tiktok"] },
  { type: "instagram",    kws: ["instagram"] },
  { type: "youtube",      kws: ["youtube"] },
  { type: "linkedin",     kws: ["linkedin"] },
  // Comunicação
  { type: "whatsapp",     kws: ["whatsapp", "zap"] },
  { type: "sms",          kws: ["sms"] },
  { type: "newsletter",   kws: ["newsletter", "automação de email", "automacao de email", "sequência de email", "sequencia de email"] },
  { type: "gmail",        kws: ["gmail", "email", "e-mail"] },
  { type: "telefone",     kws: ["telefone", "ligação", "ligacao", "call"] },
  { type: "chatbot",      kws: ["chatbot", "bot", "robô", "robo"] },
  // Funil — ordem importa: mais específico primeiro
  { type: "vsl",          kws: ["vsl", "video de vendas", "vídeo de vendas", "carta de vendas em video", "video sales"] },
  { type: "landing",      kws: ["landing page", "página de vendas", "pagina de vendas", "página de captura", "pagina de captura", "sales page"] },
  { type: "forms",        kws: ["formulário", "formulario", "form", "opt-in", "optin", "captura"] },
  { type: "clique",       kws: ["clique", "botão", "botao", "cta", "click"] },
  { type: "oferta",       kws: ["oferta", "desconto", "promoção", "promocao", "cupom"] },
  { type: "checkout",     kws: ["checkout", "pagamento", "carrinho"] },
  { type: "upsell",       kws: ["upsell", "order bump", "orderbump", "bump"] },
  { type: "downsell",     kws: ["downsell", "oferta secundária", "oferta secundaria"] },
  { type: "purchase",     kws: ["compra", "assinatura", "purchase", "vendeu", "fechou"] },
  { type: "obrigado",     kws: ["obrigado", "thank you", "confirmação", "confirmacao", "página de confirmação"] },
  { type: "membros",      kws: ["área de membros", "area de membros", "membros", "curso", "plataforma"] },
  { type: "agendamento",  kws: ["agendamento", "agendar", "calendário", "calendario", "reunião", "reuniao", "call", "consulta"] },
  { type: "comunidade",   kws: ["comunidade", "grupo", "whatsapp group", "telegram", "discord"] },
  { type: "webhook",      kws: ["webhook", "integração", "integracao", "zapier", "make", "n8n"] },
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
  //
  // Layout strategy:
  //   • Main column (left)  — steps sem condição, fluem de cima pra baixo
  //   • Branch column (right) — steps com condição, ramificam a partir do
  //     último nó MAIN (fork node), sem causar cruzamentos
  //
  //   Main sempre conecta de main→main (fluxo principal limpo)
  //   Branch sempre conecta a partir do fork node (primeiro) ou do nó
  //   anterior da branch (subsequentes)
  //   Depois de branches, mainIdx avança para não sobrepor

  const STEP_H   = 200;
  const MAIN_X   = 280;
  const BRANCH_X = 560;
  const NOTE_W   = 165;

  const nodes = [];
  const edges = [];

  // tracking
  let mainIdx       = 0;
  let branchIdx     = 0;
  let forkMainIdx   = 0;     // mainIdx no momento do fork
  let lastMainId    = null;  // último nó da coluna principal
  let lastBranchId  = null;  // último nó da coluna branch
  let inBranch      = false;

  const addEdge = (sourceId, targetId, condition, targetX, targetY, sourceX, sourceY) => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const isConditional = Boolean(condition);
    const color = isConditional ? "#f97316" : "#3b82f6";

    let srcHandle, tgtHandle;
    if (Math.abs(dx) >= Math.abs(dy)) {
      srcHandle = dx >= 0 ? "right" : "left";
      tgtHandle = dx >= 0 ? "left"  : "right";
    } else {
      srcHandle = dy >= 0 ? "bottom" : "top";
      tgtHandle = dy >= 0 ? "top"    : "bottom";
    }

    edges.push({
      id: `e_${edges.length + 1}`,
      source: sourceId,
      target: targetId,
      sourceHandle: srcHandle,
      targetHandle: tgtHandle,
      type: "default",
      animated: true,
      label: condition || undefined,
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: { type: "arrowclosed", color },
      labelStyle: { fontSize: 10, fill: "#ea580c", fontWeight: 600 },
      labelBgStyle: { fill: "#fff7ed", fillOpacity: 0.95, borderRadius: 4 },
    });
  };

  // cache de posição por id para achar coordenadas do source ao criar edge
  const posMap = {};

  steps.forEach((step) => {
    const id   = genId();
    const type = detectType(step.title);
    let x, y, sourceId;

    if (step.condition) {
      // ── Branch step ────────────────────────────────────────────────────
      if (!inBranch) {
        // Primeira step da branch: alinhar Y com o fork node
        inBranch    = true;
        forkMainIdx = mainIdx - 1;
        branchIdx   = 0;
        lastBranchId = null;
      }
      x        = BRANCH_X;
      y        = forkMainIdx * STEP_H + branchIdx * STEP_H;
      sourceId = lastBranchId ?? lastMainId; // primeiro branch → do fork; demais → do anterior da branch
      branchIdx++;
      lastBranchId = id;
    } else {
      // ── Main step ──────────────────────────────────────────────────────
      if (inBranch) {
        // Avançar mainIdx para além da altura da branch, evitando sobreposição
        mainIdx  = Math.max(mainIdx, forkMainIdx + branchIdx);
        inBranch = false;
        lastBranchId = null;
      }
      x        = MAIN_X;
      y        = mainIdx * STEP_H;
      sourceId = lastMainId; // main sempre conecta de main→main
      mainIdx++;
      lastMainId = id;
    }

    posMap[id] = { x, y };

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

    // Annotation: notas como caixa de texto ao lado do nó
    if (step.notes.length > 0) {
      const noteX = step.condition ? x + 110 : x - NOTE_W - 20;
      const noteY = y + 6;
      const richContent = step.notes.map((n) => `<p>${n}</p>`).join("");
      nodes.push({
        id: genId(),
        type: "text",
        position: { x: noteX, y: noteY },
        style: { width: NOTE_W },
        data: { richContent, label: "", notes: "", url: "", imageB64: null, imageType: null },
      });
    }

    // Edge
    if (sourceId && posMap[sourceId]) {
      const src = posMap[sourceId];
      addEdge(sourceId, id, step.condition, x, y, src.x, src.y);
    }
  });

  return { nodes, edges };
}

// Hint table exported for UI
export const KEYWORD_HINTS = [
  { icon: "🎵", label: "TikTok",           kws: "tiktok" },
  { icon: "📘", label: "Facebook/Meta",    kws: "facebook, meta ads" },
  { icon: "📸", label: "Instagram",        kws: "instagram" },
  { icon: "▶️",  label: "YouTube",          kws: "youtube" },
  { icon: "💼", label: "LinkedIn",         kws: "linkedin" },
  { icon: "🔵", label: "Google Ads",       kws: "google ads" },
  { icon: "💬", label: "WhatsApp",         kws: "whatsapp, zap" },
  { icon: "📱", label: "SMS",              kws: "sms" },
  { icon: "📧", label: "Gmail/E-mail",     kws: "gmail, email" },
  { icon: "📨", label: "Newsletter",       kws: "newsletter, sequência de email" },
  { icon: "📞", label: "Telefone",         kws: "telefone, ligação" },
  { icon: "🤖", label: "Chatbot",          kws: "chatbot, bot" },
  { icon: "🖥️",  label: "Landing Page",     kws: "landing page, página de vendas" },
  { icon: "🎬", label: "VSL / Vídeo",      kws: "vsl, vídeo de vendas" },
  { icon: "🖱️",  label: "Clique / CTA",     kws: "clique, botão, cta" },
  { icon: "📋", label: "Formulário",       kws: "formulário, form, opt-in" },
  { icon: "🏷️",  label: "Oferta",           kws: "oferta, desconto, promoção" },
  { icon: "💳", label: "Checkout",         kws: "checkout, pagamento, carrinho" },
  { icon: "🛒", label: "Compra",           kws: "compra, assinatura, purchase" },
  { icon: "⬆️",  label: "Upsell",           kws: "upsell, order bump" },
  { icon: "⬇️",  label: "Downsell",         kws: "downsell" },
  { icon: "❤️",  label: "Pg. Obrigado",     kws: "obrigado, thank you, confirmação" },
  { icon: "🔒", label: "Área de Membros",  kws: "membros, curso, plataforma" },
  { icon: "📅", label: "Agendamento",      kws: "agendamento, calendário, reunião" },
  { icon: "👥", label: "Comunidade",       kws: "comunidade, grupo, telegram" },
  { icon: "🔗", label: "Webhook",          kws: "webhook, integração, n8n" },
];
