"use client";

/** Shimmer skeleton card for the book grid loading state */
export function BookCardSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="shimmer w-full h-56" />
      <div className="p-5 flex flex-col gap-3">
        <div className="shimmer h-4 rounded-lg w-3/4" />
        <div className="shimmer h-3 rounded-lg w-1/3" />
        <div className="shimmer h-3 rounded-lg w-1/4" />
        <div className="shimmer h-10 rounded-lg w-full mt-1" />
        <div
          className="flex justify-between items-center pt-3 mt-1"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="shimmer h-4 rounded w-14" />
          <div className="shimmer h-8 rounded-lg w-20" />
        </div>
      </div>
    </div>
  );
}

/** Full-page loading spinner */
export function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5">
      <div className="relative w-10 h-10">
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: "2px solid rgba(124, 58, 237, 0.15)" }}
        />
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{ border: "2px solid transparent", borderTopColor: "var(--accent)" }}
        />
      </div>
      <p className="text-zinc-500 text-sm font-medium">{label}</p>
    </div>
  );
}

/** Inline typing indicator for chat */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}

/** Generic error state */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5 text-center px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.15)",
        }}
      >
        <span className="text-2xl">⚠️</span>
      </div>
      <div>
        <h3 className="text-zinc-200 font-semibold text-base">{title}</h3>
        {message && <p className="text-zinc-500 text-sm mt-1.5 max-w-md">{message}</p>}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-sm">
          Try Again
        </button>
      )}
    </div>
  );
}

/** Empty state illustration */
export function EmptyState({ message = "No books found" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-5xl select-none opacity-60">📚</div>
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  );
}
