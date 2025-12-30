import './Header.css';

export default function Header() {
    return (
        <header className="header">
            <div className="brand">
                <span className="brand-eyebrow">Spatial Intelligence</span>
                <h1 className="brand-title">Proximity</h1>
                <p className="brand-subtitle">Realna wartość nieruchomości</p>
            </div>
            <form className="link-form" aria-label="Analiza linku nieruchomości">
                <label className="link-form-label" htmlFor="listing-link">Wklej link do ogłoszenia</label>
                <div className="link-form-controls">
                    <input
                        id="listing-link"
                        name="listing-link"
                        type="url"
                        placeholder="np. https://www.olx.pl/nieruchomosci/..."
                        aria-required="true"
                    />
                    <button type="button">Sprawdź</button>
                </div>
            </form>
            <div className="city-chip" aria-label="Aktualny kontekst miejski">
                <span className="city-chip-dot" aria-hidden="true" />
                <span className="city-chip-label">Warszawa</span>
            </div>
        </header>
    );
}