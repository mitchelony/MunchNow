# MunchNow

MunchNow is a campus-aware food discovery app built for students in Huntsville. It combines a Next.js frontend with a FastAPI backend and ranks places using vote activity plus distance from campus.

Live apps:

- Frontend: `https://munchnow.vercel.app`
- Backend: `https://munchnow.onrender.com`

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript
- Backend: FastAPI, Python, Supabase Postgres
- Analytics: PostHog
- Deployment: Vercel (frontend), Render (backend)

## Repository Structure

```text
MunchNow/
├── frontend/   # Next.js app
├── backend/    # FastAPI API and scripts
└── README.md
```

## Features

- Campus-aware restaurant ranking
- Sort modes for `best`, `closest`, and `trending`
- Voting with updated counts returned by the API
- Category filtering
- Place detail pages
- Hidden beta onboarding flow
- PostHog analytics instrumentation

## Getting Started

### 1. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:3000`.

## Environment Variables

### Backend

Create `backend/.env` with:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ENVIRONMENT=
YELP_API_KEY=
GOOGLE_MAPS_API_KEY=
```

Notes:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required for app runtime.
- `SUPABASE_ANON_KEY` is kept for compatibility.
- `YELP_API_KEY` is only needed for the Yelp enrichment script.
- `GOOGLE_MAPS_API_KEY` is used for server-side Google Places photo ingestion.
- `backend/.env.local` is also loaded and can override values locally.

### Frontend

Create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_CAMPUS_ID=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_APP_VERSION=
```

## Main App Routes

### Frontend

- `/` discover and trending feed
- `/close` close-to-campus view
- `/place/[id]` place detail page
- `/saved` saved places
- `/info` app info page
- `/beta/onboarding` beta tester onboarding

### Backend

- `GET /health`
- `GET /campuses`
- `GET /places`
- `GET /places/{id}`
- `GET /trending`
- `POST /votes`
- `POST /beta/testers`

## Utility Scripts

Run backend scripts from `backend/` with the virtual environment active and `PYTHONPATH=.`.

### Yelp image enrichment

```bash
PYTHONPATH=. python3 scripts/yelp_enrich.py --limit 1000 --output-csv yelp_images.csv
```

### Import new places

```bash
PYTHONPATH=. python3 scripts/import_new_places.py --file /path/to/new_places.txt
```

### Stats and load testing

- `scripts/seed_stats.py`
- `scripts/dataset_stats.py`
- `scripts/latency_stats.py`

## Deployment

### Frontend

- Hosted on Vercel
- Build command: `npm run build`

### Backend

- Hosted on Render
- Make sure backend environment variables are set in the deployment environment

## Additional Notes

- Place-reading endpoints currently expect a `campus_id`.
- Analytics events are implemented in [frontend/lib/analytics.ts](/Users/MAC/Documents/GitHub/MunchNow/frontend/lib/analytics.ts).
- Frontend API calls are implemented in [frontend/lib/api.ts](/Users/MAC/Documents/GitHub/MunchNow/frontend/lib/api.ts).
