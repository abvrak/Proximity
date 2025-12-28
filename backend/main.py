from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="Proximity API",
    description="Backend dla systemu analizy wartości nieruchomości WebGIS",
    version="0.1.0"
)

# Konfiguracja CORS (kluczowe, żeby React mógł gadać z Pythonem)
origins = [
    "http://localhost:3000",  # Domyślny port Reacta
    "http://localhost:5173",  # Alternatywny port (Vite)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Proximity API działa!"}

@app.get("/api/test-location")
def get_test_location():
    # Tymczasowy endpoint zwracający współrzędne (np. Pałac Kultury)
    return {
        "lat": 52.2319, 
        "lng": 21.0067, 
        "name": "Przykładowa lokalizacja"
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)