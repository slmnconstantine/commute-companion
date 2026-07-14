/**
 * App-wide constants for Commutable Companion
 */
// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

export const APP_NAME = 'Commute Companion';
export const APP_TAGLINE = 'Your Dynamic Ride-Sharing Platform';

// ---------------------------------------------------------------------------
// Fare calculation
// ---------------------------------------------------------------------------

/** 15 base fare */
export const BASE_FARE = 15;
/** 8 per kilometre */
export const COST_PER_KM = 8;
/** ₱2 per minute */
export const COST_PER_MIN = 2;
/** 10 percent platform fee */
export const PLATFORM_FEE_RATE = 0.10;

// ---------------------------------------------------------------------------
// Map defaults (default Manila coordinates)
// ---------------------------------------------------------------------------

export const DEFAULT_LATITUDE = 14.5995;
export const DEFAULT_LONGITUDE = 120.9842;
export const DEFAULT_DELTA = 0.05;

// ---------------------------------------------------------------------------
// API endpoints (free / open-source geocoding & routing)
// ---------------------------------------------------------------------------
export const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';
export const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
export const PHOTON_BASE_URL = 'https://photon.komoot.io/api';

// ---------------------------------------------------------------------------
// Supabase Storage buckets
// ---------------------------------------------------------------------------
export const AVATAR_BUCKET = 'avatars';
export const DOCUMENTS_BUCKET = 'documents';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Status enums (const tuples for type narrowing)
// ---------------------------------------------------------------------------

export const TRIP_STATUSES = ['open', 'full', 'ongoing', 'completed', 'cancelled'] as const;
export const BOOKING_STATUSES = ['pending', 'accepted', 'rejected', 'completed', 'dropped_off_early'] as const;
