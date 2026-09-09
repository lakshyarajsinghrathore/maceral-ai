import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Clock,
  Bookmark,
  ChevronRight,
  Loader2,
  RotateCcw,
  History,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { askCoalGPT, fetchMines } from '../api/client';
import CitationBadge from '../components/CitationBadge';

const PRE_CANNED_QUESTIONS = [
  "What was the gross coal production and target adherence for Gevra OCP in Q3 FY25?",
  "What are the peak underground methane CH4 levels and DGMS statutory notices for Moonidih colliery?",
  "What is the average Gross Calorific Value (GCV), Ash content, and coal grade for Gevra?",
  "What are the ambient PM10 air quality levels and water discharge compliance for Korba coalfield?"
];

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: `### Welcome to CoalGPT Intelligence
I am your specialized AI Intelligence Assistant for the **Ministry of Coal, Government of India**.

I answer complex parliamentary queries, mine operational audits, and DGMS safety questions with **verifiable source citations** extracted from official mining documents, or chat with you about any general topic!

Try asking one of the suggested questions below, request an introduction, or enter your own query!`,
  citations: [],
  responseTime: 180,
  timestamp: new Date().toISOString()
};

// Maximum number of saved full conversation sessions
const MAX_SAVED_CONVERSATIONS = 5;

// Load saved conversations list from localStorage
const loadInitialConversations = () => {
  try {
    const saved = localStorage.getItem('coalgpt_saved_conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_SAVED_CONVERSATIONS);
      }
    }
  } catch (e) {
    console.error('Failed to load conversations from localStorage', e);
  }
  return [];
};

export default function CoalGPT() {
  // Initialize conversations list
  const [conversations, setConversations] = useState(loadInitialConversations);

  // Initialize active session ID
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    try {
      const savedActiveId = localStorage.getItem('coalgpt_active_session_id');
      if (savedActiveId) return savedActiveId;
    } catch (e) {}
    return 'conv_' + Date.now();
  });

  // Initialize active session messages
  const [messages, setMessages] = useState(() => {
    try {
      const savedActiveId = localStorage.getItem('coalgpt_active_session_id');
      const savedConvs = loadInitialConversations();

      if (savedActiveId) {
        const found = savedConvs.find((c) => c.id === savedActiveId);
        if (found && Array.isArray(found.messages) && found.messages.length > 0) {
          return found.messages;
        }
      }

      // Check legacy active chat
      const savedActiveChat = localStorage.getItem('coalgpt_active_chat');
      if (savedActiveChat) {
        const parsedChat = JSON.parse(savedActiveChat);
        if (Array.isArray(parsedChat) && parsedChat.length > 0) {
          return parsedChat;
        }
      }

      // If existing conversations exist, load the most recent one
      if (savedConvs.length > 0 && savedConvs[0]?.messages?.length > 0) {
        return savedConvs[0].messages;
      }
    } catch (e) {
      console.error('Failed to load active chat', e);
    }
    return [WELCOME_MESSAGE];
  });

  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMine, setSelectedMine] = useState('');
  const [mines, setMines] = useState([]);
  const messagesEndRef = useRef(null);

  // Persist active session messages and active session ID to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('coalgpt_active_chat', JSON.stringify(messages));
      localStorage.setItem('coalgpt_active_session_id', currentSessionId);
    } catch (e) {
      console.error('Failed to sync active chat to localStorage', e);
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    fetchMines().then(setMines).catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Helper to save or update the full conversation thread in conversations list
  const saveConversationThread = (sessionId, threadMessages) => {
    const firstUser = threadMessages.find((m) => m.role === 'user');
    if (!firstUser) return;

    const title =
      firstUser.content.length > 42
        ? firstUser.content.slice(0, 42) + '...'
        : firstUser.content;

    const lastMsg = threadMessages[threadMessages.length - 1];
    const preview = lastMsg
      ? (lastMsg.content.length > 85 ? lastMsg.content.slice(0, 85) + '...' : lastMsg.content)
      : '';

    const totalCitations = threadMessages.reduce(
      (acc, m) => acc + (Array.isArray(m.citations) ? m.citations.length : 0),
      0
    );

    const updatedEntry = {
      id: sessionId,
      title,
      preview,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      messageCount: threadMessages.filter((m) => m.id !== 'welcome').length,
      citationsCount: totalCitations,
      messages: threadMessages
    };

    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== sessionId);
      const updated = [updatedEntry, ...filtered].slice(0, MAX_SAVED_CONVERSATIONS);
      try {
        localStorage.setItem('coalgpt_saved_conversations', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save conversations to localStorage', e);
      }
      return updated;
    });
  };

  // Start a brand-new conversation thread
  const handleNewChat = () => {
    const newId = 'conv_' + Date.now();
    setCurrentSessionId(newId);
    setMessages([WELCOME_MESSAGE]);
    localStorage.setItem('coalgpt_active_session_id', newId);
    localStorage.setItem('coalgpt_active_chat', JSON.stringify([WELCOME_MESSAGE]));
    setShowHistoryDropdown(false);
  };

  // Switch to an existing conversation from history
  const handleSelectConversation = (conv) => {
    setCurrentSessionId(conv.id);
    setMessages(conv.messages);
    localStorage.setItem('coalgpt_active_session_id', conv.id);
    localStorage.setItem('coalgpt_active_chat', JSON.stringify(conv.messages));
    setShowHistoryDropdown(false);
  };

  // Delete a specific conversation from history
  const handleDeleteConversation = (e, convId) => {
    e.stopPropagation();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== convId);
      try {
        localStorage.setItem('coalgpt_saved_conversations', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (convId === currentSessionId) {
      handleNewChat();
    }
  };

  // Clear all saved conversations
  const handleClearAllConversations = () => {
    setConversations([]);
    try {
      localStorage.removeItem('coalgpt_saved_conversations');
    } catch (e) {}
    handleNewChat();
  };

  const handleSend = async (questionText = input) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: q,
      timestamp: new Date().toISOString()
    };

    const threadWithUser = [...messages, userMsg];
    setMessages(threadWithUser);
    setInput('');
    setLoading(true);

    // Ensure this conversation thread is immediately registered in history
    saveConversationThread(currentSessionId, threadWithUser);

    // Multi-turn context for conversational queries (prior turns only, excluding current query)
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await askCoalGPT(q, selectedMine || null, null, historyPayload);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer || 'No response generated.',
        citations: response.citations || [],
        responseTime: response.response_time_ms || 350,
        model: response.model_used || 'Enterprise Neural RAG',
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => {
        const fullThread = [...prev, botMsg];
        saveConversationThread(currentSessionId, fullThread);
        return fullThread;
      });
    } catch (err) {
      console.error('CoalGPT query failed:', err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Failed to connect to CoalGPT backend. Please verify that the backend is running.',
        citations: [],
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => {
        const fullThread = [...prev, errorMsg];
        saveConversationThread(currentSessionId, fullThread);
        return fullThread;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-80px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="h-5 w-5 text-amber-400" />
              CoalGPT Parliamentary & Audit Q&A
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time conversational AI & on-demand source-verified document synthesis.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs relative">
          {/* History Button & Dropdown (Last 5 Full Conversations) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-medium ${
                showHistoryDropdown
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="View conversation history (last 5 sessions)"
            >
              <History className="h-3.5 w-3.5 text-amber-400" />
              <span>History</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-amber-400 font-bold">
                {conversations.length}/5
              </span>
            </button>

            {/* Dropdown Menu */}
            {showHistoryDropdown && (
              <>
                {/* Backdrop to close on click outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowHistoryDropdown(false)}
                />

                <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-[#0C1222] border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                      <History className="h-3.5 w-3.5 text-amber-400" /> Saved Conversations ({conversations.length}/5)
                    </span>
                    {conversations.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllConversations}
                        className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="h-3 w-3" /> Clear All
                      </button>
                    )}
                  </div>

                  {conversations.length === 0 ? (
                    <div className="py-6 text-center space-y-1">
                      <p className="text-slate-400 text-xs font-medium">No saved conversations yet</p>
                      <p className="text-slate-600 text-[11px]">Conversations are automatically preserved here as you chat.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {conversations.map((conv) => {
                        const isActive = conv.id === currentSessionId;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all text-left space-y-1.5 ${
                              isActive
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-500/10'
                                : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800/80'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                                <span className={`text-xs font-semibold truncate ${isActive ? 'text-amber-300' : 'text-slate-200'}`}>
                                  {conv.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteConversation(e, conv.id)}
                                className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors shrink-0"
                                title="Delete this conversation"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {conv.preview && (
                              <p className="text-[11px] text-slate-400 line-clamp-1">
                                {conv.preview}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[10px] font-mono text-slate-500">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">
                                  {conv.messageCount || conv.messages?.filter(m => m.id !== 'welcome').length || 0} messages
                                </span>
                                {conv.citationsCount > 0 && (
                                  <span className="text-sky-400">
                                    {conv.citationsCount} citations
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{conv.updatedAt}</span>
                                {isActive && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all text-xs"
            title="Start fresh conversation"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>New Chat</span>
          </button>

          {/* Mine Filter */}
          <select
            value={selectedMine}
            onChange={(e) => setSelectedMine(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 text-xs"
          >
            <option value="">All Monitored Mines</option>
            {mines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto py-1 text-xs">
        <span className="text-slate-500 font-mono text-[11px] shrink-0">Sample Queries:</span>
        {PRE_CANNED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl whitespace-nowrap transition-all text-[11px] flex items-center gap-1.5 shrink-0"
          >
            <ChevronRight className="h-3 w-3 text-amber-400" />
            <span className="truncate max-w-[280px]">{q}</span>
          </button>
        ))}
      </div>

      {/* Messages Container */}
      <div className="flex-1 bg-[#10172B] border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 shadow-inner">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 space-y-3 ${
                isUser
                  ? 'bg-amber-500/15 border border-amber-500/30 text-slate-100 rounded-tr-sm'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md'
              }`}>
                {/* Message Header */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-800/80 pb-1.5">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    {isUser ? (
                      'Ministry Officer'
                    ) : (
                      <>
                        <div className="h-5 w-5 rounded bg-white flex items-center justify-center p-0.5 shadow-sm shrink-0">
                          <img src="/logo.png" alt="CoalGPT" className="h-4 w-auto object-contain" />
                        </div>
                        <span>CoalGPT AI Intelligence</span>
                      </>
                    )}
                  </span>
                  <div className="flex items-center space-x-2">
                    {m.responseTime && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Clock className="h-3 w-3" /> {(m.responseTime / 1000).toFixed(2)}s
                      </span>
                    )}
                    {m.model && (
                      <span className="text-slate-500 font-mono text-[10px]">
                        {m.model}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className="text-xs leading-relaxed font-sans whitespace-pre-wrap space-y-2">
                  {m.content}
                </div>

                {/* Source Citations Section */}
                {m.citations && m.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 font-mono">
                      <Bookmark className="h-3 w-3" /> Verified Document Citations ({m.citations.length})
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {m.citations.map((c, idx) => (
                        <CitationBadge key={idx} citation={c} index={idx} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 rounded-tl-sm text-xs font-mono text-slate-400 flex items-center space-x-3">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              <span>Retrieving relevant chunks & synthesizing citation-backed response via Neural RAG...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center space-x-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask any parliamentary query, safety record, or production audit (e.g. 'What is Gevra stripping ratio?')..."
          disabled={loading}
          className="flex-1 bg-[#10172B] border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
            !input.trim() || loading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
          }`}
        >
          <span>Ask CoalGPT</span>
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
