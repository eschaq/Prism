from claude_client import call_claude, load_prompt

AUDIENCE_PROMPTS = {
    "cfo": "narrative_cfo.txt",
    "operations": "narrative_operations.txt",
    "marketing": "narrative_marketing.txt",
    "sales": "narrative_sales.txt",
}


def generate_narrative(audience: str, signals: dict, analysis: dict) -> dict:
    """Generate an audience-specific briefing from signal and analysis data."""
    audience_key = audience.lower()
    if audience_key not in AUDIENCE_PROMPTS:
        raise ValueError(f"Unknown audience '{audience}'. Must be one of: {list(AUDIENCE_PROMPTS)}")

    system_prompt = load_prompt(AUDIENCE_PROMPTS[audience_key])
    user_message = (
        f"SIGNAL DATA:\n{signals}\n\n"
        f"DATA ANALYSIS:\n{analysis}"
    )

    briefing = call_claude(system_prompt, user_message)

    return {
        "audience": audience_key,
        "briefing": briefing,
    }
