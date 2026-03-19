from dotenv import load_dotenv  # type: ignore

# Load environment variables early, before importing any modules that depend on them.
load_dotenv()
load_dotenv(".env.local", override=True)

from fastapi import FastAPI #type: ignore
from fastapi.middleware.cors import CORSMiddleware #type: ignore

from app.api.routes import trending, health, votes, places, campuses, beta, admin_email
from app.core.lifespan import lifespan


app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://munchnow.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://10.0.2.2:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trending.router)
app.include_router(health.router)
app.include_router(votes.router)
app.include_router(places.router)
app.include_router(campuses.router)
app.include_router(beta.router)
app.include_router(admin_email.router)
