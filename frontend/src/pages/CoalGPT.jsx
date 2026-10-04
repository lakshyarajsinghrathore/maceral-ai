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
  MessageSquare,
  Mic,
  Volume2
} from 'lucide-react';
import { askCoalGPT, fetchMines, streamSpeechAudio } from '../api/client';
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
  const [language, setLanguage] = useState('English');
  const [isListening, setIsListening] = useState(false);
  const [playingTTSId, setPlayingTTSId] = useState(null);
  const [loadingTTSId, setLoadingTTSId] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [mines, setMines] = useState([]);
  const messagesEndRef = useRef(null);
  const currentAudioRef = useRef(null);
  const currentAudioUrlRef = useRef(null);
  const audioCacheRef = useRef(new Map());
  const playbackSessionRef = useRef(0);

  const stopCurrentAudio = () => {
    playbackSessionRef.current += 1;
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {
        console.warn("Audio pause error:", e);
      }
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      } catch (e) {
        console.warn("Revoke URL error:", e);
      }
      currentAudioUrlRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingTTSId(null);
    setLoadingTTSId(null);
  };

  // Load and pre-fetch modern Neural Natural voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      stopCurrentAudio();
    };
  }, []);

  // Selector for human-sounding Neural Natural voice packs
  const getBestVoice = (lang, voicesList) => {
    if (!voicesList || voicesList.length === 0) return null;

    if (lang === 'Hindi') {
      // 1. Swara / Madhur Natural
      const topNatural = voicesList.find(v => 
        (v.name.includes('Swara') || v.name.includes('Madhur')) && v.lang.startsWith('hi')
      );
      if (topNatural) return topNatural;

      // 2. Any Online/Natural Hindi voice
      const naturalHi = voicesList.find(v => 
        v.lang.startsWith('hi') && (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('online'))
      );
      if (naturalHi) return naturalHi;

      // 3. Google Hindi
      const googleHi = voicesList.find(v => v.lang.startsWith('hi') && v.name.includes('Google'));
      if (googleHi) return googleHi;

      return voicesList.find(v => v.lang.startsWith('hi')) || null;
    }

    if (lang === 'Bengali') {
      // 1. Tanishaa / Bashkar Natural
      const topNatural = voicesList.find(v => 
        (v.name.includes('Tanishaa') || v.name.includes('Bashkar')) && v.lang.startsWith('bn')
      );
      if (topNatural) return topNatural;

      // 2. Any Online/Natural Bengali voice
      const naturalBn = voicesList.find(v => 
        v.lang.startsWith('bn') && (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('online'))
      );
      if (naturalBn) return naturalBn;

      // 3. Google Bengali
      const googleBn = voicesList.find(v => v.lang.startsWith('bn') && v.name.includes('Google'));
      if (googleBn) return googleBn;

      return voicesList.find(v => v.lang.startsWith('bn')) || null;
    }

    // Default: English (India)
    // 1. Neerja / Prabhat Natural (Indian English)
    const topNatural = voicesList.find(v => 
      (v.name.includes('Neerja') || v.name.includes('Prabhat')) && (v.lang === 'en-IN' || v.lang.startsWith('en'))
    );
    if (topNatural) return topNatural;

    // 2. Indian English Natural/Online
    const naturalEnIn = voicesList.find(v => 
      (v.lang === 'en-IN' || v.lang === 'en_IN') && (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('online'))
    );
    if (naturalEnIn) return naturalEnIn;

    // 3. Any Indian English voice (Heera, Ravi)
    const anyEnIn = voicesList.find(v => v.lang === 'en-IN' || v.lang === 'en_IN');
    if (anyEnIn) return anyEnIn;

    // 4. Natural English (Jenny Natural, Ryan Natural, Google UK Female)
    const naturalEn = voicesList.find(v => 
      v.lang.startsWith('en') && (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('online') || v.name.includes('Google'))
    );
    if (naturalEn) return naturalEn;

    return voicesList.find(v => v.lang.startsWith('en')) || null;
  };

  const toggleListening = () => {
    if (isListening) {
      if (window._speechRecognition) {
        window._speechRecognition.stop();
      }
      setIsListening(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = language === 'Hindi' ? 'hi-IN' : language === 'Bengali' ? 'bn-IN' : 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev ? prev + ' ' + transcript : transcript);
        };
        recognition.onerror = (e) => {
          console.error("Speech error", e);
          setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);

        window._speechRecognition = recognition;
        recognition.start();
      } else {
        alert("Speech API is not supported in this browser. Please use Chrome/Edge.");
      }
    }
  };

  // Sanitizes text for natural voice synthesis: removes emojis, markdown, and non-major symbols
  const cleanSpeechText = (text) => {
    if (!text || typeof text !== 'string') return '';

    let t = text;

    // 1. Remove URLs entirely so they are never read aloud
    t = t.replace(/https?:\/\/\S+/g, '');

    // 2. Remove document citation brackets like [1], [Doc: Gevra Report], [1, 2]
    t = t.replace(/\[.*?\]/g, '');

    // 3. Remove Markdown code blocks and backticks
    t = t.replace(/`{1,3}[\s\S]*?`{1,3}/g, '');

    // 4. Remove Markdown headers (### Header -> Header)
    t = t.replace(/#{1,6}\s*/g, '');

    // 5. Remove bold / italic / strikethrough formatting markers
    t = t.replace(/\*\*(.*?)\*\*/g, '$1');
    t = t.replace(/\*(.*?)\*/g, '$1');
    t = t.replace(/~~(.*?)~~/g, '$1');
    t = t.replace(/__(.*?)__/g, '$1');
    t = t.replace(/_(.*?)_/g, '$1');

    // 6. Remove Markdown table syntax: table dividers and column pipes
    t = t.replace(new RegExp('\\|[\\-:\\s\\|]+\\|', 'g'), '');
    t = t.replace(/\|/g, ', ');

    // 7. Remove list bullets at start of lines (*, -, +, •)
    t = t.replace(new RegExp('^[\\s*•\\-+]+', 'gm'), '');

    // 8. Remove blockquote markers (> Quote -> Quote)
    t = t.replace(/^>\s*/gm, '');

    // 9. Remove all emojis and pictorial Unicode characters (faces, flags, symbols, dingbats)
    try {
      t = t.replace(/\p{Extended_Pictographic}/gu, '');
    } catch (e) {}
    t = t.replace(new RegExp('[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]', 'g'), '');
    t = t.replace(new RegExp('[\\u200B-\\u200D\\uFE00-\\uFE0F\\u2600-\\u27BF\\u2B50-\\u2B55\\u2300-\\u23FF\\u25A0-\\u25FF\\uE000-\\uF8FF]', 'g'), '');

    // 10. Remove non-major decorative symbols while preserving:
    // - Sentence cadence punctuation: . , ? ! : ; । ॥
    // - Units/quantities: % (percent), ₹, $, €, £
    // - Word hyphens (when not a bullet)
    t = t.replace(new RegExp('[@#^&*~_<>{}\\[\\]()\\\\/=+`"\'~_•◦▪–—]', 'g'), ' ');

    // 11. Normalize multiple punctuation
    t = t.replace(/\.{2,}/g, '.');
    t = t.replace(/,{2,}/g, ',');
    t = t.replace(/!{2,}/g, '!');
    t = t.replace(/\?{2,}/g, '?');

    // Add space after punctuation if immediately followed by a letter (avoid decimals like 15.4 or ১৫.৪)
    t = t.replace(/([.,!?:;।])([A-Za-z\u0904-\u0939\u0985-\u09B9])/g, '$1 $2');

    // Clean trailing/redundant spaces before punctuation
    t = t.replace(/\s+([.,!?:;।])/g, '$1');

    // Clean double commas like ', ,'
    t = t.replace(/(,\s*)+,/g, ',');

    // 12. Collapse excessive whitespace and line breaks into natural pauses
    t = t.replace(/[ \t]+/g, ' ');
    t = t.replace(/\n\s*\n+/g, '. ');
    t = t.replace(/\n/g, ', ');

    return t.trim();
  };

  // Splits sanitized text into natural sentence-sized units for streaming queue playback
  const splitIntoSpeechSentences = (text) => {
    if (!text || typeof text !== 'string') return [];

    // Protect decimals (e.g. 15.4 MT) from being split as sentence terminators
    const normalized = text.replace(/(\d+)\.(\d+)/g, (m, a, b) => a + '<DOT>' + b);

    // Split on sentence terminators: . ! ? । ॥ ; or newlines
    const rawSegments = (normalized.match(/[^.!?।॥;\n]+(?:[.!?।॥;\n]+|$)/g) || [normalized])
      .map(s => s.replace(/<DOT>/g, '.').trim())
      .filter(Boolean);

    const sentences = [];
    for (const seg of rawSegments) {
      // If a segment is exceptionally long (> 220 chars), split at commas for natural pauses
      if (seg.length > 220) {
        const parts = (seg.match(/[^,]+(?:,+|$)/g) || [seg]).map(p => p.trim()).filter(Boolean);
        let buf = '';
        for (const p of parts) {
          if (!buf) {
            buf = p;
          } else if ((buf + ' ' + p).length <= 200) {
            buf += ' ' + p;
          } else {
            sentences.push(buf);
            buf = p;
          }
        }
        if (buf) sentences.push(buf);
      } else {
        sentences.push(seg);
      }
    }

    // Merge tiny fragments (< 12 chars, e.g. "1.", "Yes.") with next sentence
    const merged = [];
    let buffer = '';
    for (const s of sentences) {
      if (!buffer) {
        buffer = s;
      } else if (buffer.length < 12) {
        buffer += ' ' + s;
      } else {
        merged.push(buffer);
        buffer = s;
      }
    }
    if (buffer) merged.push(buffer);

    return merged.length > 0 ? merged : [text.trim()];
  };

  const fallbackSpeechSynthesis = (msgId, cleanText) => {
    if (!('speechSynthesis' in window)) {
      setPlayingTTSId(null);
      setLoadingTTSId(null);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const currentVoices = window.speechSynthesis.getVoices();
      const candidateVoices = currentVoices.length > 0 ? currentVoices : availableVoices;
      const bestVoice = getBestVoice(language, candidateVoices);

      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        const fallbackVoice = candidateVoices.find(v => v.lang.startsWith('hi') || v.lang.startsWith('en')) || candidateVoices[0];
        if (fallbackVoice) {
          utterance.voice = fallbackVoice;
          utterance.lang = fallbackVoice.lang;
        } else {
          utterance.lang = 'en-IN';
        }
      }

      utterance.rate = 0.98;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setPlayingTTSId(null);
        setLoadingTTSId(null);
      };
      utterance.onerror = () => {
        setPlayingTTSId(null);
        setLoadingTTSId(null);
      };

      setLoadingTTSId(null);
      setPlayingTTSId(msgId);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Fallback speech synthesis error:", e);
      setPlayingTTSId(null);
      setLoadingTTSId(null);
    }
  };

  const playTTS = async (msgId, text) => {
    // Toggle: if currently speaking or loading this message, stop immediately
    if (playingTTSId === msgId || loadingTTSId === msgId) {
      stopCurrentAudio();
      return;
    }

    // Cancel any queued or active speech so it never loops or stacks
    stopCurrentAudio();

    // Strip emojis, markdown, and non-major symbols for clean, natural speech
    const cleanText = cleanSpeechText(text);
    if (!cleanText) return;

    const sentences = splitIntoSpeechSentences(cleanText);
    if (!sentences || sentences.length === 0) return;

    // Start loading indicator and register new playback session ID
    setLoadingTTSId(msgId);
    playbackSessionRef.current += 1;
    const currentSession = playbackSessionRef.current;

    // Helper to fetch a single sentence blob with in-memory caching
    const fetchSentenceBlob = async (sentence) => {
      const cacheKey = `${language}:${sentence}`;
      if (audioCacheRef.current.has(cacheKey)) {
        return audioCacheRef.current.get(cacheKey);
      }
      const blob = await streamSpeechAudio(sentence, language);
      audioCacheRef.current.set(cacheKey, blob);
      return blob;
    };

    // Step 1: Immediately request Sentence 0 for fast-path sub-second response (~150-250ms)
    const firstPromise = fetchSentenceBlob(sentences[0]);

    // Step 2: Concurrently kick off background prefetch for remaining sentences
    const remainingPromises = sentences.slice(1).map(s => fetchSentenceBlob(s));
    const allSentencePromises = [firstPromise, ...remainingPromises];

    try {
      // Await only the first sentence to start speaking immediately
      await firstPromise;

      // Abort if session was stopped or switched while downloading first sentence
      if (playbackSessionRef.current !== currentSession) return;

      // Transition UI from loading spinner to active audio pulse
      setLoadingTTSId(null);
      setPlayingTTSId(msgId);

      // Play each sentence in the queue sequentially without gaps
      const playQueueIndex = async (index) => {
        if (playbackSessionRef.current !== currentSession) return;

        if (index >= sentences.length) {
          // Playback completed for all sentences
          stopCurrentAudio();
          return;
        }

        try {
          const blob = await allSentencePromises[index];
          if (playbackSessionRef.current !== currentSession) return;

          // Revoke previous audio object URL to prevent memory leaks
          if (currentAudioUrlRef.current) {
            try { URL.revokeObjectURL(currentAudioUrlRef.current); } catch (e) {}
          }

          const audioUrl = URL.createObjectURL(blob);
          currentAudioUrlRef.current = audioUrl;

          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          // Strictly play each sentence ONCE and advance queue on completion
          audio.onended = () => {
            if (playbackSessionRef.current !== currentSession) return;
            playQueueIndex(index + 1);
          };

          audio.onerror = (err) => {
            console.warn(`Sentence ${index} playback error, advancing to next:`, err);
            if (playbackSessionRef.current !== currentSession) return;
            playQueueIndex(index + 1);
          };

          await audio.play();
        } catch (err) {
          console.warn(`Error streaming sentence ${index}, advancing:`, err);
          if (playbackSessionRef.current !== currentSession) return;
          playQueueIndex(index + 1);
        }
      };

      await playQueueIndex(0);

    } catch (err) {
      console.warn("Neural audio streaming unavailable, falling back to Web Speech API", err);
      if (playbackSessionRef.current === currentSession) {
        setLoadingTTSId(null);
        fallbackSpeechSynthesis(msgId, cleanText);
      }
    }
  };

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
      const response = await askCoalGPT(q, selectedMine || null, null, historyPayload, language);
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto h-[calc(100vh-80px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              CoalGPT Parliamentary & Audit Q&A
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time conversational AI & on-demand source-verified document synthesis.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs relative flex-wrap sm:flex-nowrap gap-y-2 shrink-0">
          {/* History Button & Dropdown (Last 5 Full Conversations) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-medium ${
                showHistoryDropdown
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
              }`}
              title="View conversation history (last 5 sessions)"
            >
              <History className="h-3.5 w-3.5 text-blue-600" />
              <span>History</span>
              <span className="px-1.5 py-0.2 rounded-full bg-gray-100 text-[10px] font-mono text-blue-700 font-bold border border-gray-200">
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

                <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5 font-mono">
                      <History className="h-3.5 w-3.5 text-blue-600" /> Saved Conversations ({conversations.length}/5)
                    </span>
                    {conversations.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllConversations}
                        className="text-[10px] text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 font-medium"
                      >
                        <Trash2 className="h-3 w-3" /> Clear All
                      </button>
                    )}
                  </div>

                  {conversations.length === 0 ? (
                    <div className="py-6 text-center space-y-1">
                      <p className="text-gray-500 text-xs font-medium">No saved conversations yet</p>
                      <p className="text-gray-400 text-[11px]">Conversations are automatically preserved here as you chat.</p>
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
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-white hover:bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className={`text-xs font-semibold truncate ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>
                                  {conv.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteConversation(e, conv.id)}
                                className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors shrink-0"
                                title="Delete this conversation"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {conv.preview && (
                              <p className="text-[11px] text-gray-500 line-clamp-1">
                                {conv.preview}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] font-mono text-gray-400">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  {conv.messageCount || conv.messages?.filter(m => m.id !== 'welcome').length || 0} messages
                                </span>
                                {conv.citationsCount > 0 && (
                                  <span className="text-blue-600">
                                    {conv.citationsCount} citations
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{conv.updatedAt}</span>
                                {isActive && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-bold">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl transition-all text-xs shadow-sm"
            title="Start fresh conversation"
          >
            <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
            <span>New Chat</span>
          </button>

          {/* Language Filter */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 rounded-xl px-2 py-1.5 focus:outline-none focus:border-blue-500 text-xs shadow-sm"
            title="Select Interface Language"
          >
            <option value="English">🇬🇧 English</option>
            <option value="Hindi">🇮🇳 Hindi (हिन्दी)</option>
            <option value="Bengali">🇮🇳 Bengali (বাংলা)</option>
          </select>

          {/* Mine Filter */}
          <select
            value={selectedMine}
            onChange={(e) => setSelectedMine(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 text-xs shadow-sm max-w-[170px] truncate"
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
      <div className="flex items-center space-x-2 overflow-x-auto py-1 text-xs scrollbar-none">
        <span className="text-gray-400 font-mono text-[11px] shrink-0">Sample Queries:</span>
        {PRE_CANNED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl whitespace-nowrap transition-all text-[11px] flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <ChevronRight className="h-3 w-3 text-blue-600" />
            <span className="truncate max-w-[280px]">{q}</span>
          </button>
        ))}
      </div>

      {/* Messages Container */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 overflow-y-auto space-y-4 shadow-sm">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 space-y-3 ${
                isUser
                  ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm'
                  : 'bg-gray-50 border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
              }`}>
                {/* Message Header */}
                <div className={`flex items-center justify-between text-[11px] font-mono border-b pb-1.5 ${
                  isUser ? 'border-blue-500 text-blue-100' : 'border-gray-200 text-gray-500'
                }`}>
                  <span className={`font-semibold flex items-center gap-1.5 ${isUser ? 'text-white' : 'text-blue-600'}`}>
                    {isUser ? (
                      'Ministry Officer'
                    ) : (
                      <>
                        <div className="h-5 w-5 rounded bg-white border border-gray-200 flex items-center justify-center p-0.5 shadow-sm shrink-0">
                          <img src="/logo.png" alt="CoalGPT" className="h-4 w-auto object-contain" />
                        </div>
                        <span>CoalGPT AI Intelligence</span>
                        <button
                          type="button"
                          onClick={() => playTTS(m.id || 'welcome', m.content)}
                          className={`ml-2 transition-colors ${
                            playingTTSId === (m.id || 'welcome')
                              ? 'text-blue-600 animate-pulse'
                              : loadingTTSId === (m.id || 'welcome')
                              ? 'text-blue-600'
                              : 'text-gray-400 hover:text-blue-600'
                          }`}
                          title={
                            playingTTSId === (m.id || 'welcome')
                              ? "Stop audio"
                              : loadingTTSId === (m.id || 'welcome')
                              ? "Preparing voice..."
                              : "Read aloud (once)"
                          }
                        >
                          {loadingTTSId === (m.id || 'welcome') ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </>
                    )}
                  </span>
                  <div className="flex items-center space-x-2">
                    {m.responseTime && (
                      <span className={`flex items-center gap-1 ${isUser ? 'text-blue-100' : 'text-green-600'}`}>
                        <Clock className="h-3 w-3" /> {(m.responseTime / 1000).toFixed(2)}s
                      </span>
                    )}
                    {m.model && (
                      <span className={`font-mono text-[10px] ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
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
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1 font-mono">
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
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 rounded-tl-sm text-xs font-mono text-gray-500 flex items-center space-x-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Retrieving relevant chunks & synthesizing citation-backed response via Neural RAG...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center space-x-3">
        <button
          type="button"
          onClick={toggleListening}
          className={`p-3 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0 ${
            isListening
              ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
              : 'bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300'
          }`}
          title="Dictate in regional language"
        >
          <Mic className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening..." : "Ask any parliamentary query, safety record, or report an incident..."}
          disabled={loading}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all ${
            !input.trim() || loading
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
          }`}
        >
          <span>Ask CoalGPT</span>
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}