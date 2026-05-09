// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';
import { fetchPublicSchedule } from '../controller/FetchInfo';
import { describeLayovers, formatAirportLabel, formatRouteLabel, formatTime, formatDateTime } from '../controller/FlightDisplay';
import {
  AppButton as Button,
  AppCard as Card,
  AppContainer as Container
} from '../styles/Components';

function cleanAirportCode(v) {
  return (v || '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3);
}

function sameCalendarDayUTC(dateValue, yyyyMmDd) {
  if (!dateValue || !yyyyMmDd) return false;

  const f = new Date(dateValue);
  const [y, m, d] = yyyyMmDd.split('-').map(Number);

  return (
    f.getUTCFullYear() === y
    && f.getUTCMonth() + 1 === m
    && f.getUTCDate() === d
  );
}

function minutesBetween(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const minutes = Math.round((end - start) / 60000);
    return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
}

function fmtDate(dateValue) {
    return new Date(dateValue).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

export default function PublicSchedule() {
    const location = useLocation();
    const navigate = useNavigate();
    const [flights, setFlights] = useState([]);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [depart, setDepart] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
      const state = location.state || {};
      if (state.from) {
        setFrom(cleanAirportCode(state.from));
      }
      if (state.to) {
        setTo(cleanAirportCode(state.to));
      }
      if (state.depart) {
        setDepart(state.depart);
      }
    }, [location.state]);

    useEffect(() => {
        const refreshFlights = () => {
            setFlights(fetchPublicSchedule());
        };

        refreshFlights();
        window.addEventListener('public-schedule-updated', refreshFlights);

        return () => {
            window.removeEventListener('public-schedule-updated', refreshFlights);
        };
    }, []);

    const results = useMemo(() => {
      const hasAnyFilter = Boolean(from || to || depart);

      const filtered = hasAnyFilter
        ? flights.filter((flight) => (
          (!from || cleanAirportCode(flight.origin) === from)
          && (!to || cleanAirportCode(flight.destination) === to)
          && (!depart || sameCalendarDayUTC(flight.departure, depart))
        ))
        : flights;

      return [...filtered].sort(
        (a, b) => new Date(a.departure).getTime() - new Date(b.departure).getTime()
      );
    }, [flights, from, to, depart]);

    const headerText = () => {
      if (!from && !to && !depart) return 'Showing all flights';
      return `${from || 'ANY'} → ${to || 'ANY'} • Depart ${depart ? fmtDate(depart) : 'Any day'}`;
    };

    return (
      <main className="app-site-main">
      <Container fluid className="px-0">
        <Card className="app-card w-100 mx-auto border-0" style={{ maxWidth: '980px' }}>
          <Card.Body>
            <div className="mb-3 d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div>
                <h2 className="section-title mb-1">Available Flights</h2>
                <p className="text-muted mb-0">{headerText()}</p>
              </div>

              {!isEditing && (
                <Button
                  variant="outline-primary"
                  type="button"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Search
                </Button>
              )}
            </div>

            {isEditing && (
              <Card className="border-0 bg-light mb-3 position-relative">
                <Card.Body>
                  <Button
                    variant="light"
                    size="sm"
                    className="position-absolute"
                    style={{ top: '10px', right: '10px' }}
                    type="button"
                    onClick={() => setIsEditing(false)}
                    aria-label="Hide search"
                    title="Hide"
                  >
                    ✕
                  </Button>

                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold mb-1">From</Form.Label>
                        <Form.Control
                          type="text"
                            placeholder="ELP"
                          value={from}
                            onChange={(e) => setFrom(cleanAirportCode(e.target.value))}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold mb-1">To</Form.Label>
                        <Form.Control
                          type="text"
                            placeholder="DFW"
                          value={to}
                            onChange={(e) => setTo(cleanAirportCode(e.target.value))}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fw-semibold mb-1">Depart</Form.Label>
                        <Form.Control
                          type="date"
                          value={depart}
                          onChange={(e) => setDepart(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}

            {results.length === 0 ? (
              <Card className="bg-light border">
                <Card.Body>
                  <p className="mb-1"><b>No flights found.</b></p>
                  <p className="text-muted mb-0">Try adjusting your search.</p>
                </Card.Body>
              </Card>
            ) : (
              <Stack gap={3}>
                {results.map((flight) => {
                  const durationMinutes = minutesBetween(flight.departure, flight.arrival);
                  const durationText = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
                  const routeLabel = formatRouteLabel(flight);
                  const layoversText = describeLayovers(flight.layovers);

                  return (
                    <Card className="border-soft rounded-soft shadow-soft border-0" key={flight.firestoreDocId || flight.flightNumber}>
                      <Card.Body>
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                          <div>
                            <div className="fw-semibold text-primary-brand">{flight.flightNumber} • {flight.airline}</div>
                            <div className="h5 mb-0 text-primary-brand">{routeLabel}</div>
                          </div>
                          <div className="text-muted small">{formatDateTime(flight.departure)} - {formatDateTime(flight.arrival)}</div>
                        </div>

                        <Row className="g-3 align-items-center py-2 border-top border-bottom mb-3">
                          <Col md={4}>
                            <div className="h5 mb-0 text-primary-brand">{formatTime(flight.departure)}</div>
                            <div className="text-muted small">Departure</div>
                          </Col>

                          <Col md={4} className="text-md-center">
                            <span className="fw-semibold text-primary-brand">{durationText}</span>
                          </Col>

                          <Col md={4} className="text-md-end">
                            <div className="h5 mb-0 text-primary-brand">{formatTime(flight.arrival)}</div>
                            <div className="text-muted small">Arrival</div>
                          </Col>
                        </Row>

                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 text-muted small">
                          <span>Origin: {formatAirportLabel(flight.originAirport, flight.origin)}</span>
                          <span>Destination: {formatAirportLabel(flight.destinationAirport, flight.destination)}</span>
                          <span>Layovers: {layoversText}</span>
                          <span>Flight No: {flight.flightNumber || 'N/A'}</span>
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => navigate(`/select-seats/${flight.flightNumber}`, {
                              state: {
                                flight,
                                passengers: Number(location.state?.passengers) || 1,
                                tripType: location.state?.tripType || 'one-way',
                                returnDate: location.state?.returnDate || '',
                              }
                            })}
                          >
                            Select seats
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </Stack>
            )}

            <div className="mt-3">
              <Button variant="outline-primary" onClick={() => navigate('/')}>
                Back
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
      </main>
    );
}