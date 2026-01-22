import './Header.css';
import { useState } from 'react';

export default function Header({ onSubmitAddress, loading, error }) {
    const [addressValue, setAddressValue] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!addressValue) return;
        if (onSubmitAddress) {
            await onSubmitAddress(addressValue);
        }
    };

    return (
        <header className="header">
            <div className="brand">
                <span className="brand-eyebrow">Spatial Intelligence</span>
                <h1 className="brand-title">Proximity</h1>
                <p className="brand-subtitle">Realna wartość nieruchomości</p>
            </div>
            <form className="link-form" aria-label="Analiza adresu nieruchomości" onSubmit={handleSubmit}>
                <label className="link-form-label" htmlFor="listing-address">Wpisz adres budynku</label>
                <div className="link-form-controls">
                    <input
                        id="listing-address"
                        name="listing-address"
                        type="text"
                        placeholder="np. Gliniana 27, Lublin"
                        aria-required="true"
                        value={addressValue}
                        onChange={(e) => setAddressValue(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" disabled={!addressValue || loading}>
                        {loading ? 'Czekaj...' : 'Sprawdź'}
                    </button>
                </div>
            </form>
            {error && <p className="error">{error}</p>}
            <div className="city-chip" aria-label="Aktualny kontekst miejski">
                <span className="city-chip-dot" aria-hidden="true" />
                <span className="city-chip-label">Lublin</span>
            </div>
        </header>
    );
}