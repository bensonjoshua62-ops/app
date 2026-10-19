# IGRIS Trading Platform - PRD

## Original Problem Statement
AI-powered trading platform with MT5 integration, copy trading, admin dashboard, Pro user tiers, and voice-to-text trading. Deployed via Vercel (frontend + backend).

## Architecture
- **Frontend**: React (CRA + Craco) + Tailwind CSS + Shadcn UI → Vercel
- **Backend**: FastAPI + Motor (async MongoDB) → Vercel (serverless) or Railway (persistent)
- **Database**: MongoDB Atlas (cloud)
- **3rd Party**: MetaAPI, OpenAI Whisper (Emergent LLM Key), TradingView

## Implemented Features
- Multi-Account MT5 Support with auto CopyFactory subscription
- Optimized Dashboard with cached balance (30s auto-refresh)
- Admin Controls (users, API keys, CopyFactory strategy config)
- Pro User Tier with admin toggle and feature flagging
- IGRIS Voice AI (voice-to-text trading)
- TradingView Chart Integration
- EA Signals live feed
- Settings (Profile, Security, 2FA, Notifications)
- System Status monitoring

## Deployment Config (Dec 2025)
- `backend/vercel.json` — Vercel Python runtime config
- `backend/runtime.txt` — Python 3.12 version pin
- `backend/.env.example` — Backend env vars template
- `frontend/.env.example` — Frontend env vars template
- `.gitignore` — Excludes secrets, includes .env.example
- `VERCEL_DEPLOYMENT_GUIDE.md` — 558-line guide (MongoDB Atlas, Vercel, Railway, domains, troubleshooting)

## E2E Test Results (Dec 2025)
- **Backend**: 22/22 tests passed (100%)
- **Frontend**: All critical flows working (100%)
- Flows verified: signup → approval block → admin approval → login → MT5 balance → copy trading active → IGRIS AI → EA Signals → Chart → Settings
- Test file: `/app/backend/tests/test_igris_api.py`
- Report: `/app/test_reports/iteration_1.json`

## Pending Issues
- P1: Email deliverability (SMTP provider — user needs to configure a working provider)
- P2: Trade history not displaying immediately for new accounts
- MetaAPI billing limit reached (cannot create new MT5 accounts until topped up)

## In Progress
- Dashboard.jsx refactor (4500+ lines, needs component breakdown)

## Backlog
- P1: Demo video content
- P2: Stripe subscription payment integration
- P2: Wallet functionality
- P2: Learn Page CMS verification
- P3: useEffect dependency warnings in frontend
