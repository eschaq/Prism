import os
import json
import logging

import praw
import prawcore

from claude_client import call_claude, load_prompt

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


def scrape_reddit(subreddit: str, query: str, limit: int = 25) -> dict:
    """Scrape Reddit posts and extract structured themes via Claude."""
    reddit = _get_reddit_client()

    try:
        sub = reddit.subreddit(subreddit)
        posts = []
        for submission in sub.search(query, limit=limit, sort="relevance", time_filter="month"):
            posts.append({
                "title": submission.title,
                "selftext": submission.selftext[:500],
                "score": submission.score,
                "num_comments": submission.num_comments,
                "url": submission.url,
            })
    except prawcore.exceptions.NotFound:
        raise ValueError(f"Subreddit r/{subreddit} does not exist.")
    except prawcore.exceptions.Forbidden:
        raise ValueError(f"r/{subreddit} is private or banned.")
    except prawcore.exceptions.TooManyRequests:
        raise RuntimeError("Reddit rate limit reached. Please try again in a moment.")
    except prawcore.exceptions.ResponseException as e:
        raise RuntimeError(f"Reddit API error: {e}")

    if not posts:
        return {
            "themes": [],
            "raw_posts": [],
            "subreddit": subreddit,
            "query": query,
            "post_count": 0,
        }

    system_prompt = load_prompt("signal_extraction.txt")
    user_message = (
        f"Subreddit: r/{subreddit}\n"
        f"Query: {query}\n\n"
        "Posts:\n"
        + "\n---\n".join(
            f"Title: {p['title']}\n"
            f"Score: {p['score']} | Comments: {p['num_comments']}\n"
            f"{p['selftext']}"
            for p in posts
        )
    )

    extracted_str = call_claude(system_prompt, user_message)

    # Claude is prompted to return a JSON array; parse it into a real list.
    # Fall back to the raw string if the response isn't valid JSON.
    try:
        themes = json.loads(extracted_str)
        if not isinstance(themes, list):
            themes = extracted_str
    except json.JSONDecodeError:
        logger.warning("Claude returned non-JSON signal extraction response; storing raw text.")
        themes = extracted_str

    return {
        "themes": themes,
        "raw_posts": posts,
        "subreddit": subreddit,
        "query": query,
        "post_count": len(posts),
    }
