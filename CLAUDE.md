# Prism — Claude Code Instructions

## What This Project Is
Prism is an AI-powered enterprise intelligence platform built for the AI & Big Data Expo 
North America Hackathon (lablab.ai). Submission deadline: May 19, 2026.

Tagline: "One source of truth. Every audience, perfectly framed."

## Three Layers
1. Signal Collection — scrapes Reddit via PRAW, extracts structured themes using Claude
2. Data Analysis — ingests CSV, produces plain-English business summary using Claude
3. Narrative Engine — generates audience-specific briefings (CFO, Operations, Marketing, Sales)

## Tech Stack
- Frontend: React + Tailwind CSS + shadcn/ui
- Backend: FastAPI (Python)
- AI: Claude API — always use claude-sonnet-4-5, never opus or haiku
- Signal layer: PRAW (Reddit scraper)
- Data processing: Pandas
- Hosting: HuggingFace Spaces (Docker)

## Project Structure
prism/
├── frontend/
│   └── src/components/
│       ├── SignalPanel.jsx
│       ├── DataPanel.jsx
│       ├── NarrativePanel.jsx
│       ├── GapAnalysis.jsx
│       └── LoadingStates.jsx
├── backend/
│   ├── main.py
│   ├── reddit_scraper.py
│   ├── data_processor.py
│   ├── claude_client.py
│   ├── narrative_engine.py
│   ├── gap_analysis.py
│   └── prompts/
│       ├── signal_extraction.txt
│       ├── data_analysis.txt
│       ├── gap_analysis.txt
│       ├── narrative_cfo.txt
│       ├── narrative_operations.txt
│       ├── narrative_marketing.txt
│       └── narrative_sales.txt
├── data/
│   └── demo_enterprise.csv
├── Dockerfile
├── requirements.txt
├── CLAUDE.md
└── README.md
## API Routes
- POST /api/signals → Reddit scrape + Claude signal extraction
- POST /api/analyze → CSV upload + Claude data analysis
- POST /api/gaps → Cross-stream gap analysis
- POST /api/narrative → Audience-specific briefing generation

## Layer Rules — Always Follow These
- Never put business logic in React components
- Never put UI logic in FastAPI routes
- claude_client.py is the only file that calls the Anthropic API
- All prompt templates live in backend/prompts/ as .txt files
- No hardcoded API keys anywhere — always use environment variables

## Claude API Pattern
```python
import anthropic

client = anthropic.Anthropic()  # key from environment

def call_claude(system_prompt: str, user_message: str, temperature: float = 0.3):
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )
    return message.content[0].text
Hard Constraints
Always use claude-sonnet-4-5 — never opus, never haiku
No Streamlit, no Gradio — React only for frontend
No hardcoded secrets
MIT License — repo must stay public
Reddit scraper is proprietary — extend it, don't replace it
Start Every Session By
Reading this file
Reading prism_02_technical_architecture.md if doing architecture work
Reading the relevant backend file before modifying it