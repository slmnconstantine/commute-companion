# Commute Companion — Improvement Roadmap

> Generated: 2026-06-12
> Based on: Full codebase audit against 6-module spec

---

## Phase 1: Foundation & Trust (Weeks 1–3)
*Goal: Close the gaps that break user trust and platform integrity.*

### Module 1 — Auth & Verification
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| 1.1 | **Real verification pipeline** — Add `verification_status` field (`pending` / `approved` / `rejected`). Stop auto-approving on upload. Build admin review queue in the existing `admin/` panel. | 🔴 Critical | 3 days |
| 1.2 | **Email confirmation gate** — Check `email_confirmed_at` in AuthContext. Route unconfirmed users to a "check your email" screen before accessing the app. | 🔴 Critical | 0.5 days |
| 1.3 | **Vehicle type enforcement** — Add `vehicle_type` (`public` / `private`) to Vehicle. Gate ride creation on having ≥1 active vehicle. Wire type to fare logic. | 🟡 High | 1 day |
| 1.4 | **Session recovery audit** — Verify `onAuthStateChange` is wired. Test app kill & reopen flow. | 🟢 Medium | 0.5 days |

### Module 2 — Carpooling & Fare
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| 2.1 | **Fix fare calculator** — Implement actual per-commuter platform fee. Currently `platformFee = 0` and `timeCost = 0`. Decide on commission model (driver-side 10% exists in `getDriverPayout`; add commuter-side or keep single-sided). | 🔴 Critical | 1 day |
| 2.2 | **Trip completion handshake** — Add "Confirm Arrival" button for both driver and commuter. Trip → `completed` only when both confirm (or after 24h timeout). | 🟡 High | 1.5 days |
| 2.3 | **Push notifications for booking events** — Wire `sendPushNotification` to: booking accepted, booking rejected, trip starting, trip completed. | 🟡 High | 1 day |

---

## Phase 2: Core Experience Polish (Weeks 4–6)
*Goal: Make the ride-sharing loop smooth, reliable, and intuitive.*

### Module 4 — Location & Navigation
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| 4.1 | **Pickup/dropoff pin picker** — Add a map screen where commuters can tap to set exact pickup and dropoff points along/near the route. Store coordinates on the booking. | 🔴 Critical | 2 days |
| 4.2 | **ETA display** — Use routing service + driver live position to show estimated arrival time to pickup on the commuter's screen. | 🟡 High | 1.5 days |
| 4.3 | **Geofence notifications** — Notify commuter when driver is within 500m ("Your driver is almost here!"). Use distance polling in the existing location watcher. | 🟡 High | 1 day |
| 4.4 | **Bidirectional tracking** — Let drivers see commuter's location during active trip (helpful for pickup in crowded areas). | 🟢 Medium | 1 day |

### Module 5 — Chat System
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| 5.1 | **Push notifications for messages** — Fire `sendPushNotification` in `sendMessage()` for offline recipients (check `push_token`). | 🔴 Critical | 0.5 days |
| 5.2 | **Chat room creation reliability** — Make chat room creation part of booking acceptance, not a fragile side-effect. Add retry logic. | 🟡 High | 1 day |
| 5.3 | **Location sharing in chat** — Add a "📍 Share Location" button that sends a map preview message with coordinates. | 🟡 High | 1.5 days |
| 5.4 | **Read receipts** — Add `read_at` timestamp to messages. Show "✓✓ Seen" indicators. | 🟢 Medium | 1 day |

### Module 2 — Carpooling (continued)
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| 2.4 | **"Choose preferred driver" flow** — When a commuter posts a ride request, show matching trips from multiple drivers with a comparison card (rating, fare, ETA) and a "Choose This Driver" action. | 🟡 High | 2.5 days |
| 2.5 | **Review moderation** — Add "Report Review" action. Add basic profanity filter on review text. Consider driver response feature. | 🟢 Medium | 1.5 days |

---

## Phase 3: Community & Engagement (Weeks 7–9)
*Goal: Make the Hub useful and the app sticky.*

### Module 3 — Crowd-Sourced Hub
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| 3.1 | **Structured status tags** — Define fixed tag set with icons/colors: `traffic_heavy` 🚗, `delay_reported` ⏰, `route_clear` ✅, `capacity_full` 🚫, `accident` ⚠️, `weather_advisory` 🌧️. Make them selectable chips. | 🟡 High | 1.5 days |
| 3.2 | **Real-time hub feed** — Subscribe to `postgres_changes` on `hub_posts` for the active `route_hash`. Auto-insert new posts without pull-to-refresh. | 🟡 High | 1 day |
| 3.3 | **Post expiration** — Add `expires_at` field. Auto-archive time-sensitive posts after 24h. Filter expired posts from feed. | 🟡 High | 0.5 days |
| 3.4 | **Proximity-based grouping** — Use tolerance matching (±0.01° lat/lng) instead of exact `route_hash` to group similar routes into the same feed. | 🟢 Medium | 1.5 days |
| 3.5 | **Quick reactions** — Add "Is this still accurate?" 👍/👎 on traffic/delay posts to crowdsource reliability. | 🟢 Medium | 1 day |

### Module 1 — Auth (continued)
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| 1.5 | **Extended profile fields** — Add phone number, emergency contact, gender preference. Update sign-up flow and profile edit screen. | 🟢 Medium | 1 day |

---

## Phase 4: Voice Assistant Hardening (Weeks 10–11)
*Goal: Make the assistant reliable enough for daily use.*

### Module 6 — Voice Assistant
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| 6.1 | **"Set Route" voice command** — Add `SET_ROUTE` command type. Navigate to set-route screen with pre-filled origin/destination from voice input. | 🟡 High | 1 day |
| 6.2 | **Confidence scoring** — Edge Function returns confidence score. If < 0.7, ask a clarifying question instead of executing. | 🟡 High | 1 day |
| 6.3 | **Better confirmation NLU** — Send confirmation audio to Edge Function for proper NLU instead of client-side `includes('yes')` keyword matching. | 🟡 High | 0.5 days |
| 6.4 | **Error recovery** — On error state, show "Try again" button. Keep conversation context so user doesn't restart. | 🟢 Medium | 0.5 days |
| 6.5 | **Offline command fallback** — Basic on-device intent matching for common phrases ("go home", "show my rides") when Edge Function is unreachable. | 🟢 Medium | 2 days |
| 6.6 | **Wake word activation** — Integrate Porcupine or similar for "Hey Commute" hands-free trigger. | 🔵 Low | 3 days |

---

## Phase 5: Polish & Production Readiness (Weeks 12–14)
*Goal: Ship-quality app.*

### Cross-Cutting
| # | Improvement | Priority | Effort |
|---|------------|----------|--------|
| C.1 | **PayMongo live integration** — Wire real checkout sessions to booking flow. Charge on acceptance, hold, release on completion. Remove mock fallback for production. | 🟡 High | 3 days |
| C.2 | **Push notification audit** — Ensure all user-facing events trigger notifications: booking status, message received, verification result, trip starting, driver nearby, review received. | 🟡 High | 2 days |
| C.3 | **Accessibility pass** — Add `accessibilityLabel` to all interactive elements. Test with VoiceOver/TalkBack. Support dynamic font scaling. | 🟢 Medium | 3 days |
| C.4 | **Error handling standardization** — Replace generic `Alert.alert('Error')` with a consistent error UX component (toast + retry). Add Sentry or similar for crash reporting. | 🟢 Medium | 2 days |
| C.5 | **Offline support** — Cache recent trips, routes, and messages with AsyncStorage. Queue actions (book, message) for retry when back online. | 🔵 Low | 4 days |
| C.6 | **Unit tests** — Cover critical paths: fare calculator, booking flow, auth state, review submission. Target 80% coverage on services layer. | 🟢 Medium | 4 days |

---

## Summary Timeline

```
Weeks 1-3   ████████░░░░░░░░░░░░░░░░  Phase 1: Foundation & Trust
Weeks 4-6   ░░░░░░░░████████░░░░░░░░  Phase 2: Core Experience
Weeks 7-9   ░░░░░░░░░░░░░░░░████░░░░  Phase 3: Community & Engagement
Weeks 10-11 ░░░░░░░░░░░░░░░░░░░░██░░  Phase 4: Voice Assistant
Weeks 12-14 ░░░░░░░░░░░░░░░░░░░░░░██  Phase 5: Polish & Ship
```

## Dependency Graph

```
1.1 (Verification) ──→ 2.4 (Choose Driver) ──→ 3.1 (Status Tags)
       │                      │
       ▼                      ▼
1.2 (Email Gate)      4.1 (Pin Picker) ──→ 4.2 (ETA) ──→ 4.3 (Geofence)
                             │
                             ▼
                      5.2 (Chat Reliability) ──→ 5.3 (Location Share)
                             │
                             ▼
                      2.2 (Completion Handshake) ──→ C.1 (PayMongo)
```

## Quick Wins (< 1 day each, high impact)

1. **1.2** Email confirmation gate — 0.5 days
2. **5.1** Push notifications for messages — 0.5 days
3. **2.1** Fix fare calculator — 1 day
4. **3.3** Post expiration — 0.5 days
5. **6.3** Better confirmation NLU — 0.5 days
