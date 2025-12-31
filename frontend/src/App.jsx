import MapBox from './components/MapBox';
import Header from './components/Header';

function App() {
  return (
    <div className="app">
      <header>
        <Header />
      </header>
      
      <main>
        <MapBox />
      </main>
    </div>
  );
}

export default App;
