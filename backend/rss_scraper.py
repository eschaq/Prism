"""RSS feed fetcher — normalizes feed items to the same dict shape as Reddit posts."""

import calendar
import logging
import re
from urllib.parse import urlparse

import feedparser

logger = logging.getLogger(__name__)

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(text: str) -> str:
    """Remove HTML tags from a string."""
    return _HTML_TAG_RE.sub("", text).strip()


def _source_name(feed_url: str) -> str:
    """Extract a readable source name from a feed URL."""
    parsed = urlparse(feed_url)
    domain = parsed.hostname or feed_url
    # Strip www. prefix
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def _entry_timestamp(entry) -> float:
    """Extract a Unix timestamp from a feed entry, or 0 if unavailable."""
    for attr in ("published_parsed", "updated_parsed"):
        parsed = getattr(entry, attr, None)
        if parsed:
            try:
                return float(calendar.timegm(parsed))
            except (TypeError, ValueError):
                pass
    return 0.0


def fetch_rss_feeds(
    feed_urls: list[str], query: str, limit: int = 25
) -> list[dict]:
    """Fetch and normalize RSS feed items to Reddit-compatible post dicts.

    Filters items by query term relevance and returns up to `limit` items per feed.
    """
    from scoring import extract_query_terms

    query_terms = extract_query_terms(query)
    all_items: list[dict] = []

    for url in feed_urls:
        source = _source_name(url)
        try:
            feed = feedparser.parse(url)
        except Exception:
            logger.warning("Failed to parse RSS feed: %s", url)
            continue

        if feed.bozo and not feed.entries:
            logger.warning("RSS feed returned no entries: %s", url)
            continue

        count = 0
        for entry in feed.entries:
            if count >= limit:
                break

            title = getattr(entry, "title", "") or ""
            summary = _strip_html(
                getattr(entry, "summary", "") or getattr(entry, "description", "") or ""
            )[:500]

            # Basic relevance filter: skip if no query terms match
            combined = f"{title} {summary}".lower()
            if query_terms and not any(term in combined for term in query_terms):
                continue

            all_items.append({
                "title": title,
                "selftext": summary,
                "score": 0,
                "num_comments": 0,
                "url": getattr(entry, "link", "") or "",
                "created": _entry_timestamp(entry),
                "source": source,
            })
            count += 1

    return all_items
