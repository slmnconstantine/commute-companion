# 📖 Commute Companion — Complete User Flow Manual

A comprehensive step-by-step manual and operational guide for testing and demonstrating the **Commute Companion** mobile application, covering both **Commuter** and **Driver** journeys, real-time interactions, AI Voice features, and demo override shortcuts.

---

## 📱 Prerequisites & System Permissions

Before testing on physical Android/iOS devices or emulators, ensure the following permissions are allowed when prompted:
- **Location Permission (`Foreground`)**: Required for GPS positioning, map centering, and live location broadcasting.
- **Camera Permission**: Required for Government ID upload, profile verification, and **Live Face Capture**.
- **Microphone Permission**: Required for the **AI Voice Assistant** floating button.

---

## 🚶 Part 1: Commuter User Flow

### 1. Register Account
* **Navigation**: Welcome Screen → **"Get Started"** or **"Sign Up"**.
* **Action**: Fill out the registration form with Full Name, Email Address, 11-digit Phone Number, and Password (minimum 8 characters).
* Tap **"Create Account"**.

### 2. Verify Account in Email
* **Action**: Open email inbox and find the verification email from *Commute Companion* (Subject: *Confirm Your Signup*).
* Click the verification link **"Confirm your email"**. Return to the app.

### 3. Sign In
* **Navigation**: Welcome / Sign In Screen.
* **Action**: Enter registered email and password → Tap **"Sign In"**.
* The app loads directly onto the interactive Home Map centered on your current GPS location.

### 4. Set Commute Route
* **Navigation**: Home Screen bottom card → Tap blue **"Set Route"** pill (or go to `Rides` tab → tap *"Pin Route on Map"*).
* **Action**:
  1. Pin **Pickup / Origin** (e.g., *Sudlonon / San Remigio*).
  2. Pin **Drop-off / Destination** (e.g., *Bogo City Hall / Bogo*).
  3. Verify the connected road route polyline with estimated distance & time.
* Tap **"Save Commute Corridor"**.

### 5. Post in Community Hub (Voice AI)
* **Action**: Tap the **Floating Blue Mic FAB** at the bottom-right of the Home screen to open the Voice Assistant Sheet.
* Speak clearly:
  > *"Good morning, fellow commuters"*
  *(You can also type this text directly into the assistant's input field).*
* Review the assistant preview and tap **"Confirm"** (or say *"Yes"*).
* Switch to the **Hub** tab to view your live post in the Route Community feed.

### 6. Back to Home Page and Broadcast Location
* **Navigation**: Return to the **Home** (Map) tab.
* **Action**: On the right side of the map, tap the **Eye icon button** (`routeVisible` toggle).
  * When active (highlighted blue), your device actively broadcasts your live GPS position (`latitude`, `longitude`, `heading`) to other commuters along the corridor via Supabase Realtime presence.
  * Your avatar marker appears on the map for nearby commuters.

### 7. Mention a User in Community Hub
* **Navigation**: Tap the **Hub** tab on the bottom bar.
* **Action**:
  1. Locate any post authored by another user.
  2. Tap their **Avatar** or name to open the **Profile Card Modal**.
  3. Tap **"Mention in Community Hub"** (this auto-fills `@UserHandle` in the composer).
  4. Type your message (e.g., `@Juan Are you heading to Bogo this afternoon?`) → Tap **"Post"**.
  5. The mentioned user instantly receives an in-app notification: *"You were mentioned in Hub 💬"*.

### 8. Verify Account in Profile (With Demo Override)
* **Navigation**: **Profile** tab → Tap the **"Identity Verification"** tile (or shield banner).
* **Action**:
  * *Standard*: Take a live selfie and upload Government ID.
  * *⚡ Demo Instant Override*: Scroll to the bottom and tap **"Demo: Instantly Verify Me (Override) ⚡"**.
* Your account is immediately granted the green verified checkmark badge.

### 9. Post a Ride Request in Rides Tab
* **Navigation**: **Rides** tab → **"Search Rides"** segment.
* **Action**: With your active route set, tap **"Post 'Looking for a Ride' Request"** (megaphone icon).
* Specify:
  * Number of seats needed (e.g., `1 Seat`).
  * Target departure date & time.
  * Optional commuter notes → Tap **"Submit Request"**.

### 10. Book the Requested Ride with Live Face Capture
* **Navigation**: Browse available rides in the **Rides** tab → Tap an open ride matching your route.
* **Action**:
  1. Tap **"Request to Join Ride"** / **"Book This Ride"**.
  2. In the **Live Face Capture** modal, position your face in the camera oval and tap **"Take Live Photo"**.
  3. Confirm the capture → Tap **"Confirm & Request Booking"**.

### 11. Send Messages in Ride Group Chat
* **Navigation**: Inside the Trip screen (`/ride/[id]`), tap **"Open Trip Chat"** (chat bubble icon).
* **Action**: Send real-time coordination messages:
  > *"Hi driver, I'm waiting at the corner in a blue jacket."*
* Messages synchronize instantly across all accepted passengers and the driver.

### 12. Leave a Rating for Driver
* **Action**: After the driver completes the trip, the **Rate Your Trip** modal opens.
* Select a star rating (1–5 stars), select compliment tags (*Punctual*, *Safe Driver*, *Clean Vehicle*), and tap **"Submit Rating"**.

### 13. View Activity Tab to Check Past Rides
* **Navigation**: Tap the **Activity** tab in the bottom navigation.
* **Action**: Review past completed rides, dates, fares paid, and tap any past ride card to inspect the complete **Trip Summary** breakdown.

### 14. Explore Profile Screen
* **Navigation**: Tap the **Profile** tab.
* **Action**:
  * Check your commuter rating, verification status, and emergency contacts.
  * Toggle **Dark Mode / Light Mode**.
  * Explore Settings (Notifications, Terms & Privacy, Bug Reporting).

### 15. Logout
* **Navigation**: Scroll to the bottom of the **Profile** tab.
* **Action**: Tap **"Sign Out"** → Confirm **"Log Out"** in the dialog.

---

## 🚗 Part 2: Driver User Flow

### 1. Register Account
* **Navigation**: Welcome Screen → **"Get Started"** / **"Sign Up"**.
* **Action**: Fill in Driver Name, Email, Phone Number, Password → Tap **"Create Account"**.

### 2. Verify Account in Email
* **Action**: Open driver email inbox → Click **"Confirm your email"**. Return to app.

### 3. Sign In
* **Navigation**: Sign In screen.
* **Action**: Enter driver credentials → Tap **"Sign In"** to access the Home map.

### 4. Set Commute Route
* **Navigation**: Home Screen → Tap **"Set Route"** on the bottom card.
* **Action**: Pin the driver's regular corridor (e.g., *Sudlonon → Bogo City Hall*) → Tap **"Save Commute Corridor"**.

### 5. Post in Community Hub (Voice AI)
* **Action**: Tap the **Floating Blue Mic FAB** on the Home screen.
* Speak clearly:
  > *"How is the road today?"*
* The assistant automatically tags the post under `traffic` / road condition.
* Review preview → Tap **"Confirm"**. Check the post under the **Hub** tab.

### 6. Become a Driver (With Demo Override)
* **Navigation**: **Profile** tab → Tap **"Become a Driver"**.
* **Action**:
  * *Standard*: Upload driver's license, OR/CR, and vehicle plate.
  * *⚡ Demo Instant Override*: Tap **"Override Verification (Demo)"** at the bottom of the form.
  * Select vehicle type:
    * **Tricycle (TODA)** (Capacity: 3)
    * **Sedan (Private)** (Capacity: 4)
    * **Motorcycle** (Capacity: 1)
* Your account role is instantly upgraded to `driver` with full verification status.

### 7. Offer Ride to Commuter Request with Live Face Capture
* **Navigation**: **Rides** tab → Switch to **"Post a Ride"** segment.
* **Action**:
  1. Set origin, destination, departure time, and fare contribution.
  2. Under **Live Face Verification**, tap **"Capture Live Verification Photo"**.
  3. Align face and snap live photo.
  4. Tap **"Create & Offer Trip"**. The trip is published to the network.

### 8. Send Messages in Ride Group Chat
* **Navigation**: Open the created trip → Tap **"Trip Chat"**.
* **Action**: Send coordination messages to incoming passengers:
  > *"Leaving in 10 minutes from the town terminal."*

### 9. Start the Ride
* **Navigation**: Trip management screen (`/ride/[id]`).
* **Action**:
  1. Review commuter requests in the **DriverBookingsList** and tap **"Accept"**.
  2. Tap the green **"Start Trip"** button.
  3. Live background GPS tracking begins broadcasting your vehicle marker along the route polyline in real time.
  4. The full-width **"Active Trip in Progress"** banner appears on Home.

### 10. Complete Ride
* **Navigation**: Inside the ongoing trip screen.
* **Action**: Tap **"Complete Trip"** upon arrival → Confirm completion.
  * Passenger drop-offs are confirmed.
  * Net driver earnings are credited and 10% platform fee is added to your balance.

### 11. View Activity Tab to Check Past Rides
* **Navigation**: Tap the **Activity** tab.
* **Action**: Check total driver revenue, completed trip counts, and recent trip receipts.

### 12. Simulate Payment of Platform Fees
* **Navigation**: **Profile** tab → Locate the **"Outstanding Platform Fees"** card.
* **Action**:
  1. Tap the **"Pay"** button next to the balance (e.g., `₱15.00`).
  2. On the **Pay Platform Fee** screen, tap **"Pay Full Balance"**.
  3. Tap **"Authorize Simulated Test Payment"** (built-in simulator).
  4. The simulator animates the transaction and updates Supabase. Your balance resets to `₱0.00`.

### 13. Explore Profile Screen
* **Navigation**: **Profile** tab.
* **Action**:
  * Inspect **My Vehicle** specs and plate details.
  * Check **Driver Rating & Badges**.
  * View **Transaction Summary**.
  * Toggle Theme (Dark/Light).

### 14. Logout
* **Navigation**: Scroll to the bottom of the **Profile** tab.
* **Action**: Tap **"Sign Out"** → Confirm **"Log Out"**.

---

## ⚡ Quick Reference: Demo Shortcuts

| Action | How to Trigger | Result |
| :--- | :--- | :--- |
| **Instant Commuter Verification** | `Profile` → `Identity Verification` → Tap **"Demo: Instantly Verify Me (Override) ⚡"** | Bypasses manual document review; sets verified badge. |
| **Instant Driver Setup** | `Profile` → `Become a Driver` → Tap **"Override Verification (Demo)"** | Select Tricycle / Sedan / Motorcycle; registers vehicle and enables driver status. |
| **Simulate Platform Fee Payment** | `Profile` → `Outstanding Platform Fees` → `Pay` → **"Authorize Simulated Test Payment"** | Deducts platform fee balance in database without real payment method. |
| **Voice AI Post to Hub** | Tap **Floating Blue Mic FAB** → Speak phrase → Tap **"Confirm"** | Posts directly to Route Community Hub. |
| **Broadcast Presence** | `Home` → Tap the **Eye icon FAB** on the right edge of the map | Broadcasts your live coordinates to all users along the corridor. |
