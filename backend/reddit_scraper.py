import os
import praw
from claude_client import call_claude, load_prompt


def _get_reddit_client() -> praw.Reddit:
    return praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        user_agent=os.environ.get("REDDIT_USER_AGENT", "Prism/1.0"),
    )


def scrape_reddit(subreddit: str, query: str, limit: int = 25) -> dict:
    """Scrape Reddit posts and extract structured themes via Claude."""
    reddit = _get_reddit_client()
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

    if not posts:
        return {"themes": [], "raw_posts": [], "summary": "No posts found."}

    system_prompt = load_prompt("signal_extraction.txt")
    user_message = f"Subreddit: r/{subreddit}\nQuery: {query}\n\nPosts:\n" + "\n---\n".join(
        f"Title: {p['title']}\n{p['selftext']}" for p in posts
    )

    extracted = call_claude(system_prompt, user_message)

    return {
        "themes": extracted,
        "raw_posts": posts,
        "subreddit": subreddit,
        "query": query,
    }
