# Frontend performance stats

## Lighthouse (mobile)
1. Start the app:
   ```
   npm run dev
   ```
2. In another terminal:
   ```
   npm run perf:lighthouse
   ```
This writes `frontend/lighthouse-mobile.json`.

## Bundle size
1. Build:
   ```
   npm run build
   ```
2. Run the report:
   ```
   npm run perf:bundle
   ```
This prints total JS size and the 10 largest chunks.
