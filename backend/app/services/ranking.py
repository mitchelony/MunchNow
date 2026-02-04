from datetime import timedelta


def parse_time_window(time_window: str) -> timedelta:
    """
    Parse time window string into a timedelta.
    Accepted values:
    - "24h": 1 day
    - "7d": 7 days (default)
    - "30d": 30 days
    
    Invalid inputs fall back to "7d".
    Args:
        time_window: String representing the time window 
    Returns:
        timedelta object for the specified window
    """
    time_windows = {
        "24h": timedelta(days=1),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30)
    }
    return time_windows.get(time_window, timedelta(days=7))


def compute_score(worth_it: int, mid: int, skip: int) -> float:
    """
    Calculate trending score for a place based on individual vote counts.
    Formula: worth_it - skip + (0.5 * mid)
    - worth_it votes: +1 each
    - skip votes: -1 each
    - mid votes: +0.5 each (half weight)
    Args:
        worth_it: Number of "worth_it" votes
        mid: Number of "mid" votes
        skip: Number of "skip" votes
        
    Returns:
        Calculated score as float
    """
    score = worth_it - skip + (0.5 * mid)
    return score


def distance_score(distance_miles: float, k: float = 2.5) -> float:
    """
    Compute a distance decay score.
    distance_score = exp(-distance_miles / k)
    """
    from math import exp
    return exp(-distance_miles / k)


def blended_score(popularity_score: float, distance_score_value: float, weight_popularity: float, weight_distance: float) -> float:
    """
    Weighted blend of popularity and distance signals.
    """
    return (weight_popularity * popularity_score) + (weight_distance * distance_score_value)


def rank_places(
    places: list[dict],
    vote_counts: dict[int, dict],
    limit: int | None = None
) -> list[dict]:
    """
    Merge places with their vote counts, calculate scores, and rank them.
    Sorting priority:
    1. Score (descending) - higher score = more trending
    2. Total votes (descending) - more engagement = higher rank
    3. Name (ascending) - alphabetical tiebreaker
    Args:
        places: List of place dictionaries from database
        vote_counts: Dict mapping place_id to vote counts 
                    {place_id: {"worth_it": int, "mid": int, "skip": int, "total": int}}
        limit: Maximum number of results to return
    Returns:
        Sorted and limited list of places with score and vote stats attached
    """
    ranked_places = []
    
    for place in places:
        place_id = place["id"]
        
        # Get vote counts or use zeros if place has no votes
        votes = vote_counts.get(
            place_id, 
            {"worth_it": 0, "mid": 0, "skip": 0, "total": 0}
        )
        
        # Calculate score
        score = compute_score(
            worth_it=votes["worth_it"],
            mid=votes["mid"],
            skip=votes["skip"]
        )
        
        # Attach score and vote stats to place
        ranked_places.append({
            **place,
            "score": score,
            "worth_it_count": votes["worth_it"],
            "mid_count": votes["mid"],
            "skip_count": votes["skip"],
            "total_votes": votes["total"]
        })
    
    # Sort by: score (desc), total_votes (desc), name (asc)
    ranked_places.sort(
        key=lambda x: (-x["score"], -x["total_votes"], x["name"])
    )
    
    if limit is None:
        return ranked_places
    return ranked_places[:limit]


# Backward compatibility alias
def rank_places_by_trending(places: list[dict], vote_counts: dict, limit: int = 12) -> list[dict]:
    """
    Deprecated: Use rank_places() instead.
    Maintained for backward compatibility.
    """
    return rank_places(places, vote_counts, limit)
