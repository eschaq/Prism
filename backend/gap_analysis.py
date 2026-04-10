import json
import logging

from claude_client import call_claude, load_prompt, strip_code_fences
from formatting import format_signals, format_analysis, format_profile, format_competitor_signals

logger = logging.getLogger(__name__)


def analyze_gaps(signals: dict, analysis: dict, profile: dict | None = None, competitor_signals: dict | None = None) -> dict:
    """Identify gaps and misalignments between Reddit signals and internal CSV data."""
    system_prompt = load_prompt("gap_analysis.txt")
    profile_section = f"COMPANY PROFILE:\n{format_profile(profile)}\n\n" if profile else ""
    sections = (
        f"{profile_section}"
        f"MARKET SIGNALS (Reddit):\n{format_signals(signals)}\n\n"
        f"INTERNAL DATA ANALYSIS:\n{format_analysis(analysis)}"
    )
    if competitor_signals:
        comp_text = format_competitor_signals(competitor_signals)
        if comp_text:
            sections += f"\n\nCOMPETITIVE SIGNALS:\n{comp_text}"
    user_message = sections

    raw = call_claude(system_prompt, user_message)

    try:
        parsed = json.loads(strip_code_fences(raw))
        if isinstance(parsed, dict):
            return {"gaps": parsed}
    except json.JSONDecodeError:
        logger.warning("Claude returned non-JSON gap analysis response; storing raw text.")

    return {"gaps": raw}


def generate_battlecard(competitive_contrast: list, signals: dict, profile: dict | None = None) -> dict:
    """Generate a sales battlecard from competitive contrast findings."""
    system_prompt = load_prompt("battlecard.txt")
    profile_section = f"COMPANY PROFILE:\n{format_profile(profile)}\n\n" if profile else ""

    findings = []
    for i, item in enumerate(competitive_contrast, 1):
        competitor = item.get("competitor", "Unknown")
        finding = item.get("finding", "")
        evidence = item.get("evidence", "")
        findings.append(f"{i}. [{competitor}] {finding}")
        if evidence:
            findings.append(f"   Evidence: {evidence}")

    user_message = (
        f"{profile_section}"
        f"COMPETITIVE CONTRAST FINDINGS:\n{chr(10).join(findings)}\n\n"
        f"MARKET SIGNALS:\n{format_signals(signals)}"
    )

    battlecard = call_claude(system_prompt, user_message)
    return {"battlecard": battlecard}
