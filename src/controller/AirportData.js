// @ts-nocheck
import { getAirportByIata, getAutocompleteSuggestions } from 'airport-data-js';

const EARTH_RADIUS_MILES = 3958.7613;
const AVERAGE_CRUISE_SPEED_MPH = 500;
const TAXI_AND_TURN_BUFFER_MINUTES = 35;
const MINIMUM_FLIGHT_DURATION_MINUTES = 45;

function cleanAirportCode(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 3);
}

function toRadians(value) {
    return (Number(value) * Math.PI) / 180;
}

function haversineMiles(fromLat, fromLon, toLat, toLon) {
    const lat1 = toRadians(fromLat);
    const lon1 = toRadians(fromLon);
    const lat2 = toRadians(toLat);
    const lon2 = toRadians(toLon);
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = (
        Math.sin(dLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    );
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(EARTH_RADIUS_MILES * c);
}

function pickAirportRecord(records, expectedCode) {
    const normalizedCode = cleanAirportCode(expectedCode);
    if (!Array.isArray(records) || records.length === 0) {
        return null;
    }

    return records.find((airport) => cleanAirportCode(airport?.iata) === normalizedCode) || records[0];
}

function normalizeAirportRecord(airport) {
    if (!airport) {
        return null;
    }

    return {
        iata: cleanAirportCode(airport.iata),
        icao: String(airport.icao || '').trim().toUpperCase(),
        airport: String(airport.airport || '').trim(),
        latitude: Number(airport.latitude),
        longitude: Number(airport.longitude),
        time: String(airport.time || '').trim(),
        utc: String(airport.utc || '').trim(),
        countryCode: String(airport.country_code || '').trim().toUpperCase(),
        continent: String(airport.continent || '').trim().toUpperCase(),
        type: String(airport.type || '').trim(),
    };
}

export async function getAirportDetailsByIata(iataCode) {
    const normalizedCode = cleanAirportCode(iataCode);
    if (normalizedCode.length !== 3) {
        throw new Error(`Invalid airport code: ${iataCode}`);
    }

    const matches = await getAirportByIata(normalizedCode);
    const airport = normalizeAirportRecord(pickAirportRecord(matches, normalizedCode));

    if (!airport || !Number.isFinite(airport.latitude) || !Number.isFinite(airport.longitude)) {
        throw new Error(`Airport data not found for code ${normalizedCode}.`);
    }

    return airport;
}

export function formatAirportSuggestionLabel(airport) {
    if (!airport) {
        return '';
    }

    const name = String(airport.airport || '').trim();
    const code = cleanAirportCode(airport.iata);
    const countryCode = String(airport.country_code || '').trim().toUpperCase();

    return [name, code ? `(${code})` : '', countryCode ? `- ${countryCode}` : '']
        .filter(Boolean)
        .join(' ')
        .replace(/\s+-\s+/, ' - ');
}

export async function getAirportAutocompleteMatches(query) {
    const normalizedQuery = String(query || '').trim();
    if (normalizedQuery.length < 2) {
        return [];
    }

    const matches = await getAutocompleteSuggestions(normalizedQuery);
    return matches
        .map((airport) => normalizeAirportRecord(airport))
        .filter((airport) => airport && airport.iata);
}

export async function getRouteDetailsByIata(originCode, destinationCode) {
    const originAirport = await getAirportDetailsByIata(originCode);
    const destinationAirport = await getAirportDetailsByIata(destinationCode);

    const distanceMiles = haversineMiles(
        originAirport.latitude,
        originAirport.longitude,
        destinationAirport.latitude,
        destinationAirport.longitude
    );

    return {
        originAirport,
        destinationAirport,
        distanceMiles,
    };
}

export function estimateFlightDurationMinutes(distanceMiles) {
    const airMinutes = Math.ceil((Number(distanceMiles) || 0) / AVERAGE_CRUISE_SPEED_MPH * 60);
    return Math.max(MINIMUM_FLIGHT_DURATION_MINUTES, airMinutes + TAXI_AND_TURN_BUFFER_MINUTES);
}

export function estimateArrivalFromDistance(departure, distanceMiles) {
    const departureDate = departure instanceof Date ? departure : new Date(departure);
    if (Number.isNaN(departureDate.getTime())) {
        throw new Error('Departure time must be a valid date.');
    }

    return new Date(departureDate.getTime() + estimateFlightDurationMinutes(distanceMiles) * 60 * 1000);
}
