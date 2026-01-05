import { useState } from 'react';
import MapBox from './components/MapBox';
import Header from './components/Header';

function App() {
  const [point, setPoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (url) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      const lat = Number(data?.data?.lat);
      const lon = Number(data?.data?.lon);
      const price = data?.data?.price_pln;

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setPoint({ lat, lon, price });
      } else {
        setPoint(null);
        setError('Brak współrzędnych w odpowiedzi');
      }
    } catch (e) {
      setError('Coś poszło nie tak');
      setPoint(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <Header onSubmitLink={handleSubmit} loading={loading} error={error} />
      </header>
      
      <main>
        <MapBox point={point} />
      </main>
    </div>
  );
}

export default App;
