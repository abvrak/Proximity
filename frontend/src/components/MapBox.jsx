import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapBox.css';

export default function MapBox({ point }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const lng = 21.012; // Warszawa
  const lat = 52.230;
  const zoom = 12;

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      if (marker.current) marker.current.remove();
      map.current.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (!point) return;

    if (!marker.current) {
      marker.current = new mapboxgl.Marker({ color: '#ff5a1f' });
    }

    marker.current.setLngLat([point.lon, point.lat]).addTo(map.current);

    if (point.price) {
      const popup = new mapboxgl.Popup({ offset: 10 }).setText(`Cena: ${point.price} PLN`);
      marker.current.setPopup(popup);
    }

    map.current.flyTo({ center: [point.lon, point.lat], zoom: 14 });
  }, [point]);

  return <div ref={mapContainer} className="map-container" />;
}
