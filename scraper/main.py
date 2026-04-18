"""
Selenium Scraper for books.toscrape.com → Document Intelligence Platform

Features:
  - Multi-page scraping with configurable page limit
  - Extracts: title, rating, price, cover image URL, detail description, book URL
  - Sends each book to the Django POST /api/upload/ endpoint
  - Caching: tracks already-uploaded titles in a local JSON file to avoid re-uploads
  - Rate limiting: respectful delays between requests
  - Headless and headful modes supported via --headless flag

Usage:
  python main.py                    # Scrape first 5 pages (headful)
  python main.py --pages 10         # Scrape 10 pages
  python main.py --headless         # Run without opening a browser window
  python main.py --api http://...   # Point to a different backend URL
"""

import argparse
import json
import logging
import os
import time
import random
from pathlib import Path

import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ─── Configuration ────────────────────────────────────────────
BASE_URL = "https://books.toscrape.com"
DEFAULT_API_URL = "http://127.0.0.1:8000/api/upload/"
CACHE_FILE = Path(__file__).parent / ".scraper_cache.json"
RATING_MAP = {"One": 1.0, "Two": 2.0, "Three": 3.0, "Four": 4.0, "Five": 5.0}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Cache utilities ──────────────────────────────────────────
def load_cache() -> set:
    """Load the set of already-uploaded book URLs from disk."""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()


def save_cache(uploaded_urls: set) -> None:
    """Persist the set of uploaded URLs to disk."""
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(list(uploaded_urls), f, indent=2)


# ─── Driver setup ─────────────────────────────────────────────
def create_driver(headless: bool = False) -> webdriver.Chrome:
    """Initialize a Chrome WebDriver (auto-installs chromedriver)."""
    opts = ChromeOptions()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,900")
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)
    driver.implicitly_wait(5)
    return driver


# ─── Scraping helpers ─────────────────────────────────────────
def scrape_book_detail(driver: webdriver.Chrome, detail_url: str) -> dict:
    """
    Visit a book's detail page and extract:
      - Full description
      - UPC, availability, number of reviews
    Returns a dict of extra fields.
    """
    try:
        driver.get(detail_url)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "article.product_page"))
        )
        description = ""
        try:
            desc_el = driver.find_element(By.CSS_SELECTOR, "article.product_page > p")
            description = desc_el.text.strip()
        except Exception:
            pass

        review_count = 0
        try:
            rows = driver.find_elements(By.CSS_SELECTOR, "table.table-striped tr")
            for row in rows:
                header = row.find_element(By.TAG_NAME, "th").text.strip()
                if header == "Number of reviews":
                    review_count = int(row.find_element(By.TAG_NAME, "td").text.strip())
        except Exception:
            pass

        return {"description": description, "review_count": review_count}
    except Exception as exc:
        logger.warning("Failed to scrape detail page %s: %s", detail_url, exc)
        return {"description": "", "review_count": 0}


def scrape_page(driver: webdriver.Chrome, page_url: str) -> list[dict]:
    """
    Scrape all books listed on a single catalogue page.
    Returns a list of book dicts (without details yet).
    """
    driver.get(page_url)
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "ol.row"))
    )

    book_cards = driver.find_elements(By.CSS_SELECTOR, "ol.row li article.product_pod")
    books = []

    for card in book_cards:
        try:
            # Title
            title_el = card.find_element(By.CSS_SELECTOR, "h3 a")
            title = title_el.get_attribute("title") or title_el.text.strip()

            # Relative URL → absolute
            relative_url = title_el.get_attribute("href")
            # Fix relative path if it starts with catalogue/
            if relative_url and not relative_url.startswith("http"):
                book_url = BASE_URL + "/catalogue/" + relative_url.split("catalogue/")[-1]
            else:
                book_url = relative_url

            # Star rating
            rating_el = card.find_element(By.CSS_SELECTOR, "p.star-rating")
            rating_word = rating_el.get_attribute("class").split()[-1]
            rating = RATING_MAP.get(rating_word, 0.0)

            # Price
            price_el = card.find_element(By.CSS_SELECTOR, "p.price_color")
            price = price_el.text.strip()

            # Cover image
            img_el = card.find_element(By.CSS_SELECTOR, "img.thumbnail")
            img_src = img_el.get_attribute("src") or ""
            if img_src and not img_src.startswith("http"):
                cover_image_url = BASE_URL + "/" + img_src.lstrip("../")
            else:
                cover_image_url = img_src

            books.append({
                "title": title,
                "book_url": book_url,
                "rating": rating,
                "price": price,
                "cover_image_url": cover_image_url,
            })
        except Exception as exc:
            logger.warning("Error parsing a book card: %s", exc)
            continue

    return books


def upload_book(api_url: str, book_data: dict) -> bool:
    """
    POST book data to the Django API.
    Returns True on success, False on failure.
    """
    try:
        resp = requests.post(api_url, json=book_data, timeout=60)
        if resp.status_code in (200, 201):
            data = resp.json()
            action = "Created" if resp.status_code == 201 else "Updated"
            logger.info(
                "  ✓ %s: '%s' | Genre: %s | Sentiment: %s | Chunks: %d",
                action, book_data["title"],
                data.get("genre", "?"),
                data.get("sentiment", "?"),
                data.get("chunks_indexed", 0),
            )
            return True
        else:
            logger.error("  ✗ Upload failed (%d): %s", resp.status_code, resp.text[:200])
            return False
    except Exception as exc:
        logger.error("  ✗ Request error for '%s': %s", book_data.get("title", "?"), exc)
        return False


# ─── Main ─────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Scrape books.toscrape.com and upload to backend API.")
    parser.add_argument("--pages", type=int, default=5, help="Number of catalogue pages to scrape (default: 5)")
    parser.add_argument("--headless", action="store_true", help="Run Chrome in headless mode (no GUI)")
    parser.add_argument("--api", default=DEFAULT_API_URL, help="Backend upload API URL")
    parser.add_argument("--skip-cache", action="store_true", help="Ignore cache and re-upload all books")
    args = parser.parse_args()

    logger.info("═" * 60)
    logger.info("  Document Intelligence Platform — Book Scraper")
    logger.info("  Target: %s", BASE_URL)
    logger.info("  Pages:  %d", args.pages)
    logger.info("  API:    %s", args.api)
    logger.info("  Mode:   %s", "Headless" if args.headless else "Windowed")
    logger.info("═" * 60)

    uploaded_urls = load_cache() if not args.skip_cache else set()
    driver = create_driver(headless=args.headless)

    total_scraped = 0
    total_uploaded = 0
    total_skipped = 0

    try:
        current_url = f"{BASE_URL}/catalogue/page-1.html"

        for page_num in range(1, args.pages + 1):
            logger.info("\n📄 Scraping page %d / %d: %s", page_num, args.pages, current_url)

            books_on_page = scrape_page(driver, current_url)
            logger.info("  Found %d books on page %d", len(books_on_page), page_num)
            total_scraped += len(books_on_page)

            for i, book in enumerate(books_on_page, start=1):
                book_url = book["book_url"]

                # Check cache
                if book_url in uploaded_urls and not args.skip_cache:
                    logger.info("  [%d/%d] ⏭ Skipping (cached): '%s'", i, len(books_on_page), book["title"])
                    total_skipped += 1
                    continue

                logger.info("  [%d/%d] 📖 Processing: '%s'", i, len(books_on_page), book["title"])

                # Scrape detail page for description
                detail_data = scrape_book_detail(driver, book_url)
                book.update(detail_data)
                book["author"] = "Unknown"  # books.toscrape.com doesn't list authors

                # Upload to API
                success = upload_book(args.api, book)
                if success:
                    total_uploaded += 1
                    uploaded_urls.add(book_url)
                    save_cache(uploaded_urls)

                # Polite delay to avoid hammering the server
                time.sleep(random.uniform(0.5, 1.5))

            # Navigate to next page
            try:
                next_btn = driver.find_element(By.CSS_SELECTOR, "li.next a")
                next_href = next_btn.get_attribute("href")
                if next_href and not next_href.startswith("http"):
                    current_url = f"{BASE_URL}/catalogue/{next_href.split('catalogue/')[-1]}"
                else:
                    current_url = next_href
                if not current_url:
                    logger.info("No more pages found.")
                    break
            except Exception:
                logger.info("Reached the last page.")
                break

            # Small delay between pages
            time.sleep(random.uniform(1.0, 2.0))

    except KeyboardInterrupt:
        logger.info("\n⚠ Scraping interrupted by user.")
    finally:
        driver.quit()
        save_cache(uploaded_urls)

    logger.info("\n═" * 60)
    logger.info("  Scraping complete!")
    logger.info("  Pages processed : %d", page_num)
    logger.info("  Books scraped   : %d", total_scraped)
    logger.info("  Books uploaded  : %d", total_uploaded)
    logger.info("  Books skipped   : %d (cache)", total_skipped)
    logger.info("═" * 60)


if __name__ == "__main__":
    main()
