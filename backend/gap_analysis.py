from claude_client import call_claude, load_prompt


def analyze_gaps(signals: dict, analysis: dict) -> dict:
    """Identify gaps and misalignments between Reddit signals and internal CSV data."""
    system_prompt = load_prompt("gap_analysis.txt")
    user_message = (
        f"MARKET SIGNALS (Reddit):\n{signals}\n\n"
        f"INTERNAL DATA ANALYSIS:\n{analysis}"
    )

    gaps = call_claude(system_prompt, user_message)

    return {
        "gaps": gaps,
    }
