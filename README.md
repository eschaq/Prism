---
title: Prism
emoji: 🔮
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
---

# Prism — Narrative Intelligence Platform

**Prism is the narrative intelligence layer between your market signals and your BI data — the only platform that makes the dark funnel visible, connects it to your internal numbers, and explains what both mean to every person in the room, at no cost.**

🔗 **[Live Demo →](https://huggingface.co/spaces/eschaq/Prism)**

---

## The Problem

83% of B2B buyers make purchase decisions in channels your analytics will never see — Reddit threads, community forums, Hacker News discussions, peer conversations. That's the dark funnel. Traditional BI tools report on what already happened inside your systems. Market research firms deliver insights weeks too late and charge six figures for them. The gap isn't reporting — it's timing. Executives need to know what's about to happen and what to do about it before the meeting, before the quarter ends, before the competitor moves. Today, no single platform connects what the market is saying to what your data shows and then explains what both mean — differently — to the CFO, the VP of Sales, the Product Manager, and the Board. Prism does.

## The Solution

Prism is a three-layer narrative intelligence platform:

**Layer 1 — Signal Collection.** Scrapes Reddit, RSS feeds, Hacker News, podcast feeds, and AI-powered web search in real time. Every post is scored with a proprietary Pain Point Score (PPS) across four dimensions: volume, frequency, intensity, and willingness-to-pay. Career noise is filtered. Competitor mentions are tracked separately. The result is a structured, scored feed of what your market actually cares about right now.

**Layer 2 — Data Analysis.** Upload CSVs, paste meeting notes, drop in support ticket summaries or sales call transcripts. Structured data gets Pandas analysis with column detection and statistical summaries. Unstructured text gets qualitative analysis. Both produce plain-English business insights. The platform then cross-references market signals against internal data to surface opportunity gaps, blind spots, and a competitive heat map showing where competitors are filling demand you're missing.

**Layer 3 — Narrative Engine.** Select your audience — CFO, Operations, Marketing, Sales, Product, Sales Engineer, HR, Supply Chain, Customer Success, Risk/Compliance, Board, Small Business Owner, or Chief Intelligence Officer — and Prism generates a complete executive briefing tailored to that role's language, priorities, and decision-making framework. Every briefing includes recommended actions, a confidence-weighted decision trigger, AI search visibility analysis, and follow-up questions the executive would naturally ask next.

## Key Features

- **14 audience roles** — same intelligence, 14 different lenses (CFO through CIO)
- **4 analysis paths** — Signal Report, Data Brief, Gap Analysis, Full Intelligence Report
- **Agentic Mode** — one click runs all 5 steps automatically with live progress tracking
- **Dark funnel signals** — Reddit, RSS, Hacker News, podcast RSS, AI-powered web search
- **Unstructured text upload** — paste meeting notes, sales call transcripts, support tickets alongside CSVs
- **Competitive Gap Heat Map** — 2x2 matrix of pain intensity vs competitor presence
- **AI Search Presence (Share of Model)** — estimated % of AI responses that mention your company vs competitors
- **Messaging Alignment Score** — 1-10 rating of how well your positioning matches market demand
- **Mindshare Risk alerts** — which competitor is gaining ground and why
- **Decision Readiness Score** — composite score showing how complete your intelligence is before generating
- **Generate All 14 Briefs** — one click produces briefings for every audience role
- **Audience comparison** — side-by-side briefing comparison across roles
- **Competitive battlecard generation** — auto-generated sales battlecard from gap findings
- **Buyer persona stress test** — AI roleplays a skeptical buyer reacting to your gap analysis
- **Trend sparklines** — 3-scan rolling history showing theme evolution over time
- **What Changed deltas** — NEW/RISING/DECLINING badges comparing current scan to previous
- **5 export formats** — Copy, PDF (branded), Email draft, Notion-formatted, Slack-formatted, shareable link
- **Follow-up Q&A** — click a suggested question to get an instant in-context answer
- **Evidence trail** — collapsible audit showing exactly which sources informed each briefing
- **Industry benchmarking** — Claude references industry-typical metrics in gap findings
- **Demo mode** — pre-configured Acme Analytics scenario with 15 demo CSV datasets + 4 text files

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS + Vite (Stitch design system) |
| Backend | FastAPI (Python 3.11, async) |
| AI | Claude claude-sonnet-4-5 via Anthropic API |
| Signal Sources | asyncpraw (Reddit), feedparser (RSS/HN/podcasts), Claude web search tool |
| Data Processing | Pandas (structured) + Claude (qualitative text) |
| Scoring | Custom PPS engine (volume, frequency, intensity, WTP) |
| Design System | Google Stitch (Material 3 dark theme tokens) |
| Hosting | HuggingFace Spaces (Docker) |
| Cost to user | Free |

## The 6-Layer Moat

1. **Pain Point Scoring (PPS)** — proprietary 4-dimension scoring algorithm that rates every market signal before it reaches Claude, so the AI focuses on what matters most
2. **Signal × Data cross-reference** — no other tool connects live Reddit/RSS/web signals to your uploaded CSV data and finds the gaps between them
3. **14 audience-specific narratives** — same intelligence, 14 completely different briefings, each written in the language and priorities of that role
4. **GEO context (Generative Engine Optimization)** — AI Search Presence / Share of Model analysis shows how visible you are in the new AI-mediated discovery layer
5. **Free tier with full functionality** — no paywall, no feature gating, no "contact sales" — the complete platform runs on HuggingFace Spaces at zero cost
6. **Dark funnel as a named category** — Prism doesn't just analyze signals, it names the problem ("dark funnel") and makes it a boardroom concept

## Quick Start (Local Development)

```bash
# 1. Clone
git clone https://github.com/eschaq/Prism.git
cd Prism

# 2. Backend
cd backend
python -m venv ../venv && source ../venv/bin/activate
pip install -r ../requirements.txt
export ANTHROPIC_API_KEY=your_key
export REDDIT_CLIENT_ID=your_id
export REDDIT_CLIENT_SECRET=your_secret
uvicorn main:app --reload --port 8000

# 3. Frontend (separate terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev

# 4. Open http://localhost:5173

# 5. (Optional) Load demo data from the Data Insights step
```

## HuggingFace Deployment — Required Secrets

Configure in **Settings → Repository secrets**:

| Secret | Description | Required |
|--------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Yes |
| `REDDIT_CLIENT_ID` | Reddit app client ID ([reddit.com/prefs/apps](https://reddit.com/prefs/apps)) | Yes |
| `REDDIT_CLIENT_SECRET` | Reddit app client secret | Yes |
| `REDDIT_USER_AGENT` | Reddit API user agent string | No (defaults to "Prism/1.0") |

---

**Built by Eban Schachter**
AI & Big Data Expo North America Hackathon 2026 · [lablab.ai](https://lablab.ai)

MIT License
