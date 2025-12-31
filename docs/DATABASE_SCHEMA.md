# 🗄️ Database Schema

> **Complete PostgreSQL Schema for The Reading Room Engine**

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Database Triggers](#database-triggers)
4. [Stored Procedures](#stored-procedures)
5. [Row Level Security (RLS)](#row-level-security-rls)
6. [Indexes](#indexes)
7. [Seed Data](#seed-data)

---

## Schema Overview

### **Entity Relationship Diagram**

```
┌──────────────┐
│    users     │ (Supabase Auth - managed table)
│   (Auth)     │
└──────┬───────┘
       │ 1:1
       │
┌──────▼───────────────────────┐
│        profiles              │
│  • full_name                 │
│  • instagram_handle          │
│  • bio                       │
│  • reliability_score (hidden)│
│  • created_at                │
└──────┬───────────────────────┘
       │
       ├──────────────────┬───────────────────┬──────────────────┐
       │ 1:N              │ 1:N               │ 1:N              │ N:1
       │                  │                   │                  │
┌──────▼─────────┐ ┌──────▼────────┐ ┌───────▼──────┐  ┌────────▼─────┐
│ registrations  │ │ book_reviews  │ │event_feedback│  │  vip_list    │
│ • event_id ────┼─┤ • event_id ───┼─┤ • event_id   │  │  • added_by  │
│ • queue_pos    │ │ • title       │ │ • rating     │  │  • added_at  │
│ • status       │ │ • author      │ │ • is_featured│  └──────────────┘
│ • invited_at   │ │ • review      │ │ • comments   │
│ • expires_at   │ └───────────────┘ └──────────────┘
└────────┬───────┘
         │ N:1
         │
┌────────▼───────────────┐
│       events           │
│  • event_date (Sunday) │
│  • registration_opens  │
│  • venue (JSONB)       │
│  • city                │
│  • timezone            │
│  • status              │
│  • is_waterfall_active │
└────────────────────────┘
```

---

## Core Tables

### **1. users** (Managed by Supabase Auth)

```sql
-- This table is automatically managed by Supabase
-- We only reference it via foreign keys
-- Schema (simplified):
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT, -- NULL for magic link users
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **2. profiles**

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (length(full_name) >= 2),
  instagram_handle TEXT CHECK (instagram_handle ~ '^@?[A-Za-z0-9._]{1,30}$'),
  bio TEXT CHECK (length(bio) <= 500),
  reliability_score INTEGER DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  role TEXT DEFAULT 'reader' CHECK (role IN ('reader', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);

-- Trigger: Auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Field Descriptions:**

- `full_name`: User's display name (min 2 chars)
- `instagram_handle`: Optional social handle (with or without @)
- `bio`: Short description (max 500 chars, optional)
- `reliability_score`: Hidden metric (100 = perfect attendance, decreases with no-shows)
- `role`: Authorization level (`reader` or `admin`)

---

### **3. events**

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL CHECK (EXTRACT(DOW FROM event_date) = 0), -- Sunday only
  registration_opens_at TIMESTAMPTZ NOT NULL,
  venue JSONB NOT NULL CHECK (
    venue ? 'name' AND
    venue ? 'address' AND
    venue ? 'capacity'
  ),
  city TEXT DEFAULT 'Ahmedabad' NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'rolled_out', 'completed', 'cancelled')),
  is_waterfall_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one event per Sunday per city
  UNIQUE(event_date, city)
);

-- Indexes
CREATE INDEX idx_events_date ON events(event_date DESC);
CREATE INDEX idx_events_city_date ON events(city, event_date);
CREATE INDEX idx_events_status ON events(status) WHERE status IN ('open', 'rolled_out');

-- Trigger: Auto-update updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**JSONB Venue Structure:**

```json
{
  "name": "The Reading Lounge",
  "address": "123 Book Street, Ahmedabad, Gujarat 380001",
  "map_link": "https://maps.google.com/?q=23.0225,72.5714",
  "capacity": 100,
  "instructions": "Enter through the main gate"
}
```

**Event Status Lifecycle:**

1. `draft` → Admin creating event
2. `open` → Registration window active (Monday)
3. `rolled_out` → First 100 invitations sent
4. `completed` → Event finished (Monday after event)
5. `cancelled` → Event cancelled (kill switch used)

---

### **4. registrations** (The Core Queue Table)

```sql
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queue_position INTEGER NOT NULL,
  status TEXT DEFAULT 'WAITING' CHECK (
    status IN ('WAITING', 'INVITED', 'CONFIRMED', 'DECLINED', 'EXPIRED', 'ATTENDED')
  ),
  invited_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ CHECK (expires_at > invited_at),
  responded_at TIMESTAMPTZ,
  is_manual_override BOOLEAN DEFAULT false, -- Admin-added 101st+ person
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(event_id, user_id), -- One registration per user per event
  UNIQUE(event_id, queue_position), -- No duplicate queue positions

  -- Validation: expires_at must be set when INVITED
  CONSTRAINT invited_must_have_expiry CHECK (
    (status = 'INVITED' AND expires_at IS NOT NULL) OR
    (status != 'INVITED')
  )
);

-- Indexes
CREATE INDEX idx_registrations_queue ON registrations(event_id, status, queue_position)
  WHERE status = 'WAITING';

CREATE INDEX idx_registrations_expiry ON registrations(expires_at)
  WHERE status = 'INVITED';

CREATE INDEX idx_registrations_user ON registrations(user_id, created_at DESC);

CREATE INDEX idx_registrations_confirmed ON registrations(event_id, status)
  WHERE status IN ('CONFIRMED', 'ATTENDED');

-- Trigger: Auto-update updated_at
CREATE TRIGGER update_registrations_updated_at
BEFORE UPDATE ON registrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Status State Machine:**

```
WAITING → INVITED → { CONFIRMED → ATTENDED }
                 ↘  { DECLINED }
                 ↘  { EXPIRED }
```

**Field Descriptions:**

- `queue_position`: Event-scoped position (auto-assigned on insert)
- `invited_at`: When user was promoted to INVITED (timer start)
- `expires_at`: `invited_at + 24 hours` (deadline for YES/NO)
- `responded_at`: When user clicked YES or NO
- `is_manual_override`: True if admin manually added (doesn't count toward 100 limit)

---

### **5. book_reviews**

```sql
CREATE TABLE book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) >= 1),
  author TEXT NOT NULL CHECK (length(author) >= 1),
  review TEXT CHECK (length(review) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One review per user per event
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_book_reviews_event ON book_reviews(event_id, created_at DESC);
CREATE INDEX idx_book_reviews_user ON book_reviews(user_id, created_at DESC);

-- Full-text search (future feature)
CREATE INDEX idx_book_reviews_search ON book_reviews
  USING GIN (to_tsvector('english', title || ' ' || author || ' ' || COALESCE(review, '')));
```

**Example Data:**

```json
{
  "title": "Atomic Habits",
  "author": "James Clear",
  "review": "Life-changing book about building better habits through tiny changes..."
}
```

---

### **6. event_feedback**

```sql
CREATE TABLE event_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  experience_comments TEXT CHECK (length(experience_comments) <= 1000),
  is_featured BOOLEAN DEFAULT false, -- Admin can mark for portfolio display
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One feedback per user per event
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_event_feedback_event ON event_feedback(event_id, created_at DESC);
CREATE INDEX idx_event_feedback_featured ON event_feedback(is_featured, created_at DESC)
  WHERE is_featured = true;
```

**Field Descriptions:**

- `rating`: 1-5 stars (optional)
- `experience_comments`: Freeform feedback (private to admins unless `is_featured = true`)
- `is_featured`: Admin toggle to show on public portfolio

---

### **7. vip_list**

```sql
CREATE TABLE vip_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  added_by UUID REFERENCES auth.users(id), -- Which admin added them
  notes TEXT, -- Internal admin notes
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vip_list_user ON vip_list(user_id);
```

**Usage:**

- VIPs auto-promoted to INVITED when they register
- Bypass queue entirely
- Admin-managed via CRUD interface

---

## Database Triggers

### **1. Auto-Assign Queue Position**

```sql
CREATE OR REPLACE FUNCTION assign_queue_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate next position for this event
  NEW.queue_position := (
    SELECT COALESCE(MAX(queue_position), 0) + 1
    FROM registrations
    WHERE event_id = NEW.event_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_queue_position
BEFORE INSERT ON registrations
FOR EACH ROW
WHEN (NEW.queue_position IS NULL)
EXECUTE FUNCTION assign_queue_position();
```

---

### **2. Prevent Email Changes When Active**

```sql
CREATE OR REPLACE FUNCTION prevent_email_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if email is being changed
  IF OLD.email = NEW.email THEN
    RETURN NEW;
  END IF;

  -- Check if user has active invitation
  IF EXISTS (
    SELECT 1 FROM registrations
    WHERE user_id = NEW.id
      AND status IN ('INVITED', 'CONFIRMED')
  ) THEN
    RAISE EXCEPTION 'Cannot change email while you have an active invitation or confirmed attendance';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_email_update
BEFORE UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION prevent_email_change();
```

---

### **3. Auto-Update `updated_at` Column**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to profiles, events, registrations (see table definitions above)
```

---

### **4. VIP Auto-Promotion**

```sql
CREATE OR REPLACE FUNCTION auto_promote_vip()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is in VIP list
  IF EXISTS (SELECT 1 FROM vip_list WHERE user_id = NEW.user_id) THEN
    NEW.status := 'INVITED';
    NEW.invited_at := NOW();
    NEW.expires_at := NOW() + INTERVAL '24 hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promote_vip_on_registration
BEFORE INSERT ON registrations
FOR EACH ROW
EXECUTE FUNCTION auto_promote_vip();
```

---

## Stored Procedures

### **1. Promote Next User (Waterfall)**

```sql
CREATE OR REPLACE FUNCTION promote_next_user(p_event_id UUID)
RETURNS TABLE (
  r_user_id UUID,
  r_email TEXT,
  r_full_name TEXT,
  r_queue_position INTEGER
) AS $$
DECLARE
  v_registration RECORD;
BEGIN
  -- Lock next waiting user (prevents race conditions)
  SELECT
    r.id,
    r.user_id,
    r.queue_position,
    u.email,
    p.full_name
  INTO v_registration
  FROM registrations r
  JOIN auth.users u ON u.id = r.user_id
  JOIN profiles p ON p.id = r.user_id
  WHERE r.event_id = p_event_id
    AND r.status = 'WAITING'
  ORDER BY r.queue_position ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Critical for concurrency

  -- No one waiting
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Promote to INVITED
  UPDATE registrations
  SET
    status = 'INVITED',
    invited_at = NOW(),
    expires_at = NOW() + INTERVAL '24 hours',
    updated_at = NOW()
  WHERE id = v_registration.id;

  -- Return user details for notification
  RETURN QUERY SELECT
    v_registration.user_id,
    v_registration.email,
    v_registration.full_name,
    v_registration.queue_position;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**

```sql
-- Call from Edge Function
SELECT * FROM promote_next_user('event-uuid-here');
```

---

### **2. Batch Rollout (First 100)**

```sql
CREATE OR REPLACE FUNCTION batch_rollout(p_event_id UUID, p_batch_size INTEGER DEFAULT 100)
RETURNS TABLE (
  r_user_id UUID,
  r_email TEXT,
  r_full_name TEXT
) AS $$
BEGIN
  -- Update first N waiting users
  WITH promoted AS (
    UPDATE registrations r
    SET
      status = 'INVITED',
      invited_at = NOW(),
      expires_at = NOW() + INTERVAL '24 hours',
      updated_at = NOW()
    WHERE r.id IN (
      SELECT id FROM registrations
      WHERE event_id = p_event_id
        AND status = 'WAITING'
      ORDER BY queue_position ASC
      LIMIT p_batch_size
    )
    RETURNING r.user_id
  )
  -- Return user details for email sending
  RETURN QUERY
  SELECT
    p.user_id,
    u.email,
    pr.full_name
  FROM promoted p
  JOIN auth.users u ON u.id = p.user_id
  JOIN profiles pr ON pr.id = p.user_id;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**

```sql
-- Admin clicks "Roll Out"
SELECT * FROM batch_rollout('event-uuid-here', 100);
```

---

### **3. Get Event Statistics**

```sql
CREATE OR REPLACE FUNCTION get_event_stats(p_event_id UUID)
RETURNS TABLE (
  total_registered INTEGER,
  waiting_count INTEGER,
  invited_count INTEGER,
  confirmed_count INTEGER,
  declined_count INTEGER,
  expired_count INTEGER,
  attended_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_registered,
    COUNT(*) FILTER (WHERE status = 'WAITING')::INTEGER AS waiting_count,
    COUNT(*) FILTER (WHERE status = 'INVITED')::INTEGER AS invited_count,
    COUNT(*) FILTER (WHERE status = 'CONFIRMED')::INTEGER AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'DECLINED')::INTEGER AS declined_count,
    COUNT(*) FILTER (WHERE status = 'EXPIRED')::INTEGER AS expired_count,
    COUNT(*) FILTER (WHERE status = 'ATTENDED')::INTEGER AS attended_count
  FROM registrations
  WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Row Level Security (RLS)

### **Enable RLS on All Tables**

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_list ENABLE ROW LEVEL SECURITY;
```

---

### **Profiles Policies**

```sql
-- Users can read all profiles (public info)
CREATE POLICY "profiles_public_read"
ON profiles FOR SELECT
USING (true);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);
```

---

### **Events Policies**

```sql
-- Anyone can read events (for portfolio)
CREATE POLICY "events_public_read"
ON events FOR SELECT
USING (true);

-- Only admins can insert/update events
CREATE POLICY "events_admin_write"
ON events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

### **Registrations Policies**

```sql
-- Users can read their own registrations
CREATE POLICY "registrations_read_own"
ON registrations FOR SELECT
USING (auth.uid() = user_id);

-- Admins can read all registrations
CREATE POLICY "registrations_admin_read"
ON registrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Users can insert their own registration (via API with validation)
CREATE POLICY "registrations_insert_own"
ON registrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own registration (for YES/NO response)
CREATE POLICY "registrations_update_own"
ON registrations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  -- Only allow status changes to CONFIRMED or DECLINED
  status IN ('CONFIRMED', 'DECLINED', 'ATTENDED') OR
  -- Admins can change anything
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admins can update/delete any registration
CREATE POLICY "registrations_admin_write"
ON registrations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

### **Book Reviews Policies**

```sql
-- Anyone can read reviews (for public library)
CREATE POLICY "book_reviews_public_read"
ON book_reviews FOR SELECT
USING (true);

-- Users can insert their own review
CREATE POLICY "book_reviews_insert_own"
ON book_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own review
CREATE POLICY "book_reviews_update_own"
ON book_reviews FOR UPDATE
USING (auth.uid() = user_id);
```

---

### **Event Feedback Policies**

```sql
-- Only admins can read all feedback
CREATE POLICY "event_feedback_admin_read"
ON event_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Users can read their own feedback
CREATE POLICY "event_feedback_read_own"
ON event_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "event_feedback_insert_own"
ON event_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can mark feedback as featured
CREATE POLICY "event_feedback_admin_feature"
ON event_feedback FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

### **VIP List Policies**

```sql
-- Only admins can manage VIP list
CREATE POLICY "vip_list_admin_only"
ON vip_list FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## Indexes

### **Performance Optimization**

```sql
-- Fast event lookups
CREATE INDEX idx_events_upcoming ON events(event_date)
  WHERE status IN ('open', 'rolled_out') AND event_date >= CURRENT_DATE;

-- Waterfall query optimization
CREATE INDEX idx_registrations_waterfall ON registrations(event_id, queue_position)
  WHERE status = 'WAITING';

-- Admin dashboard queries
CREATE INDEX idx_registrations_event_status ON registrations(event_id, status, responded_at);

-- User history
CREATE INDEX idx_registrations_user_history ON registrations(user_id, created_at DESC);

-- Full-text search on profiles (future)
CREATE INDEX idx_profiles_search ON profiles
  USING GIN (to_tsvector('english', full_name || ' ' || COALESCE(bio, '')));
```

---

## Seed Data

### **Development Test Data**

```sql
-- Create test admin
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@readingroom.com', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'user1@example.com', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'user2@example.com', NOW());

INSERT INTO profiles (id, full_name, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Test Reader 1', 'reader'),
  ('00000000-0000-0000-0000-000000000003', 'Test Reader 2', 'reader');

-- Create test event
INSERT INTO events (id, event_date, registration_opens_at, venue, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '2025-01-05', -- Next Sunday
  '2024-12-30 09:00:00+05:30', -- Previous Monday
  '{"name": "The Reading Lounge", "address": "123 Book St, Ahmedabad", "capacity": 100, "map_link": "https://maps.google.com"}',
  'open'
);

-- Create test VIP
INSERT INTO vip_list (user_id, added_by)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
```

---

## Migration Script

### **Initial Setup (Production)**

```sql
-- Run this in order

-- 1. Create utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create tables (in dependency order)
\i 001_create_profiles.sql
\i 002_create_events.sql
\i 003_create_registrations.sql
\i 004_create_book_reviews.sql
\i 005_create_event_feedback.sql
\i 006_create_vip_list.sql

-- 3. Create triggers
\i 007_create_triggers.sql

-- 4. Create stored procedures
\i 008_create_procedures.sql

-- 5. Enable RLS
\i 009_enable_rls.sql

-- 6. Create indexes
\i 010_create_indexes.sql

-- 7. Seed initial data (optional)
\i 011_seed_data.sql
```

---

**Last Updated**: December 31, 2025  
**Schema Version**: 1.0  
**PostgreSQL Version**: 15+
