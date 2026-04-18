"""
DRF serializers for the Book model.
"""
from rest_framework import serializers
from .models import Book


class BookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the book listing page."""

    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "author",
            "rating",
            "review_count",
            "description",
            "book_url",
            "cover_image_url",
            "genre",
            "summary",
            "price",
            "created_at",
        ]


class BookDetailSerializer(serializers.ModelSerializer):
    """Full serializer including AI-generated fields."""

    class Meta:
        model = Book
        fields = "__all__"


class BookUploadSerializer(serializers.ModelSerializer):
    """Serializer for the POST /api/upload/ endpoint."""

    class Meta:
        model = Book
        fields = [
            "title",
            "author",
            "rating",
            "review_count",
            "description",
            "book_url",
            "cover_image_url",
            "price",
        ]
        extra_kwargs = {field: {"required": False} for field in fields}
        # title is the only truly required field
        extra_kwargs["title"] = {"required": True}
