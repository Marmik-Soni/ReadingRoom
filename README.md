# 📖 The Reading Room Engine

> **A Self-Healing Event Management System for Community Reading Sessions**

[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)](https://tailwindcss.com/)

---

## 🌟 Overview

**The Reading Room Engine** is an autonomous orchestration system that replaces manual event management chaos with "Calm-Tech." Built for a weekly community reading event in Ahmedabad, it handles 400-600 registrations and manages a queue-based invitation system with zero organizer intervention.

### **The Problem We Solve**

**Before:** Organizers manually processed 600 Google Form entries, texted 100 people individually, tracked RSVPs in spreadsheets, and chased down replacements when someone cancelled.

**After:** Users click "Register" on Monday. The system auto-invites the first 100, sends reminders, handles cancellations, and promotes waitlist members—all automatically.

---

## ✨ Key Features

### 🎯 **For Readers (Community Members)**

- **One-Click Registration**: Join the queue every Monday (9 AM - 11:59 PM IST)
- **Automatic Invitations**: Get notified when a spot opens (first 100 guaranteed)
- **24-Hour Response Window**: Accept or decline with live countdown timer
- **Self-Healing Waitlist**: If you decline, the next person is instantly promoted
- **Attendance Tracking**: Mark yourself present during the event
- **Book Reviews**: Share what you read and your experience (optional)

### 🎛️ **For Admins (Organizers)**

- **VIP Management**: Maintain a permanent allowlist that auto-confirms
- **One-Click Rollout**: Start the invitation waterfall with a single button
- **Kill Switch**: Pause all automation instantly (emergency or venue changes)
- **Attendee Dashboard**: View all 100 confirmed guests + their details
- **Feedback Curation**: Select reviews to feature on the public portfolio
- **Manual Overrides**: Add 101st+ guests outside the automation

### 🌐 **For Visitors (Public Portfolio)**

- **Dynamic CTAs**: "Register Now" (Monday) → "See What We're Reading" (Sunday)
- **Live Library**: Browse book reviews during event hours
- **Community Story**: Learn about the Reading Room philosophy
- **Featured Feedback**: See curated testimonials from past events

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC PORTFOLIO                         │
│  (Next.js App Router - SSR + Dynamic CTAs)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐     ┌─────────▼──────────┐
│ READER PORTAL  │     │  ADMIN PORTAL      │
│ • Dashboard    │     │  • Event Manager   │
│ • Profile      │     │  • VIP List        │
│ • Feedback     │     │  • Rollout Control │
└───────┬────────┘     └─────────┬──────────┘
        │                        │
        └────────────┬───────────┘
                     │
        ┌────────────▼────────────────┐
        │   SUPABASE BACKEND          │
        │  • PostgreSQL Database      │
        │  • Row Level Security       │
        │  • Edge Functions           │
        │  • Realtime Subscriptions   │
        └────────────┬────────────────┘
                     │
        ┌────────────▼────────────────┐
        │   WATERFALL ENGINE          │
        │  • Auto-Promotion Logic     │
        │  • Expiry Cron Jobs         │
        │  • Email Notifications      │
        └─────────────────────────────┘
```

### **The Waterfall Engine™**

The core automation that runs invisibly in the background:

1. **Trigger**: User declines, timer expires, or admin removes someone
2. **Query**: Find next person in `WAITING` status (ordered by queue position)
3. **Promote**: Change status to `INVITED`, start 24-hour timer
4. **Notify**: Send email + push notification with venue details
5. **Repeat**: Loop continues until all 100 seats are filled

**Self-Healing**: If someone cancels at 11:59 PM Saturday, the system instantly promotes the next person—no human intervention required.

---

## 🗄️ Database Schema

### **Core Tables**

```sql
users              # Supabase Auth (email + role)
  └── profiles     # Public info (name, bio, VIP flag)

events             # Weekly reading sessions
  ├── venue        # Location details (JSONB)
  ├── city         # 'Ahmedabad' (future-proofed)
  └── status       # 'draft' | 'open' | 'rolled_out' | 'completed'

registrations      # The Queue + State Machine
  ├── status       # 'WAITING' | 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'EXPIRED'
  ├── queue_position  # Event-scoped, auto-assigned
  └── expires_at   # 24-hour countdown

book_reviews       # User-submitted reads
event_feedback     # Private ratings (admin-curated for portfolio)
vip_list          # Admin-managed allowlist
```

**Key Constraints:**

- One registration per user per event
- Email editing locked during `INVITED`/`CONFIRMED` states
- Queue positions unique per event
- Automatic expiry via database triggers

See [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for full SQL.

---

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account ([supabase.com](https://supabase.com))
- Resend account for emails ([resend.com](https://resend.com))

### **1. Clone & Install**

```bash
git clone <repository-url>
cd my-app
pnpm install
```

### **2. Environment Setup**

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Resend)
RESEND_API_KEY=re_your_api_key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_EVENT_TIMEZONE=Asia/Kolkata
NEXT_PUBLIC_DEFAULT_CITY=Ahmedabad
```

### **3. Database Setup**

```bash
# Run migrations
pnpm supabase db push

# Seed test data (optional)
pnpm supabase db seed
```

### **4. Deploy Edge Functions**

```bash
pnpm supabase functions deploy waterfall
pnpm supabase functions deploy expire-invites
pnpm supabase functions deploy send-reminders
```

### **5. Run Development Server**

```bash
pnpm dev
# Open http://localhost:3000
```

---

## 📚 Documentation

| Document                                      | Description                               |
| --------------------------------------------- | ----------------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)       | System design, data flows, security model |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Complete SQL schema + triggers            |
| [API_REFERENCE.md](docs/API_REFERENCE.md)     | REST endpoints + Edge Functions           |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)           | Production deployment guide               |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md)       | Development workflow + code standards     |

---

## 🔐 Security Features

### **Authentication**

- **Readers**: Passwordless magic link (email-only)
- **Admins**: Email + password with forgot password flow
- **Sessions**: httpOnly cookies (XSS-proof)

### **Authorization**

- Role-Based Access Control (RBAC) via Supabase RLS
- Middleware route protection
- CSRF tokens on all mutations

### **Anti-Gaming**

- Rate limiting (Upstash Redis)
- Server-side queue position assignment
- Database-level email lock during invitations
- IP throttling for registration endpoints

### **Data Integrity**

- PostgreSQL transactions (SERIALIZABLE isolation)
- Unique constraints on user+event pairs
- Immutable audit logs for admin actions

---

## 🎨 Tech Stack

### **Frontend**

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS 3.4+
- **State**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation

### **Backend**

- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (magic link + password)
- **Storage**: Supabase Storage (future: profile pictures)
- **Functions**: Supabase Edge Functions (Deno runtime)

### **Services**

- **Email**: Resend (transactional emails)
- **Push**: Web Push API (service workers)
- **Cron**: Supabase Cron (timer expiry checks)

### **DevOps**

- **Hosting**: Vercel (Next.js) + Supabase (backend)
- **Analytics**: Vercel Analytics (optional)
- **Monitoring**: Sentry (error tracking, optional)

---

## 📅 Weekly Event Flow

### **Monday (Registration Day)**

```
09:00 AM IST → Registration opens
             → Queue positions auto-assigned
             → VIPs auto-promoted to INVITED

11:59 PM IST → Registration closes
             → Admin clicks "Roll Out"
             → First 100 non-VIPs promoted to INVITED
             → 24-hour timers start
             → Invitation emails sent
```

### **Tuesday - Saturday (Response Window)**

```
Continuous  → Waterfall monitors for vacancies
            → Users click YES (→ CONFIRMED) or NO (→ DECLINED)
            → Expired invites auto-marked (→ EXPIRED)
            → Next waitlist members promoted instantly
            → 30-min reminder emails sent before expiry
```

### **Sunday (Event Day)**

```
Event Hours → "I Am Here" button activates
            → Users mark attendance (→ ATTENDED)
            → Feedback form unlocks (book review + rating)
            → Public "Live Library" page shows current reads
```

### **Monday (Next Cycle)**

```
12:00 AM IST → Previous event marked as COMPLETED
             → New event auto-created (future feature)
             → Email locks released for all users
             → Reliability scores updated (future feature)
```

---

## 🛠️ Development

### **Project Structure**

```
my-app/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Protected routes
│   │   │   ├── admin/    # Admin portal
│   │   │   └── reader/   # User dashboard
│   │   ├── (public)/     # Public portfolio
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── admin/
│   │   ├── reader/
│   │   ├── portfolio/
│   │   └── shared/
│   └── lib/              # Utilities
│       ├── supabase/     # DB clients
│       ├── auth/         # Session management
│       └── utils/        # Helpers
├── supabase/
│   ├── functions/        # Edge Functions
│   └── migrations/       # SQL schemas
└── docs/                 # Documentation
```

### **Available Scripts**

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm start        # Run production build
pnpm lint         # Run ESLint
pnpm type-check   # TypeScript validation
pnpm test         # Run tests (future)
```

### **Database Commands**

```bash
pnpm supabase db reset       # Reset database
pnpm supabase db push        # Apply migrations
pnpm supabase db diff        # Generate migration
pnpm supabase gen types ts   # Generate TypeScript types
```

---

## 🌍 Future Roadmap

### **Phase 2: Multi-City Expansion**

- [ ] City selector in portfolio
- [ ] Timezone-aware scheduling
- [ ] Separate admin dashboards per city

### **Phase 3: Social Features**

- [ ] User profiles with reading history
- [ ] Book recommendations engine
- [ ] "Find Reading Buddies" matching

### **Phase 4: Advanced Analytics**

- [ ] Reliability scores (attendance tracking)
- [ ] Predictive no-show algorithms
- [ ] Capacity optimization suggestions

### **Phase 5: Mobile App**

- [ ] React Native app (iOS + Android)
- [ ] Push notifications (native)
- [ ] Offline mode for feedback forms

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for:

- Code style guidelines
- Branch naming conventions
- Pull request process
- Testing requirements

---

## 📄 License

This project is proprietary software. All rights reserved.

**Contact**: [Contact Form](https://yoursite.com/contact)

---

## 🙏 Acknowledgments

- **Founding Team**: The visionaries who created The Reading Room
- **Community**: 600+ weekly readers who trust the system
- **Contributors**: Developers who make the magic happen

---

## 📞 Support

- **Technical Issues**: Create a GitHub issue
- **Event Questions**: Contact organizers via portfolio
- **Security Concerns**: Email security@yoursite.com

---

**Built with ❤️ for the Reading Room Community**

_Last Updated: December 31, 2025_
