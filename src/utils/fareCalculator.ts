/**
 * Fare calculation utility for Commutable Companion
 *
 * Produces a full breakdown: base fare + distance + time, split across
 * passengers, with a platform fee on top.
 */

import { BASE_FARE, COST_PER_KM, COST_PER_MIN, PLATFORM_FEE_RATE } from '@/lib/constants';

export interface FareBreakdown {
  baseFare: number;
  distanceCost: number;
  timeCost: number;
  subtotal: number;
  costPerSeat: number;
  platformFee: number;
  totalPerSeat: number;
}

/**
 * Calculate a fare breakdown for a given distance, duration and passenger count.
 *
 * @param distanceKm  - Total trip distance in kilometres
 * @param durationMin - Estimated trip duration in minutes
 * @param passengers  - Number of passengers sharing the fare (≥ 1)
 * @returns A full {@link FareBreakdown} object
 */
export function calculateFare(
  distanceKm: number,
  durationMin: number,
  passengers: number = 1,
): FareBreakdown {
  const baseFare = BASE_FARE;
  // Fare only increases if distance exceeds 5 kilometers
  const excessDistance = Math.max(0, distanceKm - 5);
  const distanceCost = Math.round(excessDistance * COST_PER_KM * 100) / 100;
  // No time cost is charged since fare only increases if distance > 5km
  const timeCost = 0;
  const subtotal = baseFare + distanceCost + timeCost;
  const costPerSeat = subtotal;
  // Passenger pays no platform fee
  const platformFee = 0;
  const totalPerSeat = Math.ceil(costPerSeat);

  return { baseFare, distanceCost, timeCost, subtotal, costPerSeat, platformFee, totalPerSeat };
}

export function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

/**
 * Calculate driver net payout and platform fee from the total fare collected.
 * The driver is charged 10% of the total fares they collected as a platform fee.
 */
export function getDriverPayout(totalFare: number): { netPayout: number; platformFee: number } {
  const platformFee = Math.round(totalFare * 0.10 * 100) / 100;
  const netPayout = Math.round((totalFare - platformFee) * 100) / 100;
  return { netPayout, platformFee };
}
