import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import httpx

router = APIRouter(prefix="/api")

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

class ProximityRequest(BaseModel):
    address: str = Field(..., min_length=3)
    radius_m: int = Field(1000, ge=100, le=5000)

CATEGORIES = {
    "food": {
        "weight": 1.0,
        "amenity": {"restaurant", "cafe", "bar", "fast_food", "pub", "biergarten"},
    },
    "grocery": {
        "weight": 1.2,
        "shop": {"supermarket", "convenience", "bakery", "greengrocer"},
    },
    "health": {
        "weight": 1.1,
        "amenity": {"hospital", "clinic", "doctors", "pharmacy", "dentist"},
    },
    "education": {
        "weight": 0.9,
        "amenity": {"school", "university", "college", "kindergarten"},
    },
    "transport": {
        "weight": 0.40,
        "public_transport": {"station", "stop_position", "platform"},
        "railway": {"station", "tram_stop", "subway_entrance"},
        "amenity": {"bus_station"},
    },
    "parks": {
        "weight": 0.7,
        "leisure": {"park", "playground", "fitness_centre", "sports_centre", "pitch"},
    },
    "services": {
        "weight": 0.6,
        "amenity": {"bank", "atm", "post_office", "police", "fire_station"},
        "shop": {"mall", "department_store", "clothes", "shoes", "chemist"},
    },
    "undesirable": {
        "weight": 1.0,
        "landuse": {"landfill", "industrial"},
        "amenity": {"prison", "waste_transfer_station", "waste_disposal"},
        "man_made": {"works", "wastewater_plant"},
    },
}


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def decay(dist_m: float, radius_m: int) -> float:
    return max(0.0, 1.0 - (dist_m / radius_m))


def classify_category(tags: dict) -> str | None:
    for category, cfg in CATEGORIES.items():
        for key, values in cfg.items():
            if key == "weight":
                continue
            value = tags.get(key)
            if value in values:
                return category
    return None


def primary_tag(tags: dict) -> tuple[str, str] | None:
    for key in ("amenity", "shop", "leisure", "public_transport", "railway"):
        value = tags.get(key)
        if value:
            return key, value
    return None


async def geocode_address(address: str) -> tuple[float, float]:
    # Add "Lublin, Poland" if not present in the address
    if "lublin" not in address.lower():
        address = f"{address}, Lublin, Polska"
    params = {
        "format": "json",
        "limit": 1,
        "q": address,
    }
    async with httpx.AsyncClient(
        timeout=10.0,
        headers={"User-Agent": "Proximity/0.1"},
    ) as client:
        response = await client.get(NOMINATIM_URL, params=params)
        response.raise_for_status()
        results = response.json()

    if not results:
        raise HTTPException(status_code=404, detail="Address not found")

    first = results[0]
    return float(first.get("lat")), float(first.get("lon"))


async def fetch_pois(lat: float, lon: float, radius_m: int) -> list[dict]:
    query = f"""
[out:json][timeout:25];
(
  node(around:{radius_m},{lat},{lon})[amenity];
  way(around:{radius_m},{lat},{lon})[amenity];
  relation(around:{radius_m},{lat},{lon})[amenity];
  node(around:{radius_m},{lat},{lon})[shop];
  way(around:{radius_m},{lat},{lon})[shop];
  relation(around:{radius_m},{lat},{lon})[shop];
  node(around:{radius_m},{lat},{lon})[leisure];
  way(around:{radius_m},{lat},{lon})[leisure];
  relation(around:{radius_m},{lat},{lon})[leisure];
  node(around:{radius_m},{lat},{lon})[public_transport];
  way(around:{radius_m},{lat},{lon})[public_transport];
  relation(around:{radius_m},{lat},{lon})[public_transport];
  node(around:{radius_m},{lat},{lon})[railway];
  way(around:{radius_m},{lat},{lon})[railway];
  relation(around:{radius_m},{lat},{lon})[railway];
);
out center;
"""
    import asyncio
    retries = 3
    delay = 0.5
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            async with httpx.AsyncClient(
                timeout=30.0,
                headers={"User-Agent": "Proximity/0.1"},
            ) as client:
                response = await client.post(OVERPASS_URL, data=query)
                response.raise_for_status()
                data = response.json()
            return data.get("elements", [])
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                await asyncio.sleep(delay)
            else:
                raise


@router.post("/proximity")
async def proximity(payload: ProximityRequest):
    address = payload.address.strip()
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")

    try:
        lat, lon = await geocode_address(address)
        elements = await fetch_pois(lat, lon, payload.radius_m)
    except httpx.HTTPStatusError as exc:
        detail = f"OSM request failed: HTTP {exc.response.status_code} - {exc.response.text}"
        raise HTTPException(status_code=502, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OSM request failed: {exc}") from exc

    breakdown = {category: {"count": 0, "raw": 0.0} for category in CATEGORIES}
    pois: list[dict] = []

    for el in elements:
        tags = el.get("tags", {})
        category = classify_category(tags)
        if not category:
            continue

        el_lat = el.get("lat")
        el_lon = el.get("lon")
        if el_lat is None or el_lon is None:
            center = el.get("center") or {}
            el_lat = center.get("lat")
            el_lon = center.get("lon")
        if el_lat is None or el_lon is None:
            continue

        dist = haversine_m(lat, lon, float(el_lat), float(el_lon))
        if dist > payload.radius_m:
            continue

        contribution = decay(dist, payload.radius_m)
        breakdown[category]["count"] += 1
        breakdown[category]["raw"] += contribution

        if len(pois) < 300:
            primary = primary_tag(tags)
            kind = primary[1] if primary else None
            name = tags.get("name") or tags.get("brand") or kind or "POI"
            pois.append(
                {
                    "id": f"{el.get('type', 'node')}/{el.get('id', '')}",
                    "name": name,
                    "category": category,
                    "kind": kind,
                    "lat": float(el_lat),
                    "lon": float(el_lon),
                    "distance_m": round(dist, 1),
                }
            )

    total_weight = sum(cfg["weight"] for cfg in CATEGORIES.values())
    weighted_score = 0.0


    for category, cfg in CATEGORIES.items():
        raw = breakdown[category]["raw"]
        count = breakdown[category]["count"]
        weight = cfg["weight"]
        if count <= 10:
            effective_raw = raw
        else:
            # First 10 objects full value, the rest only 20% of the value
            if count > 0:
                avg = raw / count
            else:
                avg = 0.0
            effective_raw = avg * 10 + avg * 0.2 * (count - 10)
        category_score = effective_raw * weight
        breakdown[category]["score"] = round(category_score * 10, 2)
        weighted_score += category_score

    # --- PENALTIES ---
    # 1. Missing categories (except undesirable)
    penalty_per_missing_category = 1.0
    missing_categories = [cat for cat in CATEGORIES if cat != "undesirable" and breakdown[cat]["count"] == 0]
    penalty_missing = len(missing_categories) * penalty_per_missing_category

    # 2. Unbalanced POI: if one category > 60% of all POI (except undesirable)
    total_pois = sum(breakdown[cat]["count"] for cat in CATEGORIES if cat != "undesirable")
    penalty_unbalanced = 0.0
    if total_pois > 0:
        for cat in CATEGORIES:
            if cat == "undesirable":
                continue
            share = breakdown[cat]["count"] / total_pois
            if share > 0.6:
                penalty_unbalanced += 1.5

    # 3. Undesirable POIs
    penalty_undesirable = breakdown["undesirable"]["count"] * 1.0

    # 4. Lack of diversity: less than 6 present categories (except undesirable)
    present_categories = [cat for cat in CATEGORIES if cat != "undesirable" and breakdown[cat]["count"] > 0]
    penalty_diversity = 0.0
    if len(present_categories) < 6:
        penalty_diversity = 2.0

    total_penalty = penalty_missing + penalty_unbalanced + penalty_undesirable + penalty_diversity


    score_scaling = 0.35


    raw_score = ((weighted_score / total_weight) * 10 * score_scaling) if total_weight > 0 else 0.0
    penalized_score = raw_score - total_penalty
    if weighted_score > 0:
        final_score = round(max(1.0, min(10.0, penalized_score)), 2)
    else:
        final_score = 0.0

    return {
        "status": "ok",
        "address": address,
        "location": {"lat": lat, "lon": lon},
        "radius_m": payload.radius_m,
        "score": final_score,
        "pois": pois,
        "breakdown": breakdown,
        "penalties": {
            "missing_categories": penalty_missing,
            "unbalanced": penalty_unbalanced,
            "undesirable": penalty_undesirable,
            "diversity": penalty_diversity,
            "total": total_penalty,
        },
    }
