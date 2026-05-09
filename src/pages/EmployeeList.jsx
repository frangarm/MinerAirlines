// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { isCurrentUserAdmin } from '../controller/UserRoleFunctions';
import { deleteInsiderAccountRecordByType } from '../controller/DeleteFromFirebase';

const STAFF_COLLECTIONS = ['admin', 'pilot', 'attendant'];

function normalizeEmployeeRecord(docSnapshot, collectionName) {
	const data = docSnapshot.data() || {};
	return {
		firestoreDocId: docSnapshot.id,
		accountType: String(data.type || collectionName || '').toLowerCase(),
		firstName: String(data.firstName || '').trim(),
		lastName: String(data.lastName || '').trim(),
		email: String(data.email || '').trim(),
		authUid: String(data.authUid || docSnapshot.id || '').trim(),
		accountId: String(data.userId || data.authUid || docSnapshot.id || '').trim()
	};
}

function fullName(firstName, lastName) {
	return `${firstName} ${lastName}`.trim() || 'Unknown User';
}

export default function EmployeeList() {
	const navigate = useNavigate();
	const [checkingAccess, setCheckingAccess] = useState(true);
	const [loading, setLoading] = useState(true);
	const [accounts, setAccounts] = useState([]);
	const [status, setStatus] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [deletingDocId, setDeletingDocId] = useState('');
	const [pendingDeleteAccount, setPendingDeleteAccount] = useState(null);

	const sortedAccounts = useMemo(() => {
		return [...accounts].sort((a, b) => {
			const byType = a.accountType.localeCompare(b.accountType);
			if (byType !== 0) return byType;
			return fullName(a.firstName, a.lastName).localeCompare(fullName(b.firstName, b.lastName));
		});
	}, [accounts]);

	const loadAccounts = async () => {
		setLoading(true);
		setErrorMessage('');

		try {
			const snapshots = await Promise.all(
				STAFF_COLLECTIONS.map((collectionName) => getDocs(collection(db, collectionName)))
			);

			const mergedAccounts = snapshots.flatMap((snapshot, index) => {
				const collectionName = STAFF_COLLECTIONS[index];
				return snapshot.docs.map((docSnapshot) => normalizeEmployeeRecord(docSnapshot, collectionName));
			});

			setAccounts(mergedAccounts);
		} catch (error) {
			setErrorMessage(error?.message || 'Unable to load employee accounts.');
		} finally {
			setLoading(false);
		}
	};

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
				await loadAccounts();
			}
		};

		verifyAdminAccess().catch(() => {
			navigate('/login');
		});

		return () => {
			isMounted = false;
		};
	}, [navigate]);

	const handleDelete = async (account) => {
		setPendingDeleteAccount(account);
	};

	const confirmDelete = async () => {
		if (!pendingDeleteAccount) return;
		const account = pendingDeleteAccount;
		const accountName = fullName(account.firstName, account.lastName);
		setStatus('');
		setErrorMessage('');
		setDeletingDocId(account.firestoreDocId);

		try {
			await deleteInsiderAccountRecordByType(account.firestoreDocId, account.accountType, account.authUid);
			setAccounts((prevAccounts) => prevAccounts.filter((current) => current.firestoreDocId !== account.firestoreDocId));
			setStatus(`${accountName} account deleted.`);
		} catch (error) {
			setErrorMessage(error?.message || 'Unable to delete account.');
		} finally {
			setDeletingDocId('');
			setPendingDeleteAccount(null);
		}
	};

	if (checkingAccess) {
		return (
			<main className="app-site-main app-site-main--fluid">
				<div className="app-auth-card app-auth-card--wide">
					<p className="helper">Checking admin access...</p>
				</div>
			</main>
		);
	}

	return (
		<main className="app-site-main app-site-main--fluid">
			<div className="app-auth-card app-auth-card--wide" style={{ maxWidth: '1000px' }}>
				<h1>Employee Accounts</h1>
				<p>View and manage staff account records.</p>

				<div className="actions">
					<button
						type="button"
						className="button secondary"
						onClick={loadAccounts}
						disabled={loading}
					>
						{loading ? 'Refreshing...' : 'Refresh List'}
					</button>
					<button
						type="button"
						className="button"
						onClick={() => navigate('/create-employee')}
					>
						Create Employee
					</button>
				</div>

				{status && <p className="helper" style={{ color: '#166534', fontWeight: 600 }}>{status}</p>}
				{errorMessage && <p className="helper" style={{ color: '#b91c1c', fontWeight: 600 }}>{errorMessage}</p>}

				{loading ? (
					<p className="helper">Loading employee accounts...</p>
				) : sortedAccounts.length === 0 ? (
					<p className="helper">No employee accounts found.</p>
				) : (
					<div
						className="border-soft rounded-soft"
						style={{ overflowX: 'auto', marginTop: '18px', background: '#fff' }}
						role="region"
						aria-label="Employee accounts table"
					>
						<table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
							<thead>
								<tr style={{ background: '#edf2ff' }}>
									<th style={{ padding: '12px' }}>Name</th>
									<th style={{ padding: '12px' }}>Email</th>
									<th style={{ padding: '12px' }}>ID</th>
									<th style={{ padding: '12px' }}>Employee Type</th>
									<th style={{ padding: '12px' }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{sortedAccounts.map((account) => {
									const accountName = fullName(account.firstName, account.lastName);
									const isDeleting = deletingDocId === account.firestoreDocId;

									return (
										<tr key={`${account.accountType}-${account.firestoreDocId}`}>
											<td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', overflowWrap: 'anywhere' }}>{accountName}</td>
											<td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', overflowWrap: 'anywhere' }}>{account.email || 'N/A'}</td>
											<td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', overflowWrap: 'anywhere' }}>{account.accountId || account.firestoreDocId}</td>
											<td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', textTransform: 'capitalize', color: '#1e3a8a', fontWeight: 600, overflowWrap: 'anywhere' }}>{account.accountType}</td>
											<td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
												<button
													type="button"
													className="button"
													style={{ backgroundColor: '#dc2626', color: '#fff', margin: 0, padding: '10px 16px' }}
													onClick={() => handleDelete(account)}
													disabled={isDeleting}
												>
													{isDeleting ? 'Deleting...' : 'Delete Account'}
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
			{pendingDeleteAccount ? (
				<div
					className="position-fixed top-0 start-0 z-3 w-100 h-100 d-flex align-items-center justify-content-center p-3 bg-dark bg-opacity-50"
					onClick={(e) => {
						if (e.target === e.currentTarget) setPendingDeleteAccount(null);
					}}
				>
					<div className="app-auth-card app-auth-card--wide" style={{ maxWidth: '640px' }}>
						<h1 style={{ fontSize: '1.8rem' }}>Confirm Account Deletion</h1>
						<p>
							Delete {fullName(pendingDeleteAccount.firstName, pendingDeleteAccount.lastName)} ({pendingDeleteAccount.email || 'No email'})?
							 This will remove their Firestore account record.
						</p>
						<div className="actions">
							<button
								type="button"
								className="button secondary"
								onClick={() => setPendingDeleteAccount(null)}
								disabled={Boolean(deletingDocId)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="button"
								onClick={confirmDelete}
								disabled={Boolean(deletingDocId)}
							>
								{deletingDocId ? 'Deleting...' : 'Delete Account'}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
