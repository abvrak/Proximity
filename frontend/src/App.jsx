import { useState } from 'react';
import MapBox from './components/MapBox';
import Header from './components/Header';
import './App.css'; // Upewnij się, że masz import stylów!


function App() {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [point, setPoint] = useState(null);
  const [pois, setPois] = useState([]);
  const [breakdown, setBreakdown] = useState({});
  const [penalties, setPenalties] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [is3D, setIs3D] = useState(false);

  const handleSubmit = async (address) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/proximity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();
      const lat = Number(data?.location?.lat);
      const lon = Number(data?.location?.lon);
      const score = data?.score;
      const receivedPois = Array.isArray(data?.pois) ? data.pois : [];
      const receivedBreakdown = data?.breakdown || {};
      const receivedPenalties = data?.penalties || {};

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setPoint({ lat, lon, score });
        setPois(receivedPois);
        setBreakdown(receivedBreakdown);
        setPenalties(receivedPenalties);
      } else {
        setPoint(null);
        setPois([]);
        setBreakdown({});
        setPenalties({});
        setError('Brak współrzędnych w odpowiedzi');
      }
    } catch (e) {
      setError('Coś poszło nie tak');
      setPoint(null);
      setPois([]);
      setBreakdown({});
      setPenalties({});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      
      <Header onSubmitAddress={handleSubmit} loading={loading} error={error} />
      
      <main className="map-container">
        <MapBox
          point={point}
          pois={pois}
          is3D={is3D}
          breakdown={breakdown}
          penalties={penalties}
        />
        <aside className="map-controls">
          <label className="map-controls__item">
            <input
              type="checkbox"
              checked={is3D}
              onChange={(event) => setIs3D(event.target.checked)}
            />
            <span>Widok 3D</span>
          </label>
        </aside>
      </main>
    </div>
  );
}

export default App;