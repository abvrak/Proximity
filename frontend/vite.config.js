import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config } from 'dotenv'
import { resolve } from 'path'

// Wczytaj zmienne z root .env
config({ path: resolve(__dirname, '../.env') })

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_MAPBOX_TOKEN': JSON.stringify(process.env.VITE_MAPBOX_TOKEN)
  }
})
