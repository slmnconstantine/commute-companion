/**
 * Commute Companion - Unified Domain Services Barrel
 *
 * Re-exports all domain services for clean, decoupled imports.
 */

// Ride & Fleet Services
export * from './ride/trips';
export * from './ride/bookings';
export * from './ride/vehicles';
export * from './ride/rideRequests';
export * from './ride/rideReminders';

// Location & Mapping Services
export * from './location/liveTracking';
export * from './location/backgroundLocation';
export * from './location/routing';
export * from './location/geocoding';

// Security & Verification Services
export * from './verification/liveFaceVerification';
export * from './verification/biometricVerification';
export * from './verification/documentQuality';

// Communication & Alerts
export * from './communication/chatRooms';
export * from './communication/messages';
export * from './communication/notifications';
export * from './communication/pushNotifications';

// Community & Moderation
export * from './community/hub';
export * from './community/hubPosts';
export * from './community/reports';
export * from './community/reviews';

// Payments
export * from './payments/paymongo';

// Core Platform & Auth
export * from './core/auth';
export * from './core/profiles';
export * from './core/storage';
export * from './core/admin';
export * from './core/jobs';
