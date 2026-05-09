// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import { submitCustomerAccount } from '../controller/StoreFirebaseInfo';
import { auth } from '../firebase';
import { writeCachedRole } from '../auth/roleCache';
import {
    AppButton as Button,
    AppContainer as Container,
    AppToast,
    AppToastStack
} from '../styles/Components';

export default function CreateAccount() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        citizen: '',
        email: '',
        password: '',
        confirmPassword: '',
        accountType: 'customer' 
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [status, setStatus] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVariant, setToastVariant] = useState('success');

    const canContinue =
        formData.firstName.trim() &&
        formData.lastName.trim() &&
        formData.dateOfBirth &&
        formData.gender &&
        formData.email.trim() &&
        formData.password &&
        formData.confirmPassword &&
        formData.password === formData.confirmPassword;

    // @ts-ignore
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const showFeedbackToast = (message, variant = 'success') => {
        setToastMessage(message);
        setToastVariant(variant);
        setShowToast(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!canContinue) {
	    setErrorMessage('Please complete all fields and make sure passwords match.');
	    showFeedbackToast(
                'Please complete all fields and make sure passwords match.',
                'danger'
            );
            return;
        }

        setIsSubmitting(true);
        setStatus("");
        setErrorMessage("");

	if (formData.password !== formData.confirmPassword) {
            setErrorMessage("Passwords do not match.");
            showFeedbackToast('Passwords do not match.', 'danger');
            setIsSubmitting(false);
            return;
        }

        try {
            await submitCustomerAccount(
                formData.firstName,
                formData.lastName,
                formData.dateOfBirth,
                formData.gender,
                formData.email,
                formData.password,
                formData.accountType, 
                formData.citizen
            );

	    setStatus(`Account created successfully!`);
	    showFeedbackToast('Account created successfully.', 'success');

            const signedIn = auth.currentUser;
            if (signedIn) {
                writeCachedRole(signedIn.uid, formData.accountType);
            }

            setFormData({
                firstName: '',
                lastName: '',
                dateOfBirth: '',
                gender: '',
                citizen: '',
                email: '',
                password: '',
                confirmPassword: '',
                accountType: 'customer'
            });

	    
	    const targetRoute =
		  formData.accountType === 'corporate_travel_manager'
		  ? '/travel-manager-dashboard'
		  : '/customer-dashboard';

            navigate(targetRoute, {
                state: {
                    firstName: formData.firstName,
                    lastName: formData.lastName
                }
            });

        } catch (error) {
	    setErrorMessage(error?.message || "Unknown error while creating account.");
	    showFeedbackToast(
		error?.message || 'Unknown error while creating account.',
                'danger'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="app-site-main">
            <Container className="py-4 px-0">
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

                <div className="app-card w-100 mx-auto" style={{ maxWidth: '760px' }}>
                    <h1 className="section-title mb-1">Create Your Account</h1>
                    <p className="text-muted mb-4">
                        Join MinerAirlines to book, manage, and explore your trips.
                    </p>

                    <Form onSubmit={handleSubmit}>

  
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold">Account Type</Form.Label>
                            <Stack direction="horizontal" gap={4}>
                                <Form.Check
                                    type="radio"
                                    label="Customer"
                                    name="accountType"
                                    value="customer"
                                    checked={formData.accountType === 'customer'}
                                    onChange={handleChange}
                                />
                                <Form.Check
                                    type="radio"
                                    label="Corporate Travel Manager"
                                    name="accountType"
                                    value="corporate_travel_manager"
                                    checked={formData.accountType === 'corporate_travel_manager'}
                                    onChange={handleChange}
                                />
                            </Stack>
                        </Form.Group>

                        <div className="form-grid-2">
                            <Form.Group className="mb-3">
                                <Form.FloatingLabel label="First name">
                                    <Form.Control
					id="firstName"
					name="firstName"
                                        type="text"
					placeholder="First name"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.FloatingLabel>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.FloatingLabel label="Last name">
                                    <Form.Control
					id="lastName"
					name="lastName"
                                        type="text"
					placeholder="Last name"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.FloatingLabel>
                            </Form.Group>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.FloatingLabel label="Date of Birth">
                                <Form.Control
				    id="dateOfBirth"
				    name="dateOfBirth"
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.FloatingLabel>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.FloatingLabel label="Gender">
                                <Form.Select
				    id="gender"
				    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </Form.Select>
                            </Form.FloatingLabel>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.FloatingLabel label="Citizenship Status">
                                <Form.Select
				    id="citizen"
				    name="citizen"
                                    value={formData.citizen}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Citizenship</option>
                                    <option value="US Citizen">US Citizen</option>
                                    <option value="Permanent Resident">Permanent Resident</option>
                                    <option value="Visa Holder">Visa Holder</option>
                                </Form.Select>
                            </Form.FloatingLabel>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.FloatingLabel label="Email">
                                <Form.Control
				    id="email"
				    name="email"
                                    type="email"
				    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.FloatingLabel>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.FloatingLabel label="Password">
                                <Form.Control
				    id="password"
				    name="password"
                                    type="password"
				    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.FloatingLabel>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.FloatingLabel label="Confirm Password">
                                <Form.Control
				    id="confirmPassword"
				    name="confirmPassword"
                                    type="password"
				    placeholder="Re-enter your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.FloatingLabel>
                        </Form.Group>

                        <Stack direction="horizontal" gap={2} className="justify-content-center">
                            <Button
                                variant="warning"
                                type="submit"
                                size="lg"
                                loading={isSubmitting}
                                loadingText="Creating Account..."
				className="fw-semibold"
                            >
                                Create Account
                            </Button>
                            <Button
                                type="button"
                                variant="outline-secondary"
                                size="lg"
                                onClick={() => navigate('/')}
				className="fw-semibold"
                            >
                                Back
                            </Button>
                        </Stack>
                    </Form>

		    <div className="text-center text-muted small mt-4">
                    <div>Already have an account?</div>
                        <Button variant="link" className="p-0 mt-1" onClick={() => navigate('/login')}>Log In</Button>
                    </div>

		</div>
            </Container>
        </main>
    );
}
