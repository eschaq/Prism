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

from reddit_scraper import scrape_reddit
from data_processor import process_csv
from narrative_engine import generate_narrative, AUDIENCE_PROMPTS
from gap_analysis import analyze_gaps

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
    subreddit: str = Field(..., min_length=1, max_length=100)
    query: str = Field(..., min_length=1, max_length=300)
    limit: Optional[int] = Field(default=25, ge=1, le=100)
    profile: Optional[dict] = None


class GapRequest(BaseModel):
    signals: dict
    analysis: dict
    profile: Optional[dict] = None


VALID_AUDIENCES = set(AUDIENCE_PROMPTS.keys())


class NarrativeRequest(BaseModel):
    audience: str
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
        result = scrape_reddit(request.subreddit, request.query, request.limit, request.profile)
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
# POST /api/analyze — CSV upload + Claude data analysis
# ---------------------------------------------------------------------------
@app.post("/api/analyze", tags=["data"])
async def analyze_data(file: UploadFile = File(...), profile: Optional[str] = Form(None)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .csv files are accepted.",
        )
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )
        max_size = 10 * 1024 * 1024  # 10 MB
        if len(contents) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large ({len(contents) / 1024 / 1024:.1f} MB). Maximum size is 10 MB.",
            )
        profile_data = json.loads(profile) if profile else None
        result = process_csv(io.BytesIO(contents), profile_data)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in /api/analyze")
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
        result = analyze_gaps(request.signals, request.analysis, request.profile)
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
        result = generate_narrative(request.audience, request.signals, request.analysis, request.gaps, request.profile)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in /api/narrative")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


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
