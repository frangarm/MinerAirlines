// @ts-nocheck
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Shared app container with consistent spacing.
 */
export function AppContainer({ className = '', centered = false, ...props }) {
  const containerClassName = [
    'app-shell-container',
    centered ? 'app-shell-container--centered' : '',
    className
  ].filter(Boolean).join(' ');

  return <Container className={containerClassName} {...props} />;
}

/**
 * Shared button with optional loading state.
 */
export function AppButton({
  loading = false,
  loadingText = 'Loading...',
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <Button
      className={cx('app-action-btn', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Shared toast container placement defaults.
 */
export function AppToastStack({ position = 'top-end', className = 'p-3', ...props }) {
  return <ToastContainer position={position} className={className} {...props} />;
}

/**
 * Shared toast with app-branded header/body styling.
 */
export function AppToast({
  title = 'Status',
  variant = 'success',
  show,
  onClose,
  delay = 3000,
  autohide = true,
  children,
  ...props
}) {
  return (
    <Toast
      bg={variant}
      show={show}
      onClose={onClose}
      delay={delay}
      autohide={autohide}
      className="app-toast"
      {...props}
    >
      <Toast.Header closeButton>
        <strong className="me-auto app-toast-title">{title}</strong>
      </Toast.Header>
      <Toast.Body className={variant === 'danger' ? 'text-white' : ''}>
        {children}
      </Toast.Body>
    </Toast>
  );
}

/**
 * Shared card wrapper.
 */
const AppCardBase = ({ className = '', ...props }) => (
  <Card className={cx('app-card-shell', className)} {...props} />
);

AppCardBase.Body = Card.Body;
AppCardBase.Header = Card.Header;
AppCardBase.Footer = Card.Footer;
AppCardBase.Title = Card.Title;
AppCardBase.Subtitle = Card.Subtitle;
AppCardBase.Text = Card.Text;

export const AppCard = AppCardBase;

/**
 * Shared alert wrapper.
 */
export function AppAlert({ className = '', ...props }) {
  return <Alert className={cx('app-alert-shell', className)} {...props} />;
}

/**
 * Shared badge wrapper.
 */
export function AppBadge({ className = '', ...props }) {
  return <Badge className={cx('app-badge-shell', className)} {...props} />;
}
