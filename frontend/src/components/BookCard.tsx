"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, BookOpen, Tag, ExternalLink } from "lucide-react";
import type { Book } from "@/lib/api";

interface BookCardProps {
  book: Book;
  index?: number;
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const stars = Math.round(rating);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${s <= stars ? "star-filled fill-amber-400" : "star-empty"}`}
          style={{ width: "14px", height: "14px" }}
        />
      ))}
      <span style={{ fontSize: "12px", color: "#52525b", marginLeft: "6px", fontWeight: 500 }}>{rating.toFixed(1)}</span>
    </div>
  );
}

const SENTIMENT_STYLE: Record<string, { badge: string; emoji: string }> = {
  Positive: { badge: "badge-emerald", emoji: "😊" },
  Negative: { badge: "badge-red",     emoji: "😔" },
  Neutral:  { badge: "badge-slate",   emoji: "😐" },
  Mixed:    { badge: "badge-amber",   emoji: "🤔" },
};

export default function BookCard({ book }: BookCardProps) {
  const sentiment = SENTIMENT_STYLE[book.sentiment] ?? SENTIMENT_STYLE["Neutral"];

  return (
    <article
      className="group"
      style={{
        position: "relative",
        borderRadius: "16px",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Card surface */}
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "16px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-hover)";
          e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Cover image */}
        <div style={{ position: "relative", width: "100%", height: "220px", overflow: "hidden", background: "var(--bg-elevated)" }}>
          {book.cover_image_url ? (
            <Image
              src={book.cover_image_url}
              alt={`Cover of ${book.title}`}
              fill
              className="object-cover"
              style={{ transition: "transform 0.5s ease" }}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              unoptimized
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen style={{ width: "48px", height: "48px", color: "#27272a" }} />
            </div>
          )}

          {/* Bottom gradient */}
          <div style={{
            position: "absolute", inset: "auto 0 0 0", height: "80px",
            background: "linear-gradient(to top, var(--bg-card), transparent)",
            pointerEvents: "none",
          }} />

          {/* Genre badge */}
          {book.genre && (
            <div style={{ position: "absolute", top: "12px", left: "12px" }}>
              <span className="badge badge-violet">
                <Tag style={{ width: "12px", height: "12px" }} />
                {book.genre}
              </span>
            </div>
          )}

          {/* Sentiment badge */}
          {book.sentiment && (
            <div style={{ position: "absolute", top: "12px", right: "12px" }}>
              <span className={`badge ${sentiment.badge}`}>
                <span style={{ fontSize: "13px" }}>{sentiment.emoji}</span>
                {book.sentiment}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, gap: "6px" }}>
          {/* Title */}
          <h2
            style={{
              fontWeight: 700, fontSize: "15px", color: "#f4f4f5",
              lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0,
              transition: "color 0.2s ease",
            }}
            className="group-hover:text-violet-300"
          >
            {book.title}
          </h2>

          {/* Author */}
          <p style={{ fontSize: "12px", fontWeight: 500, color: "#52525b", letterSpacing: "0.03em", margin: 0 }}>
            {book.author !== "Unknown" ? book.author : "Author unknown"}
          </p>

          {/* Rating */}
          <StarRating rating={book.rating} />

          {/* Summary snippet */}
          {book.summary && (
            <p style={{
              fontSize: "13px", color: "#71717a", lineHeight: 1.6,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
              marginTop: "4px", margin: "4px 0 0 0",
            }}>
              {book.summary}
            </p>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Footer */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)",
          }}>
            {book.price ? (
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#34d399" }}>
                {book.price}
              </span>
            ) : (
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.1em" }}>Free</span>
            )}
            <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
              {book.book_url && (
                <a
                  href={book.book_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "8px", color: "#71717a", textDecoration: "none",
                    background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                    transition: "all 0.2s ease", zIndex: 20, cursor: "pointer",
                  }}
                  aria-label="Find book online"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink style={{ width: "16px", height: "16px" }} />
                </a>
              )}
              <Link
                href={`/book/${book.id}`}
                className="btn-primary"
                style={{ fontSize: "12px", padding: "8px 16px", textDecoration: "none", zIndex: 20 }}
              >
                Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
