export type StatusTag = 'traffic' | 'tip' | 'alert' | 'question' | 'delay' | 'full' | 'clear' | 'other';

export const VALID_STATUS_TAGS: StatusTag[] = ['traffic', 'tip', 'alert', 'question', 'delay', 'full', 'clear', 'other'];

export const STATUS_TAG_LABELS: Record<StatusTag, string> = {
  traffic: 'Traffic',
  tip: 'Tip',
  alert: 'Alert',
  question: 'Question',
  delay: 'Delay',
  full: 'Full',
  clear: 'Clear',
  other: 'Other',
};

/**
 * Infer or normalize a status tag given an optional explicit tag string and/or post message content.
 */
export function resolveStatusTag(explicitTag?: string | null, message?: string | null): StatusTag {
  if (explicitTag) {
    const cleanTag = explicitTag.toLowerCase().trim() as StatusTag;
    if (VALID_STATUS_TAGS.includes(cleanTag)) {
      return cleanTag;
    }
  }

  if (!message) return 'other';

  const text = message.toLowerCase().trim();

  // 1. Question matching (ends with ? or starts with question words, or contains question keywords)
  if (text.endsWith('?') || /^(is|are|how|where|when|why|what|can|does|has|anyone)\b/i.test(text) || /\b(question|ask|asking|inquire)\b/i.test(text)) {
    return 'question';
  }

  // 2. Alert / Danger / Warning / Police / Flood / Hazard / Accident
  if (/\b(alert|warning|danger|hazard|police|checkpoint|flood|flooded|accident|crash|collision|breakdown|stalled|fire|emergency)\b/i.test(text)) {
    return 'alert';
  }

  // 3. Traffic / Congestion / Heavy / Bumper to bumper / Gridlock / Roadwork
  if (/\b(traffic|congestion|heavy traffic|bumper to bumper|jam|gridlock|slow|slow-moving|roadwork|construction)\b/i.test(text)) {
    return 'traffic';
  }

  // 4. Delay / Standstill / Late
  if (/\b(delay|delayed|standstill|stuck|late|not moving)\b/i.test(text)) {
    return 'delay';
  }

  // 5. Full / Line / Queue / No seats / Packed
  if (/\b(full|packed|crowded|long line|long queue|no seats|queue|sro)\b/i.test(text)) {
    return 'full';
  }

  // 6. Clear / Smooth / Fast / No traffic
  if (/\b(clear|smooth|fast|no traffic|light traffic|moving fast|all clear)\b/i.test(text)) {
    return 'clear';
  }

  // 7. Tip / Advice / Shortcut / Recommendation
  if (/\b(tip|advice|shortcut|reroute|re-route|recommend|recommendation|heads up|take|try using)\b/i.test(text)) {
    return 'tip';
  }

  return 'other';
}

export function getStatusTagLabel(tag: StatusTag): string {
  return STATUS_TAG_LABELS[tag] || 'Update';
}
