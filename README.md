# MunchNow (MunchHSV)

Campus-aware, student-focused food discovery for Huntsville.

- Frontend: Next.js App Router (`frontend/`)
- Backend: FastAPI + Supabase Postgres (`backend/`)
- Live frontend: `https://munchnow.vercel.app`
- Live backend: `https://munchnow.onrender.com`

## What is implemented

- Campus-based ranking (`campus_id` required on place-read endpoints)
- Distance-aware scoring using `place_distances`
- Sort modes: `best`, `closest`, `trending`
- Stable ordering and pagination-ready API behavior
- Votes with server-returned updated counts
- Category filtering (including `All` behavior on frontend)
- Yelp image enrichment support (`image_url`, `image_source`)
- Hidden beta onboarding flow at `/beta/onboarding` (noindex/nofollow)
- PostHog event tracking with shared context payload

## Architecture

### Frontend (`frontend/`)

- Next.js 16 (App Router)
- Main surfaces:
  - `/` discover/trending
  - `/close` close-to-campus view
  - `/place/[id]` place details
  - `/beta/onboarding` hidden beta onboarding page
- API client: `frontend/lib/api.ts`
- Analytics helper: `frontend/lib/analytics.ts`

### Backend (`backend/`)

- FastAPI app entry: `backend/main.py`
- Routes:
  - `GET /health`
  - `GET /campuses`
  - `GET /places`
  - `GET /places/{id}`
  - `GET /trending`
  - `POST /votes`
  - `POST /beta/testers`
- Supabase access via service role key: `backend/app/db/client.py`

## API contracts (current)

### Campus requirement

`campus_id` is required for endpoints returning places:

- `GET /places`
- `GET /places/{id}`
- `GET /trending`

Missing `campus_id` returns `400`.

### Sort modes

Supported query param: `sort=best|closest|trending`

- `/places` default: `best`
- `/trending` default: `trending`

### Per-place payload fields

Frontend depends on:

- `id`
- `name`
- `categories`
- `price_tier`
- `distance_miles`
- `score`

Vote-enabled responses may also include:

- `worth_it_count`, `mid_count`, `skip_count`, `total_votes`
- `image_url`, `image_source`

### Scoring

- Popularity from votes
- Distance signal: `exp(-distance_miles / 2.5)`
- Weighted blend by sort mode:
  - `best`: `0.65 * popularity + 0.35 * distance`
  - `closest`: `0.25 * popularity + 0.75 * distance`
  - `trending`: `0.85 * popularity + 0.15 * distance`

Ordering is stable using:

1. score DESC
2. distance_miles ASC
3. id ASC

## Beta onboarding

Hidden page:

- `GET /beta/onboarding` (unlisted in nav, robots noindex/nofollow)

Flow:

- Collect tester name + email
- Persist to `beta_testers` via `POST /beta/testers`
- Capture onboarding analytics events

Backend request body:

```json
{
  "name": "Jane Tester",
  "email": "jane@example.com",
  "source": "beta_onboarding"
}
```

Behavior:

- Upserts by `email`
- Returns saved tester row payload

## Analytics (PostHog)

Client helper: `frontend/lib/analytics.ts`

Core events include:

- `campus_selected`
- `category_selected`
- `sort_mode_selected`
- `place_card_viewed`
- `place_clicked`
- `open_in_maps_clicked`
- `vote_cast`
- `shuffle_click`
- `beta_onboarding_view`
- `beta_onboarding_identity_submitted`
- `beta_onboarding_open_app_clicked`
- `beta_onboarding_apple_guide_clicked`
- `beta_onboarding_go_trending_clicked`

Shared context attached to events includes:

- `campus`, `campus_id`
- `sort_mode`
- `category`
- `session_id`
- `app_version`

## Database notes

Core tables used by app/runtime:

- `campuses`
- `places`
- `place_distances`
- `votes`
- `beta_testers`

`places` currently uses:

- `id`, `name`, `address`, `city`
- `category` (array of strings)
- `price_tier`
- `lat`, `lng`
- `image_url`, `image_source`

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs on `http://127.0.0.1:8000`.

Required env (`backend/.env`):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (kept for compatibility)
- `ENVIRONMENT` (optional)
- `YELP_API_KEY` (only for Yelp enrichment script)
- `GOOGLE_MAPS_API_KEY` (server-side only; used for Google Places photo ingestion)

Optional local override:

- `backend/.env.local` is loaded after `backend/.env` and can override values for local dev.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://127.0.0.1:3000`.

Recommended env (`frontend/.env.local`):

- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- `NEXT_PUBLIC_CAMPUS_ID=<default campus id>`
- `NEXT_PUBLIC_POSTHOG_KEY=<optional>`
- `NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com` (optional override)
- `NEXT_PUBLIC_APP_VERSION=<optional>`

## Utility scripts

Run from `backend/` with venv active and `PYTHONPATH=.`.

### Yelp image enrichment

Script: `backend/scripts/yelp_enrich.py`

Example:

```bash
PYTHONPATH=. python3 scripts/yelp_enrich.py --limit 1000 --output-csv yelp_images.csv
```

Options:

- `--include-existing` to reprocess rows with existing images
- `--dry-run` to preview matches
- `--output-csv <file>` to export matched `place_id,image_url,image_source`

### Bulk add places + distances

Script: `backend/scripts/import_new_places.py`

Example:

```bash
PYTHONPATH=. python3 scripts/import_new_places.py --file /path/to/new_places.txt
```

Script behavior:

1. Parses lines of place data
2. Skips duplicates by name + address
3. Inserts into `places`
4. Upserts `place_distances` for seeded campuses
5. Prints summary counts

## Deployment

### Frontend (Vercel)

- Build command: `npm run build`
- Ensure frontend env vars are set in Vercel project settings
- If backend code is deployed on Vercel server runtime, set `GOOGLE_MAPS_API_KEY` as a server env var (never as `NEXT_PUBLIC_*`)

### Backend (Render)

- Start command should run FastAPI on Render port
- Ensure backend env vars are set in Render
- Add `GOOGLE_MAPS_API_KEY` in Render environment variables
- Render free tier can sleep when inactive; app behavior should tolerate cold starts

## Quick troubleshooting

- `400 campus_id is required`: include `campus_id` on place-read requests
- Frontend runtime error for campus id: set `NEXT_PUBLIC_CAMPUS_ID`
- Empty/partial Yelp enrichment results:
  - check `YELP_API_KEY`
  - run with `--include-existing` and high `--limit`
  - verify table columns match script (`lat/lng` expected)
- Missing Python modules in venv:
  - activate venv and reinstall `requirements.txt`

## License

AGPL-3.0-or-later (`LICENSE`)
