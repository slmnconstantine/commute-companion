/**
 * Database types for Commutable Companion
 *
 * These interfaces mirror the Supabase table schemas exactly.
 * Joined / extended variants are provided for common query patterns.
 */

// ---------------------------------------------------------------------------
// Core tables
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  username?: string;
  full_name: string;
  role: 'driver' | 'commuter';
  is_verified: boolean;
  verified_badge: boolean;
  government_id_url: string | null;
  avatar_url: string | null;
  rating_avg: number | null;
  total_ratings: number;
  push_token?: string | null;
  platform_fee_balance?: number;
  created_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  plate_number: string;
  type: string;
  model: string;
  capacity: string;
  is_active: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  driver_id: string;
  vehicle_id: string;
  origin_lat: number;
  origin_lng: number;
  origin_label: string;
  destination_lat: number;
  destination_lng: number;
  destination_label: string;
  route_polyline: string | null;
  departure_time: string;
  available_seats: number;
  fare_per_seat: number;
  status: 'open' | 'full' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  commuter_id: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  fare_paid: number;
  platform_fee: number;
  created_at: string;
}

export interface Review {
  id: number;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface HubPost {
  id: string;
  author_id: string;
  route_hash: string;
  status_tag: string;
  message: string;
  location_lat: number;
  location_lng: number;
  location_label?: string | null;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  trip_id: string;
  type: string;
  created_at: string;
}

export interface ChatMember {
  chat_room_id: string;
  user_id: string;
}

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  is_alert: boolean;
  created_at: string;
}

export interface Route {
  id: string;
  user_id: string;
  label: string | null;
  origin_lat: number;
  origin_lng: number;
  origin_label: string;
  destination_lat: number;
  destination_lng: number;
  destination_label: string;
  route_hash: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Community {
  id: string;
  route_hash: string;
  name: string | null;
  member_count: number;
  created_at: string;
}

export interface Route {
  id: string;
  user_id: string;
  label: string | null;
  origin_lat: number;
  origin_lng: number;
  origin_label: string;
  destination_lat: number;
  destination_lng: number;
  destination_label: string;
  route_hash: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Community {
  id: string;
  route_hash: string;
  name: string | null;
  member_count: number;
  created_at: string;
}


// ---------------------------------------------------------------------------
// Joined / extended types (for common Supabase queries with selects)
// ---------------------------------------------------------------------------

export interface TripWithDriver extends Trip {
  driver: Profile;
  vehicle?: Vehicle;
  bookings?: (Booking & { reviews?: Review[] })[];
}

export interface BookingWithTrip extends Booking {
  trip: TripWithDriver;
  reviews?: Review[];
}

export interface BookingWithCommuter extends Booking {
  commuter: Profile;
}

export interface ReviewWithProfiles extends Review {
  reviewer: Profile;
  reviewee: Profile;
}

export interface HubPostWithAuthor extends HubPost {
  author: Profile;
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
}

export interface PostCommentWithAuthor extends PostComment {
  author: Profile;
}

export interface MessageWithSender extends Message {
  sender: Profile;
}
