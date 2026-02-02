# Load testing

## k6
```
BASE_URL=http://localhost:8000 k6 run backend/loadtest/k6.js
```

Optional:
- `VUS=25`
- `DURATION=60s`

## Locust
```
BASE_URL=http://localhost:8000 locust -f backend/loadtest/locustfile.py
```

Then open the Locust UI (default http://localhost:8089) and start a run.
