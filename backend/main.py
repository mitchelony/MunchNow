from fastapi import FastAPI, HTTPException
from app.supabase import get_by_category, get_all, place_vote

app = FastAPI()

items = []

@app.get("/")
def root():
    return {"Hello": "World"}

@app.get("/get_places(category)")
def get_places(category):
    return get_by_category(category)

@app.get("/get_all")
def get_all_places():
    return get_all()

@app.post("/vote")
def vote(place_id: int, vote: str):
    return place_vote(place_id, vote)