// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Col from 'react-bootstrap/Col';
import { subscribeAllBookings, aggregateByDay, subscribeFlights } from '../controller/FetchBookingInfo';
import { observeAuthState } from '../controller/SignIn';
import { isAdminUser } from '../controller/UserRoleFunctions';
import { AppCard as Card, AppContainer as Container } from '../styles/Components';

export default function AdminAnalytics() {
  const [data, setData] = useState([]);
  const [flightData, setFlightData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (currentUser) => {
      setUser(currentUser || null);

      if (!currentUser) {
        setIsAdmin(false);
        setCheckingAuth(false);
        return;
      }

      try {
        const adminUser = await isAdminUser(currentUser.uid, currentUser.email);
        setIsAdmin(adminUser);
      } catch (authError) {
        console.error('Error checking admin status:', authError);
        setIsAdmin(false);
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (checkingAuth || !user || !isAdmin) {
      if (!checkingAuth && (!user || !isAdmin)) {
        setError(!user ? 'Please sign in to view analytics.' : 'Only admins can view booking analytics.');
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError('');

    const unsubscribeBookings = subscribeAllBookings(
      (bookings) => {
        setData(aggregateByDay(bookings));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubscribeFlights = subscribeFlights(
        (flights) => setFlightData(flights),
        (err) => setError(err.message)
    );

    return () => {
      unsubscribeBookings();
      unsubscribeFlights();
    };
  }, [checkingAuth, user, isAdmin]);

    return (
    <div className="app-page d-flex justify-content-center align-items-center w-100">
      <Container fluid className="w-100 px-4 px-lg-5" style={{ maxWidth: '1600px' }}>
        <h1 className="section-title mb-2 text-white text-center">Admin Analytics</h1>
        <Card className="app-card w-100">
          <Card.Body>
            <p className="text-muted mb-4" font-weight="bold" style={{ textAlign: 'center' }}>Tickets And Seats Sold by Booking Date</p>

            {loading && <p className="text-muted">Loading analytics...</p>}
            {!loading && error && <p className="text-danger">{error}</p>}
            {!loading && !error && data.length === 0 && (
              <p className="text-muted">No booking records found yet.</p>
            )}

            {!loading && !error && data.length > 0 && (
              <Col>
                <div style={{ width: '100%', height: '420px' }}>
                  <ResponsiveContainer>
                    <AreaChart
                      data={data}
                      margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="ticketsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff8c00" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#ff8c00" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="seatsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#62a4e6" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#62a4e6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="ticketsSold"
                        name="Tickets Sold"
                        stroke="#ff8c00"
                        fill="url(#ticketsGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="seatsSold"
                        name="Seats Sold"
                        stroke="#62a4e6"
                        fill="url(#seatsGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Col>
            )}
            </Card.Body>
            </Card>
            <br/>
        <Card>
          <Card.Body>
            {!loading && !error && flightData.length > 0 && (
              <Col className="mt-4">
                <p className="text-muted mb-4" font-weight="bold" style={{ textAlign: 'center' }}>Seats Sold by Flight</p>
                <div style={{ width: '100%', height: '420px' }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={flightData}
                      margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="flightNumber" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="seatsSold"
                        name="Seats Sold"
                        fill="#001f3f"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Col>
            )}
          </Card.Body>
        </Card>
        <br/>
        <Card>
          <Card.Body>
             {!loading && !error && flightData.length > 0 && (
              <Col className="mt-4">
                <p className="text-muted mb-4" font-weight="bold" style={{ textAlign: 'center' }}>Daily Revenue</p>
                <div style={{ width: '100%', height: '420px' }}>
                  <ResponsiveContainer>
                    <AreaChart
                      data={data}
                      margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} 
                        tickFormatter={(value) => '$${value}'}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${value}`, 'Daily Revenue']}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="totalRevenue"
                        name="Daily Revenue"
                        fill="#ff8c00"
                        radius={[8, 8, 0, 0]}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Col>
            )}
          </Card.Body>
        </Card>
      </Container>
        </div>
    );
}