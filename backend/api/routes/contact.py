import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/api")

class ContactRequest(BaseModel):
    address: str

@router.post("/contact")
async def contact(payload: ContactRequest):
    address = payload.address.strip()
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")

    params = {
        "format": "json",
        "limit": 1,
        "q": address,
    }

    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            headers={"User-Agent": "Proximity"},
        ) as client:
            response = await client.get("https://nominatim.openstreetmap.org/search", params=params)
            response.raise_for_status()
            results = response.json()
    except httpx.HTTPStatusError as exc:
        detail = f"Geocoding failed: HTTP {exc.response.status_code} - {exc.response.text}"
        raise HTTPException(status_code=502, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Geocoding failed: {exc}") from exc

    if not results:
        raise HTTPException(status_code=404, detail="Address not found")

    first = results[0]
    data = {
        "lat": first.get("lat"),
        "lon": first.get("lon"),
    }

    print(f"[geocode] address={address} data={data}")

    return {"status": "ok", "address": address, "data": data}