from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import io

from reddit_scraper import scrape_reddit
from data_processor import process_csv
from narrative_engine import generate_narrative
from gap_analysis import analyze_gaps

app = FastAPI(title="Prism API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SignalRequest(BaseModel):
    subreddit: str
    query: str
    limit: Optional[int] = 25


class NarrativeRequest(BaseModel):
    audience: str  # "cfo" | "operations" | "marketing" | "sales"
    signals: dict
    analysis: dict


class GapRequest(BaseModel):
    signals: dict
    analysis: dict


@app.post("/api/signals")
async def get_signals(request: SignalRequest):
    try:
        result = scrape_reddit(request.subreddit, request.query, request.limit)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
async def analyze_data(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        result = process_csv(io.BytesIO(contents))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/gaps")
async def get_gaps(request: GapRequest):
    try:
        result = analyze_gaps(request.signals, request.analysis)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/narrative")
async def get_narrative(request: NarrativeRequest):
    try:
        result = generate_narrative(request.audience, request.signals, request.analysis)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
