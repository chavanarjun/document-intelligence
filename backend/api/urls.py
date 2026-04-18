"""
URL routing for the `api` application.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Health check
    path("health/", views.health_check, name="health_check"),

    # Book endpoints
    path("books/", views.book_list, name="book_list"),
    path("books/<int:pk>/", views.book_detail, name="book_detail"),
    path("books/<int:pk>/related/", views.book_related, name="book_related"),

    # Ingestion
    path("upload/", views.book_upload, name="book_upload"),

    # RAG chat
    path("chat/", views.chat, name="chat"),
]
