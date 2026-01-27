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

export default function MapBox({ point, pois, is3D, breakdown = {}, penalties = {} }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const poiMarkers = useRef([]);
  const routeRequestId = useRef(0);
  const CIRCLE_SOURCE_ID = 'main-point-radius-source';
  const CIRCLE_FILL_LAYER_ID = 'main-point-radius-fill';
  const CIRCLE_OUTLINE_LAYER_ID = 'main-point-radius-outline';
  const CIRCLE_RADIUS_METERS = 1000;
  const BUILDINGS_LAYER_ID = '3d-buildings-layer';
  const ROUTE_SOURCE_ID_DRIVING = 'route-source-driving';
  const ROUTE_LAYER_ID_DRIVING = 'route-layer-driving';
  const ROUTE_SOURCE_ID_WALKING = 'route-source-walking';
  const ROUTE_LAYER_ID_WALKING = 'route-layer-walking';
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

  const ensure3DBuildingsLayer = () => {
    if (!map.current || map.current.getLayer(BUILDINGS_LAYER_ID)) return;
    if (!map.current.getSource('composite')) return;

    const labelLayerId = map.current
      .getStyle()
      ?.layers?.find((layer) => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;

    map.current.addLayer(
      {
        id: BUILDINGS_LAYER_ID,
        source: 'composite',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 15,
        filter: ['==', 'extrude', 'true'],
        paint: {
          'fill-extrusion-color': '#f7efe3',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.85,
        },
      },
      labelLayerId
    );
  };

  const ensureRouteLayers = () => {
    if (!map.current) return;

    if (!map.current.getSource(ROUTE_SOURCE_ID_DRIVING)) {
      map.current.addSource(ROUTE_SOURCE_ID_DRIVING, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.current.getSource(ROUTE_SOURCE_ID_WALKING)) {
      map.current.addSource(ROUTE_SOURCE_ID_WALKING, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.current.getLayer(ROUTE_LAYER_ID_DRIVING)) {
      map.current.addLayer({
        id: ROUTE_LAYER_ID_DRIVING,
        type: 'line',
        source: ROUTE_SOURCE_ID_DRIVING,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });
    }

    if (!map.current.getLayer(ROUTE_LAYER_ID_WALKING)) {
      map.current.addLayer({
        id: ROUTE_LAYER_ID_WALKING,
        type: 'line',
        source: ROUTE_SOURCE_ID_WALKING,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 3,
          'line-opacity': 0.85,
          'line-dasharray': [1.2, 1.2],
        },
      });
    }
  };

  const clearRoutes = () => {
    if (!map.current) return;
    const drivingSource = map.current.getSource(ROUTE_SOURCE_ID_DRIVING);
    if (drivingSource) drivingSource.setData({ type: 'FeatureCollection', features: [] });
    const walkingSource = map.current.getSource(ROUTE_SOURCE_ID_WALKING);
    if (walkingSource) walkingSource.setData({ type: 'FeatureCollection', features: [] });
  };

  const fetchRouteGeoJson = async (profile, from, to) => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson&access_token=${token}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Directions request failed');
    const data = await response.json();
    const route = data?.routes?.[0];
    const durationSeconds = route?.duration;
    const geometry = route?.geometry;
    if (!geometry || !Number.isFinite(durationSeconds)) throw new Error('Invalid directions response');

    return {
      geojson: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: {},
          },
        ],
      },
      minutes: Math.max(1, Math.ceil(durationSeconds / 60)),
    };
  };


  const remove3DBuildingsLayer = () => {
    if (!map.current) return;
    if (map.current.getLayer(BUILDINGS_LAYER_ID)) {
      map.current.removeLayer(BUILDINGS_LAYER_ID);
    }
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
      ensureRouteLayers();
      if (is3D) {
        ensure3DBuildingsLayer();
        map.current.easeTo({ pitch: 60, bearing: 20, duration: 800 });
      }
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

  useEffect(() => {
    if (!map.current) return;

    if (map.current.isStyleLoaded()) {
      if (is3D) {
        ensure3DBuildingsLayer();
        map.current.easeTo({ pitch: 60, bearing: 20, duration: 600 });
      } else {
        remove3DBuildingsLayer();
        map.current.easeTo({ pitch: 0, bearing: 0, duration: 500 });
      }
    } else {
      map.current.once('load', () => {
        if (is3D) {
          ensure3DBuildingsLayer();
          map.current.easeTo({ pitch: 60, bearing: 20, duration: 600 });
        } else {
          remove3DBuildingsLayer();
          map.current.easeTo({ pitch: 0, bearing: 0, duration: 500 });
        }
      });
    }
  }, [is3D]);



  // Pinezka z rozbudowanym popupem
  useEffect(() => {
    if (!map.current) return;
    if (!point) return;

    if (!marker.current) {
      const el = document.createElement('div');
      el.className = 'main-marker';
      marker.current = new mapboxgl.Marker({ element: el });
    }

    marker.current.setLngLat([point.lon, point.lat]).addTo(map.current);

    // Przygotuj szczegółowy HTML do popupu
    let html = '';
    if (Number.isFinite(point.score)) {
      const numericScore = Number(point.score);
      const formattedScore = Number.isFinite(numericScore) && numericScore === 10
        ? '10'
        : numericScore.toFixed(2);
      html += `<div class="main-popup-score"><b>Proximity score:</b> ${formattedScore}/10</div>`;
    }


    // Procentowy wkład kategorii w końcowy score
    // Suma score wszystkich kategorii (łącznie z undesirable)
    let totalScore = 0;
    Object.entries(breakdown).forEach(([cat, val]) => {
      totalScore += typeof val.score === 'number' ? val.score : 0;
    });
    html += '<div class="main-popup-breakdown"><b>Wkład kategorii w wynik:</b><ul style="margin:0 0 0 1em;padding:0">';
    Object.entries(breakdown).forEach(([cat, val]) => {
      const percent = totalScore > 0 ? ((val.score ?? 0) / totalScore * 100).toFixed(1) : '0.0';
      html += `<li>${cat}: ${percent}%</li>`;
    });
    html += '</ul></div>';

    const popup = new mapboxgl.Popup({ offset: 10 }).setHTML(`<div class="main-popup">${html}</div>`);
    marker.current.setPopup(popup);
    marker.current.togglePopup();

    if (map.current.isStyleLoaded()) {
      ensureRadiusLayer();
      ensureRouteLayers();
      const source = map.current.getSource(CIRCLE_SOURCE_ID);
      if (source) {
        source.setData(createCircleGeoJson([point.lon, point.lat], CIRCLE_RADIUS_METERS));
      }
      clearRoutes();
    } else {
      map.current.once('load', () => {
        ensureRadiusLayer();
        ensureRouteLayers();
        const source = map.current.getSource(CIRCLE_SOURCE_ID);
        if (source) {
          source.setData(createCircleGeoJson([point.lon, point.lat], CIRCLE_RADIUS_METERS));
        }
        clearRoutes();
      });
    }

    map.current.flyTo({ center: [point.lon, point.lat], zoom: 14 });
  }, [point, breakdown, penalties]);

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

      el.addEventListener('click', async () => {
        if (!map.current || !point) return;
        const from = [Number(point.lon), Number(point.lat)];
        const to = [Number(poi.lon), Number(poi.lat)];
        if (!Number.isFinite(from[0]) || !Number.isFinite(from[1])) return;
        if (!Number.isFinite(to[0]) || !Number.isFinite(to[1])) return;

        const requestId = ++routeRequestId.current;

        try {
          ensureRouteLayers();

          const [driving, walking] = await Promise.all([
            fetchRouteGeoJson('driving', from, to),
            fetchRouteGeoJson('walking', from, to),
          ]);
          if (requestId !== routeRequestId.current) return;

          const drivingSource = map.current.getSource(ROUTE_SOURCE_ID_DRIVING);
          if (drivingSource) drivingSource.setData(driving.geojson);

          const walkingSource = map.current.getSource(ROUTE_SOURCE_ID_WALKING);
          if (walkingSource) walkingSource.setData(walking.geojson);

          const html = `<div class="poi-popup">
              <div class="poi-popup-title">${poi.name || 'POI'}</div>
              <div class="poi-popup-meta">${meta.label}${poi.kind ? ` • ${poi.kind}` : ''}</div>
              <div class="poi-popup-time">
                <span class="poi-time-badge poi-time-walk">🚶 ${walking.minutes} min</span>
                <span class="poi-time-badge poi-time-drive">🚗 ${driving.minutes} min</span>
              </div>
            </div>`;

          new mapboxgl.Popup({ offset: 12 })
            .setLngLat(to)
            .setHTML(html)
            .addTo(map.current);
        } catch (error) {
          clearRoutes();
        }
      });

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


  const legendItems = Object.entries(CATEGORY_META);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-root" />
      <div className="poi-legend">
        <div className="poi-legend-title">Legenda POI</div>
        <div className="poi-legend-items">
          {legendItems.map(([key, meta]) => (
            <div key={key} className="poi-legend-item">
              <span className="poi-legend-icon" style={{ backgroundColor: meta.color }}>
                {meta.icon}
              </span>
              <span className="poi-legend-label">{meta.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
