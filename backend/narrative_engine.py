from claude_client import call_claude, load_prompt
from formatting import format_signals, format_analysis, format_gaps

AUDIENCE_PROMPTS = {
    "cfo": "narrative_cfo.txt",
    "operations": "narrative_operations.txt",
    "marketing": "narrative_marketing.txt",
    "sales": "narrative_sales.txt",
}


def generate_narrative(audience: str, signals: dict, analysis: dict, gaps: dict | None = None) -> dict:
    """Generate an audience-specific briefing from signal, analysis, and gap data."""
    audience_key = audience.lower()
    if audience_key not in AUDIENCE_PROMPTS:
        raise ValueError(f"Unknown audience '{audience}'. Must be one of: {list(AUDIENCE_PROMPTS)}")

    system_prompt = load_prompt(AUDIENCE_PROMPTS[audience_key])
    sections = [
        f"MARKET SIGNALS (Reddit):\n{format_signals(signals)}",
        f"INTERNAL DATA ANALYSIS:\n{format_analysis(analysis)}",
    ]
    if gaps:
        sections.append(f"GAP ANALYSIS:\n{format_gaps(gaps)}")

    user_message = "\n\n".join(sections)
    briefing = call_claude(system_prompt, user_message)

    return {
        "audience": audience_key,
        "briefing": briefing,
    }
