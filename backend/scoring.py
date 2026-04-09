"""Pure scoring and filtering functions for Reddit post analysis.

All functions are stateless — no API calls, no side effects.
"""

import re

# ---------------------------------------------------------------------------
# Component 1 — Career post exclusion keywords
# ---------------------------------------------------------------------------
CAREER_KEYWORDS = [
    "internship", "resume", "cv", "job search", "salary", "hiring",
    "recruiter", "interview", "entry-level", "junior analyst",
    "career change", "career switch", "breaking into",
    "how to get a job", "laid off", "job market", "bootcamp",
    "degree required", "should i study", "fix my career", "career path",
]


def is_career_post(title: str, selftext: str) -> bool:
    """Return True if the post matches career/job noise keywords."""
    combined = f"{title} {selftext}".lower()
    return any(kw in combined for kw in CAREER_KEYWORDS)


# ---------------------------------------------------------------------------
# Component 2 — Dynamic relevance scoring
# ---------------------------------------------------------------------------
_PUNCTUATION_RE = re.compile(r"[^\w\s]")


def extract_query_terms(query: str) -> list[str]:
    """Split a search query into lowercase terms with punctuation stripped."""
    cleaned = _PUNCTUATION_RE.sub("", query.lower())
    return [t for t in cleaned.split() if t]


def score_relevance(title: str, selftext: str, query_terms: list[str]) -> str:
    """Score post relevance based on query term matches.

    Returns 'HIGH' (2+ matches), 'MEDIUM' (1), or 'LOW' (0).
    """
    combined = f"{title} {selftext}".lower()
    matches = sum(1 for term in query_terms if term in combined)
    if matches >= 2:
        return "HIGH"
    if matches == 1:
        return "MEDIUM"
    return "LOW"


# ---------------------------------------------------------------------------
# Component 3 — WTP signal detection
# ---------------------------------------------------------------------------
_DOLLAR_RE = re.compile(r"\$\d")

WTP_PHRASES = [
    "dollars", "bucks", "usd", "per month", "per year", "per seat",
    "pricing", "how much does", "worth paying", "would pay for",
    "too expensive", "too cheap", "affordable", "budget", "roi",
    "free tier", "free plan", "free trial", "enterprise license",
    "pro license", "premium license", "can't afford", "out of budget",
]


def detect_wtp(text: str) -> tuple[bool, list[str]]:
    """Scan text for willingness-to-pay signals.

    Returns (wtp_detected, list of matched phrases).
    """
    lower = text.lower()
    matches = []
    if _DOLLAR_RE.search(text):
        matches.append("$amount")
    matches.extend(phrase for phrase in WTP_PHRASES if phrase in lower)
    return (len(matches) > 0, matches)


# ---------------------------------------------------------------------------
# Component 4 — Structural pain pattern detection
# ---------------------------------------------------------------------------
PAIN_PATTERNS = [
    # Gap signals
    "why is there no", "someone should build", "wish there was",
    "no good solution", "still no way",
    # Frustration
    "tired of manually", "drives me crazy", "spent hours figuring",
    # Workaround
    "cobbled together", "manually every week", "still using spreadsheet",
    "copy paste", "export to excel and then",
    # Switching
    "looking to replace", "alternative to", "moving away from",
]


def detect_pain_patterns(text: str) -> tuple[list[str], int]:
    """Scan text for structural pain phrases.

    Returns (list of matched phrases, count).
    """
    lower = text.lower()
    matches = [p for p in PAIN_PATTERNS if p in lower]
    return (matches, len(matches))


# ---------------------------------------------------------------------------
# Component 5 — PPS scoring (max 12)
# ---------------------------------------------------------------------------
_RELEVANCE_VOLUME = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

PPS_LABELS = [
    (10, "PRODUCT"),
    (7, "SERIES"),
    (4, "POST"),
    (0, "AWARENESS"),
]


def calculate_pps(
    relevance_tier: str, pain_count: int, wtp_detected: bool
) -> tuple[int, str]:
    """Calculate Pain Point Score across 4 dimensions.

    Returns (pps_total, pps_label).
    """
    volume = _RELEVANCE_VOLUME.get(relevance_tier, 1)
    frequency = min(pain_count, 3)
    intensity = min(pain_count * 2, 3)
    wtp = 3 if wtp_detected else 0

    total = volume + frequency + intensity + wtp

    label = "AWARENESS"
    for threshold, lbl in PPS_LABELS:
        if total >= threshold:
            label = lbl
            break

    return (total, label)
