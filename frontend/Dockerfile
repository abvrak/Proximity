# Używamy obrazu Node.js
FROM node:18-alpine

# Katalog roboczy
WORKDIR /app

# Kopiujemy pliki konfiguracyjne pakietów
COPY package.json package-lock.json ./

# Instalujemy zależności
RUN npm install

# Kopiujemy resztę kodu aplikacji
COPY . .

# Otwieramy port 3000
EXPOSE 3000

# Uruchamiamy serwer deweloperski
CMD ["npm", "start"]