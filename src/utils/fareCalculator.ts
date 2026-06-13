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
  // Calculate time cost based on durationMin * COST_PER_MIN
  const timeCost = Math.round(durationMin * COST_PER_MIN * 100) / 100;
  const subtotal = baseFare + distanceCost + timeCost;
  const costPerSeat = subtotal;
  // Calculate platform fee using PLATFORM_FEE_RATE
  const platformFee = Math.round(costPerSeat * PLATFORM_FEE_RATE * 100) / 100;
  const totalPerSeat = Math.ceil(costPerSeat + platformFee);

  return { baseFare, distanceCost, timeCost, subtotal, costPerSeat, platformFee, totalPerSeat };
}

export function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

/**
 * Calculate driver net payout and platform fee from the total fare collected.
 * The driver is charged 10% of the base fare as a platform fee, and the platform
 * also collects the 10% commuter platform fee. The combined platform fee is what
 * the driver owes to the platform (since they collect the total in cash).
 */
export function getDriverPayout(totalFare: number): { netPayout: number; platformFee: number } {
  // totalFare includes commuter platform fee (10% on top of base fare)
  const baseFare = Math.round((totalFare / (1 + PLATFORM_FEE_RATE)) * 100) / 100;
  const commuterFee = Math.round((totalFare - baseFare) * 100) / 100;
  const driverFee = Math.round(baseFare * PLATFORM_FEE_RATE * 100) / 100;
  
  const platformFee = Math.round((commuterFee + driverFee) * 100) / 100;
  const netPayout = Math.round((baseFare - driverFee) * 100) / 100;
  
  return { netPayout, platformFee };
}
