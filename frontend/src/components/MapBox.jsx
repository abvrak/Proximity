import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapBox.css';

export default function MapBox() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const lng = 21.012; // Warszawa
  const lat = 52.230;
  const zoom = 12;

  useEffect(() => {
    // Token dostępu Mapbox
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    // Jeśli mapa już istnieje, nie twórz jej ponownie
    if (map.current) return;

    // Utwórz mapę
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [lng, lat],
      zoom: zoom,
      pitch: 45, // Kąt nachylenia dla efektu 3D
    });

    // Dodaj kontrolę zoom
    map.current.addControl(new mapboxgl.NavigationControl());

    // Czyszczenie po odmontowaniu komponentu
    return () => {
      map.current.remove();
      map.current = null;
    };
  }, []);

  return <div ref={mapContainer} className="map-container" />;
}
