import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';

// TOKEN Z MAPBOX.COM
mapboxgl.accessToken = 'pk.eyJ1IjoiY2FpbW9iIiwiYSI6ImNtanBuMTNwMTFxamcza3NkMXJhamx0MXcifQ.VCUDPf77833_gXe8CTkGVw';

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(21.012); // Warszawa
  const [lat, setLat] = useState(52.230);
  const [zoom, setZoom] = useState(11);

  useEffect(() => {
    if (map.current) return; // inicjalizuj mapę tylko raz

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Ciemny styl (pasuje do Twojego UI)
      center: [lng, lat],
      zoom: zoom,
      pitch: 45, // Kąt nachylenia dla efektu 3D
    });

    // Dodanie kontrolek nawigacji (zoom, obrót)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  });

  return (
    <div className="App">
      <div className="sidebar">
        Lat: {lat} | Lng: {lng} | Zoom: {zoom}
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}

export default App;