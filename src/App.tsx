/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Server,
  Cpu,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Database,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen,
  CloudOff,
  Terminal,
} from "lucide-react";
import { Message, HealthResponse } from "./types";

export default function App() {
  // State definitions
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const STORAGE_KEY = "smart-ai-support-history";
  const initialWelcomeMessage: Message = {
    id: "welcome-message",
    sender: "bot",
    text: "Hello! I'm your Smart AI Support Assistant, powered by Google Gemini. How can I help you today?",
    timestamp: Date.now(),
    providerUsed: "System Welcome",
  };

  // Audio effect context for simulated keystroke / bot notifications
  const [soundEnabled] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Precompiled typical diagnostic prompt questions
  const SUGGESTED_TEMPLATES = [
    {
      label: "Pricing Plans",
      text: "What are your support and pricing plans?",
      icon: "💳",
    },
    {
      label: "Request Refund",
      text: "Can I cancel my subscription and get a refund?",
      icon: "🔄",
    },
    {
      label: "Track Package",
      text: "Where is my package delivery and order number?",
      icon: "📦",
    },
    {
      label: "Password Reset",
      text: "How do I reset my locked account password?",
      icon: "🔐",
    },
    {
      label: "Report a Bug",
      text: "The customer dashboard is slow and shows errors.",
      icon: "⚙️",
    },
  ];

  // Load saved conversation and health status on mount
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setMessages([initialWelcomeMessage]);
        }
      } catch {
        setMessages([initialWelcomeMessage]);
      }
    } else {
      setMessages([initialWelcomeMessage]);
    }

    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Safe window scrolling to keep conversations fully aligned with latest answer
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading, loadingStep]);

  // Read backend configuration and diagnostic parameters
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch("/api/health");
      if (response.ok) {
        const data: HealthResponse = await response.json();
        setHealth(data);
        setConnectionError(false);
        setHealthError(null);
      } else {
        const text = await response.text();
        setHealthError(`Health API returned ${response.status}: ${text}`);
        setConnectionError(true);
      }
    } catch (err) {
      console.error("Failed to fetch backend health data:", err);
      setHealthError(String(err));
      setConnectionError(true);
    }
  };

  // Submit client inquiry
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend || textToSend.trim() === "" || isLoading) return;

    const trimmedInput = textToSend.trim();
    setInputText("");
    setIsLoading(true);

    // Initial state: simulated dispatch log
    setLoadingStep("Sending message to Gemini...");

    const ticks = [
      { delay: 600, text: "Waiting for Gemini response..." },
    ];

    const timers = ticks.map((tick) =>
      setTimeout(() => setLoadingStep(tick.text), tick.delay)
    );

    // Optimistically push the user message into the messages list so they see it instantly
    const tempUserMessage: Message = {
      id: "temp_" + Date.now(),
      sender: "user",
      text: trimmedInput,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Direct post payload sending
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput }),
      });

      // Cancel simulated ticks
      timers.forEach(clearTimeout);

      if (response.ok) {
        const data = await response.json();
        const botMessage: Message = {
          id: "bot_" + Date.now(),
          sender: "bot",
          text: data.response,
          timestamp: Date.now(),
          providerUsed: data.providerUsed,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMsg: Message = {
          id: "error_" + Date.now(),
          sender: "bot",
          text: "### ❌ Connection Throttled\nThe application is experiencing runtime request failures. Please verify your backend server is active and try again.",
          timestamp: Date.now(),
          providerUsed: "Failover Handler",
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      timers.forEach(clearTimeout);
      console.error("Critical chat error:", error);
      const offlineMsg: Message = {
        id: "offline_" + Date.now(),
        sender: "bot",
        text: "### 📴 Sync Failure\nCould not reach the API. Check that `/api/chat` is deployed and that your AI API keys are set in Vercel Environment Variables (then redeploy).",
        timestamp: Date.now(),
        providerUsed: "Offline Sandbox Catch",
      };
      setMessages((prev) => [...prev, offlineMsg]);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
      fetchHealthStatus(); // Refresh statuses and hit statistics
    }
  };

  // Custom regex Markdown styling engine
  const renderStyledMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // 1. Headers Check
      if (line.startsWith("### ")) {
        return (
          <h3
            key={idx}
            className="text-sm font-semibold text-slate-800 mt-2.5 mb-1 flex items-center gap-1.5"
          >
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2
            key={idx}
            className="text-base font-bold text-slate-900 mt-3.5 mb-1.5 border-b border-dashed border-slate-200 pb-0.5"
          >
            {line.replace("## ", "")}
          </h2>
        );
      }

      // 2. Unordered lists Check
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        const content = line.replace(/^[\s]*[-*]\s+/, "");
        return (
          <li
            key={idx}
            className="ml-5 list-disc text-xs text-slate-600 mb-0.5 leading-relaxed"
          >
            {parseInlineStyling(content)}
          </li>
        );
      }

      // 3. Ordered lists Check
      const orderedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (orderedMatch) {
        const num = orderedMatch[1];
        const content = orderedMatch[2];
        return (
          <li
            key={idx}
            className="ml-5 list-decimal text-xs text-slate-600 mb-0.5 leading-relaxed"
          >
            {parseInlineStyling(content)}
          </li>
        );
      }

      // 4. Blank lines Check
      if (line.trim() === "") {
        return <div key={idx} className="h-1.5" />;
      }

      // 5. Standard Paragraph text
      return (
        <p
          key={idx}
          className="text-xs text-slate-600 mb-1 leading-relaxed break-words"
        >
          {parseInlineStyling(line)}
        </p>
      );
    });
  };

  // Inline highlights parser (**bold** and `code`)
  const parseInlineStyling = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-800">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-mono text-amber-800"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="h-screen w-full bg-[#f8fafc] text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Upper Status Ribbon (Geometric Balance Theme) */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center select-none">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="font-bold text-lg tracking-tight">
            Smart AI <span className="text-indigo-600">Support Assistant</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              fetchHealthStatus();
            }}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1 cursor-pointer"
            title="Full dynamic check"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionError ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {connectionError ? "Offline Mode" : "System Online"}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Model</span>
            <span className="text-xs font-medium text-slate-700">
              {health?.config?.geminiEnabled
                ? health.config.geminiModel
                : "Not configured"}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Conversation History & Live Configurations */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
          <div className="p-4">
            <button
              onClick={() => {
                // Instantly wipe history to initial welcome message
                setMessages([
                  {
                    id: "welcome-message",
                    sender: "bot",
                    text: "Hello! History has been refreshed. I am your Smart AI Support Assistant. Ready to help with any details!",
                    timestamp: Date.now(),
                    providerUsed: "Reset Trigger",
                  }
                ]);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Recent Templates
            </div>
            {SUGGESTED_TEMPLATES.map((tmpl, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(tmpl.text)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition text-left cursor-pointer disabled:opacity-50"
              >
                <span className="text-sm shrink-0">{tmpl.icon}</span>
                <span className="truncate">{tmpl.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 flex flex-col gap-3">
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Environment Status</h3>
              <ul className="space-y-2 font-mono text-[10px]">
                <li className="flex justify-between">
                  <span className="text-slate-500">GEMINI_API_KEY</span>
                  {health?.config?.geminiEnvStatus === "valid" ? (
                    <span className="text-indigo-600 font-bold">READY</span>
                  ) : health?.config?.geminiEnvStatus === "placeholder" ? (
                    <span className="text-amber-500 font-bold">INVALID</span>
                  ) : (
                    <span className="text-slate-400 font-bold">MISSING</span>
                  )}
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">MODEL</span>
                  <span className="text-slate-600 font-bold truncate max-w-[8rem]">
                    {health?.config?.geminiModel || "—"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">KEY_LEN</span>
                  <span className="text-slate-600 font-bold">
                    {health?.config?.keyLength ?? 0}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">VERCEL</span>
                  <span className="text-slate-600 font-bold">
                    {health?.config?.onVercel ? "YES" : "NO"}
                  </span>
                </li>
              </ul>
            </div>

            {/* Simulated Live Terminal output inside Sidebar */}
            <div className="bg-slate-900 text-[9px] text-slate-400 font-mono rounded-lg p-2.5 leading-normal">
              <span className="text-emerald-500">SYSTEM LOG: </span>
              <span>Gemini-only routing</span>
            </div>
            {healthError && (
              <div className="bg-rose-950 text-[10px] text-rose-200 font-mono rounded-lg p-3 mt-3 leading-normal">
                <div className="font-bold uppercase tracking-wider text-rose-300 mb-1">Health check failed</div>
                <div>{healthError}</div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content: Chat Interface */}
        <main className="flex-1 flex flex-col relative bg-[#f8fafc] overflow-hidden">
          {/* Messages Area */}
          <div
            ref={containerRef}
            className="flex-1 p-8 space-y-6 overflow-y-auto"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Database className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700">No cached conversations</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Reload status check or choose any support scenarios template on the sidebar!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.sender === "user") {
                  return (
                    <div key={msg.id} className="flex items-start justify-end gap-4 max-w-3xl ml-auto">
                      <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text}
                      </div>
                      <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600 select-none uppercase">
                        ME
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={msg.id} className="flex items-start gap-4 max-w-3xl">
                      <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 select-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-sm leading-relaxed text-slate-800 flex-1">
                        <div className="space-y-1">
                          {renderStyledMarkdown(msg.text)}
                        </div>
                        {msg.providerUsed && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                            <span className="italic">
                              Generated via {msg.providerUsed}
                            </span>
                            <span className="font-mono text-[9px] bg-slate-50 px-1.5 py-0.5 border border-slate-200/50 rounded">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })
            )}

            {/* Staggered progress pipeline animation loader */}
            {isLoading && (
              <div className="flex items-start gap-4 max-w-3xl">
                <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-400 select-none animate-pulse">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-sm text-slate-800 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold">
                      CALLING GEMINI...
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-150 truncate">
                    &gt; {loadingStep || "Analyzing local weights..."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area (Geometric Balance Theme) */}
          <div className="h-32 bg-white border-t border-slate-200 p-6 shrink-0 z-10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="max-w-4xl mx-auto flex gap-4"
            >
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isLoading}
                  placeholder={isLoading ? "Computing inference chain..." : "Type your support question here..."}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-6 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-60"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 text-slate-300">
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-sans">
                    Enter
                  </kbd>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="h-14 px-8 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50 shadow-xs shrink-0"
              >
                <span>Send Message</span>
                <svg className="w-4 h-4 translate-y-[0.5px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
            <div className="mt-3 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Powered by Google Gemini
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
