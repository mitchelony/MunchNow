# MunchHSV — what to eat right now (Huntsville)

A mobile-first “food dashboard” for Huntsville that surfaces quick picks by category (Quick Bites, Cheap, Late Night, Coffee Spots, Local Favorite), lets people open directions instantly, and vote so the list gets smarter over time.

**Live:** https://munchnow.vercel.app  
**API:** https://munchnow.onrender.com  
*(Replace these if your URLs differ.)*

---

## What this is (and why)

Food decisions are a repeating problem: you’re hungry, you want something good, and you don’t want to scroll Google Maps or DoorDash forever. MunchHSV is designed to be **fast**:

**See → Choose → Maps → Vote**

Start local (Huntsville), keep it simple, and grow based on real usage.

---

## Core features

- **5 curated categories**: Quick Bites, Cheap, Late Night, Coffee Spots, Local Favorite
- **Trending picks** based on community votes (time-windowed)
- **One-tap “Open in Maps”** flow (no extra steps)
- **Voting loop** so picks reflect what people actually choose
- **Mobile-first UX** (fast sessions, thumb-friendly)
- **Web analytics** via Vercel Analytics (traffic + usage visibility)

---

## Tech stack

**Frontend**
- Next.js / React (deployed on **Vercel**)
- Vercel Web Analytics

**Backend**
- **FastAPI (Python)** REST API
- Supabase Python client

**Database**
- **Supabase Postgres**
  - `places` (seeded)
  - `votes` (FK → places)

**Hosting**
- Frontend: **Vercel**
- Backend: **Render**

---

## Architecture (high level)

- Frontend calls the FastAPI backend for:
  - places (by category / city)
  - trending picks (by time window)
  - submitting votes
- Backend reads/writes through Supabase (Postgres)
- “Popularity” / “Trending” is derived from vote counts over a time window

Why this setup:
- **Decoupled deployments** (frontend and backend ship independently)
- Supabase keeps the DB + admin workflow simple while still using real Postgres
- FastAPI keeps backend logic explicit and scalable (routing, schemas, validation)

---

## API endpoints (v1)

Examples (your routes may differ — adjust to match your code):

- `GET /health`
- `GET /places?city=Huntsville&category=cheap&limit=12`
- `GET /trending?city=Huntsville&time_window=7d&limit=12`
- `POST /votes` (vote for a place)

---

## Local development

### Prereqs
- Python 3.11+ (or your version)
- Node 18+
- Supabase project (URL + keys)

### Backend (FastAPI)
1. `cd backend`
2. Create `.env` (or use `.env.example`) and set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - (optional) `SUPABASE_SERVICE_ROLE_KEY` *(avoid using this in public-facing deployments)*
3. Install deps and run:
   - `uvicorn main:app --reload`

Backend runs on: `http://127.0.0.1:8000`

### Frontend
1. `cd frontend`
2. Set env vars (example):
   - `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
3. Install deps and run:
   - `npm install`
   - `npm run dev`

Frontend runs on: `http://127.0.0.1:3000`

---

## Deployment notes (what matters)

### Backend (Render)
- Run command should bind to Render’s port (no `--reload` in production)
- Configure environment variables in Render (don’t commit secrets)

### CORS
If your frontend is on Vercel and backend is on Render, the backend must allow requests from:
- `https://munchnow.vercel.app` (and any custom domain you add later)

---

## Known constraints (v1)

- No photos yet (intentional — avoids API cost + complexity early)
- Huntsville-first dataset (seeded list)
- Trending depends on vote volume (cold start is real)

---

## Next improvements

- Add “Open now” reliability + better hours handling
- Add lightweight photos later (likely via Places API or curated uploads)
- Improve ranking with time decay + category balancing
- Expand beyond Huntsville once the loop is proven

---

## License

MIT (add a LICENSE file if you want it formally included).
