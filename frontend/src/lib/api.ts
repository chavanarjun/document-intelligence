/**
 * API client for the Document Intelligence Platform backend.
 * All calls point to the Django REST Framework server at localhost:8000.
 */
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s — AI calls can be slow
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Types ────────────────────────────────────────────────────

export interface Book {
  id: number;
  title: string;
  author: string;
  rating: number | null;
  review_count: number | null;
  description: string;
  book_url: string;
  cover_image_url: string;
  genre: string;
  summary: string;
  sentiment: string;
  price: string;
  created_at: string;
}

export interface BookDetail extends Book {
  updated_at: string;
}

export interface BooksResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: Book[];
}

export interface RelatedResponse {
  book_id: number;
  related: Book[];
  method: string;
}

export interface ChatSource {
  source_index: number;
  book_id: number;
  title: string;
  chunk: string;
  relevance_percent: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

// ─── API calls ────────────────────────────────────────────────

export const getBooks = async (params?: {
  page?: number;
  page_size?: number;
  search?: string;
  genre?: string;
}): Promise<BooksResponse> => {
  const { data } = await api.get<BooksResponse>("/books/", { params });
  return data;
};

export const getBook = async (id: number): Promise<BookDetail> => {
  const { data } = await api.get<BookDetail>(`/books/${id}/`);
  return data;
};

export const getRelatedBooks = async (id: number): Promise<RelatedResponse> => {
  const { data } = await api.get<RelatedResponse>(`/books/${id}/related/`);
  return data;
};

export const askQuestion = async (question: string): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>("/chat/", { question });
  return data;
};

export const uploadBook = async (bookData: Partial<Book>): Promise<unknown> => {
  const { data } = await api.post("/upload/", bookData);
  return data;
};

export const getHealth = async (): Promise<{ status: string; books_in_db: number; chunks_in_vector_db: number }> => {
  const { data } = await api.get("/health/");
  return data;
};

export default api;
