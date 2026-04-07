# FluxScale - PRD

## Visão Geral
Sistema de gestão para agências digitais — CRM, pipeline de vendas, financeiro, operacional, RH, conteúdo, WhatsApp e Instagram integrados.

## Stack
- Backend: FastAPI + MongoDB (porta 8001)
- Frontend: React + TailwindCSS + shadcn/ui (porta 3000)
- URL: https://abre-run.preview.emergentagent.com

---

## Módulos Implementados

### Core (v1)
- Autenticação JWT (login, registro)
- Dashboard (métricas gerais)
- Leads (CRUD, importação, kanban)
- Pipeline de Vendas (DnD, stages, deals, métricas)
- Clientes (CRUD, contratos, histórico)
- Financeiro (receitas, despesas, DRE)
- Conteúdo (calendário editorial)
- Operacional (tarefas, TaskRow, CommentsDrawer)
- RH (colaboradores, avaliações)
- WhatsApp (conversas, webhook)
- Configurações (multi-seção)

### v2 — Atualização (Abr/2026)
Extração e execução do arquivo `atualização recente da recente.rar`:
- Arquivos recriados: Sidebar.jsx, AuthCallback.jsx, sonner.jsx, dialog.jsx, collapsible.jsx, hover-card.jsx, pagination.jsx, slider.jsx, toggle.jsx, taskConfig.js
- Dependências instaladas: framer-motion, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, httpx

### UI/UX Modernization (Abr/2026)
- `index.css`: CSS vars atualizados (background off-white hsl(210 40% 97.5%), cards brancos), sidebar vars dedicadas, utilities `.nav-item`, `.nav-item-active`, `.card-elevated`, `.page-container`, `.status-success/error/warning`, animações `fade-up`/`fade-in`
- `Sidebar.jsx`: Logo gradiente + Building2 icon, active item com borda lateral azul + bg azul claro, subitems com linha indentada, espaçamento `space-y-1`, footer com pulse verde
- `Layout.jsx`: Header com divider, avatar com ring, ChevronDown no user menu, backdrop-blur
- `button.jsx`: `active:scale-[0.97]`, `transition-all duration-200`, `rounded-lg` padrão, hover shadow
- `card.jsx`: CardTitle usa `font-heading`, shadow suave
- `input.jsx`: `rounded-lg`, `focus-visible:ring-2 focus-visible:ring-primary/30`
- `badge.jsx`: Novos variants `success`, `warning`, `solid`
- Backend: `InstagramApiSettings` model + `GET/PUT /api/settings/instagram-api`
- page_access_token mascarado no GET (****last4)
- Frontend: `InstagramApiSection` em Configuracoes.jsx
  - Campos: page_access_token (eye toggle), instagram_account_id, verify_token
  - Webhook URL copiável: `{BACKEND_URL}/api/webhook/instagram`

### Tarefa 2 — Pipeline Instagram (Abr/2026)
- Backend: campo `pipeline_type` em StageCreate + DealCreate
- `GET /pipeline/stages?type=` (default/instagram)
- `GET /pipeline/deals?pipeline_type=` (default/instagram)
- `GET /api/webhook/instagram` — verificação do webhook Meta (challenge)
- Webhook `POST /api/webhook/instagram-lead` atualizado: cria deal automático no pipeline Instagram se houver stage
- Frontend: Tabs "Pipeline Principal" | "Pipeline Instagram" no Pipeline.jsx
  - `DefaultPipelineBoard` = pipeline existente (inalterado)
  - `InstagramPipelineBoard` = kanban independente com stages do Instagram
  - Cards com badge roxo "Instagram"

### Tarefa 3 — Mensagens Instagram DM (Abr/2026)
- Backend: coleção `instagram_conversations`
- `POST /api/webhook/instagram` recebe DMs da Meta
- `GET /api/instagram/conversations` — lista conversas (unread_count, last_text)
- `GET /api/instagram/conversations/{id}` — conversa completa
- `POST /api/instagram/conversations/{id}/messages` — envia via Graph API v18.0
- `PATCH /api/instagram/conversations/{id}/read-all` — marca como lidas
- Frontend: `InstagramChatPanel` (Sheet) no Pipeline Instagram
  - Balões inbound (esquerda) / outbound (direita)
  - Timestamp em pt-BR
  - Campo de texto + botão Enviar
  - Auto-scroll para última mensagem

---

## Credenciais de Teste
- Email: testuser@agencia.com
- Senha: Test1234!

---

## REGRAS PERMANENTES DE OPERAÇÃO

### Regra 1: Carrossel HTML — Script de Navegação Obrigatório

**Sempre que gerar um carrossel em HTML, aplicar obrigatoriamente:**

1. **Estrutura de cada slide:**
   - Cada slide deve ter `class="slide"`
   - Primeiro slide deve ter `class="slide active"`
   - Demais slides NÃO devem ter `.active`
   - Incluir botões `.prev` e `.next` em cada slide
   - Incluir `.dot` para navegação por pontos
   - Incluir `.slide-counter` para exibir "X / Y"

2. **Posicionamento do script:**
   - SEMPRE posicionar antes do `</body>`
   - NUNCA dentro de um slide
   - NUNCA no meio do HTML
   - Sempre DEPOIS de todos os slides

3. **CSS + Script obrigatório:**
```html
<style>
  .slide { display: none; }
  .slide.active { display: block; }
</style>
<script>
  let current = 0;
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const counters = document.querySelectorAll('.slide-counter');

  function goTo(n) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = (n + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
    counters.forEach(c => c.textContent = (current + 1) + ' / ' + slides.length);
  }

  document.querySelectorAll('.next').forEach(btn => btn.addEventListener('click', () => goTo(current + 1)));
  document.querySelectorAll('.prev').forEach(btn => btn.addEventListener('click', () => goTo(current - 1)));
  document.querySelectorAll('.dot').forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
</script>
```

4. **Garantia automática no backend:**
   - O backend (`server.py`) injeta automaticamente este script se não estiver presente no HTML gerado pelo LLM
   - Verificação: busca por `goTo` no HTML; se ausente, insere antes de `</body>`

---

## Backlog / Próximos Passos
- P0: Nenhum crítico pendente
- P1: Dividir server.py em módulos (2711 linhas)
- P1: Polling automático de novas mensagens Instagram (WebSocket ou SSE)
- P2: Badge de não lidas no menu lateral para Pipeline Instagram
- P2: Filtros avançados no Pipeline Instagram (por stage, por data)
- P2: Notificações push de novas mensagens Instagram
