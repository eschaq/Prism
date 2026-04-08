import json
import logging

from claude_client import call_claude, load_prompt

logger = logging.getLogger(__name__)


def _format_signals(signals: dict) -> str:
    """Format the signals dict into clean readable text for Claude."""
    lines = [
        f"Subreddit: r/{signals.get('subreddit', 'unknown')}",
        f"Query: {signals.get('query', 'unknown')}",
        f"Posts analyzed: {signals.get('post_count', 0)}",
        "",
        "Themes:",
    ]
    themes = signals.get("themes", [])
    if isinstance(themes, list):
        for i, theme in enumerate(themes, 1):
            if isinstance(theme, dict):
                name = theme.get("theme") or theme.get("name", "Unnamed")
                sentiment = theme.get("sentiment", "")
                summary = theme.get("summary", "")
                lines.append(f"  {i}. {name}")
                if sentiment:
                    lines.append(f"     Sentiment: {sentiment}")
                if summary:
                    lines.append(f"     {summary}")
            else:
                lines.append(f"  {i}. {theme}")
    else:
        lines.append(str(themes))
    return "\n".join(lines)


def _format_analysis(analysis: dict) -> str:
    """Format the analysis dict into clean readable text for Claude."""
    lines = []
    shape = analysis.get("shape", {})
    if shape:
        lines.append(f"Dataset: {shape.get('rows', '?')} rows × {shape.get('columns', '?')} columns")
    columns = analysis.get("columns", [])
    if columns:
        lines.append(f"Columns: {', '.join(columns)}")
    summary = analysis.get("summary", "")
    if summary:
        lines.append("")
        lines.append(f"Business Summary:\n{summary}")
    return "\n".join(lines)


def analyze_gaps(signals: dict, analysis: dict) -> dict:
    """Identify gaps and misalignments between Reddit signals and internal CSV data."""
    system_prompt = load_prompt("gap_analysis.txt")
    user_message = (
        f"MARKET SIGNALS (Reddit):\n{_format_signals(signals)}\n\n"
        f"INTERNAL DATA ANALYSIS:\n{_format_analysis(analysis)}"
    )

    raw = call_claude(system_prompt, user_message)

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return {"gaps": parsed}
    except json.JSONDecodeError:
        logger.warning("Claude returned non-JSON gap analysis response; storing raw text.")

    return {"gaps": raw}
