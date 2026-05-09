// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { formatAirportSuggestionLabel, getAirportAutocompleteMatches } from '../controller/AirportData';

function cleanAirportCode(value) {
    return String(value || '')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 3);
}

export default function AirportAutocompleteField({
    label,
    placeholder,
    query,
    code,
    onQueryChange,
    onCodeChange,
    hint,
    required = false,
    disabled = false,
    className = '',
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const blurTimeoutRef = useRef(null);

    useEffect(() => {
        const normalizedQuery = String(query || '').trim();
        if (normalizedQuery.length < 2) {
            setSuggestions([]);
            setLoading(false);
            return () => {};
        }

        let isCancelled = false;
        const timerId = setTimeout(async () => {
            try {
                setLoading(true);
                const matches = await getAirportAutocompleteMatches(normalizedQuery);
                if (isCancelled) return;
                setSuggestions(matches.slice(0, 8));
                setIsOpen(true);
            } catch (_) {
                if (isCancelled) return;
                setSuggestions([]);
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        }, 180);

        return () => {
            isCancelled = true;
            clearTimeout(timerId);
        };
    }, [query]);

    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    const selectAirport = (airport) => {
        const nextCode = cleanAirportCode(airport?.iata);
        onCodeChange(nextCode);
        onQueryChange(formatAirportSuggestionLabel(airport));
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        const nextQuery = e.target.value;
        onQueryChange(nextQuery);

        const normalizedCode = cleanAirportCode(nextQuery);
        if (normalizedCode.length === 3 && normalizedCode === String(nextQuery || '').trim().toUpperCase()) {
            onCodeChange(normalizedCode);
        } else if (!String(nextQuery || '').trim()) {
            onCodeChange('');
        }

        setIsOpen(true);
    };

    const handleBlur = () => {
        blurTimeoutRef.current = setTimeout(() => {
            const normalizedCode = cleanAirportCode(query);
            if (normalizedCode.length === 3 && normalizedCode === String(query || '').trim().toUpperCase()) {
                onCodeChange(normalizedCode);
            }
            setIsOpen(false);
        }, 120);
    };

    const handleFocus = () => {
        if (suggestions.length > 0) {
            setIsOpen(true);
        }
    };

    return (
        <div className={`field airportAutocomplete ${className}`.trim()}>
            <label>{label}</label>
            <div className="airportAutocomplete__control">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    autoComplete="off"
                    required={required}
                    disabled={disabled}
                />
                {isOpen && (loading || suggestions.length > 0) ? (
                    <div className="airportAutocomplete__menu">
                        {loading ? (
                            <div className="airportAutocomplete__empty">Searching airports...</div>
                        ) : (
                            suggestions.map((airport) => (
                                <button
                                    key={`${airport.iata}-${airport.icao}`}
                                    type="button"
                                    className="airportAutocomplete__option"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => selectAirport(airport)}
                                >
                                    <span className="airportAutocomplete__optionTitle">{airport.airport}</span>
                                    <span className="airportAutocomplete__optionMeta">
                                        {airport.iata} {airport.countryCode ? `- ${airport.countryCode}` : ''}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                ) : null}
            </div>
            <small className="hint">
                {hint}
                {code ? ` Selected code: ${code}` : ''}
            </small>
        </div>
    );
}
