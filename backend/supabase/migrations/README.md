# Supabase Database Migrations

This directory contains SQL migration scripts for the Commute Companion database schema, triggers, and Row Level Security (RLS) policies.

## Guidelines
- Keep migrations versioned chronologically: `YYYYMMDDHHMMSS_description.sql`
- Apply migrations using Supabase CLI:
  ```bash
  cd backend/supabase
  supabase db push
  ```
- Store initial baseline and subsequent table modifications here to ensure full version control.
