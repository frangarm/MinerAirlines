// @ts-nocheck
import React, { useEffect } from 'react';
import {useState} from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { fetchBoardingPass, fetchBuyingCustomer} from '../controller/FetchFromFirebase';
import { cancelBookingForCustomer } from '../controller/TransactionFunctions';
import { describeLayovers, formatAirportLabel, formatDateTime } from '../controller/FlightDisplay';
import { AppButton as Button, AppContainer as Container, AppCard as Card } from '../styles/Components';

export default function CustomerBoardingPass(){
    const navigate = useNavigate();
    const [boardingPass, setBoardingPass] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const location = useLocation();
    const { id } = useParams();
    const boardingPassId = location.state?.boardingPassId || id || '';
    const passengerName = boardingPass?.passengerName || boardingPass?.customerEmail || '';
    const flightNumber = boardingPass?.flightNumber || boardingPass?.flight?.flightNumber || '';
    const origin = formatAirportLabel(boardingPass?.flight?.originAirport, boardingPass?.origin || boardingPass?.flight?.origin || '');
    const destination = formatAirportLabel(boardingPass?.flight?.destinationAirport, boardingPass?.destination || boardingPass?.flight?.destination || '');
    const departure = boardingPass?.departure || boardingPass?.flight?.departure || null;
    const arrival = boardingPass?.arrival || boardingPass?.flight?.arrival || null;
    const gate = boardingPass?.gate || boardingPass?.flight?.gate || 'unknown';
    const layovers = describeLayovers(boardingPass?.flight?.layovers || boardingPass?.layovers);
    const accommodations = Array.isArray(boardingPass?.accommodations)
        ? boardingPass.accommodations
        : [];

    const loadBoardingPass = async () => {
        if (!boardingPassId) {
            setError('Missing boarding pass information. Please open this page from your dashboard.');
            setIsLoading(false);
            return;
        }

        try {
            const data = await fetchBoardingPass(boardingPassId);
            setBoardingPass(data);
        } catch (loadError) {
            setError(loadError?.message || 'Unable to load this boarding pass.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadBoardingPass();
    }, []);

    const cancelFlight = async () => {
        if (!boardingPass) {
            alert('No boarding pass loaded yet.');
            return;
        }

        try{
            const customer = await fetchBuyingCustomer();
            await cancelBookingForCustomer(boardingPass, customer);
            navigate('/booking-canceled');
        } catch (error) {
            alert(error?.message || 'Error occurred while cancelling booking.');
        }

    }

    return(
        <Container className="py-4">
            <h1>{passengerName}'s Boarding Pass</h1>
            {isLoading && <p>Loading boarding pass...</p>}
            {!isLoading && error && <p className="text-danger">{error}</p>}
            <Card>
                <Card.Body>
                    <Card.Title>Boarding Pass Details</Card.Title>
                    <Card.Text>
                        <strong>Passenger:</strong> {passengerName || 'N/A'}
                        <br />
                        <strong>Flight Number:</strong> {flightNumber || 'N/A'}
                        <br />
                        <strong>Origin:</strong> {origin || 'N/A'}
                        <br />
                        <strong>Destination:</strong> {destination || 'N/A'}
                        <br />
                        <strong>Departure:</strong> {formatDateTime(departure)}
                        <br />
                        <strong>Arrival:</strong> {formatDateTime(arrival)}
                        <br />
                        <strong>Layovers:</strong> {layovers}
                        <br />
                        <strong>Gate:</strong> {gate}
                        <br />
                        <strong>Accommodations:</strong> {accommodations.length ? accommodations.join(', ') : 'None'}
                    </Card.Text>
                </Card.Body>
                <Button
                    onClick={async () => {
                        await cancelFlight();
                    }}
                    disabled={!boardingPass || isLoading || Boolean(error)}
                >
                    Cancel Booking
                </Button>
            </Card>
        </Container>
    );

}