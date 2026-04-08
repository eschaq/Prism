import json
import logging

from claude_client import call_claude, load_prompt
from formatting import format_signals, format_analysis

logger = logging.getLogger(__name__)


def analyze_gaps(signals: dict, analysis: dict) -> dict:
    """Identify gaps and misalignments between Reddit signals and internal CSV data."""
    system_prompt = load_prompt("gap_analysis.txt")
    user_message = (
        f"MARKET SIGNALS (Reddit):\n{format_signals(signals)}\n\n"
        f"INTERNAL DATA ANALYSIS:\n{format_analysis(analysis)}"
    )

    raw = call_claude(system_prompt, user_message)

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return {"gaps": parsed}
    except json.JSONDecodeError:
        logger.warning("Claude returned non-JSON gap analysis response; storing raw text.")

    return {"gaps": raw}
