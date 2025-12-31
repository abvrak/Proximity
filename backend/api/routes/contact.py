from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api")

class ContactRequest(BaseModel):
    url: str

@router.post("/contact")
async def contact(payload: ContactRequest):
    print(payload.model_dump())
    return {"status": "received", "url": payload.url}