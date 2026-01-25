import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapBox.css';

const CATEGORY_META = {
  food: { label: 'Gastronomia', icon: '🍽️', color: '#f97316' },
  grocery: { label: 'Sklepy', icon: '🛒', color: '#22c55e' },
  health: { label: 'Zdrowie', icon: '🏥', color: '#ef4444' },
  education: { label: 'Edukacja', icon: '🎓', color: '#3b82f6' },
  transport: { label: 'Transport', icon: '🚆', color: '#8b5cf6' },
  parks: { label: 'Parki', icon: '🌳', color: '#16a34a' },
  services: { label: 'Usługi', icon: '🏦', color: '#14b8a6' },
};

export default function MapBox({ point, pois }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const poiMarkers = useRef([]);
  const CIRCLE_SOURCE_ID = 'main-point-radius-source';
  const CIRCLE_FILL_LAYER_ID = 'main-point-radius-fill';
  const CIRCLE_OUTLINE_LAYER_ID = 'main-point-radius-outline';
  const CIRCLE_RADIUS_METERS = 1000;
  const lng = 22.560; // Lublin
  const lat = 51.236;
  const zoom = 12.5;

  const createCircleGeoJson = (center, radiusMeters, steps = 72) => {
    const [centerLon, centerLat] = center;
    const coords = [];
    const earthRadius = 6378137;
    const latRad = (centerLat * Math.PI) / 180;

    for (let i = 0; i <= steps; i += 1) {
      const angle = (i / steps) * 2 * Math.PI;
      const dx = radiusMeters * Math.cos(angle);
      const dy = radiusMeters * Math.sin(angle);
      const dLat = (dy / earthRadius) * (180 / Math.PI);
      const dLon = (dx / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
      coords.push([centerLon + dLon, centerLat + dLat]);
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
      properties: {},
    };
  };

  const ensureRadiusLayer = () => {
    if (!map.current || map.current.getSource(CIRCLE_SOURCE_ID)) return;

    map.current.addSource(CIRCLE_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.current.addLayer({
      id: CIRCLE_FILL_LAYER_ID,
      type: 'fill',
      source: CIRCLE_SOURCE_ID,
      paint: {
        'fill-color': '#fb7185',
        'fill-opacity': 0.12,
      },
    });

    map.current.addLayer({
      id: CIRCLE_OUTLINE_LAYER_ID,
      type: 'line',
      source: CIRCLE_SOURCE_ID,
      paint: {
        'line-color': '#fb7185',
        'line-width': 2,
        'line-opacity': 0.35,
      },
    });
  };

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on('load', () => {
      ensureRadiusLayer();
    });

    return () => {
      
      if (marker.current) marker.current.remove();
      poiMarkers.current.forEach((poiMarker) => poiMarker.remove());
      poiMarkers.current = [];


      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); 
  

  // Pinezka
  useEffect(() => {
    if (!map.current) return;
    if (!point) return;

    if (!marker.current) {
      const el = document.createElement('div');
      el.className = 'main-marker';
      marker.current = new mapboxgl.Marker({ element: el });
    }

    marker.current.setLngLat([point.lon, point.lat]).addTo(map.current);

    if (Number.isFinite(point.score)) {
      const popup = new mapboxgl.Popup({ offset: 10 }).setText(`Proximity score: ${point.score}`);
      marker.current.setPopup(popup);
      marker.current.togglePopup();
    }

    if (map.current.isStyleLoaded()) {
      ensureRadiusLayer();
      const source = map.current.getSource(CIRCLE_SOURCE_ID);
      if (source) {
        source.setData(createCircleGeoJson([point.lon, point.lat], CIRCLE_RADIUS_METERS));
      }
    } else {
      map.current.once('load', () => {
        ensureRadiusLayer();
        const source = map.current.getSource(CIRCLE_SOURCE_ID);
        if (source) {
          source.setData(createCircleGeoJson([point.lon, point.lat], CIRCLE_RADIUS_METERS));
        }
      });
    }

    map.current.flyTo({ center: [point.lon, point.lat], zoom: 14 });
  }, [point]);

  // POI markery
  useEffect(() => {
    if (!map.current) return;

    poiMarkers.current.forEach((poiMarker) => poiMarker.remove());
    poiMarkers.current = [];

    if (!Array.isArray(pois) || pois.length === 0) return;

    pois.forEach((poi) => {
      const meta = CATEGORY_META[poi.category] || {
        label: poi.category || 'POI',
        icon: '📍',
        color: '#64748b',
      };

      const el = document.createElement('div');
      el.className = `poi-marker poi-${poi.category || 'default'}`;
      el.textContent = meta.icon;
      el.style.backgroundColor = meta.color;

      const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(
        `<div class="poi-popup">
          <div class="poi-popup-title">${poi.name || 'POI'}</div>
          <div class="poi-popup-meta">${meta.label}${poi.kind ? ` • ${poi.kind}` : ''}</div>
          <div class="poi-popup-distance">${poi.distance_m} m</div>
        </div>`
      );

      const poiMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([poi.lon, poi.lat])
        .setPopup(popup)
        .addTo(map.current);

      poiMarkers.current.push(poiMarker);
    });
  }, [pois]);


return <div ref={mapContainer} className="map-root" />;}
