from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from backend.api.routes.contact import router as contact_router
from backend.api.routes.proximity import router as proximity_router

app = FastAPI(
    title="Proximity API",
    description="Backend dla systemu analizy wartości nieruchomości WebGIS",
    version="0.1.0"
)

# Konfiguracja CORS (kluczowe, żeby React mógł gadać z Pythonem)
# Domyślne origins (lokalny rozwój)
default_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
]

# Pozwól na ustawienie produkcyjnych originów przez zmienną środowiskową
# Przykład: ALLOWED_ORIGINS="https://app.vercel.app,https://www.example.com"
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    # split, strip and ignore empty
    parsed = [o.strip() for o in env_origins.split(",") if o.strip()]
    origins = default_origins + parsed
else:
    origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contact_router)
app.include_router(proximity_router)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)