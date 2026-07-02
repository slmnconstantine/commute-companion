# Commute Companion

Commute Companion is a React Native mobile application built with Expo that assists users with their daily commutes. It features ride booking, real-time route tracking, a community hub for interactions, and integrated payment processing using PayMongo. The backend is powered by Supabase.

## Features

- **Ride Booking & Management:** Commuters can request rides and drivers can manage bookings.
- **Real-Time Tracking:** Integration with Mapbox/MapLibre for real-time location tracking and routing.
- **Voice Assistant:** Built-in voice commands to enhance the user experience while commuting.
- **Community Hub:** A space for commuters to interact, share updates, and communicate.
- **Seamless Payments:** Integrated PayMongo checkout for secure and easy fee payments.
- **Admin Dashboard:** A web-based admin portal to manage configurations.

## Project Structure

- **`/app` & `/src`**: Frontend React Native application (Expo Router).
- **`/backend/supabase`**: Backend Edge Functions and Database configuration powered by Supabase.
- **`/backend/admin`**: Node.js admin dashboard server.

## Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI
- Supabase CLI (optional, for local development)

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd commute-companion
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example` (if provided) and populate it with your Supabase and PayMongo keys:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   # Add your PayMongo API keys here
   ```

## Usage

### Running the Mobile App
Start the Expo development server:
```bash
npx expo start
```
You can then run the app on an Android emulator (`a`), iOS simulator (`i`), or scan the QR code using the Expo Go app on your physical device.

### Running the Admin Dashboard
To start the admin portal:
```bash
npm run admin
```
The server will run on `http://localhost:8080`.

## Recent Changes

- **Project Restructuring:** Separated backend components (Supabase & Admin) into a dedicated `/backend` directory, while keeping Expo frontend files securely configured at the root.
- **Cleanup:** Removed unused testing scripts and formatting utilities to streamline the repository.
- **PayMongo Integration:** Added checkout services for fee payments using PayMongo (`src/services/paymongo.ts`).

## License
MIT License
