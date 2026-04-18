"""
Vector store utilities using FAISS + Sentence-Transformers.

Architecture:
  - We maintain a local FAISS index (`faiss_index.bin`)
  - Metadata is stored in a linked JSON file (`faiss_metadata.json`)
    Each chunk gets an integer ID in FAISS, which maps to metadata in JSON.
  - Chunks are stored with metadata: book_id, title, chunk_index, text
  - Similarity search returns chunks → we aggregate context for RAG

Caching:
  - The embedding model is loaded once at module level (singleton)
  - Query embeddings are cached
"""
import os
import json
import hashlib
import logging
from typing import List, Dict, Any

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from django.conf import settings

logger = logging.getLogger(__name__)

# ─── File paths ───────────────────────────────────────────────
FAISS_DIR = getattr(settings, "CHROMA_PERSIST_DIR", os.path.join(str(settings.BASE_DIR), "faiss_db"))
INDEX_PATH = os.path.join(FAISS_DIR, "faiss_index.bin")
METADATA_PATH = os.path.join(FAISS_DIR, "faiss_metadata.json")

# ─── State ────────────────────────────────────────────────────
_embedding_model: SentenceTransformer | None = None
_faiss_index: faiss.Index | None = None
_metadata: Dict[str, Any] = {}  # stringified int -> dict
_dim = 384  # Dimension for all-MiniLM-L6-v2

def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading embedding model: %s", settings.EMBEDDING_MODEL)
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _embedding_model

def _load_store():
    global _faiss_index, _metadata
    os.makedirs(FAISS_DIR, exist_ok=True)
    if _faiss_index is None:
        if os.path.exists(INDEX_PATH):
            _faiss_index = faiss.read_index(INDEX_PATH)
        else:
            _faiss_index = faiss.IndexFlatIP(_dim) # Cosine similarity = FlatIP with L2 normalized vectors
    if not _metadata:
        if os.path.exists(METADATA_PATH):
            try:
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    _metadata = json.load(f)
            except Exception as e:
                logger.error("Failed to load metadata: %s", e)
                _metadata = {}
                _faiss_index = faiss.IndexFlatIP(_dim) # reset index if metadata is corrupt

def _save_store():
    global _faiss_index, _metadata
    if _faiss_index is not None:
        faiss.write_index(_faiss_index, INDEX_PATH)
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(_metadata, f)

def get_vector_count() -> int:
    _load_store()
    return _faiss_index.ntotal if _faiss_index else 0

# ─── Chunking strategy ────────────────────────────────────────
def chunk_text(text: str, chunk_size: int = 400, overlap: int = 80) -> List[str]:
    if not text or len(text) < chunk_size:
        return [text] if text.strip() else []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            while end < len(text) and text[end] != " ":
                end += 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
        if start <= 0:
            start = end

    return chunks

# ─── Indexing ─────────────────────────────────────────────────
def index_book(book_id: int, title: str, text: str) -> int:
    _load_store()
    global _faiss_index, _metadata
    model = get_embedding_model()

    # In FAISS Flat, deleting is slow and changes IDs. 
    # For simplicity in this demo, we'll just soft-delete by removing them from metadata,
    # or honestly just append since it's an assignment. We'll mark old ones deleted.
    to_delete = [
        faiss_id for faiss_id, meta in _metadata.items()
        if meta.get("book_id") == book_id
    ]
    for fid in to_delete:
        # soft delete
        _metadata[fid]["deleted"] = True

    chunks = chunk_text(text)
    if not chunks:
        return 0

    embeddings = model.encode(chunks, show_progress_bar=False)
    # L2 normalize for cosine similarity via FlatIP
    faiss.normalize_L2(embeddings)

    start_id = _faiss_index.ntotal
    _faiss_index.add(embeddings)

    for i, chunk in enumerate(chunks):
        _metadata[str(start_id + i)] = {
            "book_id": book_id,
            "title": title,
            "chunk_index": i,
            "text": chunk,
            "deleted": False
        }

    _save_store()
    logger.info("Indexed %d chunks for book '%s' (id=%d)", len(chunks), title, book_id)
    return len(chunks)

# ─── Similarity search ────────────────────────────────────────
_query_cache: Dict[str, Any] = {}

def search_similar_chunks(query: str, n_results: int = 5) -> Dict[str, Any]:
    _load_store()
    cache_key = hashlib.sha256(query.encode()).hexdigest()
    if cache_key in _query_cache:
        return _query_cache[cache_key]

    model = get_embedding_model()
    query_emb = model.encode([query], show_progress_bar=False)
    faiss.normalize_L2(query_emb)

    total_docs = _faiss_index.ntotal if _faiss_index else 0
    if total_docs == 0:
        return {"documents": [], "metadatas": [], "distances": []}

    # Fetch more in case of soft-deleted records
    k = min(n_results * 5, total_docs)
    distances, indices = _faiss_index.search(query_emb, k)

    docs, metas, dists = [], [], []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1: continue
        meta = _metadata.get(str(idx))
        if not meta or meta.get("deleted"):
            continue
        
        # FAISS FlatIP returns dot product. Cosine distance = 1 - dot product
        dist_val = 1.0 - float(dist)
        
        docs.append(meta["text"])
        metas.append({"book_id": meta["book_id"], "title": meta["title"]})
        dists.append(dist_val)
        
        if len(docs) == n_results:
            break

    output = {"documents": docs, "metadatas": metas, "distances": dists}
    if len(_query_cache) >= 256:
        _query_cache.pop(next(iter(_query_cache)))
    _query_cache[cache_key] = output
    return output

def get_related_book_ids(book_id: int, n: int = 5) -> List[int]:
    _load_store()
    model = get_embedding_model()

    # Find chunks for this book
    book_chunks = [
        meta["text"] for fid, meta in _metadata.items()
        if meta.get("book_id") == book_id and not meta.get("deleted")
    ]
    if not book_chunks:
        return []

    embeddings = model.encode(book_chunks, show_progress_bar=False)
    faiss.normalize_L2(embeddings)
    
    # Centroid
    centroid = np.mean(embeddings, axis=0, keepdims=True)
    faiss.normalize_L2(centroid)

    total_docs = _faiss_index.ntotal if _faiss_index else 0
    if total_docs == 0: return []

    k = min(n * 20, total_docs)
    _, indices = _faiss_index.search(centroid, k)

    seen_ids = set()
    related_ids = []
    for idx in indices[0]:
        if idx == -1: continue
        meta = _metadata.get(str(idx))
        if not meta or meta.get("deleted"): continue
        
        bid = meta["book_id"]
        if bid and bid != book_id and bid not in seen_ids:
            seen_ids.add(bid)
            related_ids.append(bid)
        if len(related_ids) >= n:
            break

    return related_ids
