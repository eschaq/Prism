"""Web search signal source — uses Claude's built-in web search tool."""

import json
import logging
from urllib.parse import urlparse

from claude_client import call_claude_with_search, strip_code_fences

logger = logging.getLogger(__name__)


def _domain(url: str) -> str:
    """Extract readable domain from a URL."""
    try:
        host = urlparse(url).hostname or url
        return host.replace("www.", "")
    except Exception:
        return url


def search_web(query: str, industry: str = "", limit: int = 10) -> list[dict]:
    """Search the web for recent industry content and return normalized post dicts.

    Uses Claude's built-in web search tool to find recent news, discussions,
    and industry content, then normalizes results to the same dict shape as
    Reddit/RSS items for the scoring pipeline.
    """
    system_prompt = (
        "You are a market research assistant with web search access. "
        "Search for recent news, blog posts, forum discussions, and industry content. "
        "For each relevant result, extract the title, a brief summary (2-3 sentences), "
        "the source URL, and the domain name. "
        "Return a JSON array of objects with keys: title, summary, url, domain. "
        "Return ONLY the JSON array. No markdown, no code fences, no commentary."
    )

    industry_context = f" Industry context: {industry}." if industry else ""
    user_message = (
        f"Find recent industry content about: {query}.{industry_context} "
        f"Focus on pain points, market trends, product discussions, competitive dynamics, "
        f"and buyer sentiment. Return up to {limit} results. "
        f"Prioritize content from the last 30 days."
    )

    try:
        raw = call_claude_with_search(system_prompt, user_message)
    except Exception:
        logger.exception("Web search call failed")
        return []

    # Parse the JSON response
    try:
        parsed = json.loads(strip_code_fences(raw))
        if not isinstance(parsed, list):
            logger.warning("Web search returned non-list response")
            return []
    except json.JSONDecodeError:
        logger.warning("Web search returned non-JSON response; discarding.")
        return []

    # Normalize to post dict shape
    items = []
    for result in parsed[:limit]:
        if not isinstance(result, dict):
            continue
        title = result.get("title", "")
        summary = result.get("summary", "")
        url = result.get("url", "")
        domain = result.get("domain", "") or _domain(url)

        if not title:
            continue

        items.append({
            "title": title,
            "selftext": summary[:500],
            "score": 0,
            "num_comments": 0,
            "url": url,
            "created": 0,
            "source": f"web:{domain}",
        })

    return items
