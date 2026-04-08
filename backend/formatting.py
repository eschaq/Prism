"""Shared formatting helpers for preparing Claude user messages."""


def format_signals(signals: dict) -> str:
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


def format_analysis(analysis: dict) -> str:
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


def format_gaps(gaps: dict) -> str:
    """Format the gaps dict into clean readable text for Claude."""
    if not gaps:
        return "No gap analysis available."

    # If structured JSON parse succeeded, gaps is nested under "gaps" key
    data = gaps.get("gaps", gaps)

    # Structured format from gap_analysis.py
    if isinstance(data, dict):
        sections = []
        for key, label in [
            ("alignments", "Alignments"),
            ("gaps", "Critical Gaps"),
            ("blind_spots", "Blind Spots"),
            ("recommendations", "Recommendations"),
        ]:
            items = data.get(key, [])
            if not items:
                continue
            sections.append(f"{label}:")
            for i, item in enumerate(items, 1):
                if isinstance(item, dict):
                    main = item.get("finding") or item.get("action", "")
                    detail = item.get("evidence") or item.get("rationale", "")
                    sections.append(f"  {i}. {main}")
                    if detail:
                        sections.append(f"     {detail}")
                else:
                    sections.append(f"  {i}. {item}")
        return "\n".join(sections) if sections else str(data)

    # Raw text fallback
    return str(data)
