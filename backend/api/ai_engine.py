"""
AI insight generation and RAG pipeline.

This module wraps the OpenAI-compatible API (works with both real OpenAI
and LM Studio running locally at http://localhost:1234/v1).

Features:
  - Summary generation
  - Genre classification
  - Sentiment analysis
  - Full RAG Q&A with source citations
  - Response caching (in-memory) to avoid repeated API calls
"""
import hashlib
import logging
from typing import Dict, Any, List, Tuple

from openai import OpenAI
from django.conf import settings

logger = logging.getLogger(__name__)

# ─── OpenAI client (singleton) ────────────────────────────────
_openai_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    """Return a cached OpenAI client configured for either cloud or LM Studio."""
    global _openai_client
    if _openai_client is None:
        kwargs = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            kwargs["base_url"] = settings.OPENAI_BASE_URL
        _openai_client = OpenAI(**kwargs)
        logger.info("OpenAI client initialized (base_url=%s)", settings.OPENAI_BASE_URL or "default")
    return _openai_client


# ─── In-process response cache ────────────────────────────────
_ai_cache: Dict[str, str] = {}
_CACHE_MAX = 512


def _cache_get(key: str) -> str | None:
    return _ai_cache.get(key)


def _cache_set(key: str, value: str) -> None:
    if len(_ai_cache) >= _CACHE_MAX:
        oldest = next(iter(_ai_cache))
        del _ai_cache[oldest]
    _ai_cache[key] = value


def _call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 512) -> str:
    """
    Call the configured LLM with caching.
    Returns the model's text response.
    """
    cache_key = hashlib.sha256(f"{system_prompt}||{user_prompt}".encode()).hexdigest()
    cached = _cache_get(cache_key)
    if cached:
        logger.debug("LLM cache hit.")
        return cached

    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        result = response.choices[0].message.content.strip()
        _cache_set(cache_key, result)
        return result
    except Exception as exc:
        logger.error("LLM call failed: %s", exc)
        return ""


# ─── Insight generators ───────────────────────────────────────

def generate_summary(title: str, description: str) -> str:
    """
    Generate a 2–4 sentence summary of the book.
    Falls back to a truncated description if LLM is unavailable.
    """
    if not description.strip():
        return ""

    system = (
        "You are a professional book editor. "
        "Write concise, engaging 2–4 sentence summaries."
    )
    user = (
        f"Book title: {title}\n\n"
        f"Description:\n{description[:2000]}\n\n"
        "Write a 2–4 sentence summary of this book."
    )
    result = _call_llm(system, user, max_tokens=200)
    # Fallback: truncate description
    if not result:
        return description[:300] + "..." if len(description) > 300 else description
    return result


def classify_genre(title: str, description: str) -> str:
    """
    Predict the book's genre from its title and description.
    Returns a short genre label (e.g. 'Mystery', 'Science Fiction').
    """
    system = (
        "You are a librarian expert at genre classification. "
        "Respond with ONLY the genre label — nothing else. "
        "Examples: Fiction, Mystery, Science Fiction, Romance, Fantasy, "
        "Non-Fiction, Biography, Self-Help, Horror, Thriller, Historical Fiction."
    )
    user = (
        f"Title: {title}\n"
        f"Description: {description[:1000]}\n\n"
        "What is the genre of this book? Respond with only the genre label."
    )
    result = _call_llm(system, user, max_tokens=30)
    return result or "Fiction"


def analyze_sentiment(description: str) -> str:
    """
    Analyze the overall sentiment/tone of the book description.
    Returns one of: Positive, Negative, Neutral, Mixed.
    """
    if not description.strip():
        return "Neutral"

    system = (
        "You are a sentiment analysis expert. "
        "Analyze the tone of text and respond with ONLY one word: "
        "Positive, Negative, Neutral, or Mixed."
    )
    user = f"Analyze the sentiment of this text:\n\n{description[:1000]}"
    result = _call_llm(system, user, max_tokens=10)
    valid = {"Positive", "Negative", "Neutral", "Mixed"}
    return result if result in valid else "Neutral"


def generate_all_insights(title: str, description: str) -> Dict[str, str]:
    """
    Run all three insight generators and return a dict.
    Batch-friendly: all three prompts are independent.
    """
    summary = generate_summary(title, description)
    genre = classify_genre(title, description)
    sentiment = analyze_sentiment(description)
    return {"summary": summary, "genre": genre, "sentiment": sentiment}


# ─── RAG Pipeline ─────────────────────────────────────────────

def rag_query(question: str, n_chunks: int = 5) -> Dict[str, Any]:
    """
    Full Retrieval-Augmented Generation pipeline:
      1. Embed the question (via sentence-transformers in vector_store)
      2. Retrieve the top-n most similar chunks from FAISS
      3. Build a context string with source citations
      4. Call the LLM to generate an answer grounded in the context
      5. Return answer + source citations

    Returns:
        {
            "answer": str,
            "sources": [{"book_id": int, "title": str, "chunk": str}, ...]
        }
    """
    from .vector_store import search_similar_chunks  # Avoid circular import

    # Step 1 & 2 — Retrieve similar chunks
    search_results = search_similar_chunks(question, n_results=n_chunks)
    documents = search_results.get("documents", [])
    metadatas = search_results.get("metadatas", [])
    distances = search_results.get("distances", [])

    if not documents:
        return {
            "answer": "I don't have enough information in my knowledge base to answer that question yet. Try uploading more books!",
            "sources": [],
        }

    # Step 3 — Build context with numbered citations
    context_parts = []
    sources = []
    seen_books = set()

    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances), start=1):
        book_id = meta.get("book_id", "?")
        title = meta.get("title", "Unknown Book")
        relevance = round((1 - dist) * 100, 1)  # Convert cosine distance to %

        context_parts.append(f"[Source {i}] \"{title}\" (relevance: {relevance}%):\n{doc}")
        sources.append({
            "source_index": i,
            "book_id": book_id,
            "title": title,
            "chunk": doc,
            "relevance_percent": relevance,
        })

    context = "\n\n".join(context_parts)

    # Step 4 — Generate answer
    system_prompt = (
        "You are a knowledgeable book assistant. "
        "Answer the user's question ONLY using the provided context excerpts. "
        "Cite sources by their [Source N] number inline. "
        "If the context does not contain enough information, say so honestly. "
        "Be concise, accurate, and helpful."
    )
    user_prompt = (
        f"Context from book database:\n\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer (cite sources inline using [Source N]):"
    )

    answer = _call_llm(system_prompt, user_prompt, max_tokens=600)
    if not answer:
        answer = f"Based on the retrieved context, here is what I found:\n\n{documents[0][:400]}"

    return {"answer": answer, "sources": sources}
