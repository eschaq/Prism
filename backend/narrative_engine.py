from claude_client import call_claude, load_prompt
from formatting import format_signals, format_analysis, format_gaps, format_profile

AUDIENCE_PROMPTS = {
    "cfo": "narrative_cfo.txt",
    "operations": "narrative_operations.txt",
    "marketing": "narrative_marketing.txt",
    "sales": "narrative_sales.txt",
    "product": "narrative_product.txt",
    "sales_engineer": "narrative_sales_engineer.txt",
    "hr": "narrative_hr.txt",
    "supply_chain": "narrative_supply_chain.txt",
    "customer_success": "narrative_customer_success.txt",
    "risk_compliance": "narrative_risk_compliance.txt",
    "board": "narrative_board.txt",
    "small_business": "narrative_small_business.txt",
}


def generate_narrative(audience: str, signals: dict, analysis: dict, gaps: dict | None = None, profile: dict | None = None) -> dict:
    """Generate an audience-specific briefing from signal, analysis, and gap data."""
    audience_key = audience.lower()
    if audience_key not in AUDIENCE_PROMPTS:
        raise ValueError(f"Unknown audience '{audience}'. Must be one of: {list(AUDIENCE_PROMPTS)}")

    system_prompt = load_prompt(AUDIENCE_PROMPTS[audience_key])
    sections = []
    if profile:
        sections.append(f"COMPANY PROFILE:\n{format_profile(profile)}")
    sections.extend([
        f"MARKET SIGNALS (Reddit):\n{format_signals(signals)}",
        f"INTERNAL DATA ANALYSIS:\n{format_analysis(analysis)}",
    ])
    if gaps:
        sections.append(f"GAP ANALYSIS:\n{format_gaps(gaps)}")

    user_message = "\n\n".join(sections)
    briefing = call_claude(system_prompt, user_message)

    return {
        "audience": audience_key,
        "briefing": briefing,
    }
