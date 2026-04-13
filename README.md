---
title: Prism
emoji: 🔮
colorFrom: indigo
colorTo: cyan
sdk: docker
app_port: 7860
---

# Prism — Enterprise Intelligence Platform

One source of truth. Every audience, perfectly framed.

Prism is an AI-powered narrative intelligence platform that connects market signals to internal data, identifies opportunity gaps, and generates audience-specific executive briefings.

## Architecture

- **Frontend**: React + Tailwind CSS + Vite (Stitch design system)
- **Backend**: FastAPI (Python)
- **AI**: Claude API (claude-sonnet-4-5)
- **Signal Sources**: Reddit (asyncpraw), RSS feeds, AI-powered web search
- **Data Processing**: Pandas + qualitative text analysis
- **Hosting**: HuggingFace Spaces (Docker)

## Five Intelligence Steps

1. **Market Intelligence** — Scrape Reddit, RSS feeds, and web search for market signals with PPS scoring
2. **Data Insights** — Upload CSVs or paste text for plain-English data analysis
3. **Opportunity Gaps** — Cross-reference signals against data to find gaps, with competitive heat map
4. **AI Search Presence** — Assess Share of Model visibility vs competitors
5. **Executive Briefing** — Generate role-specific briefings for 14 audience roles

## Deployment — HuggingFace Spaces

### Required Space Secrets

Configure these in your Space's **Settings → Repository secrets**:

| Secret | Description | Required |
|--------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude | Yes |
| `REDDIT_CLIENT_ID` | Reddit app client ID (from reddit.com/prefs/apps) | Yes |
| `REDDIT_CLIENT_SECRET` | Reddit app client secret | Yes |
| `REDDIT_USER_AGENT` | Reddit API user agent string | No (defaults to "Prism/1.0") |

### How it works

The Docker container runs a single FastAPI server on port 7860 that:
- Serves the built React frontend as static files
- Handles all `/api/*` routes for backend intelligence processing
- Falls back to `index.html` for client-side routing

The multi-stage Dockerfile builds the React frontend with Node 20, then copies the built assets into a Python 3.11 runtime image.

### Local Development

```bash
# Backend
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

## License

MIT
