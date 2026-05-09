// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import Landing from './pages/Landing';
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import WelcomeUser from './pages/WelcomeUser';
import Booking from './pages/Booking';
import { startSync } from './controller/InitializeData';
import PublicSchedule from './pages/PublicSchedule';
import WelcomeAdmin from './pages/WelcomeAdmin';
import AdminDashboard from './pages/AdminDashboard';
import Flights from './pages/Flights';
import MyBookings from './pages/MyBookings';
import CreateEmployee from './pages/CreateEmployee';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeList from './pages/EmployeeList';
import SelectSeats from './pages/SelectSeats';
import BookingSuccessful from './pages/BookingSuccessful';
import CustomerBoardingPass from './pages/CustomerBoardingPass';
import CustomerDashboard from './pages/CustomerDashboard';
import TravelManagerDashboard from './pages/TravelManagerDashboard';
import TravelManagerEmployees from './pages/TravelManagerEmployees';
import AdminAnalytics from './pages/AdminAnalytics';
import AboutUs from './pages/AboutUs';

import { auth, hasFirebaseConfiguration } from './firebase';
import AppSiteLayout from './components/AppSiteLayout';

function RequireAuth({ children }) {
    const location = useLocation();
    const [authReady, setAuthReady] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (!hasFirebaseConfiguration()) {
            setUser(null);
            setAuthReady(true);
            return () => {};
        }

        const stop = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setAuthReady(true);
        });

        return () => stop();
    }, []);

    if (!authReady) {
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ redirectTo: { pathname: location.pathname, search: location.search } }} />;
    }

    return children;
}

export default function App() {
    //Initialzes the database
    useEffect(() => {
        const sync = startSync();

        return () => {
            if (typeof sync === 'function') {
                sync();
            }
        };
    }, []);

    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route element={<AppSiteLayout />}>\

                    <Route path="/login" element={<Login />} />
                    <Route path="/create-account" element={<CreateAccount />} />
                    <Route path="/welcome-user" element={<WelcomeUser />} />
                    <Route path="/booking" element={<Booking />} />
                    <Route path="/flights" element={<Flights />} />
                    <Route path="/select-seats/:flightNumber" element={<SelectSeats />} />
                    <Route path="/booking-successful" element={<BookingSuccessful />} />
                    <Route path="/customer-boarding-pass/:id" element={<CustomerBoardingPass />} />
                    <Route
                        path="/customer-dashboard"
                        element={(
                            <RequireAuth>
                                <CustomerDashboard />
                            </RequireAuth>
                        )}
                    />
		    <Route
			path="/travel-manager-dashboard"
			element={(
			    <RequireAuth>
				<TravelManagerDashboard />
			    </RequireAuth>
			)}
		    />
                    <Route
                        path="/my-bookings"
                        element={(
                            <RequireAuth>
                                <MyBookings />
                            </RequireAuth>
                        )}
                    />
		    <Route path="/travel-manager/employees" element={<TravelManagerEmployees />} />
                    <Route path="/public-schedule" element={<PublicSchedule />} />
                    <Route path="/create-employee" element={<CreateEmployee />} />
                    <Route path="/welcome-admin" element={<WelcomeAdmin />} />
                    <Route path="/admin-dashboard" element={<AdminDashboard />} />
                    <Route path="/admin-analytics" element={<AdminAnalytics />} />
                    <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
                    <Route path="/employee-list" element={<EmployeeList />} />
                    <Route path="/about-us" element={<AboutUs />} />
                </Route>
            </Routes>
        </Router>
    );
}
