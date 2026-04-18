"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, BookOpen, Cpu, Database, Sparkles, X } from "lucide-react";
import { getBooks, getHealth, type Book, type BooksResponse } from "@/lib/api";
import BookCard from "@/components/BookCard";
import { BookCardSkeleton, ErrorState, EmptyState } from "@/components/LoadingStates";

const GENRES = [
  "All", "Fiction", "Mystery", "Science Fiction", "Romance", "Fantasy",
  "Non-Fiction", "Biography", "Self-Help", "Horror", "Thriller", "Historical Fiction",
];

function StatCard({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex items-center gap-4 transition-all duration-200 group cursor-default"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: "var(--accent-surface)",
          border: "1px solid rgba(124, 58, 237, 0.15)",
        }}
      >
        <Icon className="w-5 h-5 text-violet-400" />
      </div>
      <div>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<BooksResponse | null>(null);
  const [health, setHealth] = useState<{ books_in_db: number; chunks_in_vector_db: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [genre, setGenre] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBooks({ page, page_size: 12, search: search || undefined, genre: genre || undefined });
      setData(result);
    } catch (e) {
      setError("Failed to connect to the backend. Make sure Django is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }, [page, search, genre]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 32px" }}>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <div
        className="fade-in"
        style={{
          position: "relative",
          marginBottom: "48px",
          padding: "56px 40px",
          borderRadius: "20px",
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.06) 0%, rgba(99, 102, 241, 0.04) 50%, var(--bg-card) 100%)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Decorative gradient orb */}
        <div
          style={{
            position: "absolute", top: "-100px", right: "-100px",
            width: "320px", height: "320px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)",
            filter: "blur(60px)", pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: "640px", margin: "0 auto" }}>
          <div className="badge badge-violet" style={{ marginBottom: "24px" }}>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AI-Powered Intelligence
          </div>
          <h1
            className="gradient-text-hero"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "clamp(40px, 6vw, 72px)",
              fontWeight: 800,
              marginBottom: "16px",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Discover Brilliance.
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px", maxWidth: "560px", lineHeight: 1.7, fontWeight: 300 }}>
            Your personal AI librarian — analyzing every page to extract{" "}
            <span style={{ color: "#a78bfa", fontWeight: 500 }}>sentiments</span>, classify{" "}
            <span style={{ color: "#818cf8", fontWeight: 500 }}>genres</span>, and let you{" "}
            <span style={{ color: "#34d399", fontWeight: 500 }}>chat</span> with your entire collection.
          </p>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────── */}
      {health && (
        <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "40px" }}>
          <StatCard icon={BookOpen} label="Books in Library" value={health.books_in_db} />
          <StatCard icon={Database} label="Vector Chunks" value={health.chunks_in_vector_db.toLocaleString()} />
          <StatCard icon={Cpu} label="AI-Enhanced" value="All books" />
        </div>
      )}

      {/* ── Search & Filter Bar ───────────────────────────────── */}
      <div
        className="fade-in"
        style={{
          display: "flex",
          gap: "8px",
          padding: "6px",
          borderRadius: "14px",
          marginBottom: "32px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <form onSubmit={handleSearch} style={{ position: "relative", flex: 1 }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "16px", display: "flex", alignItems: "center", pointerEvents: "none" }}>
            <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </div>
          <input
            id="search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or author…"
            style={{
              width: "100%",
              paddingLeft: "44px",
              paddingRight: "40px",
              paddingTop: "12px",
              paddingBottom: "12px",
              borderRadius: "10px",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "14px",
              border: "none",
              outline: "none",
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              style={{
                position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                padding: "4px", background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        <div style={{ width: "1px", background: "var(--border)", margin: "4px 0" }} />

        {/* Genre filter */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", minWidth: "180px" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "16px", display: "flex", alignItems: "center", pointerEvents: "none" }}>
            <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </div>
          <select
            id="genre-filter"
            value={genre}
            onChange={(e) => { setGenre(e.target.value === "All" ? "" : e.target.value); setPage(1); }}
            style={{
              width: "100%",
              paddingLeft: "44px",
              paddingRight: "32px",
              paddingTop: "12px",
              paddingBottom: "12px",
              borderRadius: "10px",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: "14px",
              border: "none",
              outline: "none",
              appearance: "none" as const,
              cursor: "pointer",
            }}
          >
            {GENRES.map((g) => (
              <option key={g} value={g === "All" ? "" : g} style={{ background: "#16161d", color: "#d4d4d8" }}>
                {g}
              </option>
            ))}
          </select>
          <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Active Filters ────────────────────────────────────── */}
      {(search || genre) && (
        <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>Filters:</span>
          {search && (
            <span className="badge badge-violet">
              &quot;{search}&quot;
              <button onClick={clearSearch} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", marginLeft: "2px" }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {genre && (
            <span className="badge badge-violet">
              {genre}
              <button onClick={() => setGenre("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", marginLeft: "2px" }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Count Label ───────────────────────────────────────── */}
      {data && !loading && (
        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "20px", fontWeight: 500 }}>
          Showing {data.results.length} of {data.count} books
          {data.total_pages > 1 && ` · Page ${data.page} of ${data.total_pages}`}
        </p>
      )}

      {/* ── Book Grid ─────────────────────────────────────────── */}
      {error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 8 }).map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      ) : data?.results.length === 0 ? (
        <EmptyState message="No books found. Try running the scraper or adjusting your filters." />
      ) : (
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
          {data?.results.map((book: Book, i: number) => (
            <BookCard key={book.id} book={book} index={i} />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────── */}
      {data && data.total_pages > 1 && !loading && (
        <div className="fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "48px" }}>
          <button
            id="prev-page"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost"
            style={{ fontSize: "13px", opacity: page <= 1 ? 0.3 : 1, cursor: page <= 1 ? "not-allowed" : "pointer" }}
          >
            ← Prev
          </button>

          <div style={{ display: "flex", gap: "4px" }}>
            {Array.from({ length: data.total_pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === data.total_pages)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span style={{ padding: "0 4px", color: "#3f3f46" }}>…</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    style={{
                      width: "36px", height: "36px", borderRadius: "8px",
                      fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer",
                      background: p === page ? "var(--accent)" : "transparent",
                      color: p === page ? "#fff" : "var(--text-muted)",
                      boxShadow: p === page ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {p}
                  </button>
                </span>
              ))}
          </div>

          <button
            id="next-page"
            disabled={page >= data.total_pages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost"
            style={{ fontSize: "13px", opacity: page >= data.total_pages ? 0.3 : 1, cursor: page >= data.total_pages ? "not-allowed" : "pointer" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
