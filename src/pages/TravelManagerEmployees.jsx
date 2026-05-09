// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import { auth } from '../firebase';
import {
  addManagerEmployee,
  getManagerEmployees,
  deleteManagerEmployee  
} from '../controller/ManagerEmployeeFunctions';


import {
  AppAlert as Alert,
  AppBadge as Badge,
  AppButton as Button,
  AppContainer as Container
} from '../styles/Components';

//I still need to import and integrate backend functionality

export default function TravelManagerEmployees() {
    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

  
    const [showAddForm, setShowAddForm] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);  

    //employee loading
    useEffect(() => {
	const load = async () => {
	    setLoading(true);
	    const managerUid = auth.currentUser.uid;
	    const list = await getManagerEmployees(managerUid);
	    setEmployees(list);
	    setLoading(false);
	};

	load();
    }, []);

    //handlers
    const isSelected = (employeeId) =>
	  selectedEmployees.includes(employeeId);

    
    const toggleEmployeeSelection = (employeeId) => {
	setSelectedEmployees(prev =>
	    prev.includes(employeeId)
		? prev.filter(id => id !== employeeId)
		: [...prev, employeeId]
	);
    };

    const handleAddEmployee = async () => {
	if (!firstName || !lastName || !email) {
	    setError('All fields are required');
	    return;
	}

	try {
	    setSaving(true);
	    setError('');

	    const managerUid = auth.currentUser.uid;

	    await addManagerEmployee(managerUid, {
		firstName,
		lastName,
		email
	    });

	    // Refresh list
	    const updated = await getManagerEmployees(managerUid);
	    setEmployees(updated);
	    
	    // Reset form
	    setFirstName('');
	    setLastName('');
	    setEmail('');
	    setShowAddForm(false);
	} catch (err) {
	    setError(err.message || 'Unable to add employee');
	} finally {
	    setSaving(false);
	}
    };

    const handleDeleteEmployee = async (employeeId) => {
	const confirmDelete = window.confirm(
	    'Are you sure you want to permanently delete this employee?\n\nThis cannot be undone.'
	);

	if (!confirmDelete) return;

	try {
	    const managerUid = auth.currentUser.uid;

	    await deleteManagerEmployee(managerUid, employeeId);

	    // Update UI immediately
	    setEmployees(prev =>
		prev.filter(emp => emp.employeeId !== employeeId)
	    );
	} catch (err) {
	    alert(err.message || 'Failed to delete employee');
	}
    };

    
    return (
	<main className="app-site-main app-site-main--fluid">
	    <Container fluid className="customer-account-shell">

		{/* Header */}
		<section className="customer-account-hero">
		    <Container fluid className="customer-account-shell">
			<div className="customer-account-hero__grid">
			    <div className="customer-account-hero__intro">
				<p className="customer-account-hero__eyebrow">
				    Employee Managing
				</p>
				<h1> Add and Select Employees for Booking!</h1>
			    </div>
			</div>
		    </Container>
		</section>  
		

		{/* Main Content */}
		<section className="customer-panel customer-panel--primary">
		    <div className="customer-panel__header">
			<h2>Employee Directory</h2>
			<span>{employees.length} total</span>
		    </div>


		    
		    {/* Add Employee and Booking Buttons */}
		    <div className = "d-flex align-items-center gap-3">

			<Button
			    variant="warning"
			    size="lg"
			    onClick={() => setShowAddForm(!showAddForm)}
			>
			    {showAddForm ? 'Cancel' : 'Add Employee'}
			</Button>

			
			<Button
			    variant="primary"
			    size="lg"
			    disabled={selectedEmployees.length === 0}
			    title={
				selectedEmployees.length === 0
				    ? 'Select one or more employees to book flights'
				    : ''
			    }
			    onClick={() => {
				navigate('/booking', {
				    state: {
					selectedEmployees: employees.filter(emp =>
					    selectedEmployees.includes(emp.employeeId)
					)
				    }
				});
				console.log('Selected employees:', selectedEmployees);
			    }}
			>
			    Book for Selected
			    {selectedEmployees.length > 0 && (
				<> ({selectedEmployees.length})</>
			    )}
			</Button>
			
		    </div>
			

		    {/* Add Employee Form  */}
		    {showAddForm && (
			<section className="customer-panel customer-panel--primary mt-4">
			    {/* Form Header */}
			    <div className="customer-panel__header">
				<h3>Add Employee</h3>
			    </div>
			    
			    {/* Form Body */}
			    <div className="customer-panel__body">
				{error && <Alert variant="danger">{error}</Alert>}

				<Row className="g-3">
				    <Col md={4}>
					<div className="field field--stacked">
					    <label>First Name</label>
					    <input
						type="text"
						value={firstName}
						onChange={e => setFirstName(e.target.value)}
					    />
					</div>
				    </Col>

				    <Col md={4}>
					<div className="field field--stacked">
					    <label>Last Name</label>
					    <input
						type="text"
						value={lastName}
						onChange={e => setLastName(e.target.value)}
					    />
					</div>
				    </Col>

				    <Col md={4}>
					<div className="field field--stacked">
					    <label>Email</label>
					    <input
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
					    />
					</div>
				    </Col>
				</Row>
			    </div>

			    {/* Form Footer */}
			    <div className="customer-panel__footer d-flex justify-content-end gap-3 mt-4">
				<Button
				    variant="secondary"
				    onClick={() => setShowAddForm(false)}
				>
				    Cancel
				</Button>
				
				<Button
				    variant="primary"
				    loading={saving}
				    onClick={handleAddEmployee}
				>
				    Save Employee
				</Button>
			    </div>
			</section>
		    )}
		    
		    {/* Checks if there are no employees  */}
		    <div className="mt-4">
			{loading ? (
			    <Alert variant="info">Loading employees…</Alert>
			) : employees.length === 0 ? (
			    <Alert variant="secondary" className="mt-3">
				<h4>No employees yet</h4>
				<p>
				    Add employees to start booking flights for your team.
				</p>

			    </Alert>
			) : (
			    <Stack gap={3}>
				{employees.map((emp, index) => (
				    <article
					key={emp.employeeId}
					className="trip-activity-card"
				    >
					<div className="trip-activity-card__header">
					    <div>
						<div className="trip-activity-card__title">
						    {emp.firstName} {emp.lastName}
						</div>
						<div className="trip-activity-card__subtitle">
						    {emp.email}
						</div>
					    </div>
					    
					    <Badge bg={isSelected(emp.employeeId) ? 'primary' : 'secondary'}>
						{isSelected(emp.employeeId) ? 'Selected' : 'Not Selected'}
					    </Badge>
					</div>

					<Row className="g-3">
					    <Col md={4}>
						<div className="trip-activity-card__label">
						    Employee #
						</div>
						<div className="trip-activity-card__value">
						    {emp.employeeNumber || index+1}
						</div>
					    </Col>
					    
					    <Col md={4}>
						<div className="trip-activity-card__label">
						    Total Flight Cost
						</div>
						<div className="trip-activity-card__value">
						    {emp.costCenter || '—'}
						</div>
					    </Col>

					    <Col md={4}>
						<div className="trip-activity-card__label">
						    Actions
						</div>
						<div className="trip-activity-card__value">
						    
						    
						    <Button
							size="sm"
							variant={isSelected(emp.employeeId) ? 'outline-primary' : 'primary'}
							onClick={() => toggleEmployeeSelection(emp.employeeId)}
						    >
							{isSelected(emp.employeeId) ? 'Deselect' : 'Select'}
						    </Button>

						    <Button
							size="sm"
							variant="outline-danger"
							onClick={() => handleDeleteEmployee(emp.employeeId)}
						    >
							Delete
						    </Button>
						    
						</div>
					    </Col>
					</Row>
				    </article>
				))}
			    </Stack>
			)}
		    </div>
		</section>
	    </Container>
	</main>
    );
}

