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
  const distanceCost = Math.round(distanceKm * COST_PER_KM * 100) / 100;
  const timeCost = Math.round(durationMin * COST_PER_MIN * 100) / 100;
  const subtotal = baseFare + distanceCost + timeCost;
  const costPerSeat = Math.round((subtotal / Math.max(passengers, 1)) * 100) / 100;
  const platformFee = Math.round(costPerSeat * PLATFORM_FEE_RATE * 100) / 100;
  const totalPerSeat = Math.ceil(costPerSeat + platformFee);

  return { baseFare, distanceCost, timeCost, subtotal, costPerSeat, platformFee, totalPerSeat };
}

/**
 * Format a numeric amount as a Philippine Peso string (e.g. `₱123.00`).
 */
export function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}
