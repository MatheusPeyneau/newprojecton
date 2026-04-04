import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Loader2, AlertTriangle, ExternalLink, CheckCircle2,
  Copy, CheckCheck, RotateCcw, Search, Lightbulb, PenTool, Palette,
  History, ChevronRight, Save, Maximize2, Clock, ImageIcon,
  Download, MessageSquare, X, Send, ChevronLeft, ChevronsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("agenciaos_token")}` };
}

const ALL_PROVIDERS = [
  { value: "perplexity", label: "Perplexity", note: "pesquisa web em tempo real" },
  { value: "openai", label: "OpenAI (GPT-4o)", note: "baseado em treinamento" },
  { value: "anthropic", label: "Anthropic (Claude Sonnet 4.6)", note: "visão + criação baseada em template" },
  { value: "gemini", label: "Google Gemini 1.5", note: "baseado em treinamento" },
  { value: "groq", label: "Groq (Llama 3.3)", note: "baseado em treinamento" },
];

const LLM_PROVIDERS = ALL_PROVIDERS.filter(p => p.value !== "perplexity");

const STEP_DEFS = [
  { n: 1, label: "Pesquisa", icon: Search },
  { n: 2, label: "Temas", icon: Lightbulb },
  { n: 3, label: "Copy", icon: PenTool },
  { n: 4, label: "Design", icon: Palette },
];

function getActiveStep(step) {
  if (step === "setup") return 0;
  if (["agent1_loading", "agent1_done"].includes(step)) return 1;
  if (["agent2_loading", "agent2_done"].includes(step)) return 2;
  if (["agent3_loading", "agent3_done"].includes(step)) return 3;
  if (["agent4_loading", "agent4_done"].includes(step)) return 4;
  return 0;
}

function StepIndicator({ step }) {
  const active = getActiveStep(step);
  return (
    <div className="flex items-center mb-6" data-testid="step-indicator">
      {STEP_DEFS.map((s, i) => {
        const done = active > s.n;
        const isActive = active === s.n;
        return (
          <React.Fragment key={s.n}>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              done && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              isActive && "bg-primary/10 text-primary ring-1 ring-primary/20",
              !done && !isActive && "text-muted-foreground"
            )} data-testid={`step-badge-${s.n}`}>
              {done ? (
                <CheckCircle2 size={12} />
              ) : (
                <span className={cn(
                  "w-4 h-4 flex items-center justify-center rounded-full border text-[10px] font-bold",
                  isActive ? "border-primary" : "border-muted-foreground/30"
                )}>{s.n}</span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEP_DEFS.length - 1 && (
              <div className={cn("h-px flex-1 mx-1", done ? "bg-emerald-400/40" : "bg-border")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LoadingCard({ message, note }) {
  return (
    <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-4" data-testid="agent-loading-card">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <Sparkles size={14} className="text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="text-center">
        <p className="text-sm text-foreground/80 font-medium">{message}</p>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      </div>
    </div>
  );
}

function ErrorBanner({ message, onGoSettings }) {
  const navigate = useNavigate();
  const isKeyError = message?.includes("não configurada") || message?.includes("inválida");
  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4 flex items-start gap-3" data-testid="agent-error-banner">
      <AlertTriangle size={15} className="text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">Erro no agente</p>
        <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
        {isKeyError && (
          <button
            onClick={() => navigate("/configuracoes")}
            className="flex items-center gap-1 text-xs text-primary mt-1.5 hover:underline"
            data-testid="error-goto-settings"
          >
            <ExternalLink size={11} /> Ir para Configurações → Chaves de API
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const [html, setHtml] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadAndToggle = async () => {
    if (html) { setExpanded(e => !e); return; }
    try {
      const res = await axios.get(`${API}/carousel/history/${item.carousel_id}`, { headers: getAuthHeader() });
      setHtml(res.data.html_content);
      setExpanded(true);
    } catch { toast.error("Erro ao carregar carrossel"); }
  };

  const handleCopy = async () => {
    let content = html;
    if (!content) {
      const res = await axios.get(`${API}/carousel/history/${item.carousel_id}`, { headers: getAuthHeader() });
      content = res.data.html_content;
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("HTML copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    let content = html;
    if (!content) {
      const res = await axios.get(`${API}/carousel/history/${item.carousel_id}`, { headers: getAuthHeader() });
      content = res.data.html_content;
      setHtml(content);
    }
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carrossel-${item.theme?.toLowerCase().replace(/\s+/g, "-") || item.carousel_id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden" data-testid="history-card">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.theme}</p>
          <div className="flex items-center flex-wrap gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">{item.client_name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={10} />
              {new Date(item.created_at).toLocaleDateString("pt-BR")}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-muted rounded font-medium capitalize">{item.llm_provider}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopy} data-testid="history-copy-btn">
            {copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} data-testid="history-download-btn">
            <Download size={12} />
          </Button>
          <Button variant="outline" size="sm" onClick={loadAndToggle} data-testid="history-view-btn">
            {expanded ? "Fechar" : "Ver"}
          </Button>
        </div>
      </div>
      {expanded && html && (
        <div className="border-t border-border">
          <iframe
            srcDoc={injectListener(html)}
            className="w-full"
            style={{ height: "480px" }}
            sandbox="allow-scripts"
            title="Carrossel Preview"
          />
        </div>
      )}
    </div>
  );
}

// ——— Slides Preview (Agent 3 copy result) ———
function SlidesPreviewSection({ copyData, error, onRetry, onBack, onNext }) {
  const [expanded, setExpanded] = useState(false);
  const slides = copyData?.slides || [];
  const PREVIEW_COUNT = 3;
  const visibleSlides = expanded ? slides : slides.slice(0, PREVIEW_COUNT);
  const hasMore = slides.length > PREVIEW_COUNT;

  return (
    <div className="bg-card border border-border rounded-xl p-6" data-testid="agent3-result">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-heading font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Copy criado — {slides.length} slides
          </h2>
          {copyData?.hook && (
            <p className="text-xs text-muted-foreground mt-0.5 italic">"{copyData.hook}"</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onRetry} data-testid="retry-agent3">
          <RotateCcw size={12} className="mr-1.5" />Regenerar
        </Button>
      </div>

      <div className="space-y-2 mb-2">
        {visibleSlides.map((slide, i) => (
          <div key={i} className="bg-muted/30 rounded-lg p-3" data-testid={`slide-copy-${i}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary">Slide {slide.number}</span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded font-medium",
                slide.type === "capa" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                slide.type === "cta" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                slide.type === "conteudo" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
              )}>{slide.type}</span>
            </div>
            <p className="text-sm font-semibold">{slide.title}</p>
            {slide.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{slide.subtitle}</p>}
            {slide.body && <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{slide.body}</p>}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-primary hover:bg-muted rounded-lg transition-colors mb-4"
          data-testid="expand-slides-button"
        >
          {expanded ? (
            <><ChevronLeft size={13} className="rotate-90" />Ocultar slides</>
          ) : (
            <><ChevronsDown size={13} />Ver todos os {slides.length} slides ({slides.length - PREVIEW_COUNT} ocultos)</>
          )}
        </button>
      )}

      {error && <ErrorBanner message={error} />}

      <div className="flex items-center gap-3 mt-4">
        <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext} className="gap-2" data-testid="proceed-to-design">
          Criar Design HTML <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

// ——— Carousel HTML Preview (Agent 4 result) ———
// Injects a postMessage listener into the HTML so external ← → buttons work
// even with sandbox="allow-scripts" (no allow-same-origin needed)
const POSTMSG_LISTENER = `
<script>
(function(){
  window.addEventListener('message', function(e) {
    var action = e && e.data && e.data.action;
    if (!action) return;

    // Try known function names first
    var fnMap = {
      'carousel-next': ['nextSlide','showNext','goNext','slideNext','moveNext'],
      'carousel-prev': ['prevSlide','showPrev','goPrev','slidePrev','movePrev'],
    };
    var fns = fnMap[action];
    if (fns) {
      for (var i = 0; i < fns.length; i++) {
        if (typeof window[fns[i]] === 'function') { window[fns[i]](); return; }
      }
      // Fallback: click arrow buttons by text content
      var buttons = document.querySelectorAll('button, [role="button"], .nav-btn, .arrow');
      var isNext = action === 'carousel-next';
      var targets = isNext
        ? ['→','▶','>','Next','Próximo','next']
        : ['←','◀','<','Prev','Anterior','prev'];
      for (var b = 0; b < buttons.length; b++) {
        var txt = buttons[b].textContent.trim();
        if (targets.indexOf(txt) !== -1) { buttons[b].click(); return; }
      }
      // Last resort: click first/last button in nav containers
      var navArea = document.querySelector('.navigation, .controls, .nav, footer, [class*="nav"]');
      if (navArea) {
        var navBtns = navArea.querySelectorAll('button');
        if (navBtns.length >= 2) {
          (isNext ? navBtns[navBtns.length-1] : navBtns[0]).click();
        }
      }
    }
  });
})();
</script>`;

function injectListener(html) {
  if (!html) return html;
  if (html.includes('</body>')) return html.replace('</body>', POSTMSG_LISTENER + '\n</body>');
  if (html.includes('</html>')) return html.replace('</html>', POSTMSG_LISTENER + '\n</html>');
  return html + POSTMSG_LISTENER;
}

function CarouselPreviewSection({
  htmlContent, selectedTheme, selectedClient, error, copied, saved,
  showChangeRequest, changeRequest, setShowChangeRequest, setChangeRequest,
  onRetry, onBack, onCopy, onDownload, onSave, onApplyChanges,
}) {
  const iframeRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(null);

  // Inject the postMessage listener once
  const processedHtml = useMemo(() => injectListener(htmlContent), [htmlContent]);

  // After iframe loads, try to detect total slide count from the DOM
  const onIframeLoad = () => {
    setCurrentSlide(1);
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const candidates = [
        doc.querySelectorAll('[class*="slide"]:not([class*="slider"])'),
        doc.querySelectorAll('[id*="slide"]'),
        doc.querySelectorAll('section'),
      ];
      for (const list of candidates) {
        if (list.length > 1) { setTotalSlides(list.length); return; }
      }
    } catch {}
  };

  const navigateSlide = (dir) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ action: dir === 'next' ? 'carousel-next' : 'carousel-prev' }, '*');
    setCurrentSlide(p => dir === 'next'
      ? (totalSlides ? Math.min(p + 1, totalSlides) : p + 1)
      : Math.max(p - 1, 1)
    );
  };

  const openFullscreen = () => {
    const w = window.open('', '_blank');
    if (w) { w.document.write(processedHtml); w.document.close(); }
  };

  return (
    <div data-testid="agent4-result">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-heading font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Carrossel HTML gerado
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedTheme?.title} · {selectedClient?.name}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry} data-testid="retry-agent4">
          <RotateCcw size={12} className="mr-1.5" />Regenerar
        </Button>
      </div>

      {/* HTML Preview */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-4" data-testid="html-preview-container">
        {/* Toolbar */}
        <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateSlide('prev')}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background hover:bg-muted transition-colors"
              title="Slide anterior"
              data-testid="prev-slide-btn"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-muted-foreground px-2 min-w-[64px] text-center tabular-nums">
              {totalSlides ? `${currentSlide} / ${totalSlides}` : `Slide ${currentSlide}`}
            </span>
            <button
              onClick={() => navigateSlide('next')}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background hover:bg-muted transition-colors"
              title="Próximo slide"
              data-testid="next-slide-btn"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button
            onClick={openFullscreen}
            className="text-xs text-primary hover:underline flex items-center gap-1"
            data-testid="open-fullscreen"
          >
            <Maximize2 size={11} /> Tela cheia
          </button>
        </div>

        <iframe
          ref={iframeRef}
          srcDoc={processedHtml}
          className="w-full"
          style={{ height: "620px" }}
          sandbox="allow-scripts"
          title="Carrossel Preview"
          data-testid="carousel-iframe"
          onLoad={onIframeLoad}
        />
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Pedido de alterações */}
      {showChangeRequest && (
        <div className="mb-4 p-4 border border-border rounded-xl bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" />
              O que deseja alterar no carrossel?
            </p>
            <button onClick={() => setShowChangeRequest(false)} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          <textarea
            value={changeRequest}
            onChange={e => setChangeRequest(e.target.value)}
            placeholder="Ex: Mude o gradiente da capa para azul e laranja, aumente o tamanho do título, adicione mais espaçamento entre os slides..."
            className="w-full h-24 px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="change-request-input"
          />
          <Button
            onClick={onApplyChanges}
            disabled={!changeRequest.trim()}
            size="sm"
            className="gap-2"
            data-testid="apply-changes-button"
          >
            <Send size={13} />Aplicar Alterações
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>
        <Button variant="outline" onClick={onCopy} className="gap-2" data-testid="copy-html-button">
          {copied
            ? <><CheckCheck size={14} className="text-emerald-500" />Copiado!</>
            : <><Copy size={14} />Copiar HTML</>}
        </Button>
        <Button variant="outline" onClick={onDownload} className="gap-2" data-testid="download-html-button">
          <Download size={14} />Baixar HTML
        </Button>
        <Button variant="outline" onClick={() => setShowChangeRequest(v => !v)} className="gap-2" data-testid="request-changes-button">
          <MessageSquare size={14} />Pedir Alterações
        </Button>
        <Button onClick={onSave} disabled={saved} className="gap-2" data-testid="save-history-button">
          {saved
            ? <><CheckCircle2 size={14} />Salvo!</>
            : <><Save size={14} />Salvar no Histórico</>}
        </Button>
      </div>
    </div>
  );
}

export default function Conteudo() {
  const [tab, setTab] = useState("generate");
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [periodDays, setPeriodDays] = useState(7);
  const [agent1Provider, setAgent1Provider] = useState("perplexity");
  const [llmProvider, setLlmProvider] = useState("openai");

  // State machine
  const [step, setStep] = useState("setup");
  const [error, setError] = useState(null);

  // Agent results
  const [newsContext, setNewsContext] = useState("");
  const [newsInfo, setNewsInfo] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [copyData, setCopyData] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");

  // Template visual
  const [templateImage, setTemplateImage] = useState(null); // { b64, type, preview }

  // Pedido de alterações
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeRequest, setChangeRequest] = useState("");

  // UI
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/clients`, { headers: getAuthHeader() });
        setClients(res.data.filter(c => c.status === "ativo"));
      } catch {}
    })();
  }, []);

  // Retoma polling se havia um job pendente ao sair da página
  useEffect(() => {
    const pendingJobId = localStorage.getItem("carousel_pending_job_id");
    if (pendingJobId) {
      setStep("agent4_loading");
      startPolling(pendingJobId, "agent3_done");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/carousel/history`, { headers: getAuthHeader() });
      setHistory(res.data);
    } catch {}
    setLoadingHistory(false);
  };

  const handleApiError = useCallback((e) => {
    const msg = e.response?.data?.detail || e.message || "Erro desconhecido";
    setError(msg);
    toast.error(msg);
  }, []);

  // ---------- Generic agent job polling ----------
  const pollAgentJob = useCallback((jobId, onDone, onError, maxAttempts = 60) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts >= maxAttempts) {
        onError("A etapa excedeu o tempo máximo. Tente novamente.");
        return;
      }
      attempts++;
      try {
        const res = await axios.get(`${API}/carousel/agent-job/${jobId}`, { headers: getAuthHeader() });
        if (res.data.status === "done") {
          onDone(res.data.result);
        } else if (res.data.status === "error") {
          onError(res.data.error || "Erro no agente. Tente novamente.");
        } else {
          setTimeout(poll, 3000);
        }
      } catch (e) {
        onError(e.response?.data?.detail || e.message || "Erro ao verificar status");
      }
    };
    setTimeout(poll, 2000);
  }, []);

  // ---------- Agents ----------
  const runAgent1 = async () => {
    if (!selectedClientId) return;
    setStep("agent1_loading");
    setError(null);
    try {
      const res = await axios.post(`${API}/carousel/agent/news`, {
        client_id: selectedClientId, period_days: periodDays, llm_provider: agent1Provider,
      }, { headers: getAuthHeader() });
      pollAgentJob(
        res.data.job_id,
        (result) => {
          setNewsContext(result.news_context);
          setNewsInfo({ name: result.client_name, niche: result.niche });
          setStep("agent1_done");
        },
        (errMsg) => {
          setError(errMsg);
          toast.error(errMsg);
          setStep("setup");
        }
      );
    } catch (e) {
      handleApiError(e);
      setStep("setup");
    }
  };

  const runAgent2 = async () => {
    setStep("agent2_loading");
    setError(null);
    try {
      const res = await axios.post(`${API}/carousel/agent/themes`, {
        client_id: selectedClientId, news_context: newsContext, llm_provider: llmProvider,
      }, { headers: getAuthHeader() });
      pollAgentJob(
        res.data.job_id,
        (result) => {
          setThemes(result.themes || []);
          setSelectedTheme(null);
          setStep("agent2_done");
        },
        (errMsg) => {
          setError(errMsg);
          toast.error(errMsg);
          setStep("agent1_done");
        }
      );
    } catch (e) {
      handleApiError(e);
      setStep("agent1_done");
    }
  };

  const runAgent3 = async () => {
    if (!selectedTheme) return;
    setStep("agent3_loading");
    setError(null);
    try {
      const themeText = `${selectedTheme.title}. Ângulo: ${selectedTheme.angle}. Promessa: ${selectedTheme.promise}`;
      const res = await axios.post(`${API}/carousel/agent/copy`, {
        client_id: selectedClientId, chosen_theme: themeText,
        news_context: newsContext, llm_provider: llmProvider,
      }, { headers: getAuthHeader() });
      pollAgentJob(
        res.data.job_id,
        (result) => {
          setCopyData(result.copy);
          setStep("agent3_done");
        },
        (errMsg) => {
          setError(errMsg);
          toast.error(errMsg);
          setStep("agent2_done");
        }
      );
    } catch (e) {
      handleApiError(e);
      setStep("agent2_done");
    }
  };

  // Polling compartilhado — persiste no localStorage para sobreviver à navegação
  const startPolling = useCallback((jobId, fallbackStep = "agent3_done") => {
    localStorage.setItem("carousel_pending_job_id", jobId);
    const maxAttempts = 75;
    let attempts = 0;
    const poll = async () => {
      if (attempts >= maxAttempts) {
        localStorage.removeItem("carousel_pending_job_id");
        setError("A geração excedeu o tempo máximo. Tente novamente.");
        setStep(fallbackStep);
        return;
      }
      attempts++;
      try {
        const status = await axios.get(`${API}/carousel/job/${jobId}`, { headers: getAuthHeader() });
        if (status.data.status === "done") {
          localStorage.removeItem("carousel_pending_job_id");
          setHtmlContent(status.data.html_content);
          setSaved(false);
          setStep("agent4_done");
          toast.success("Carrossel gerado com sucesso!");
        } else if (status.data.status === "error") {
          localStorage.removeItem("carousel_pending_job_id");
          setError(status.data.error || "Erro ao gerar o design. Tente novamente.");
          setStep(fallbackStep);
        } else {
          setTimeout(poll, 4000);
        }
      } catch (e) {
        handleApiError(e);
        localStorage.removeItem("carousel_pending_job_id");
        setStep(fallbackStep);
      }
    };
    setTimeout(poll, 4000);
  }, [handleApiError]);

  const runAgent4 = async () => {
    setStep("agent4_loading");
    setError(null);
    try {
      const copyText = (copyData?.slides || []).map(s =>
        `Slide ${s.number} (${s.type}): Título: "${s.title}" | Subtítulo: "${s.subtitle || ""}" | Corpo: "${s.body || ""}"`
      ).join("\n");
      const res = await axios.post(`${API}/carousel/agent/design`, {
        client_id: selectedClientId,
        copy_content: copyText,
        chosen_theme: selectedTheme?.title || "",
        llm_provider: llmProvider,
        template_image_b64: templateImage?.b64 || null,
        template_image_type: templateImage?.type || null,
      }, { headers: getAuthHeader() });
      startPolling(res.data.job_id, "agent3_done");
    } catch (e) {
      handleApiError(e);
      setStep("agent3_done");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carrossel-${selectedTheme?.title?.toLowerCase().replace(/\s+/g, "-") || "instagram"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAgent4WithChanges = async () => {
    if (!changeRequest.trim()) return;
    setShowChangeRequest(false);
    setStep("agent4_loading");
    setError(null);
    try {
      const copyText = (copyData?.slides || []).map(s =>
        `Slide ${s.number} (${s.type}): Título: "${s.title}" | Subtítulo: "${s.subtitle || ""}" | Corpo: "${s.body || ""}"`
      ).join("\n");
      const res = await axios.post(`${API}/carousel/agent/design`, {
        client_id: selectedClientId,
        copy_content: copyText,
        chosen_theme: selectedTheme?.title || "",
        llm_provider: llmProvider,
        template_image_b64: templateImage?.b64 || null,
        template_image_type: templateImage?.type || null,
        change_request: changeRequest.trim(),
        current_html: htmlContent,
      }, { headers: getAuthHeader() });
      setChangeRequest("");
      startPolling(res.data.job_id, "agent4_done");
    } catch (e) {
      handleApiError(e);
      setStep("agent4_done");
    }
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopied(true);
    toast.success("HTML copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      const client = clients.find(c => c.client_id === selectedClientId);
      await axios.post(`${API}/carousel/save`, {
        client_id: selectedClientId,
        client_name: client?.name || "Cliente",
        theme: selectedTheme?.title || "Sem tema",
        html_content: htmlContent,
        llm_provider: llmProvider,
      }, { headers: getAuthHeader() });
      setSaved(true);
      toast.success("Carrossel salvo no histórico!");
    } catch { toast.error("Erro ao salvar no histórico"); }
  };

  const resetFlow = () => {
    setStep("setup");
    setError(null);
    setNewsContext("");
    setNewsInfo(null);
    setThemes([]);
    setSelectedTheme(null);
    setCopyData(null);
    setHtmlContent("");
    setSaved(false);
    setCopied(false);
    setTemplateImage(null);
    setShowChangeRequest(false);
    setChangeRequest("");
    localStorage.removeItem("carousel_pending_job_id");
  };

  const selectedClient = clients.find(c => c.client_id === selectedClientId);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">Conteúdo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerador de carrossel para Instagram com 4 agentes de IA em sequência
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setTab("generate")}
          className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all",
            tab === "generate" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          data-testid="tab-generate"
        >
          <Sparkles size={13} className="inline mr-1.5" />Gerar Carrossel
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all",
            tab === "history" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          data-testid="tab-history"
        >
          <History size={13} className="inline mr-1.5" />Histórico
        </button>
      </div>

      {tab === "generate" ? (
        <div>
          {step !== "setup" && <StepIndicator step={step} />}

          {/* ===== SETUP ===== */}
          {step === "setup" && (
            <div className="bg-card border border-border rounded-xl p-6" data-testid="setup-card">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-semibold">Novo Carrossel</h2>
                  <p className="text-xs text-muted-foreground">
                    4 agentes de IA em sequência — do insight ao HTML final
                  </p>
                </div>
              </div>

              {error && <ErrorBanner message={error} />}

              <div className="space-y-5">
                {/* Client */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Cliente</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger data-testid="client-select" className="max-w-sm">
                      <SelectValue placeholder="Selecionar cliente ativo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum cliente ativo</div>
                      ) : clients.map(c => (
                        <SelectItem key={c.client_id} value={c.client_id}>
                          {c.name}{c.company ? ` — ${c.company}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Período de pesquisa de notícias</Label>
                  <div className="flex gap-2">
                    {[7, 15, 30].map(d => (
                      <button
                        key={d}
                        onClick={() => setPeriodDays(d)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg border text-sm font-medium transition-all",
                          periodDays === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                        )}
                        data-testid={`period-${d}d`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* LLM Agent 1 */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">API — Agente 1 (Pesquisa de Notícias)</Label>
                  <Select value={agent1Provider} onValueChange={setAgent1Provider}>
                    <SelectTrigger data-testid="agent1-provider-select" className="max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                          <span className="text-muted-foreground text-xs ml-1">— {p.note}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* LLM */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">API — Agentes 2, 3 e 4 (Temas, Copy, Design)</Label>
                  <Select value={llmProvider} onValueChange={setLlmProvider}>
                    <SelectTrigger data-testid="llm-select" className="max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LLM_PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Configure as chaves em{" "}
                    <a href="/configuracoes" className="text-primary hover:underline">Configurações → Chaves de API</a>.
                  </p>
                </div>

                {/* Template Visual (opcional) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Template Visual <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envie uma imagem de referência para a IA replicar o estilo visual no carrossel.
                    Funciona melhor com o provedor <strong>Anthropic (Claude Sonnet 4.6)</strong>.
                  </p>
                  {templateImage ? (
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/40">
                      <img
                        src={templateImage.preview}
                        alt="Template"
                        className="w-16 h-16 object-cover rounded-md border border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Template carregado</p>
                        <p className="text-xs text-muted-foreground">{templateImage.type}</p>
                      </div>
                      <button
                        onClick={() => setTemplateImage(null)}
                        className="text-xs text-destructive hover:underline"
                        data-testid="remove-template-button"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <label
                      className="flex flex-col items-center justify-center w-full max-w-sm h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                      data-testid="template-upload-area"
                    >
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImageIcon size={20} />
                        <span className="text-xs">Clique para enviar imagem (JPG, PNG, WEBP)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        data-testid="template-file-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const dataUrl = ev.target.result;
                            const base64 = dataUrl.split(',')[1];
                            setTemplateImage({ b64: base64, type: file.type, preview: dataUrl });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>

                <Button
                  onClick={runAgent1}
                  disabled={!selectedClientId}
                  className="gap-2"
                  data-testid="start-generation-button"
                >
                  <Search size={14} />
                  Iniciar Pesquisa de Notícias
                </Button>
              </div>
            </div>
          )}

          {/* ===== AGENT 1 LOADING ===== */}
          {step === "agent1_loading" && (
            <LoadingCard message={`Agente 1: Pesquisando notícias e tendências com ${ALL_PROVIDERS.find(p => p.value === agent1Provider)?.label || agent1Provider}...`} />
          )}

          {/* ===== AGENT 1 DONE ===== */}
          {step === "agent1_done" && (
            <div className="bg-card border border-border rounded-xl p-6" data-testid="agent1-result">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-heading font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Pesquisa concluída
                  </h2>
                  {newsInfo && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nicho: {newsInfo.niche} · Últimos {periodDays}d · {ALL_PROVIDERS.find(p => p.value === agent1Provider)?.label}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={runAgent1} data-testid="retry-agent1">
                  <RotateCcw size={12} className="mr-1.5" />Regenerar
                </Button>
              </div>

              <div className="bg-muted/40 rounded-lg p-4 mb-4 max-h-56 overflow-y-auto">
                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {newsContext}
                </pre>
              </div>

              {error && <ErrorBanner message={error} />}

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={resetFlow}>Recomeçar</Button>
                <Button onClick={runAgent2} className="gap-2" data-testid="proceed-to-themes">
                  Gerar Temas <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* ===== AGENT 2 LOADING ===== */}
          {step === "agent2_loading" && (
            <LoadingCard message="Agente 2: Analisando temas estratégicos para o carrossel..." />
          )}

          {/* ===== AGENT 2 DONE ===== */}
          {step === "agent2_done" && (
            <div className="bg-card border border-border rounded-xl p-6" data-testid="agent2-result">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-heading font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    Temas gerados — selecione um
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Clique em um tema para selecioná-lo</p>
                </div>
                <Button variant="outline" size="sm" onClick={runAgent2} data-testid="retry-agent2">
                  <RotateCcw size={12} className="mr-1.5" />Regenerar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {themes.map((theme, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      "text-left p-4 rounded-lg border-2 transition-all hover:shadow-sm",
                      selectedTheme?.title === theme.title
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                    data-testid={`theme-card-${i}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Tema {i + 1}</span>
                      <span className="text-xs text-muted-foreground">{theme.slides_count} slides</span>
                    </div>
                    <p className="text-sm font-semibold leading-snug mb-1">{theme.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{theme.angle}</p>
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 line-clamp-2">{theme.promise}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && <ErrorBanner message={error} />}

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setStep("agent1_done")}>Voltar</Button>
                <Button
                  onClick={runAgent3}
                  disabled={!selectedTheme}
                  className="gap-2"
                  data-testid="proceed-to-copy"
                >
                  Criar Copy <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* ===== AGENT 3 LOADING ===== */}
          {step === "agent3_loading" && (
            <LoadingCard message="Agente 3: Escrevendo o copy para cada slide..." />
          )}

          {/* ===== AGENT 3 DONE ===== */}
          {step === "agent3_done" && copyData && (
            <SlidesPreviewSection
              copyData={copyData}
              error={error}
              onRetry={runAgent3}
              onBack={() => setStep("agent2_done")}
              onNext={runAgent4}
            />
          )}

          {/* ===== AGENT 4 LOADING ===== */}
          {step === "agent4_loading" && (
            <LoadingCard
              message="Agente 4: Desenhando o carrossel HTML com gradientes e tipografia..."
              note="Gerando em segundo plano — pode levar de 1 a 3 minutos com modelos avançados. A página continuará verificando automaticamente."
            />
          )}

          {/* ===== AGENT 4 DONE ===== */}
          {step === "agent4_done" && htmlContent && (
            <CarouselPreviewSection
              htmlContent={htmlContent}
              selectedTheme={selectedTheme}
              selectedClient={selectedClient}
              error={error}
              copied={copied}
              saved={saved}
              showChangeRequest={showChangeRequest}
              changeRequest={changeRequest}
              setShowChangeRequest={setShowChangeRequest}
              setChangeRequest={setChangeRequest}
              onRetry={runAgent4}
              onBack={() => setStep("agent3_done")}
              onCopy={handleCopyHtml}
              onDownload={handleDownload}
              onSave={handleSave}
              onApplyChanges={runAgent4WithChanges}
            />
          )}
        </div>
      ) : (
        /* ===== HISTORY TAB ===== */
        <div data-testid="history-tab">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-heading font-semibold">Carrosséis Gerados</h2>
            <Button variant="outline" size="sm" onClick={loadHistory} disabled={loadingHistory}>
              <RotateCcw size={12} className={cn("mr-1.5", loadingHistory && "animate-spin")} />
              Atualizar
            </Button>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <History size={32} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum carrossel salvo ainda</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Gere e salve um carrossel na aba "Gerar Carrossel"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(item => (
                <HistoryCard key={item.carousel_id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
