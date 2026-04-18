"""
Book model — stores metadata for every scraped/uploaded book.
AI-generated fields (summary, genre, sentiment) are populated
asynchronously during the upload pipeline.
"""
from django.db import models


class Book(models.Model):
    """
    Core metadata table for a book.
    Vector embeddings are stored separately in FAISS, keyed by book id.
    """
    title = models.CharField(max_length=512)
    author = models.CharField(max_length=255, blank=True, default="Unknown")
    rating = models.FloatField(null=True, blank=True)
    review_count = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, default="")
    book_url = models.URLField(max_length=1024, blank=True, default="")
    cover_image_url = models.URLField(max_length=1024, blank=True, default="")
    price = models.CharField(max_length=50, blank=True, default="")

    # AI-generated insights
    summary = models.TextField(blank=True, default="")
    genre = models.CharField(max_length=255, blank=True, default="")
    sentiment = models.CharField(max_length=100, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "books"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} by {self.author}"
