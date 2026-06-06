/**
 * Date / time formatting utilities for Commutable Companion
 *
 * All functions accept ISO-8601 date strings (as returned by Supabase)
 * and rely on `date-fns` for locale-aware formatting.
 */

import { formatDistanceToNow, format, isToday, isTomorrow, parseISO } from 'date-fns';

/** "2 hours ago", "in 3 days", etc. */
export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

/** "Today, 3:30 PM" / "Tomorrow, 8:00 AM" / "Jun 5, 9:15 AM" */
export function formatDepartureTime(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

/** "June 2, 2026" */
export function formatFullDate(dateString: string): string {
  return format(parseISO(dateString), 'MMMM d, yyyy');
}

/** "3:30 PM" */
export function formatTime(dateString: string): string {
  return format(parseISO(dateString), 'h:mm a');
}

/** Chat bubble timestamp — time only for today, otherwise "Jun 2, 3:30 PM" */
export function formatMessageTime(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return format(date, 'h:mm a');
  return format(date, 'MMM d, h:mm a');
}
