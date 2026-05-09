// @ts-nocheck

function cleanAirportCode(value) {
  return String(value || '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3);
}

function cleanDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

function cleanPassengers(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(9, Math.max(1, parsed));
}

export function createFlightSearchCriteria(params = {}) {
  const tripType = params.tripType === 'round-trip' ? 'round-trip' : 'one-way';
  const from = cleanAirportCode(params.from);
  const to = cleanAirportCode(params.to);
  const depart = cleanDate(params.depart);
  const returnDate = cleanDate(params.returnDate);
  const passengers = cleanPassengers(params.passengers);

  return {
    tripType,
    from,
    to,
    depart,
    returnDate,
    passengers,
  };
}

export function validateFlightSearchCriteria(criteriaIn = {}) {
  const criteria = createFlightSearchCriteria(criteriaIn);
  const errors = [];

  if (criteria.from.length !== 3) errors.push('Departure airport code must be 3 letters.');
  if (criteria.to.length !== 3) errors.push('Arrival airport code must be 3 letters.');
  if (criteria.from && criteria.to && criteria.from === criteria.to) {
    errors.push('Departure and arrival airports must be different.');
  }
  if (!criteria.depart) errors.push('Please select a departure date.');

  if (criteria.tripType === 'round-trip') {
    if (!criteria.returnDate) errors.push('Please select a return date.');
    if (criteria.depart && criteria.returnDate && criteria.returnDate < criteria.depart) {
      errors.push('Return date cannot be before departure date.');
    }
  }

  return errors;
}

export function toFlightSearchParams(criteriaIn = {}) {
  const criteria = createFlightSearchCriteria(criteriaIn);
  const params = new URLSearchParams();

  params.set('tripType', criteria.tripType);
  params.set('from', criteria.from);
  params.set('to', criteria.to);
  params.set('depart', criteria.depart);
  params.set('passengers', String(criteria.passengers));

  if (criteria.tripType === 'round-trip' && criteria.returnDate) {
    params.set('return', criteria.returnDate);
  }

  return params;
}

export function fromFlightSearchParams(params) {
  return createFlightSearchCriteria({
    tripType: params.get('tripType') || 'one-way',
    from: params.get('from') || '',
    to: params.get('to') || '',
    depart: params.get('depart') || '',
    returnDate: params.get('return') || '',
    passengers: params.get('passengers') || '1',
  });
}
