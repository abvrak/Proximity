# Używamy stabilnego Pythona 3.12 (3.14 to wersja eksperymentalna, może powodować błędy z GIS)
FROM python:3.12-slim

WORKDIR /app

# Instalujemy biblioteki systemowe wymagane przez GeoPandas i PostGIS
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Ustawiamy zmienne środowiskowe dla kompilatora GDAL
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Twój plik main.py ma "backend.main:app" w pixi, ale w kontenerze jesteśmy w środku folderu,
# więc uruchamiamy to jako "main:app"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]