from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

"""
Pydantic schemas for request/response validation.
"""
class VoteValue(str, Enum):
    """Canonical vote values."""
    WORTH_IT = "worth_it"
    MID = "mid"
    SKIP = "skip"

class CategoryValue(str, Enum):
    """Canonical category values."""
    QUICK_BITES = "quick_bites"
    CHEAP = "cheap"
    LATE_NIGHT = "late_night"
    COFFEE_SPOTS = "coffee_spots"
    LOCAL_FAVORITE = "local_favorite"

# Request/Response Schemas
class VoteCreate(BaseModel):
    """Schema for creating a new vote."""
    vote: VoteValue
    comment: Optional[str] = None

class VoteResponse(BaseModel):
    """Schema for vote response."""
    id: int
    user_id: int
    spot_id: int
    vote: VoteValue
    comment: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

class SpotCreate(BaseModel):
    """Schema for creating a new spot."""
    name: str = Field(..., min_length=1, max_length=200)
    address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None  # Can be CategoryValue in v2
    description: Optional[str] = None

class SpotResponse(BaseModel):
    """Schema for spot response."""
    id: int
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    created_at: str
    vote_summary: Optional[dict] = None  # {worth_it: 5, mid: 2, skip: 1}

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    """Schema for user registration."""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=100)
    password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    username: str
    email: str
    created_at: str

    class Config:
        from_attributes = True

# Place Models
class PlaceOut(BaseModel):
    """Schema for place output."""
    id: int
    name: str
    address: str
    city: str
    categories: list[str]
    category: Optional[list[str]] = None
    price_tier: Optional[str] = None
    distance_miles: float
    score: float
    image_url: Optional[str] = None
    image_source: Optional[str] = None

    class Config:
        from_attributes = True

class PlaceResponse(BaseModel):
    """Schema for single place response."""
    place: PlaceOut

class PlacesResponse(BaseModel):
    """Schema for multiple places response."""
    places: list[PlaceOut]

# Vote Models
class VoteIn(BaseModel):
    """Schema for creating a vote."""
    place_id: int
    vote: VoteValue
    session_id: Optional[str] = None

class VoteOut(BaseModel):
    """Schema for vote output."""
    ok: bool
    place_id: int
    vote: VoteValue
    created_at: str
    worth_it_count: int
    mid_count: int
    skip_count: int
    total_votes: int

    class Config:
        from_attributes = True

# Trending Models
class TrendingPlaceOut(PlaceOut):
    """Schema for trending place output with vote statistics."""
    score: float
    worth_it_count: int
    mid_count: int
    skip_count: int
    total_votes: int

class TrendingResponse(BaseModel):
    """Schema for trending places response."""
    places: list[TrendingPlaceOut]

# Error Model
class ErrorResponse(BaseModel):
    """Schema for error responses."""
    error: str


# Campus Models
class CampusOut(BaseModel):
    """Schema for campus output."""
    id: int
    name: str
    short_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


class CampusesResponse(BaseModel):
    """Schema for campuses response."""
    campuses: list[CampusOut]
