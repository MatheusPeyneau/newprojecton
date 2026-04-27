import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

const BOT_URL_KEY = 'fluxscale.whatsapp_bot_url';

function getBotUrl() {
  return localStorage.getItem(BOT_URL_KEY) || '';
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function ChatAvatar({ name }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  const color = colors[(name || '').charCodeAt(0) % colors.length];
  return (
    <div
      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-2xl">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

function NotConnectedBanner({ botUrl, onOpenConfig }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#25d366]/10 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#25d366]">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold">WhatsApp não conectado</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {botUrl
            ? 'O bot não está respondendo. Verifique se ele está rodando.'
            : 'Configure a URL do bot em Configurações para conectar.'}
        </p>
      </div>
      <button
        onClick={onOpenConfig}
        className="text-xs font-medium text-primary hover:underline"
      >
        {botUrl ? 'Verificar configurações' : 'Ir para Configurações'}
      </button>
    </div>
  );
}

export default function Conversas() {
  const [botUrl, setBotUrl] = useState(getBotUrl);
  const [status, setStatus] = useState('initializing');
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!botUrl) return;
    try {
      const res = await fetch(`${botUrl}/api/status`);
      const data = await res.json();
      setStatus(data.status);
    } catch {
      setStatus('disconnected');
    }
  }, [botUrl]);

  const fetchChats = useCallback(async () => {
    if (!botUrl || status !== 'connected') return;
    try {
      const res = await fetch(`${botUrl}/api/chats`);
      if (!res.ok) return;
      const data = await res.json();
      setChats(data);
    } catch {}
  }, [botUrl, status]);

  const fetchMessages = useCallback(async (chatId) => {
    if (!botUrl || !chatId) return;
    try {
      const res = await fetch(`${botUrl}/api/messages/${encodeURIComponent(chatId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data);
    } catch {}
  }, [botUrl]);

  // Poll status
  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 5000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  // Fetch chats when connected
  useEffect(() => {
    if (status === 'connected') fetchChats();
    const t = setInterval(() => {
      if (status === 'connected') fetchChats();
    }, 5000);
    return () => clearInterval(t);
  }, [status, fetchChats]);

  // Poll messages when chat is open
  useEffect(() => {
    if (!selectedChat) return;
    fetchMessages(selectedChat.id);
    const t = setInterval(() => fetchMessages(selectedChat.id), 3000);
    return () => clearInterval(t);
  }, [selectedChat, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedChat || sending) return;
    setSending(true);
    const body = input.trim();
    setInput('');
    try {
      await fetch(`${botUrl}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedChat.id, body }),
      });
      await fetchMessages(selectedChat.id);
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openConfig = () => {
    window.location.href = '/configuracoes';
  };

  const filteredChats = chats.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const isConnected = status === 'connected';

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — chat list */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-card">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#25d366]">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold leading-none">Conversas</h1>
            <p className={cn(
              'text-[10px] mt-0.5 font-medium',
              status === 'connected' ? 'text-emerald-500' :
              status === 'qr' ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              {status === 'connected' ? '● Conectado' :
               status === 'qr' ? '● Aguardando QR' :
               status === 'initializing' ? '● Iniciando...' : '● Desconectado'}
            </p>
          </div>
          <button
            onClick={openConfig}
            title="Configurações WhatsApp"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        {isConnected && (
          <div className="px-3 py-2 border-b border-border">
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {!isConnected ? (
            <NotConnectedBanner botUrl={botUrl} onOpenConfig={openConfig} />
          ) : filteredChats.length === 0 ? (
            <EmptyState icon="💬" title="Nenhuma conversa" subtitle="As conversas do WhatsApp aparecerão aqui." />
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50',
                  selectedChat?.id === chat.id
                    ? 'bg-primary/5'
                    : 'hover:bg-muted/50'
                )}
              >
                <ChatAvatar name={chat.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold truncate">{chat.name}</p>
                    {chat.lastMessage?.timestamp && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatDate(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {chat.lastMessage.fromMe ? '✓ ' : ''}{chat.lastMessage.body || '📎 Mídia'}
                    </p>
                  )}
                </div>
                {chat.unreadCount > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-[#25d366] text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {chat.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right — message thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {!selectedChat ? (
          <div className="flex-1 flex">
            {!isConnected ? (
              <NotConnectedBanner botUrl={botUrl} onOpenConfig={openConfig} />
            ) : (
              <EmptyState
                icon="💬"
                title="Selecione uma conversa"
                subtitle="Clique em um contato para ver as mensagens."
              />
            )}
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-border bg-card flex items-center gap-3">
              <ChatAvatar name={selectedChat.name} />
              <div>
                <p className="text-sm font-semibold">{selectedChat.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedChat.id.replace('@c.us', '')}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4 space-y-1"
              style={{
                background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              }}
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const showDate = i === 0 || formatDate(messages[i - 1]?.timestamp) !== formatDate(msg.timestamp);
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full">
                            {formatDate(msg.timestamp)}
                          </span>
                        </div>
                      )}
                      <div className={cn('flex', msg.fromMe ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                            msg.fromMe
                              ? 'bg-[#dcf8c6] dark:bg-[#025c4c] text-foreground rounded-br-sm ml-2'
                              : 'bg-card text-foreground rounded-bl-sm mr-2 border border-border/50'
                          )}
                        >
                          {msg.type === 'chat' ? (
                            <p className="leading-relaxed whitespace-pre-wrap break-words text-[13px]">{msg.body}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">📎 Mídia</p>
                          )}
                          <p className={cn(
                            'text-[10px] mt-1 text-right',
                            msg.fromMe ? 'text-[#34b7f1]/80 dark:text-[#25d366]/70' : 'text-muted-foreground'
                          )}>
                            {formatTime(msg.timestamp)}
                            {msg.fromMe && ' ✓✓'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-card flex items-end gap-3">
              <textarea
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                className="flex-1 resize-none text-sm px-4 py-2.5 rounded-2xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary max-h-32 leading-relaxed"
                style={{ minHeight: 42 }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="shrink-0 w-10 h-10 rounded-full bg-[#25d366] hover:bg-[#20b858] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 -rotate-45 translate-x-0.5">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
