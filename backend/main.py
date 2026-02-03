from dotenv import load_dotenv  # type: ignore

# Load environment variables early, before importing any modules that depend on them.
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import trending, health, votes, places

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://munchnow.vercel.app", "http://localhost:3000", "http://127.0.2.2:3000"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trending.router)
app.include_router(health.router)
app.include_router(votes.router)
app.include_router(places.router)
