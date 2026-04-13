"""Full pipeline orchestrator — chains all 5 intelligence steps sequentially."""

import io
import time
import logging

from reddit_scraper import scrape_signals
from data_processor import process_csvs, process_text
from gap_analysis import analyze_gaps
from visibility import assess_visibility
from narrative_engine import generate_narrative

logger = logging.getLogger(__name__)


def _run_step(name, fn):
    """Run a step function, capture result, error, and duration."""
    start = time.time()
    try:
        result = fn()
        duration = int((time.time() - start) * 1000)
        return result, {"status": "completed", "duration_ms": duration}
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        logger.exception("Pipeline step '%s' failed", name)
        return None, {"status": "failed", "error": str(e), "duration_ms": duration}


def _skip_step(reason):
    """Return a skipped status entry."""
    return None, {"status": "skipped", "reason": reason}


def run_full_pipeline(
    subreddits: list[str],
    query: str,
    limit: int = 25,
    rss_feeds: list[str] | None = None,
    csv_objs: list[io.BytesIO] | None = None,
    text_content: str | None = None,
    text_filenames: list[str] | None = None,
    audience: str = "cfo",
    profile: dict | None = None,
) -> dict:
    """Run all 5 intelligence steps sequentially with dependency-aware error handling.

    Returns a dict with results from each step plus status/timing metadata.
    """
    pipeline_start = time.time()

    signals_result = None
    analysis_result = None
    gaps_result = None
    visibility_result = None
    narrative_result = None
    steps_status = {}

    # Parse competitors from profile
    competitors_raw = (profile or {}).get("competitors", "")
    competitors = [c.strip() for c in competitors_raw.split(",") if c.strip()] if competitors_raw else None

    # --- Step 1: Signal Collection ---
    signals_result, steps_status["signals"] = _run_step("signals", lambda: scrape_signals(
        subreddits, query, limit, profile, rss_feeds, competitors,
    ))

    # --- Step 2: Data Analysis ---
    if csv_objs or text_content:
        if csv_objs and not text_content:
            analysis_result, steps_status["analysis"] = _run_step("analysis", lambda: process_csvs(
                csv_objs, profile,
            ))
        elif text_content and not csv_objs:
            analysis_result, steps_status["analysis"] = _run_step("analysis", lambda: process_text(
                text_content, text_filenames or ["pasted_text"], profile,
            ))
        else:
            # Mixed: run both and combine
            def _mixed_analysis():
                csv_result = process_csvs(csv_objs, profile)
                text_result = process_text(text_content, text_filenames or ["pasted_text"], profile)
                return {
                    "summary": csv_result["summary"] + "\n\n---\n\n**Qualitative Analysis:**\n\n" + text_result["summary"],
                    "shape": csv_result["shape"],
                    "columns": csv_result["columns"],
                    "preview": csv_result["preview"],
                    "file_count": csv_result["file_count"] + text_result["file_count"],
                    "input_type": "mixed",
                    "text_length": text_result["text_length"],
                    "source_files": text_result["source_files"],
                }
            analysis_result, steps_status["analysis"] = _run_step("analysis", _mixed_analysis)
    else:
        analysis_result, steps_status["analysis"] = _skip_step("no data files or text provided")

    # --- Step 3: Gap Analysis ---
    if signals_result and analysis_result:
        competitor_signals = signals_result.get("competitor_signals")
        gaps_result, steps_status["gaps"] = _run_step("gaps", lambda: analyze_gaps(
            signals_result, analysis_result, profile, competitor_signals,
        ))
    else:
        reasons = []
        if not signals_result:
            reasons.append("signals step failed or skipped")
        if not analysis_result:
            reasons.append("analysis step failed or skipped")
        gaps_result, steps_status["gaps"] = _skip_step(" and ".join(reasons))

    # --- Step 4: AI Visibility (independent) ---
    company = (profile or {}).get("companyName", "")
    industry = (profile or {}).get("industry", "General")
    if company and competitors:
        visibility_result, steps_status["visibility"] = _run_step("visibility", lambda: assess_visibility(
            company, industry, competitors,
        ))
    else:
        visibility_result, steps_status["visibility"] = _skip_step(
            "company name or competitors not configured in profile"
        )

    # --- Step 5: Narrative Engine ---
    # Runs if signals exist; analysis/gaps/visibility are optional
    if signals_result:
        narrative_result, steps_status["narrative"] = _run_step("narrative", lambda: generate_narrative(
            audience, signals_result, analysis_result or {}, gaps_result, profile, visibility_result,
        ))
    else:
        narrative_result, steps_status["narrative"] = _skip_step("signals step failed or skipped")

    total_duration = int((time.time() - pipeline_start) * 1000)

    return {
        "signals": signals_result,
        "analysis": analysis_result,
        "gaps": gaps_result,
        "visibility": visibility_result,
        "narrative": narrative_result,
        "steps_status": steps_status,
        "total_duration_ms": total_duration,
    }
