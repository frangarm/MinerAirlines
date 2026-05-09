// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Stack from 'react-bootstrap/Stack';
import InputGroup from 'react-bootstrap/InputGroup';
import { submitInsiderAccount } from '../controller/StoreFirebaseInfo';
import { isCurrentUserAdmin } from '../controller/UserRoleFunctions';
import {
    AppButton as Button,
    AppContainer as Container,
    AppToast,
    AppToastStack
} from '../styles/Components';

const COMPANY_EMAIL_DOMAIN = '@minerairlines.com';

function toCompanyEmail(input) {
    const localPart = String(input ?? '')
        .trim()
        .toLowerCase()
        .split('@')[0]
        .replace(/\s+/g, '');

    return localPart ? `${localPart}${COMPANY_EMAIL_DOMAIN}` : '';
}

export default function CreateAdmin() {
    const navigate = useNavigate();
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '', 
        dateOfBirth: '', 
        gender: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [status, setStatus] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVariant, setToastVariant] = useState('success');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const canContinue = formData.firstName && formData.lastName && 
    formData.dateOfBirth && formData.gender && 
    formData.email && formData.password && formData.confirmPassword;

    // @ts-ignore
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: name === 'email' ? value.trim().split('@')[0] : value
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
            setErrorMessage('Please complete all fields before creating an account.');
            showFeedbackToast('Please complete all fields before creating an account.', 'danger');
            return;
        }
        setIsSubmitting(true);
        setStatus("");
        setErrorMessage("");
        const companyEmail = toCompanyEmail(formData.email);

        if (!companyEmail) {
            setErrorMessage("Please enter an email username.");
            showFeedbackToast('Please enter an email username.', 'danger');
            setIsSubmitting(false);
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setErrorMessage("Passwords do not match.");
            showFeedbackToast('Passwords do not match.', 'danger');
            setIsSubmitting(false);
            return;
        }

        try {
            await submitInsiderAccount(
                formData.firstName,
                formData.lastName,
                formData.dateOfBirth,
                formData.gender,
                companyEmail,
                formData.password,
                "admin",
                ''
            );

            setStatus(`Account added created successfully!`);
            showFeedbackToast('Admin account created successfully.', 'success');
            setFormData({ firstName: "", lastName: "", dateOfBirth: "", gender: "", email: "", password: "", confirmPassword: "" });
            navigate('/welcome-admin', {
                state: {
                    firstName: formData.firstName,
                    lastName: formData.lastName
                }
            });
        } catch (error) {
            setErrorMessage(error?.message || "Unknown error while creating account.");
            showFeedbackToast(error?.message || 'Unknown error while creating account.', 'danger');
        }
        finally{
            setIsSubmitting(false);
        }
    };

    if (checkingAccess) {
        return (
            <Container className="py-5">
                <div className="app-card w-100 mx-auto" style={{ maxWidth: '760px' }}>
                    <p className="text-muted mb-0">Checking admin access...</p>
                </div>
            </Container>
        );
    }

    return (
        <Container className="py-5">
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
                <h1 className="section-title mb-1">Create Administrator Account</h1>
                <p className="text-muted mb-4">Create an account to manage employees, flights, etc.</p>

                <Form onSubmit={handleSubmit}>
                    <div className="form-grid-2">
                        <Form.Group className="mb-3">
                            <Form.FloatingLabel controlId="firstName" label="First Name">
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
                            <Form.FloatingLabel controlId="lastName" label="Last Name">
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
                        <Form.FloatingLabel controlId="dateOfBirth" label="Date of Birth">
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
                        <Form.FloatingLabel controlId="gender" label="Gender">
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

                    <InputGroup className="mb-3">
                        <Form.FloatingLabel controlId="email" label="Email">
                            <Form.Control
                                id="email"
                                name="email"
                                type="text"
                                placeholder="admin"
                                value={formData.email}
                                onChange={handleChange}
                                pattern="[A-Za-z0-9._%+-]+"
                                title="Use letters, numbers, and . _ % + - only, no spaces or @ symbol. The '@minerairlines.com' domain will be added automatically."
                                required
                            />
                        </Form.FloatingLabel>
                    <InputGroup.Text id="basic-addon2">@minerairlines.com</InputGroup.Text>
                    </InputGroup>

                    <Form.Group className="mb-3">
                        <Form.FloatingLabel controlId="password" label="Password">
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
                        <Form.FloatingLabel controlId="confirmPassword" label="Confirm Password">
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

                    <Stack direction="horizontal" gap={2} className="justify-content-center mb-3">
                        <Button variant="warning" type="submit" size="lg" loading={isSubmitting} loadingText="Creating Account..." className="fw-semibold"> Create Admin Account </Button>
                        <Button type="button" variant="outline-secondary" size="lg" onClick={() => navigate('/')} className="fw-semibold">Back</Button>
                    </Stack>
                </Form>

                <div className="text-center text-muted small mt-4">
                    <div>Already have an account?</div>
                        <Button variant="link" className="p-0 mt-1" onClick={() => navigate('/login')}>Log In</Button>
                    </div>
                </div>
        </Container>
    );
}
