import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.scrape import scrape_olx_data

router = APIRouter(prefix="/api")

class ContactRequest(BaseModel):
    url: str

@router.post("/contact")
async def contact(payload: ContactRequest):
    try:
        data = await asyncio.to_thread(scrape_olx_data, payload.url)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Scrape failed: {exc}") from exc

    print(f"[scrape] url={payload.url} data={data}")

    return {"status": "ok", "url": payload.url, "data": data}