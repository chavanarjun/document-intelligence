"""
API Views for the Document Intelligence Platform.

Endpoints:
  GET  /api/books/              — List all books
  GET  /api/books/<id>/         — Book detail
  GET  /api/books/<id>/related/ — Related book recommendations
  POST /api/upload/             — Ingest a new book (triggers AI insights + embedding)
  POST /api/chat/               — RAG question-answering endpoint
  GET  /api/health/             — Health check
"""
import logging

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Book
from .serializers import BookListSerializer, BookDetailSerializer, BookUploadSerializer
from .ai_engine import generate_all_insights, rag_query
from .vector_store import index_book, get_related_book_ids

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
# GET /api/books/
# ──────────────────────────────────────────────────────────────
@api_view(["GET"])
def book_list(request):
    """
    Return a paginated list of all books.
    Query params:
      - page (int, default=1)
      - page_size (int, default=20, max=100)
      - search (str) — filter by title or author
      - genre (str)  — filter by genre
    """
    books = Book.objects.all()

    # Filtering
    search = request.query_params.get("search", "").strip()
    if search:
        books = books.filter(title__icontains=search) | books.filter(author__icontains=search)

    genre = request.query_params.get("genre", "").strip()
    if genre:
        books = books.filter(genre__iexact=genre)

    # Pagination
    try:
        page = max(1, int(request.query_params.get("page", 1)))
        page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
    except ValueError:
        page, page_size = 1, 20

    total = books.count()
    start = (page - 1) * page_size
    end = start + page_size
    page_books = books[start:end]

    serializer = BookListSerializer(page_books, many=True)
    return Response({
        "count": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "results": serializer.data,
    })


# ──────────────────────────────────────────────────────────────
# GET /api/books/<id>/
# ──────────────────────────────────────────────────────────────
@api_view(["GET"])
def book_detail(request, pk):
    """Return full detail of a single book including AI insights."""
    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response({"error": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = BookDetailSerializer(book)
    return Response(serializer.data)


# ──────────────────────────────────────────────────────────────
# GET /api/books/<id>/related/
# ──────────────────────────────────────────────────────────────
@api_view(["GET"])
def book_related(request, pk):
    """
    Return up to 5 related books for the given book.
    Uses centroid-based vector similarity in FAISS.
    Falls back to same-genre books if no vector data exists.
    """
    try:
        book = Book.objects.get(pk=pk)
    except Book.DoesNotExist:
        return Response({"error": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

    related_ids = get_related_book_ids(pk, n=5)

    if related_ids:
        related_books = Book.objects.filter(id__in=related_ids)
        # Preserve the order returned by vector search
        id_order = {book_id: i for i, book_id in enumerate(related_ids)}
        related_books = sorted(related_books, key=lambda b: id_order.get(b.id, 999))
    else:
        # Fallback: same genre, excluding self
        related_books = Book.objects.filter(genre=book.genre).exclude(pk=pk)[:5]

    serializer = BookListSerializer(related_books, many=True)
    return Response({
        "book_id": pk,
        "related": serializer.data,
        "method": "vector_similarity" if related_ids else "genre_fallback",
    })


# ──────────────────────────────────────────────────────────────
# POST /api/upload/
# ──────────────────────────────────────────────────────────────
@api_view(["POST"])
def book_upload(request):
    """
    Ingest a book into the system.
    Steps:
      1. Validate and save metadata to the SQL database
      2. Generate AI insights (summary, genre, sentiment) via LLM
      3. Index the book's text into FAISS for RAG
    Idempotency: if a book with the same title already exists,
    it updates the record instead of creating a duplicate.
    """
    serializer = BookUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    validated = serializer.validated_data
    title = validated.get("title", "")

    # Upsert: find or create
    book, created = Book.objects.get_or_create(
        title=title,
        defaults=validated,
    )
    if not created:
        # Update existing record with new data
        for field, value in validated.items():
            setattr(book, field, value)

    # Generate AI insights
    description = book.description or ""
    logger.info("%s book '%s' — generating AI insights...", "Creating" if created else "Updating", title)
    try:
        insights = generate_all_insights(title, description)
        book.summary = insights.get("summary", "")
        book.genre = insights.get("genre", "")
        book.sentiment = insights.get("sentiment", "")
    except Exception as exc:
        logger.warning("AI insight generation failed for '%s': %s", title, exc)

    book.save()

    # Index into vector store
    index_text = f"{title}\n\n{book.summary or description}"
    try:
        num_chunks = index_book(book.id, title, index_text)
        logger.info("Indexed %d chunks for book id=%d", num_chunks, book.id)
    except Exception as exc:
        logger.warning("Vector indexing failed for book id=%d: %s", book.id, exc)
        num_chunks = 0

    return Response({
        "id": book.id,
        "title": book.title,
        "created": created,
        "genre": book.genre,
        "sentiment": book.sentiment,
        "summary_preview": book.summary[:150] + "..." if len(book.summary) > 150 else book.summary,
        "chunks_indexed": num_chunks,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ──────────────────────────────────────────────────────────────
# POST /api/chat/
# ──────────────────────────────────────────────────────────────
@api_view(["POST"])
def chat(request):
    """
    RAG question-answering endpoint.
    Body: { "question": "..." }
    Returns: { "answer": "...", "sources": [...] }
    """
    question = request.data.get("question", "").strip()
    if not question:
        return Response(
            {"error": "The 'question' field is required and must not be empty."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    logger.info("RAG query received: %s", question[:100])
    result = rag_query(question, n_chunks=5)
    return Response(result, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────────────────────
# GET /api/health/
# ──────────────────────────────────────────────────────────────
@api_view(["GET"])
def health_check(request):
    """Simple health-check endpoint."""
    from .vector_store import get_vector_count
    try:
        vector_count = get_vector_count()
        db_ok = True
    except Exception:
        vector_count = -1
        db_ok = False

    try:
        book_count = Book.objects.count()
        sql_ok = True
    except Exception:
        book_count = -1
        sql_ok = False

    return Response({
        "status": "ok" if (db_ok and sql_ok) else "degraded",
        "books_in_db": book_count,
        "chunks_in_vector_db": vector_count,
    })
