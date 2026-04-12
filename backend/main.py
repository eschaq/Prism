import io
import json
import logging
import os

from fastapi import FastAPI, Form, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from typing import Optional

from reddit_scraper import scrape_signals
from data_processor import process_csvs, process_text
from narrative_engine import generate_narrative, answer_follow_up, AUDIENCE_PROMPTS
from gap_analysis import analyze_gaps, generate_battlecard
from subreddit_map import INDUSTRY_SUBREDDITS, DEFAULT_SUBREDDITS
from rss_feed_map import INDUSTRY_FEEDS, DEFAULT_FEEDS
from claude_client import call_claude, strip_code_fences
from visibility import assess_visibility

logger = logging.getLogger(__name__)

app = FastAPI(title="Prism API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static file serving for the built React frontend (production / HuggingFace)
# ---------------------------------------------------------------------------
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
ASSETS_DIR = os.path.join(DIST_DIR, "assets")

if os.path.isdir(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
class SignalRequest(BaseModel):
    subreddits: list[str] = Field(..., min_length=1, max_length=10)
    query: str = Field(..., min_length=1, max_length=300)
    limit: Optional[int] = Field(default=25, ge=1, le=100)
    profile: Optional[dict] = None
    rss_feeds: Optional[list[str]] = Field(default=None, max_length=10)


class GapRequest(BaseModel):
    signals: dict
    analysis: dict
    profile: Optional[dict] = None
    competitor_signals: Optional[dict] = None


VALID_AUDIENCES = set(AUDIENCE_PROMPTS.keys())


class NarrativeRequest(BaseModel):
    audience: str
    signals: dict
    analysis: dict
    gaps: Optional[dict] = None
    profile: Optional[dict] = None
    visibility: Optional[dict] = None

    @field_validator("audience")
    @classmethod
    def audience_must_be_valid(cls, v: str) -> str:
        normalized = v.lower()
        if normalized not in VALID_AUDIENCES:
            raise ValueError(f"audience must be one of: {sorted(VALID_AUDIENCES)}")
        return normalized


class FollowUpRequest(BaseModel):
    audience: str
    question: str = Field(..., min_length=1)
    briefing: str = Field(..., min_length=1)
    signals: dict
    analysis: dict
    gaps: Optional[dict] = None
    profile: Optional[dict] = None

    @field_validator("audience")
    @classmethod
    def audience_must_be_valid(cls, v: str) -> str:
        normalized = v.lower()
        if normalized not in VALID_AUDIENCES:
            raise ValueError(f"audience must be one of: {sorted(VALID_AUDIENCES)}")
        return normalized


class SubredditRequest(BaseModel):
    industry: str = Field(..., min_length=1)
    sub_industry: Optional[str] = None
    query: str = Field(..., min_length=1)


class CompetitorSuggestionRequest(BaseModel):
    company: str = Field(..., min_length=1)
    industry: str = Field(..., min_length=1)
    sub_industry: Optional[str] = None


class BattlecardRequest(BaseModel):
    competitive_contrast: list
    signals: dict
    profile: Optional[dict] = None


class VisibilityRequest(BaseModel):
    company: str = Field(..., min_length=1)
    industry: str = Field(..., min_length=1)
    competitors: list[str] = Field(..., min_length=1, max_length=8)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/signals — Reddit scrape + Claude signal extraction
# ---------------------------------------------------------------------------
@app.post("/api/signals", tags=["signals"])
async def get_signals(request: SignalRequest):
    try:
        competitors_raw = (request.profile or {}).get("competitors", "")
        competitors = [c.strip() for c in competitors_raw.split(",") if c.strip()] if competitors_raw else None
        result = scrape_signals(request.subreddits, request.query, request.limit, request.profile, request.rss_feeds, competitors)
        return result
    except ValueError as e:
        # Bad subreddit name, private sub, etc. — caller's fault
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        # Reddit rate limit, API errors — transient
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in /api/signals")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/analyze — CSV/text upload + Claude data analysis
# ---------------------------------------------------------------------------
ALLOWED_EXTENSIONS = {".csv", ".txt", ".md"}


@app.post("/api/analyze", tags=["data"])
async def analyze_data(
    files: list[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    profile: Optional[str] = Form(None),
):
    max_size = 10 * 1024 * 1024  # 10 MB per file
    csv_objs = []
    text_parts = []
    text_filenames = []

    try:
        # Process uploaded files
        if files:
            for f in files:
                if not f.filename:
                    continue
                ext = f.filename.lower()[f.filename.rfind("."):]
                if ext not in ALLOWED_EXTENSIONS:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Unsupported file type: {f.filename}. Accepted: .csv, .txt, .md",
                    )
                contents = await f.read()
                if not contents:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Uploaded file is empty: {f.filename}",
                    )
                if len(contents) > max_size:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File too large ({len(contents) / 1024 / 1024:.1f} MB): {f.filename}. Maximum is 10 MB per file.",
                    )
                if ext == ".csv":
                    csv_objs.append(io.BytesIO(contents))
                else:
                    text_parts.append(contents.decode("utf-8", errors="replace"))
                    text_filenames.append(f.filename)

        # Process pasted text
        if text and text.strip():
            text_parts.append(text.strip())
            if not text_filenames:
                text_filenames.append("pasted_text")

        if not csv_objs and not text_parts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files or text provided.",
            )

        profile_data = json.loads(profile) if profile else None

        # Route to appropriate processor
        if csv_objs and not text_parts:
            # CSV only
            result = process_csvs(csv_objs, profile_data)
        elif text_parts and not csv_objs:
            # Text only
            combined_text = "\n\n---\n\n".join(text_parts)
            result = process_text(combined_text, text_filenames, profile_data)
        else:
            # Mixed: process both and combine
            csv_result = process_csvs(csv_objs, profile_data)
            combined_text = "\n\n---\n\n".join(text_parts)
            text_result = process_text(combined_text, text_filenames, profile_data)
            result = {
                "summary": csv_result["summary"] + "\n\n---\n\n**Qualitative Analysis:**\n\n" + text_result["summary"],
                "shape": csv_result["shape"],
                "columns": csv_result["columns"],
                "preview": csv_result["preview"],
                "file_count": csv_result["file_count"] + text_result["file_count"],
                "input_type": "mixed",
                "text_length": text_result["text_length"],
                "source_files": text_result["source_files"],
            }

        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in /api/analyze: %s", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/gaps — Cross-stream gap analysis
# ---------------------------------------------------------------------------
@app.post("/api/gaps", tags=["analysis"])
async def get_gaps(request: GapRequest):
    if not request.signals or not request.analysis:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'signals' and 'analysis' must be non-empty.",
        )
    try:
        result = analyze_gaps(request.signals, request.analysis, request.profile, request.competitor_signals)
        return result
    except Exception as e:
        logger.exception("Unexpected error in /api/gaps")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/narrative — Audience-specific briefing generation
# ---------------------------------------------------------------------------
@app.post("/api/narrative", tags=["narrative"])
async def get_narrative(request: NarrativeRequest):
    if not request.signals or not request.analysis:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'signals' and 'analysis' must be non-empty.",
        )
    try:
        result = generate_narrative(request.audience, request.signals, request.analysis, request.gaps, request.profile, request.visibility)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in /api/narrative")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/narrative/follow-up — Answer a follow-up question
# ---------------------------------------------------------------------------
@app.post("/api/narrative/follow-up", tags=["narrative"])
async def get_follow_up(request: FollowUpRequest):
    try:
        result = answer_follow_up(
            request.audience, request.question, request.briefing,
            request.signals, request.analysis, request.gaps, request.profile,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in /api/narrative/follow-up")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/subreddits — Dynamic subreddit suggestions
# ---------------------------------------------------------------------------
@app.post("/api/subreddits", tags=["signals"])
async def get_subreddits(request: SubredditRequest):
    base_list = INDUSTRY_SUBREDDITS.get(request.industry, DEFAULT_SUBREDDITS)
    try:
        if request.sub_industry:
            prompt = (
                f"Given the industry '{request.industry}' and sub-industry '{request.sub_industry}', "
                f"and the search query '{request.query}', select the 5 most relevant subreddits "
                f"from this list: {base_list}\n\n"
                "Return ONLY a JSON array of subreddit names (no r/ prefix). No commentary."
            )
            raw = call_claude("You select relevant subreddits. Return only a JSON array.", prompt)
            try:
                parsed = json.loads(strip_code_fences(raw))
                if isinstance(parsed, list):
                    suggested = [s for s in parsed if isinstance(s, str)][:7]
                    if len(suggested) >= 3:
                        return {"suggested": suggested}
            except (json.JSONDecodeError, Exception):
                logger.warning("Claude returned invalid subreddit suggestions; using defaults.")
        suggested = base_list[:5]
    except Exception as e:
        logger.exception("Unexpected error in /api/subreddits")
        suggested = DEFAULT_SUBREDDITS[:5]
    return {"suggested": suggested}


# ---------------------------------------------------------------------------
# POST /api/feeds — Suggested RSS feeds for an industry
# ---------------------------------------------------------------------------
class FeedRequest(BaseModel):
    industry: str = Field(..., min_length=1)


@app.post("/api/feeds", tags=["signals"])
async def get_feeds(request: FeedRequest):
    feeds = INDUSTRY_FEEDS.get(request.industry, DEFAULT_FEEDS)
    return {"suggested": feeds[:5]}


# ---------------------------------------------------------------------------
# POST /api/battlecard — Generate competitive sales battlecard
# ---------------------------------------------------------------------------
@app.post("/api/battlecard", tags=["analysis"])
async def get_battlecard(request: BattlecardRequest):
    if not request.competitive_contrast:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="competitive_contrast must be non-empty.",
        )
    try:
        result = generate_battlecard(request.competitive_contrast, request.signals, request.profile)
        return result
    except Exception as e:
        logger.exception("Unexpected error in /api/battlecard")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/suggest-competitors — AI-powered competitor suggestions
# ---------------------------------------------------------------------------
@app.post("/api/suggest-competitors", tags=["analysis"])
async def suggest_competitors(request: CompetitorSuggestionRequest):
    sub_context = f" (sub-industry: {request.sub_industry})" if request.sub_industry else ""
    prompt = (
        f"Company: {request.company}\n"
        f"Industry: {request.industry}{sub_context}\n\n"
        "List 5-8 likely direct competitors for this company in this space. "
        "Include both well-known market leaders and emerging challengers. "
        "Return ONLY a JSON array of company name strings. No commentary."
    )
    try:
        raw = call_claude("You identify business competitors. Return only a JSON array.", prompt)
        parsed = json.loads(strip_code_fences(raw))
        if isinstance(parsed, list):
            suggested = [s for s in parsed if isinstance(s, str)][:8]
            return {"suggested": suggested}
    except (json.JSONDecodeError, Exception):
        logger.warning("Claude returned invalid competitor suggestions.")
    return {"suggested": []}


# ---------------------------------------------------------------------------
# POST /api/visibility — AI search visibility assessment
# ---------------------------------------------------------------------------
@app.post("/api/visibility", tags=["analysis"])
async def get_visibility(request: VisibilityRequest):
    try:
        result = assess_visibility(request.company, request.industry, request.competitors)
        return result
    except Exception as e:
        logger.exception("Unexpected error in /api/visibility")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# GET /api/demo-data/{filepath:path} — Serve demo data files
# ---------------------------------------------------------------------------
DEMO_DATA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "data", "demo"))

DEMO_MEDIA_TYPES = {
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


@app.get("/api/demo-data/{filepath:path}", tags=["data"])
async def get_demo_data(filepath: str):
    # Validate extension
    ext = filepath[filepath.rfind("."):].lower() if "." in filepath else ""
    if ext not in DEMO_MEDIA_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type.")
    # Resolve and validate path stays within demo directory
    resolved = os.path.realpath(os.path.join(DEMO_DATA_DIR, filepath))
    if not resolved.startswith(DEMO_DATA_DIR + os.sep):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path.")
    if not os.path.isfile(resolved):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Demo file not found: {filepath}")
    filename = os.path.basename(resolved)
    return FileResponse(resolved, media_type=DEMO_MEDIA_TYPES[ext], filename=filename)


# ---------------------------------------------------------------------------
# Catch-all — serve React index.html for client-side routing (must be last)
# ---------------------------------------------------------------------------
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Frontend not built. Run `npm run build` in the frontend directory."},
    )
