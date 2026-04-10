import json
import logging

from claude_client import call_claude, load_prompt, strip_code_fences

logger = logging.getLogger(__name__)


def assess_visibility(company: str, industry: str, competitors: list[str]) -> dict:
    """Assess AI search visibility for a company and its competitors."""
    system_prompt = load_prompt("visibility_assessment.txt")
    user_message = (
        f"Company: {company}\n"
        f"Industry: {industry}\n"
        f"Competitors: {', '.join(competitors)}\n\n"
        "Assess the AI search visibility of the company and each competitor "
        "for buyer-intent queries in this industry."
    )

    raw = call_claude(system_prompt, user_message)

    try:
        parsed = json.loads(strip_code_fences(raw))
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        logger.warning("Claude returned non-JSON visibility assessment; storing raw text.")

    return {"assessments": raw}
