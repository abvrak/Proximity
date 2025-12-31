from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from backend.api.routes.contact import router as contact_router

app = FastAPI(
    title="Proximity API",
    description="Backend dla systemu analizy wartości nieruchomości WebGIS",
    version="0.1.0"
)

# Konfiguracja CORS (kluczowe, żeby React mógł gadać z Pythonem)
origins = [
    "http://localhost:3000",  # Domyślny port Reacta
    "http://localhost:5173",  # Vite dev
    "http://localhost:4173",  # Vite preview
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contact_router)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)