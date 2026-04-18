"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, Star, Tag, BookOpen, ExternalLink,
  Sparkles, Brain, Smile, ChevronRight, Layers,
} from "lucide-react";
import { getBook, getRelatedBooks, type BookDetail, type Book } from "@/lib/api";
import { LoadingSpinner, ErrorState } from "@/components/LoadingStates";
import BookCard from "@/components/BookCard";

const SENTIMENT_CONFIG: Record<string, { badge: string; label: string; emoji: string }> = {
  Positive: { badge: "badge-emerald", label: "Positive", emoji: "😊" },
  Negative: { badge: "badge-red",     label: "Negative", emoji: "😔" },
  Neutral:  { badge: "badge-slate",   label: "Neutral",  emoji: "😐" },
  Mixed:    { badge: "badge-amber",   label: "Mixed",    emoji: "🤔" },
};

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const stars = Math.round(rating);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-5 h-5 ${s <= stars ? "star-filled fill-amber-400" : "star-empty"}`} />
      ))}
      <span style={{ color: "var(--text-secondary)", marginLeft: "4px", fontWeight: 500, fontSize: "14px" }}>{rating.toFixed(1)} / 5</span>
    </div>
  );
}

function InsightCard({ icon: Icon, title, children, color = "violet" }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  color?: "violet" | "emerald" | "blue" | "amber";
}) {
  const colorMap = {
    violet:  { bg: "rgba(124, 58, 237, 0.06)", border: "rgba(124, 58, 237, 0.15)", text: "#a78bfa" },
    emerald: { bg: "rgba(16, 185, 129, 0.06)", border: "rgba(16, 185, 129, 0.15)", text: "#34d399" },
    blue:    { bg: "rgba(99, 102, 241, 0.06)", border: "rgba(99, 102, 241, 0.15)", text: "#818cf8" },
    amber:   { bg: "rgba(245, 158, 11, 0.06)", border: "rgba(245, 158, 11, 0.15)", text: "#fbbf24" },
  };
  const c = colorMap[color];

  return (
    <div style={{ borderRadius: "14px", padding: "20px", background: c.bg, border: `1px solid ${c.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <Icon style={{ width: "16px", height: "16px", color: c.text }} />
        <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: c.text, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ color: "#d4d4d8", fontSize: "14px", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [book, setBook] = useState<BookDetail | null>(null);
  const [related, setRelated] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getBook(id),
      getRelatedBooks(id).catch(() => ({ related: [] })),
    ])
      .then(([bookData, relatedData]) => {
        setBook(bookData);
        setRelated(relatedData.related || []);
      })
      .catch(() => setError("Could not load book details. Please try again."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading book details…" />;
  if (error)   return <ErrorState message={error} onRetry={() => router.refresh()} />;
  if (!book)   return <ErrorState title="Book not found" />;

  const sentiment = SENTIMENT_CONFIG[book.sentiment] ?? SENTIMENT_CONFIG["Neutral"];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px" }}>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="group"
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          color: "var(--text-muted)", fontSize: "14px", fontWeight: 500,
          marginBottom: "32px", background: "none", border: "none",
          cursor: "pointer", transition: "color 0.2s",
        }}
      >
        <ArrowLeft style={{ width: "16px", height: "16px" }} />
        Back to Library
      </button>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px", marginBottom: "48px" }}>

        {/* Cover */}
        <div>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "2/3",
              borderRadius: "16px",
              overflow: "hidden",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}
          >
            {book.cover_image_url ? (
              <Image
                src={book.cover_image_url}
                alt={`Cover of ${book.title}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 33vw"
                unoptimized
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen style={{ width: "80px", height: "80px", color: "#27272a" }} />
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center" }}>
          {/* Genre badge */}
          {book.genre && (
            <span className="badge badge-violet" style={{ width: "fit-content" }}>
              <Tag style={{ width: "12px", height: "12px" }} />
              {book.genre}
            </span>
          )}

          {/* Title */}
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "36px",
              fontWeight: 800,
              color: "#f4f4f5",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {book.title}
          </h1>

          {/* Author */}
          {book.author && (
            <p style={{ color: "var(--text-muted)", fontSize: "16px", margin: 0 }}>
              by <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{book.author}</span>
            </p>
          )}

          {/* Rating */}
          <StarRating rating={book.rating} />

          {/* Meta pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
            {book.price && (
              <span
                style={{
                  padding: "6px 14px", borderRadius: "10px",
                  color: "#34d399", fontSize: "14px", fontWeight: 600,
                  background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)",
                }}
              >
                {book.price}
              </span>
            )}
            {book.review_count != null && (
              <span
                style={{
                  padding: "6px 14px", borderRadius: "10px",
                  color: "var(--text-secondary)", fontSize: "14px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                }}
              >
                {book.review_count} reviews
              </span>
            )}
            {book.sentiment && (
              <span className={`badge ${sentiment.badge}`}>
                {sentiment.emoji} {sentiment.label} tone
              </span>
            )}
          </div>

          {/* Description */}
          {book.description && (
            <div
              style={{
                borderRadius: "14px",
                padding: "16px",
                marginTop: "8px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>{book.description}</p>
            </div>
          )}

          {/* External link */}
          {book.book_url && (
            <a
              href={book.book_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{ width: "fit-content", marginTop: "4px", textDecoration: "none" }}
            >
              <ExternalLink style={{ width: "16px", height: "16px" }} />
              View on Books Site
            </a>
          )}
        </div>
      </div>

      {/* ── AI Insights ───────────────────────────────────────── */}
      <div className="fade-in" style={{ marginBottom: "48px", animationDelay: "0.1s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <Sparkles style={{ width: "20px", height: "20px", color: "#a78bfa" }} />
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 700, color: "#e4e4e7", margin: 0 }}>
            AI Insights
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {book.summary && (
            <InsightCard icon={Brain} title="AI Summary" color="violet">
              {book.summary}
            </InsightCard>
          )}
          {book.genre && (
            <InsightCard icon={Tag} title="Genre Classification" color="blue">
              <span style={{ fontSize: "22px", fontWeight: 700, color: "#818cf8" }}>{book.genre}</span>
              <p style={{ marginTop: "4px", color: "#52525b", fontSize: "12px" }}>Classified by AI based on description</p>
            </InsightCard>
          )}
          {book.sentiment && (
            <InsightCard icon={Smile} title="Sentiment Analysis" color={
              book.sentiment === "Positive" ? "emerald" :
              book.sentiment === "Negative" ? "violet" : "amber"
            }>
              <span style={{ fontSize: "22px", fontWeight: 700 }}>{sentiment.emoji} {sentiment.label}</span>
              <p style={{ marginTop: "4px", color: "#52525b", fontSize: "12px" }}>Tone detected from book description</p>
            </InsightCard>
          )}
        </div>
      </div>

      {/* ── Related Books ─────────────────────────────────────── */}
      {related.length > 0 && (
        <div className="fade-in" style={{ animationDelay: "0.2s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers style={{ width: "20px", height: "20px", color: "#a78bfa" }} />
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 700, color: "#e4e4e7", margin: 0 }}>
                Related Books
              </h2>
              <span style={{ fontSize: "11px", color: "#52525b", marginLeft: "4px", fontWeight: 500 }}>(vector similarity)</span>
            </div>
            <Link href="/" style={{ fontSize: "14px", color: "#a78bfa", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none", fontWeight: 500 }}>
              View all <ChevronRight style={{ width: "14px", height: "14px" }} />
            </Link>
          </div>

          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
            {related.map((b, i) => (
              <BookCard key={b.id} book={b} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
