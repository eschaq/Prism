import os
import json
import logging

import praw
import prawcore

from claude_client import call_claude, load_prompt, strip_code_fences
from formatting import format_profile
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
_reddit: praw.Reddit | None = None


def _get_reddit_client() -> praw.Reddit:
    global _reddit
    if _reddit is None:
        _reddit = praw.Reddit(
            client_id=os.environ["REDDIT_CLIENT_ID"],
            client_secret=os.environ["REDDIT_CLIENT_SECRET"],
            user_agent=os.environ.get("REDDIT_USER_AGENT", "Prism/1.0"),
        )
    return _reddit


def _enrich_with_comments(submission) -> tuple[str, bool, list[str]]:
    """Fetch top 3 comments for a submission.

    Returns (comment_text, wtp_detected_in_comments, wtp_matches_in_comments).
    """
    try:
        submission.comments.replace_more(limit=0)
        top_comments = sorted(
            submission.comments.list(),
            key=lambda c: c.score,
            reverse=True,
        )[:3]
        comment_text = "\n---\n".join(c.body[:500] for c in top_comments)
    except Exception:
        logger.warning("Failed to fetch comments for post %s", submission.id)
        return ("", False, [])

    wtp_detected, wtp_matches = detect_wtp(comment_text)
    return (comment_text, wtp_detected, wtp_matches)


def scrape_reddit(subreddit: str, query: str, limit: int = 25, profile: dict | None = None) -> dict:
    """Scrape Reddit posts with filtering, PPS scoring, and comment enrichment."""
    reddit = _get_reddit_client()

    try:
        sub = reddit.subreddit(subreddit)
        submissions = list(sub.search(query, limit=limit, sort="relevance", time_filter="month"))
    except prawcore.exceptions.NotFound:
        raise ValueError(f"Subreddit r/{subreddit} does not exist.")
    except prawcore.exceptions.Forbidden:
        raise ValueError(f"r/{subreddit} is private or banned.")
    except prawcore.exceptions.TooManyRequests:
        raise RuntimeError("Reddit rate limit reached. Please try again in a moment.")
    except prawcore.exceptions.ResponseException as e:
        raise RuntimeError(f"Reddit API error: {e}")

    if not submissions:
        return {
            "themes": [],
            "raw_posts": [],
            "subreddit": subreddit,
            "query": query,
            "post_count": 0,
        }

    # --- Step 1: Career post exclusion filter ---
    submissions = [
        s for s in submissions
        if not is_career_post(s.title, s.selftext)
    ]

    if not submissions:
        return {
            "themes": [],
            "raw_posts": [],
            "subreddit": subreddit,
            "query": query,
            "post_count": 0,
        }

    # --- Step 2: Score each post ---
    query_terms = extract_query_terms(query)
    scored_posts = []

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

    # --- Step 4: Comment enrichment for top 10 ---
    for post in scored_posts[:10]:
        comment_text, comment_wtp, comment_wtp_matches = _enrich_with_comments(
            post["submission"]
        )
        post["comments_text"] = comment_text
        if comment_wtp and not post["wtp_detected"]:
            post["wtp_detected"] = True
            post["wtp_matches"].extend(comment_wtp_matches)
            # Recalculate PPS with updated WTP
            post["pps_total"], post["pps_label"] = calculate_pps(
                post["relevance_tier"], post["pain_count"], True
            )

    # Re-sort after potential PPS updates from comment enrichment
    scored_posts.sort(key=lambda p: p["pps_total"], reverse=True)

    # --- Step 5: Build Claude message ---
    system_prompt = load_prompt("signal_extraction.txt")
    profile_section = f"COMPANY PROFILE:\n{format_profile(profile)}\n\n" if profile else ""

    post_sections = []
    for p in scored_posts:
        section = (
            f"Title: {p['title']}\n"
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
        f"Subreddit: r/{subreddit}\n"
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

    # --- Build raw_posts for frontend (drop PRAW submission objects) ---
    raw_posts = []
    for p in scored_posts:
        raw_posts.append({
            "title": p["title"],
            "selftext": p["selftext"],
            "score": p["score"],
            "num_comments": p["num_comments"],
            "url": p["url"],
            "relevance_tier": p["relevance_tier"],
            "wtp_detected": p["wtp_detected"],
            "wtp_matches": p["wtp_matches"],
            "pain_patterns": p["pain_patterns"],
            "pain_count": p["pain_count"],
            "pps_total": p["pps_total"],
            "pps_label": p["pps_label"],
        })

    return {
        "themes": themes,
        "raw_posts": raw_posts,
        "subreddit": subreddit,
        "query": query,
        "post_count": len(raw_posts),
    }
