// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import React from "react";
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import { submitInsiderAccount } from "../controller/StoreFirebaseInfo";
import { updateFlightCrewByDocId } from "../controller/StoreFirebaseInfo";
import { isCurrentUserAdmin } from '../controller/UserRoleFunctions';
import { useNavigate } from 'react-router-dom';
import {
    AppButton as Button,
    AppContainer as Container,
    AppToast,
    AppToastStack
} from "../styles/Components";

const COMPANY_EMAIL_DOMAIN = '@minerairlines.com';

function toCompanyEmail(input) {
    const localPart = String(input ?? '')
        .trim()
        .toLowerCase()
        .split('@')[0]
        .replace(/\s+/g, '');

    return localPart ? `${localPart}${COMPANY_EMAIL_DOMAIN}` : '';
}

function parseEmails(str) {
    return (str || '')
        .split(/[\s,]+/g)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

export default function ManageStaff(){
    const navigate = useNavigate();
    const [checkingAccess, setCheckingAccess] = useState(true);
    
    const [status, setStatus] = useState('');
    const [flights, setFlights] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVariant, setToastVariant] = useState('success');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [staffForm, setStaffForm] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        email: '',
        password: '',
        confirmPassword: '',
        type: 'pilot',
        misc: ''
    });

    useEffect(() => {
        let isMounted = true;

        const verifyAdminAccess = async () => {
            const allowed = await isCurrentUserAdmin();
            if (!allowed) {
                navigate('/login');
                return;
            }

            if (isMounted) {
                setCheckingAccess(false);
            }
        };

        verifyAdminAccess().catch(() => {
            navigate('/login');
        });

        return () => {
            isMounted = false;
        };
    }, [navigate]);

       // @ts-ignore
    const handleStaffChange = (e) => {
            const { name, value } = e.target;
            setStaffForm((prevStaff) => ({
                ...prevStaff,
                [name]: name === 'email' ? value.trim().split('@')[0] : value
            }));
        };

        const showFeedbackToast = (message, variant = 'success') => {
            setToastMessage(message);
            setToastVariant(variant);
            setShowToast(true);
        };
    
        const handleStaffSubmit = async (e) => {
            e.preventDefault();
            setStatus('');
            setErrorMessage('');
    
            if (staffForm.password !== staffForm.confirmPassword) {
                setErrorMessage('Staff passwords do not match.');
                showFeedbackToast('Staff passwords do not match.', 'danger');
                return;
            }

            if (!staffForm.dateOfBirth || !staffForm.gender) {
                setErrorMessage('Please select birth date and gender.');
                showFeedbackToast('Please select birth date and gender.', 'danger');
                return;
            }

            const companyEmail = toCompanyEmail(staffForm.email);
            if (!companyEmail) {
                setErrorMessage('Please enter an email username.');
                showFeedbackToast('Please enter an email username.', 'danger');
                return;
            }

            setIsSubmitting(true);
    
            try {
                const docId = await submitInsiderAccount(
                    staffForm.firstName,
                    staffForm.lastName,
                    companyEmail,
                    staffForm.password,
                    staffForm.type,
                    staffForm.misc
                );
    
                setStatus(`Staff account created. Firestore doc id: ${docId}`);
                showFeedbackToast('Staff account created successfully.', 'success');
                setStaffForm({
                    firstName: '',
                    lastName: '',
                    dateOfBirth: '',
                    gender: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    type: 'pilot',
                    misc: ''
                });
            } catch (error) {
                setErrorMessage(error?.message || 'Unable to create staff account.');
                showFeedbackToast(error?.message || 'Unable to create staff account.', 'danger');
            } finally {
                setIsSubmitting(false);
            }
        };

      const handleSaveCrew = async (firestoreDocId, pilotsDraft, attendantsDraft) => {
        setStatus('');
        setErrorMessage('');

        const pilots = parseEmails(pilotsDraft);
        const attendants = parseEmails(attendantsDraft);

        try {
            await updateFlightCrewByDocId(
                firestoreDocId,
                pilots,
                attendants
            );
            setFlights((prevFlights) =>
                prevFlights.map((currentFlight) =>
                    currentFlight.firestoreDocId === firestoreDocId
                        ? {
                            ...currentFlight,
                            crew: {
                                pilots,
                                attendants
                            }
                        }
                        : currentFlight
                )
            );
            setStatus('Crew updated successfully.');
        } catch (error) {
            setErrorMessage(error?.message || 'Unable to update crew.');
        }
    };

    if (checkingAccess) {
        return (
            <Container className="createStaffAccount py-4">
                <div className="app-card w-100 mx-auto" style={{ maxWidth: '760px' }}>
                    <p className="text-muted mb-0">Checking admin access...</p>
                </div>
            </Container>
        );
    }

    return (  
        <Container className="createStaffAccount py-4">
            <AppToastStack>
                <AppToast
                    variant={toastVariant}
                    show={showToast}
                    onClose={() => setShowToast(false)}
                    title="Account Status"
                >
                    {toastMessage}
                </AppToast>
            </AppToastStack>
            <h1 className="mb-4" style={{ color: '#001f3f' }}>Create New Staff Account</h1>
            <Form onSubmit={handleStaffSubmit}> 
                <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold" style={{ color: '#001f3f' }}>Staff Information</Form.Label>
                    <Form.FloatingLabel controlId="floatingSelect" label="Select Staff Type">
                        <Form.Select
                            aria-label="selectType"
                            name="type"
                            value={staffForm.type}
                            onChange={handleStaffChange}
                        >
                            <option value="admin">Admin</option>
                            <option value="pilot">Pilot</option>
                            <option value="attendant">Attendant</option>
                        </Form.Select>
                    </Form.FloatingLabel>
                </Form.Group>

                <Row>
                    
                    <Form.Group as={Col} controlId="formStaffAccount">
                        <Form.FloatingLabel controlId="firstName" label="First Name" className="mb-2">
                            <Form.Control
                                className="mb-2"
                                type="text"
                                name="firstName"
                                placeholder="First Name"
                                value={staffForm.firstName}
                                onChange={handleStaffChange}
                            />
                        </Form.FloatingLabel>
                        <Form.FloatingLabel controlId="dateOfBirth" label="Date of Birth" className="mb-2">
                            <Form.Control
                                className="mb-2"
                                type="date"
                                name="dateOfBirth"
                                value={staffForm.dateOfBirth}
                                onChange={handleStaffChange}
                                required
                            />
                        </Form.FloatingLabel>
                        <InputGroup className="mb-2">
                            <Form.FloatingLabel controlId="email" label="Email" className="mb-0">
                                <Form.Control
                                    type="text"
                                    name="email"
                                    placeholder="username"
                                    value={staffForm.email}
                                    onChange={handleStaffChange}
                                    pattern="[A-Za-z0-9._%+-]+"
                                    title="Use letters, numbers, and . _ % + - only, no spaces or @ symbol. The '@minerairlines.com' domain will be added automatically."
                                    required
                                />
                            </Form.FloatingLabel>
                            <InputGroup.Text>@minerairlines.com</InputGroup.Text>
                        </InputGroup>
                        <Form.FloatingLabel controlId="password" label="Password" className="mb-2">
                            <Form.Control
                                className="mb-2"
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={staffForm.password}
                                onChange={handleStaffChange}
                            />
                        </Form.FloatingLabel>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formStaffAccount2">
                        <Form.FloatingLabel controlId="lastName" label="Last Name" className="mb-2">
                            <Form.Control
                                className="mb-2"
                                type="text"
                                name="lastName"
                                placeholder="Last Name"
                                value={staffForm.lastName}
                                onChange={handleStaffChange}
                            />
                        </Form.FloatingLabel>
                        <Form.FloatingLabel controlId="gender" label="Gender" className="mb-2">
                                <Form.Select
                                    className="mb-2"
                                    name="gender"
                                    value={staffForm.gender}
                                    onChange={handleStaffChange}
                                    required
                                >
                                <option value="">Select Gender</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                                </Form.Select>
                        </Form.FloatingLabel>
                        <Form.FloatingLabel controlId="misc" label="Additional Information" className="mb-2">
                            <Form.Control
                                className="mb-2"
                                type="text"
                                name="misc"
                                placeholder="Additional Information"
                                value={staffForm.misc}
                                onChange={handleStaffChange}
                            />
                        </Form.FloatingLabel>
                        <Form.FloatingLabel controlId="confirmPassword" label="Confirm Password" className="mb-2">
                            <Form.Control
                                className="mb-2"
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                value={staffForm.confirmPassword}
                                onChange={handleStaffChange}
                            />   
                        </Form.FloatingLabel>
                    </Form.Group>

                </Row>
            <Button
                variant="warning"
                type="submit"
                loading={isSubmitting}
                loadingText="Loading..."
                className="fw-bold border-0 px-3"
            >
                Submit
            </Button>
            </Form>
        </Container>     
    );
}
