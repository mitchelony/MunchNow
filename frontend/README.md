# MunchHSV Frontend

Mobile-first Next.js app for browsing trending Huntsville spots and voting fast.

## Setup

```bash
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Run the dev server:

```bash
npm run dev
```

## API endpoints used

- `GET /trending?city=Huntsville&time_window=7d&limit=12[&category=...]`
- `POST /votes` with `{ place_id, vote, session_id }`

All fetch calls live in `frontend/lib/api.ts`.
