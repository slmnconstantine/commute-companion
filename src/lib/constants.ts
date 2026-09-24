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
/** Deprecated: Time cost is no longer applied to fare calculations */
export const COST_PER_MIN = 0;
/** 10 percent platform fee */
export const PLATFORM_FEE_RATE = 0.10;

// ---------------------------------------------------------------------------
// Map defaults (default Manila coordinates)
// ---------------------------------------------------------------------------

export const DEFAULT_LATITUDE = 14.5995;
export const DEFAULT_LONGITUDE = 120.9842;
export const DEFAULT_DELTA = 0.05;

// ---------------------------------------------------------------------------
// Map Styles (Free OpenFreeMap & OpenStreetMap, no API key required, no watermark)
// ---------------------------------------------------------------------------
export const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
export const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

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
export const HUB_POSTS_BUCKET = 'hub-post-images';

// ---------------------------------------------------------------------------
// Community Hub Reactions
// ---------------------------------------------------------------------------
export const HUB_REACTIONS = [
  { type: 'like', icon: 'heart', label: 'Like', color: '#EF4444' },
  { type: 'helpful', icon: 'thumbs-up', label: 'Helpful', color: '#10B981' },
  { type: 'warning', icon: 'alert-circle', label: 'Warning', color: '#F59E0B' },
  { type: 'confirm', icon: 'checkmark-circle', label: 'Confirm', color: '#3B82F6' },
  { type: 'sad', icon: 'sad', label: 'Sad', color: '#8B5CF6' },
] as const;

export type HubReactionType = typeof HUB_REACTIONS[number]['type'];

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Status enums (const tuples for type narrowing)
// ---------------------------------------------------------------------------

export const TRIP_STATUSES = ['open', 'full', 'ongoing', 'completed', 'cancelled'] as const;
export const BOOKING_STATUSES = ['pending', 'accepted', 'rejected', 'completed', 'cancelled', 'dropped_off_early'] as const;
