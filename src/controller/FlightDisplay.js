// @ts-nocheck
function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value) {
  const parsed = toDate(value);
  return parsed ? parsed.toLocaleString() : 'N/A';
}

export function formatTime(value) {
  const parsed = toDate(value);
  return parsed ? parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }) : 'N/A';
}

function extractLocationLabel(airportName) {
  const name = String(airportName || '').trim();
  if (!name) {
    return '';
  }

  return name
    .replace(/\s+international\s+airport$/i, '')
    .replace(/\s+regional\s+airport$/i, '')
    .replace(/\s+municipal\s+airport$/i, '')
    .replace(/\s+metropolitan\s+airport$/i, '')
    .replace(/\s+county\s+airport$/i, '')
    .replace(/\s+airport$/i, '')
    .trim();
}

export function formatAirportLabel(airport, fallbackCode = '') {
  const code = String(fallbackCode || airport?.iata || '').trim();
  const location = extractLocationLabel(airport?.airport);

  if (location && code) {
    return `${location} (${code})`;
  }

  if (location) {
    return location;
  }

  return code || 'N/A';
}

export function formatRouteLabel(flight = {}) {
  return `${formatAirportLabel(flight.originAirport, flight.origin)} → ${formatAirportLabel(flight.destinationAirport, flight.destination)}`;
}

export function formatBookingRouteLabel(booking = {}) {
  const flight = booking.flight || {};

  return formatRouteLabel({
    ...booking,
    ...flight,
    origin: flight.origin || booking.origin || booking.flightOrigin || '',
    destination: flight.destination || booking.destination || booking.flightDestination || '',
    originAirport: flight.originAirport || booking.originAirport || null,
    destinationAirport: flight.destinationAirport || booking.destinationAirport || null,
  });
}

export function describeLayovers(layovers) {
  if (Array.isArray(layovers)) {
    const items = layovers.map((item) => String(item || '').trim()).filter(Boolean);
    if (items.length === 0) {
      return 'No';
    }
    return `Yes: ${items.join(', ')}`;
  }

  const text = String(layovers || '').trim();
  if (!text || text.toLowerCase() === 'none') {
    return 'No';
  }

  return text.toLowerCase().startsWith('yes') ? text : `Yes: ${text}`;
}
