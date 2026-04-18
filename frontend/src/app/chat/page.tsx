"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Sparkles, BookOpen, User, ChevronDown,
  ChevronUp, Lightbulb, MessageSquare, Trash2,
} from "lucide-react";
import { askQuestion, type ChatSource } from "@/lib/api";
import { TypingIndicator } from "@/components/LoadingStates";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  timestamp: Date;
}

// ─── Sample questions ─────────────────────────────────────────
const SAMPLE_QUESTIONS = [
  "What are some mystery books in the library?",
  "Recommend a fantasy book with a positive tone.",
  "Which books have the highest ratings?",
  "Tell me about books related to self-improvement.",
  "What science fiction books do you have?",
  "Which books have dark or negative themes?",
];

// ─── Source Citation Card ──────────────────────────────────────
function SourceCard({ source }: { source: ChatSource }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        borderRadius: "12px",
        overflow: "hidden",
        fontSize: "12px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        transition: "all 0.2s ease",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", textAlign: "left" }}>
          <span
            style={{
              width: "20px", height: "20px", borderRadius: "6px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(124,58,237,0.15)", color: "#a78bfa",
              fontWeight: 700, fontSize: "10px", flexShrink: 0,
            }}
          >
            {source.source_index}
          </span>
          <span style={{ color: "#d4d4d8", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
            {source.title}
          </span>
          <span style={{ color: "#a78bfa", flexShrink: 0, fontWeight: 600 }}>{source.relevance_percent}%</span>
        </div>
        {expanded
          ? <ChevronUp style={{ width: "14px", height: "14px", color: "#52525b", flexShrink: 0 }} />
          : <ChevronDown style={{ width: "14px", height: "14px", color: "#52525b", flexShrink: 0 }} />
        }
      </button>

      {expanded && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--border)" }}>
          <p style={{ color: "#71717a", lineHeight: 1.6, paddingTop: "8px" }}>{source.chunk}</p>
          <Link
            href={`/book/${source.book_id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              marginTop: "8px", color: "#a78bfa", textDecoration: "none",
              fontSize: "12px", fontWeight: 500,
            }}
          >
            <BookOpen style={{ width: "12px", height: "12px" }} />
            View book details
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Chat message bubble ──────────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  const formatAnswer = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "<strong style='font-weight:600;color:#e4e4e7'>$1</strong>")
      .replace(
        /\[Source (\d+)\]/g,
        '<span style="display:inline-flex;align-items:center;padding:1px 6px;border-radius:6px;background:rgba(124,58,237,0.15);color:#c4b5fd;font-size:10px;font-weight:700;border:1px solid rgba(124,58,237,0.2);margin:0 3px">[S$1]</span>'
      );

  return (
    <div className="fade-in" style={{ display: "flex", gap: "12px", flexDirection: isUser ? "row-reverse" : "row" }}>
      {/* Avatar */}
      <div
        style={{
          width: "36px", height: "36px", borderRadius: "10px",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          ...(isUser ? {
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.15)",
          } : {
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
          }),
        }}
      >
        {isUser
          ? <User style={{ width: "16px", height: "16px", color: "#a78bfa" }} />
          : <Sparkles style={{ width: "16px", height: "16px", color: "#fff" }} />
        }
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: "8px", alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div
          style={{
            padding: "14px 18px",
            fontSize: "14px",
            lineHeight: 1.7,
            ...(isUser ? {
              background: "var(--accent)",
              color: "#fff",
              borderRadius: "16px 16px 4px 16px",
              boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
            } : {
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "16px 16px 16px 4px",
            }),
          }}
        >
          {isUser ? (
            <p style={{ fontWeight: 500, margin: 0 }}>{message.content}</p>
          ) : (
            <div
              style={{ fontWeight: 300, letterSpacing: "0.01em" }}
              dangerouslySetInnerHTML={{ __html: formatAnswer(message.content) }}
            />
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            <p style={{
              fontSize: "11px", fontWeight: 600, color: "#52525b",
              display: "flex", alignItems: "center", gap: "6px",
              letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "2px",
            }}>
              <BookOpen style={{ width: "12px", height: "12px", color: "#a78bfa" }} />
              Sources
            </p>
            {message.sources.map((s) => (
              <SourceCard key={s.source_index} source={s} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span style={{ fontSize: "10px", color: "#3f3f46", fontWeight: 500, marginTop: "2px" }}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Main Chat Page ────────────────────────────────────────────
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi! I'm **BookBrain AI**, powered by a RAG pipeline over your book library. Ask me anything about the books — I'll search the vector database and give you a grounded answer with citations.\n\nTry one of the sample questions below to get started!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await askQuestion(question.trim());
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "⚠️ Sorry, I couldn't connect to the backend. Make sure the Django server is running on port 8000.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-2",
        role: "assistant",
        content: "Chat cleared! Ask me anything about your books.",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 32px", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div className="fade-in" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexShrink: 0 }}>
        <div>
          <div className="badge badge-violet" style={{ marginBottom: "12px" }}>
            <MessageSquare style={{ width: "14px", height: "14px" }} />
            RAG-Powered Q&amp;A
          </div>
          <h1
            className="gradient-text"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Ask Your Library
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            Answers grounded in vector similarity search + LLM generation with citations.
          </p>
        </div>
        <button
          onClick={clearChat}
          title="Clear chat"
          style={{
            padding: "10px",
            borderRadius: "10px",
            color: "#52525b",
            background: "none",
            border: "1px solid var(--border)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <Trash2 style={{ width: "16px", height: "16px" }} />
        </button>
      </div>

      {/* Sample questions */}
      {messages.length <= 1 && (
        <div className="fade-in" style={{ marginBottom: "20px", flexShrink: 0 }}>
          <p style={{ fontSize: "11px", color: "#52525b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", fontWeight: 600 }}>
            <Lightbulb style={{ width: "14px", height: "14px", color: "#f59e0b" }} />
            Try asking:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#71717a",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginBottom: "16px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="fade-in" style={{ display: "flex", gap: "12px" }}>
            <div
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              }}
            >
              <Sparkles style={{ width: "16px", height: "16px", color: "#fff" }} />
            </div>
            <div
              style={{
                borderRadius: "16px 16px 16px 4px",
                padding: "4px 8px",
                display: "flex", alignItems: "center",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ flexShrink: 0, paddingTop: "8px" }}>
        <form
          onSubmit={handleSubmit}
          style={{
            position: "relative",
            borderRadius: "16px",
            padding: "12px 12px 12px 20px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            transition: "all 0.2s ease",
          }}
        >
          <textarea
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask BookBrain anything about your library..."
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "14px",
              resize: "none",
              border: "none",
              outline: "none",
              lineHeight: 1.6,
              maxHeight: "160px",
              overflowY: "auto",
              minHeight: "28px",
              marginTop: "4px",
              fontFamily: "'Inter', sans-serif",
            }}
            disabled={loading}
          />
          <button
            id="send-btn"
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              width: "40px", height: "40px", borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, border: "none", cursor: (!input.trim() || loading) ? "not-allowed" : "pointer",
              transition: "all 0.2s ease", marginBottom: "2px",
              background: (!input.trim() || loading) ? "var(--bg-elevated)" : "var(--accent)",
              color: (!input.trim() || loading) ? "var(--text-muted)" : "#fff",
              boxShadow: (!input.trim() || loading) ? "none" : "0 2px 8px rgba(124,58,237,0.3)",
            }}
          >
            <Send style={{ width: "16px", height: "16px" }} />
          </button>
        </form>
      </div>

      <p style={{ textAlign: "center", fontSize: "10px", color: "#27272a", marginTop: "8px" }}>
        Powered by ChromaDB + Sentence Transformers + LLM
      </p>
    </div>
  );
}
