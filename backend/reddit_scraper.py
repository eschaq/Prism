import os
import json
import logging

import asyncpraw
import asyncprawcore

from claude_client import call_claude, load_prompt, strip_code_fences
from formatting import format_profile
from rss_scraper import fetch_rss_feeds
from web_search import search_web
from scoring import (
    is_career_post,
    extract_query_terms,
    score_relevance,
    detect_wtp,
    detect_pain_patterns,
    calculate_pps,
)

logger = logging.getLogger(__name__)

# Module-level singleton — created once, reused across requests
_reddit: asyncpraw.Reddit | None = None


def _get_reddit_client() -> asyncpraw.Reddit:
    global _reddit
    if _reddit is None:
        _reddit = asyncpraw.Reddit(
            client_id=os.environ["REDDIT_CLIENT_ID"],
            client_secret=os.environ["REDDIT_CLIENT_SECRET"],
            user_agent=os.environ.get("REDDIT_USER_AGENT", "Prism/1.0"),
        )
    return _reddit


async def _enrich_with_comments(submission) -> tuple[str, bool, list[str]]:
    """Fetch top 2 comments for a submission.

    Returns (comment_text, wtp_detected_in_comments, wtp_matches_in_comments).
    """
    try:
        await submission.comments.replace_more(limit=0)
        top_comments = sorted(
            submission.comments.list(),
            key=lambda c: c.score,
            reverse=True,
        )[:2]
        comment_text = "\n---\n".join(c.body[:500] for c in top_comments)
    except Exception:
        logger.warning("Failed to fetch comments for post %s", submission.id)
        return ("", False, [])

    wtp_detected, wtp_matches = detect_wtp(comment_text)
    return (comment_text, wtp_detected, wtp_matches)


async def _fetch_subreddit(reddit, subreddit_name: str, query: str, limit: int) -> list:
    """Fetch submissions from a single subreddit. Returns list of asyncpraw submissions."""
    try:
        sub = await reddit.subreddit(subreddit_name)
        submissions = []
        async for submission in sub.search(query, limit=limit, sort="relevance", time_filter="month"):
            submissions.append(submission)
        return submissions
    except asyncprawcore.exceptions.NotFound:
        logger.warning("Subreddit r/%s does not exist, skipping.", subreddit_name)
        return []
    except asyncprawcore.exceptions.Forbidden:
        logger.warning("r/%s is private or banned, skipping.", subreddit_name)
        return []
    except asyncprawcore.exceptions.TooManyRequests:
        raise RuntimeError("Reddit rate limit reached. Please try again in a moment.")
    except asyncprawcore.exceptions.ResponseException as e:
        raise RuntimeError(f"Reddit API error: {e}")


async def scan_competitors(
    competitors: list[str], subreddits: list[str], limit: int = 10
) -> dict[str, list[dict]]:
    """Run Reddit scans for each competitor name.

    Returns a dict mapping competitor name to a list of scored post dicts.
    """
    reddit = _get_reddit_client()
    results = {}

    for competitor in competitors:
        submissions = []
        for sub_name in subreddits:
            submissions.extend(await _fetch_subreddit(reddit, sub_name, competitor, limit))

        # Career filter
        submissions = [s for s in submissions if not is_career_post(s.title, s.selftext)]

        # Score using competitor name as query terms
        comp_terms = extract_query_terms(competitor)
        scored = []
        for s in submissions:
            text = f"{s.title} {s.selftext}"
            relevance_tier = score_relevance(s.title, s.selftext, comp_terms)
            wtp_detected, wtp_matches = detect_wtp(text)
            pain_patterns, pain_count = detect_pain_patterns(text)
            pps_total, pps_label = calculate_pps(relevance_tier, pain_count, wtp_detected)

            scored.append({
                "title": s.title,
                "selftext": s.selftext[:500],
                "score": s.score,
                "num_comments": s.num_comments,
                "url": s.url,
                "created": s.created_utc,
                "source": f"r/{s.subreddit.display_name}",
                "competitor": competitor,
                "relevance_tier": relevance_tier,
                "wtp_detected": wtp_detected,
                "wtp_matches": wtp_matches,
                "pain_patterns": pain_patterns,
                "pain_count": pain_count,
                "pps_total": pps_total,
                "pps_label": pps_label,
            })

        scored.sort(key=lambda p: p["pps_total"], reverse=True)
        results[competitor] = scored

    return results


async def scrape_signals(
    subreddits: list[str],
    query: str,
    limit: int = 25,
    profile: dict | None = None,
    rss_feeds: list[str] | None = None,
    competitors: list[str] | None = None,
    web_search: bool = False,
) -> dict:
    """Scrape Reddit, optional RSS feeds, and optional web search with filtering, PPS scoring, and comment enrichment."""
    reddit = _get_reddit_client()

    # --- Fetch posts from all subreddits ---
    submissions = []
    for sub_name in subreddits:
        submissions.extend(await _fetch_subreddit(reddit, sub_name, query, limit))

    # --- Fetch RSS feed items (sync — no PRAW) ---
    rss_items = []
    if rss_feeds:
        rss_items = fetch_rss_feeds(rss_feeds, query, limit)

    # --- Fetch web search results (sync — no PRAW) ---
    web_items = []
    if web_search:
        industry = (profile or {}).get("industry", "")
        web_items = search_web(query, industry, limit)

    if not submissions and not rss_items and not web_items:
        return {
            "themes": [],
            "raw_posts": [],
            "subreddits": subreddits,
            "rss_feeds": rss_feeds or [],
            "query": query,
            "post_count": 0,
        }

    # --- Step 1: Career post exclusion filter ---
    submissions = [
        s for s in submissions
        if not is_career_post(s.title, s.selftext)
    ]
    rss_items = [
        item for item in rss_items
        if not is_career_post(item["title"], item["selftext"])
    ]
    web_items = [
        item for item in web_items
        if not is_career_post(item["title"], item["selftext"])
    ]

    if not submissions and not rss_items and not web_items:
        return {
            "themes": [],
            "raw_posts": [],
            "subreddits": subreddits,
            "rss_feeds": rss_feeds or [],
            "query": query,
            "post_count": 0,
        }

    # --- Step 2: Score all posts ---
    query_terms = extract_query_terms(query)
    scored_posts = []

    # Score Reddit submissions
    for s in submissions:
        text = f"{s.title} {s.selftext}"
        relevance_tier = score_relevance(s.title, s.selftext, query_terms)
        wtp_detected, wtp_matches = detect_wtp(text)
        pain_patterns, pain_count = detect_pain_patterns(text)
        pps_total, pps_label = calculate_pps(relevance_tier, pain_count, wtp_detected)

        scored_posts.append({
            "submission": s,
            "title": s.title,
            "selftext": s.selftext[:500],
            "score": s.score,
            "num_comments": s.num_comments,
            "url": s.url,
            "created": s.created_utc,
            "source": f"r/{s.subreddit.display_name}",
            "relevance_tier": relevance_tier,
            "wtp_detected": wtp_detected,
            "wtp_matches": wtp_matches,
            "pain_patterns": pain_patterns,
            "pain_count": pain_count,
            "pps_total": pps_total,
            "pps_label": pps_label,
            "comments_text": "",
        })

    # Score RSS items
    for item in rss_items:
        text = f"{item['title']} {item['selftext']}"
        relevance_tier = score_relevance(item["title"], item["selftext"], query_terms)
        wtp_detected, wtp_matches = detect_wtp(text)
        pain_patterns, pain_count = detect_pain_patterns(text)
        pps_total, pps_label = calculate_pps(relevance_tier, pain_count, wtp_detected)

        scored_posts.append({
            "submission": None,
            "title": item["title"],
            "selftext": item["selftext"],
            "score": item["score"],
            "num_comments": item["num_comments"],
            "url": item["url"],
            "created": item["created"],
            "source": item["source"],
            "relevance_tier": relevance_tier,
            "wtp_detected": wtp_detected,
            "wtp_matches": wtp_matches,
            "pain_patterns": pain_patterns,
            "pain_count": pain_count,
            "pps_total": pps_total,
            "pps_label": pps_label,
            "comments_text": "",
        })

    # Score web search items
    for item in web_items:
        text = f"{item['title']} {item['selftext']}"
        relevance_tier = score_relevance(item["title"], item["selftext"], query_terms)
        wtp_detected, wtp_matches = detect_wtp(text)
        pain_patterns, pain_count = detect_pain_patterns(text)
        pps_total, pps_label = calculate_pps(relevance_tier, pain_count, wtp_detected)

        scored_posts.append({
            "submission": None,
            "title": item["title"],
            "selftext": item["selftext"],
            "score": item["score"],
            "num_comments": item["num_comments"],
            "url": item["url"],
            "created": item["created"],
            "source": item["source"],
            "relevance_tier": relevance_tier,
            "wtp_detected": wtp_detected,
            "wtp_matches": wtp_matches,
            "pain_patterns": pain_patterns,
            "pain_count": pain_count,
            "pps_total": pps_total,
            "pps_label": pps_label,
            "comments_text": "",
        })

    # --- Step 3: Sort by PPS descending ---
    scored_posts.sort(key=lambda p: p["pps_total"], reverse=True)

    # --- Step 4: Comment enrichment for top 5 (Reddit posts only) ---
    for post in scored_posts[:5]:
        if post["submission"] is None:
            continue
        comment_text, comment_wtp, comment_wtp_matches = await _enrich_with_comments(
            post["submission"]
        )
        post["comments_text"] = comment_text
        if comment_wtp and not post["wtp_detected"]:
            post["wtp_detected"] = True
            post["wtp_matches"].extend(comment_wtp_matches)
            post["pps_total"], post["pps_label"] = calculate_pps(
                post["relevance_tier"], post["pain_count"], True
            )

    # Re-sort after potential PPS updates from comment enrichment
    scored_posts.sort(key=lambda p: p["pps_total"], reverse=True)

    # --- Step 5: Build Claude message ---
    system_prompt = load_prompt("signal_extraction.txt")
    profile_section = f"COMPANY PROFILE:\n{format_profile(profile)}\n\n" if profile else ""

    source_parts = [f"r/{s}" for s in subreddits]
    if rss_feeds:
        source_parts.extend(f"RSS:{url}" for url in rss_feeds)
    if web_search:
        source_parts.append("Web Search")
    source_label = ", ".join(source_parts)

    post_sections = []
    for p in scored_posts:
        section = (
            f"Title: {p['title']}\n"
            f"Source: {p['source']}\n"
            f"Score: {p['score']} | Comments: {p['num_comments']}\n"
            f"Relevance: {p['relevance_tier']} | PPS: {p['pps_total']} ({p['pps_label']}) "
            f"| WTP: {'yes' if p['wtp_detected'] else 'no'} | Pain signals: {p['pain_count']}\n"
            f"{p['selftext']}"
        )
        if p["comments_text"]:
            section += f"\n\nTop comments:\n{p['comments_text']}"
        post_sections.append(section)

    user_message = (
        f"{profile_section}"
        f"Sources: {source_label}\n"
        f"Query: {query}\n\n"
        "Posts (sorted by Pain Point Score, highest first):\n"
        + "\n---\n".join(post_sections)
    )

    extracted_str = call_claude(system_prompt, user_message)

    # Claude is prompted to return a JSON array; parse it into a real list.
    # Fall back to the raw string if the response isn't valid JSON.
    try:
        themes = json.loads(strip_code_fences(extracted_str))
        if not isinstance(themes, list):
            themes = extracted_str
    except json.JSONDecodeError:
        logger.warning("Claude returned non-JSON signal extraction response; storing raw text.")
        themes = extracted_str

    # --- Build raw_posts for frontend (drop asyncpraw submission objects) ---
    raw_posts = []
    for p in scored_posts:
        raw_posts.append({
            "title": p["title"],
            "selftext": p["selftext"],
            "score": p["score"],
            "num_comments": p["num_comments"],
            "url": p["url"],
            "created": p["created"],
            "source": p["source"],
            "relevance_tier": p["relevance_tier"],
            "wtp_detected": p["wtp_detected"],
            "wtp_matches": p["wtp_matches"],
            "pain_patterns": p["pain_patterns"],
            "pain_count": p["pain_count"],
            "pps_total": p["pps_total"],
            "pps_label": p["pps_label"],
        })

    # --- Step 7: Competitive scanning (separate from main pipeline) ---
    competitor_signals = {}
    if competitors:
        try:
            competitor_signals = await scan_competitors(competitors, subreddits, limit=10)
        except Exception:
            logger.warning("Competitor scanning failed — proceeding without competitor signals")
            competitor_signals = {}

    return {
        "themes": themes,
        "raw_posts": raw_posts,
        "subreddits": subreddits,
        "rss_feeds": rss_feeds or [],
        "web_search": web_search,
        "query": query,
        "post_count": len(raw_posts),
        "competitor_signals": competitor_signals,
    }
