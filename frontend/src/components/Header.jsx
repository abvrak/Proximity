import './Header.css';
import { useState } from 'react';

export default function Header() {
    const [linkValue, setLinkValue] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { url: linkValue };

    const res = await fetch("http://localhost:8000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        });
    };

    return (
        <header className="header">
            <div className="brand">
                <span className="brand-eyebrow">Spatial Intelligence</span>
                <h1 className="brand-title">Proximity</h1>
                <p className="brand-subtitle">Realna wartość nieruchomości</p>
            </div>
            <form className="link-form" aria-label="Analiza linku nieruchomości" onSubmit={handleSubmit}>
                <label className="link-form-label" htmlFor="listing-link">Wklej link do ogłoszenia</label>
                <div className="link-form-controls">
                    <input
                        id="listing-link"
                        name="listing-link"
                        type="url"
                        placeholder="np. https://www.olx.pl/nieruchomosci/..."
                        aria-required="true"
                        value={linkValue}
                        onChange={(e) => setLinkValue(e.target.value)}
                    />
                    <button type="submit" disabled={!linkValue}>Sprawdź</button>
                </div>
            </form>
            <div className="city-chip" aria-label="Aktualny kontekst miejski">
                <span className="city-chip-dot" aria-hidden="true" />
                <span className="city-chip-label">Warszawa</span>
            </div>
        </header>
    );
}