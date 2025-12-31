# 🏛️ System Architecture

> **The Reading Room Engine: Technical Deep Dive**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [The Waterfall Engine](#the-waterfall-engine)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Security Architecture](#security-architecture)
6. [State Machine](#state-machine)
7. [Scalability Considerations](#scalability-considerations)

---

## System Overview

The Reading Room Engine is built on a **Three-Tier Architecture** with autonomous automation:

```
┌──────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                      │
│  Next.js 14 App Router (React Server Components)        │
│  • Public Portfolio (SSR)                                │
│  • Reader Portal (CSR + Server Actions)                  │
│  • Admin Dashboard (Protected Routes)                    │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ HTTP/REST + WebSocket (Realtime)
                   │
┌──────────────────▼───────────────────────────────────────┐
│                   APPLICATION LAYER                       │
│  Supabase Backend + Edge Functions                       │
│  • Authentication (Magic Link + Password)                │
│  • Authorization (Row Level Security)                    │
│  • Business Logic (Edge Functions)                       │
│  • Waterfall Orchestration                              │
└──────────────────┬───────────────────────────────────────┘
                   │
                   │ PostgreSQL Wire Protocol
                   │
┌──────────────────▼───────────────────────────────────────┐
│                     DATA LAYER                            │
│  PostgreSQL 15+ with Extensions                          │
│  • Transactional Integrity (ACID)                        │
│  • Database Triggers (Auto-assignment)                   │
│  • Constraints (Email Lock, Uniqueness)                  │
│  • Audit Logs (Admin Actions)                           │
└──────────────────────────────────────────────────────────┘
```

---

## Architecture Layers

### 1. Presentation Layer

**Technology**: Next.js 14 App Router with React Server Components

#### **Route Structure**

```typescript
app/
├── (public)/           // Unauthenticated routes (SSR)
│   ├── page.tsx        // Portfolio homepage
│   ├── story/          // About the community
│   ├── library/        // Live book showcase (Sunday only)
│   └── contact/        // Contact form
│
├── (auth)/             // Protected routes (CSR + SSR hybrid)
│   ├── admin/
│   │   ├── dashboard/  // Event overview
│   │   ├── events/
│   │   │   ├── [id]/   // Attendee list + controls
│   │   │   └── new/    // Create event form
│   │   └── vips/       // VIP management CRUD
│   │
│   └── reader/
│       ├── dashboard/  // Queue status + invitation panel
│       ├── profile/    // Edit profile (email lock aware)
│       └── feedback/   // Post-event form
│
└── api/                // Server-side endpoints
    ├── auth/
    │   ├── login/      // Send magic link
    │   └── verify/     // Validate token
    ├── events/
    │   ├── register/   // Join queue (rate-limited)
    │   └── respond/    // YES/NO decision
    └── admin/
        ├── rollout/    // Trigger waterfall
        └── kill-switch/ // Pause automation
```

#### **Component Hierarchy**

```
Page Components (app/)
  │
  ├─→ Layout Components
  │     └─→ Navbar, Footer
  │
  ├─→ Feature Components (components/)
  │     ├─→ admin/
  │     │     ├─→ EventForm (venue input)
  │     │     ├─→ AttendeeList (100-person table)
  │     │     └─→ VIPManager (add/remove)
  │     │
  │     ├─→ reader/
  │     │     ├─→ StatusCard (queue position display)
  │     │     ├─→ InvitationPanel (YES/NO buttons)
  │     │     └─→ CountdownTimer (24-hour visual)
  │     │
  │     └─→ portfolio/
  │           ├─→ Hero (landing section)
  │           ├─→ DynamicCTA (context-aware button)
  │           └─→ BookShowcase (featured reviews)
  │
  └─→ Utility Components (components/shared/)
        ├─→ Button, Input, Modal
        └─→ LoadingSpinner, ErrorBoundary
```

#### **Data Fetching Strategy**

```typescript
// Server Components (Default)
async function EventPage({ params }: { params: { id: string } }) {
  const event = await getEventServer(params.id); // Direct DB query
  return <EventDetails event={event} />;
}

// Client Components (Realtime Updates)
'use client';
function QueueStatus() {
  const { data } = useQuery({
    queryKey: ['queue-position'],
    queryFn: getQueuePosition,
    refetchInterval: 10000 // Poll every 10s
  });

  useEffect(() => {
    // Subscribe to realtime changes
    const channel = supabase
      .channel('registrations')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'registrations'
      }, handleUpdate)
      .subscribe();

    return () => channel.unsubscribe();
  }, []);
}
```

---

### 2. Application Layer

**Technology**: Supabase (PostgreSQL + Edge Functions + Auth)

#### **Authentication Flow**

##### **Magic Link (Readers)**

```
1. User enters email → POST /api/auth/login
2. Server generates JWT token → stores in DB
3. Email sent via Resend with verification link
4. User clicks link → GET /api/auth/verify?token=...
5. Server validates token → creates session (httpOnly cookie)
6. Redirect to /reader/dashboard
```

##### **Password (Admins)**

```
1. User enters email + password → POST /api/auth/admin-login
2. Supabase validates credentials
3. Server checks role = 'admin' in profiles table
4. Session created → Redirect to /admin/dashboard
```

#### **Authorization (Row Level Security)**

```sql
-- Readers can only see their own registrations
CREATE POLICY "users_read_own_registrations"
ON registrations FOR SELECT
USING (auth.uid() = user_id);

-- Admins can see all registrations
CREATE POLICY "admins_read_all_registrations"
ON registrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users cannot update email if invited/confirmed
CREATE POLICY "prevent_email_change_when_active"
ON auth.users FOR UPDATE
USING (
  NOT EXISTS (
    SELECT 1 FROM registrations
    WHERE user_id = auth.uid()
    AND status IN ('INVITED', 'CONFIRMED')
  )
);
```

#### **Edge Functions Architecture**

```typescript
// supabase/functions/waterfall/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const { eventId, triggeredBy } = await req.json();

  // 1. Check if waterfall is active
  const { data: event } = await supabase
    .from('events')
    .select('is_waterfall_active, venue')
    .eq('id', eventId)
    .single();

  if (!event.is_waterfall_active) {
    return new Response('Waterfall paused', { status: 200 });
  }

  // 2. Find next waiting user (atomic transaction)
  const { data: nextUser } = await supabase.rpc('promote_next_user', {
    event_id: eventId
  });

  if (!nextUser) {
    return new Response('Queue empty', { status: 200 });
  }

  // 3. Send notification
  await fetch(`${RESEND_API_URL}/emails`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'The Reading Room <noreply@readingroom.com>',
      to: nextUser.email,
      subject: 'You've Been Invited! 🎉',
      html: generateInviteEmail(nextUser, event.venue)
    })
  });

  return new Response('Promotion successful', { status: 200 });
});
```

##### **Stored Procedure (Atomic Promotion)**

```sql
CREATE OR REPLACE FUNCTION promote_next_user(event_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT
) AS $$
DECLARE
  next_registration RECORD;
BEGIN
  -- Lock the next waiting registration (FOR UPDATE prevents race conditions)
  SELECT r.id, r.user_id, p.email, p.full_name
  INTO next_registration
  FROM registrations r
  JOIN profiles p ON p.id = r.user_id
  WHERE r.event_id = promote_next_user.event_id
    AND r.status = 'WAITING'
  ORDER BY r.queue_position ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Skip if another transaction is processing

  IF NOT FOUND THEN
    RETURN; -- No one in queue
  END IF;

  -- Update status atomically
  UPDATE registrations
  SET
    status = 'INVITED',
    invited_at = NOW(),
    expires_at = NOW() + INTERVAL '24 hours'
  WHERE id = next_registration.id;

  RETURN QUERY SELECT
    next_registration.user_id,
    next_registration.email,
    next_registration.full_name;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. Data Layer

**Technology**: PostgreSQL 15+ (Supabase Managed)

#### **Core Tables** (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for full SQL)

```
users (Supabase Auth)
  ↓
profiles (1:1 with users)
  ├─→ registrations (1:N - user's event history)
  ├─→ book_reviews (1:N - submitted reads)
  └─→ event_feedback (1:N - ratings)

events (Weekly sessions)
  ├─→ registrations (1:N - participants)
  ├─→ book_reviews (1:N - books read at this event)
  └─→ event_feedback (1:N - feedback for this event)

vip_list (Global allowlist)
  └─→ profiles (N:1 - which users are VIPs)
```

#### **Critical Indexes**

```sql
-- Fast queue lookups
CREATE INDEX idx_registrations_queue
ON registrations(event_id, status, queue_position)
WHERE status = 'WAITING';

-- Expiry cron job optimization
CREATE INDEX idx_registrations_expiry
ON registrations(expires_at)
WHERE status = 'INVITED';

-- VIP checks
CREATE INDEX idx_vip_list_user
ON vip_list(user_id);

-- Admin dashboard queries
CREATE INDEX idx_registrations_confirmed
ON registrations(event_id, status)
WHERE status = 'CONFIRMED';
```

---

## The Waterfall Engine

### **Core Concept**

The Waterfall is a **self-healing queue promotion system** that runs autonomously.

#### **Trigger Conditions**

1. User clicks "Decline" → `status = 'DECLINED'`
2. 24-hour timer expires → Cron job marks `status = 'EXPIRED'`
3. Admin manually removes user → Direct status change

#### **Execution Flow**

```
┌─────────────────┐
│  TRIGGER EVENT  │ (Decline / Expire / Admin Remove)
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ Check is_waterfall_active │ (Event kill switch)
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Query: Find next WAITING │ (ORDER BY queue_position ASC LIMIT 1)
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Atomic Update (FOR UPDATE)│ (PostgreSQL transaction lock)
│ • status = 'INVITED'      │
│ • invited_at = NOW()      │
│ • expires_at = NOW() + 24h│
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Send Email Notification  │ (Via Resend API)
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Schedule Reminder Email  │ (23.5 hours later)
└──────────────────────────┘
```

#### **Race Condition Prevention**

**Scenario**: 3 users decline simultaneously at 11:58 PM.

**Without Protection**:

```
Thread A: Finds User #101
Thread B: Finds User #101 (duplicate!)
Thread C: Finds User #101 (duplicate!)
→ Result: User #101 gets 3 emails, positions #102-103 skipped
```

**With `FOR UPDATE SKIP LOCKED`**:

```
Thread A: Locks User #101 → Promotes to INVITED
Thread B: Skips #101 (locked), finds #102 → Promotes
Thread C: Skips #101-102 (locked), finds #103 → Promotes
→ Result: Sequential promotion, no duplicates
```

#### **Cron Job: Expire Old Invitations**

```sql
-- Runs every 10 minutes via Supabase Cron
SELECT cron.schedule(
  'expire-old-invitations',
  '*/10 * * * *', -- Every 10 minutes
  $$
  UPDATE registrations
  SET status = 'EXPIRED'
  WHERE status = 'INVITED'
    AND expires_at < NOW()
  RETURNING event_id;
  $$
);

-- Trigger waterfall for affected events (via webhook)
```

---

## Data Flow Diagrams

### **Monday Registration Flow**

```
User (Browser)
  │
  │ 1. Clicks "Register" button
  │
  ▼
Next.js Middleware
  │
  │ 2. Check: Is it Monday 9 AM - 11:59 PM IST?
  │    ├─ NO → Return 403 "Registration closed"
  │    └─ YES → Continue
  │
  ▼
API Route (/api/events/register)
  │
  │ 3. Validate session + CSRF token
  │ 4. Check: User already registered for this event?
  │    ├─ YES → Return 409 "Already registered"
  │    └─ NO → Continue
  │
  ▼
Supabase (PostgreSQL)
  │
  │ 5. INSERT INTO registrations
  │    • event_id = current_event
  │    • user_id = session.user.id
  │    • status = 'WAITING' (default)
  │
  │ 6. Database Trigger: assign_queue_position()
  │    • Calculates MAX(queue_position) + 1
  │    • Assigns to new registration
  │
  │ 7. Check: Is user in vip_list?
  │    ├─ YES → UPDATE status = 'INVITED', call waterfall
  │    └─ NO → Keep as 'WAITING'
  │
  ▼
Response to User
  │
  │ 8. Return { queue_position, status, message }
  │
  ▼
User sees: "You're registered! Position: #387"
```

### **Admin Rollout Flow**

```
Admin clicks "Roll Out" button
  │
  ▼
POST /api/admin/rollout
  │
  │ 1. Verify admin role via RLS
  │ 2. Disable button (prevent double-click)
  │
  ▼
Edge Function: batch_promote
  │
  │ 3. SELECT first 100 WAITING users
  │    WHERE status = 'WAITING'
  │    ORDER BY queue_position ASC
  │    LIMIT 100
  │
  │ 4. Batch UPDATE:
  │    • status = 'INVITED'
  │    • invited_at = NOW()
  │    • expires_at = NOW() + 24h
  │
  │ 5. Queue 100 emails via job queue
  │
  ▼
Response: "100 invitations sent"
  │
  ▼
Email Service (Resend)
  │
  │ Sends 100 emails in parallel batches
  │ Each email contains:
  │   • Venue details
  │   • YES/NO magic links
  │   • Expiry countdown
  │
  ▼
Users receive invitations
```

### **User Response Flow (YES/NO)**

```
User clicks YES button in email
  │
  │ (Magic link: /api/events/respond?token=xyz&decision=yes)
  │
  ▼
API Route: /api/events/respond
  │
  │ 1. Validate JWT token
  │ 2. Extract: user_id, event_id, expires_at
  │ 3. Check: Has invitation expired?
  │    ├─ YES → Return "Invitation expired"
  │    └─ NO → Continue
  │
  ▼
Database Transaction
  │
  │ 4. UPDATE registrations
  │    SET status = 'CONFIRMED',
  │        responded_at = NOW()
  │    WHERE id = registration_id
  │      AND status = 'INVITED' -- Prevent double-confirm
  │
  │ 5. Send confirmation email
  │
  ▼
Redirect: /reader/dashboard
  │
  ▼
User sees: "You're confirmed! See you Sunday 🎉"
```

**If User Clicks NO:**

```
User clicks NO button
  │
  ▼
Same validation steps
  │
  ▼
UPDATE status = 'DECLINED'
  │
  ▼
Trigger Waterfall Edge Function
  │
  │ Promotes next WAITING user
  │
  ▼
User sees: "We'll miss you! Join us next time"
```

---

## Security Architecture

### **Threat Model**

| Threat                   | Mitigation                                            |
| ------------------------ | ----------------------------------------------------- |
| **Account Takeover**     | Magic links expire in 15 minutes, HTTPS-only cookies  |
| **CSRF Attacks**         | Next.js CSRF tokens on all mutations                  |
| **SQL Injection**        | Parameterized queries via Supabase SDK                |
| **XSS**                  | Content Security Policy headers, React auto-escaping  |
| **Rate Limiting Bypass** | Upstash Redis with IP + user fingerprinting           |
| **Queue Gaming**         | Server-side position assignment, immutable timestamps |
| **Email Bombing**        | 1 registration per user per event (DB constraint)     |

### **Defense Layers**

#### **Layer 1: Network (CDN)**

```
Vercel Edge Network
  ├─→ DDoS protection (automatic)
  ├─→ Geo-blocking (optional, future)
  └─→ Rate limiting (10 req/sec per IP)
```

#### **Layer 2: Application (Middleware)**

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. CSRF Protection
  if (req.method === "POST") {
    const token = req.headers.get("x-csrf-token");
    if (!validateCSRF(token)) {
      return new Response("Invalid CSRF token", { status: 403 });
    }
  }

  // 2. Route Protection
  if (path.startsWith("/admin")) {
    const session = await getSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.redirect("/");
    }
  }

  // 3. Registration Time Gate
  if (path === "/api/events/register") {
    const now = dayjs().tz("Asia/Kolkata");
    const isMonday = now.day() === 1;
    const isInWindow = now.hour() >= 9 && now.hour() < 24;

    if (!isMonday || !isInWindow) {
      return new Response("Registration closed", { status: 403 });
    }
  }

  return NextResponse.next();
}
```

#### **Layer 3: Database (RLS + Triggers)**

```sql
-- Prevent mass updates by rogue admin
CREATE POLICY "limit_bulk_updates"
ON registrations FOR UPDATE
USING (
  -- Only allow updating one registration at a time
  (SELECT COUNT(*) FROM registrations WHERE status = 'WAITING') < 2
  OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

-- Audit log for sensitive actions
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'rollout', 'kill_switch', 'force_invite'
  event_id UUID REFERENCES events(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_audit_log (admin_id, action, event_id, metadata)
  VALUES (auth.uid(), TG_ARGV[0], NEW.id, row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_rollout
AFTER UPDATE OF status ON events
FOR EACH ROW
WHEN (NEW.status = 'rolled_out')
EXECUTE FUNCTION log_admin_action('rollout');
```

---

## State Machine

### **Registration Status Lifecycle**

```
                  ┌─────────────┐
                  │  UNREGISTERED│
                  └──────┬──────┘
                         │
         Monday 9AM-11:59PM (Click "Register")
                         │
                         ▼
                  ┌─────────────┐
       ┌──────────│   WAITING   │
       │          └──────┬──────┘
       │                 │
       │     Admin clicks "Roll Out" OR
       │     VIP auto-promotion OR
       │     Waterfall promotion
       │                 │
       │                 ▼
       │          ┌─────────────┐
       │     ┌────│   INVITED   │────┐
       │     │    └─────────────┘    │
       │     │                       │
       │  Clicks YES          Clicks NO OR
       │     │                Timer expires
       │     │                       │
       │     ▼                       ▼
       │ ┌─────────┐          ┌──────────┐
       │ │CONFIRMED│          │ DECLINED │
       │ └────┬────┘          │ EXPIRED  │
       │      │               └─────┬────┘
       │      │                     │
       │      │                     └──→ Triggers Waterfall
       │      │                          (Promotes next WAITING)
       │      │
       │  Sunday Event
       │      │
       │      ▼
       │ ┌─────────┐
       └─│ ATTENDED│ (Final state)
         └─────────┘
```

### **State Transition Rules**

| From State | To State  | Trigger                         | Reversible?              |
| ---------- | --------- | ------------------------------- | ------------------------ |
| WAITING    | INVITED   | Admin rollout / Waterfall / VIP | No                       |
| INVITED    | CONFIRMED | User clicks YES                 | No                       |
| INVITED    | DECLINED  | User clicks NO                  | No                       |
| INVITED    | EXPIRED   | Timer runs out (24h)            | No                       |
| CONFIRMED  | ATTENDED  | User marks attendance           | No                       |
| CONFIRMED  | DECLINED  | Admin removes (emergency)       | Yes (re-invite manually) |

---

## Scalability Considerations

### **Current Capacity**

- **Users**: 600 registrations/week = 31,200/year
- **Database**: PostgreSQL handles 10M+ rows easily
- **Emails**: Resend allows 100k/month (400 invites/week = 1,600/month)
- **Edge Functions**: Auto-scales with Supabase

### **Bottlenecks (Future)**

1. **Email Delivery**: At 2000 registrations/week → need enterprise Resend plan
2. **Realtime Connections**: Supabase limits 200 concurrent connections on free tier
3. **Database Queries**: Need read replicas if >10k concurrent users

### **Horizontal Scaling Strategy (Multi-City)**

```sql
-- Add city partitioning
ALTER TABLE events ADD COLUMN city TEXT DEFAULT 'Ahmedabad';
ALTER TABLE events ADD COLUMN timezone TEXT DEFAULT 'Asia/Kolkata';

CREATE INDEX idx_events_city ON events(city, event_date);

-- Future: Partition by city
CREATE TABLE events_ahmedabad PARTITION OF events
  FOR VALUES IN ('Ahmedabad');

CREATE TABLE events_mumbai PARTITION OF events
  FOR VALUES IN ('Mumbai');
```

---

## Monitoring & Observability

### **Key Metrics**

```typescript
// Metrics to track (future Sentry/PostHog integration)
{
  "registration_count": 587,          // Current week
  "invitation_acceptance_rate": 0.92, // % of YES responses
  "waterfall_promotions": 23,         // Auto-promotions this week
  "avg_response_time": "4.3h",        // Time from invite to YES/NO
  "no_show_rate": 0.08,               // Confirmed but didn't attend
  "email_delivery_rate": 0.99         // Successful email sends
}
```

### **Error Alerting**

```typescript
// Conditions that trigger alerts
{
  "waterfall_stuck": "No promotions in >1 hour when queue exists",
  "email_failure_spike": ">10% emails bouncing",
  "database_slow_queries": "Query takes >2 seconds",
  "kill_switch_activated": "Admin paused waterfall (notify all admins)"
}
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Vercel (Frontend)                     │
│  • Next.js App (Serverless Functions)                  │
│  • Edge Middleware (CSRF, Auth Check)                  │
│  • CDN (Static Assets)                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ HTTPS (TLS 1.3)
                   │
┌──────────────────▼──────────────────────────────────────┐
│              Supabase (Backend)                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ PostgreSQL (Primary + Replica)                  │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Edge Functions (Deno Workers)                   │   │
│  │  • Waterfall                                    │   │
│  │  • Expire Invites                               │   │
│  │  • Send Reminders                               │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Auth (GoTrue)                                   │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ HTTPS
                   │
┌──────────────────▼──────────────────────────────────────┐
│                 Resend (Email)                          │
│  • Transactional Email API                             │
│  • Webhook for delivery tracking                       │
└─────────────────────────────────────────────────────────┘
```

---

**Last Updated**: December 31, 2025  
**Document Version**: 1.0  
**Maintained By**: Engineering Team
