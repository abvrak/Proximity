import { useState } from 'react';
import MapBox from './components/MapBox';
import Header from './components/Header';
import './App.css'; // Upewnij się, że masz import stylów!

function App() {
  const [point, setPoint] = useState(null);
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (address) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/proximity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();
      const lat = Number(data?.location?.lat);
      const lon = Number(data?.location?.lon);
      const score = data?.score;
      const receivedPois = Array.isArray(data?.pois) ? data.pois : [];

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setPoint({ lat, lon, score });
        setPois(receivedPois);
      } else {
        setPoint(null);
        setPois([]);
        setError('Brak współrzędnych w odpowiedzi');
      }
    } catch (e) {
      setError('Coś poszło nie tak');
      setPoint(null);
      setPois([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      
      <Header onSubmitAddress={handleSubmit} loading={loading} error={error} />
      
      <main className="map-container">
        <MapBox point={point} pois={pois} />
      </main>
    </div>
  );
}

export default App;