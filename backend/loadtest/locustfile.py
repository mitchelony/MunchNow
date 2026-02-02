import os
import random

from locust import HttpUser, task, between


class MunchUser(HttpUser):
    wait_time = between(0.5, 1.5)
    host = os.getenv("BASE_URL", "http://localhost:8000")
    place_ids: list[int] = []

    def on_start(self):
        if not self.place_ids:
            with self.client.get("/places?limit=25", name="/places?limit=25") as resp:
                if resp.status_code == 200:
                    data = resp.json()
                    self.place_ids = [p["id"] for p in data.get("places", [])]

    @task(3)
    def get_trending(self):
        self.client.get("/trending?limit=12&time_window=7d", name="/trending")

    @task(2)
    def get_place(self):
        if not self.place_ids:
            return
        place_id = random.choice(self.place_ids)
        self.client.get(f"/places/{place_id}", name="/places/:id")

    @task(1)
    def post_vote(self):
        if not self.place_ids:
            return
        place_id = random.choice(self.place_ids)
        self.client.post(
            "/votes",
            json={"place_id": place_id, "vote": "worth_it"},
            name="/votes",
        )
