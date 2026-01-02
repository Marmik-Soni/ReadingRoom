# The Reading Room Automated Coordinator

## The Problem

Right now, managing a community of 600+ people for 100 seats is a manual marathon. We spend hours tracking WhatsApp messages, managing waitlists, and dealing with "dead seats" from no-shows.

## The Solution

A "Calm-Tech" engine that acts as our digital steward. It automates the repetitive scheduling but leaves the final "human" decisions to us.

---

## 🛠 The Organizer's Experience (Admin Flow)

This turns your role from a "logistics manager" into a "community host."

### 1. The Hands-Off Monday

The system starts the week for us. At 9:00 AM, the registration portal opens automatically. We don't need to post a link or announce anything. We simply log in to our dashboard and watch the queue build in real-time. If a venue issue pops up, we have a Master Kill Switch that cancels the event and notifies everyone instantly with one click.

### 2. The Tuesday "Roll Out"

Once we have our venue and time confirmed, we perform our only major task of the week. We enter the location and time into the dashboard and hit "Roll Out."

**Smart Invites**: The system automatically identifies the top 100 people.

**The VIP Guard**: If we have core team members or special guests, we put them on a "Priority List." The system guarantees them a spot within that 100, so we never have to worry about our "vibe-setters" missing out.

### 3. The Saturday Waterfall (Self-Healing Queue)

This is the most powerful part. Once invites are out, the system manages the seats:

- **Instant Backfill**: If person #40 says "No," the system instantly invites person #101.
- **The 24-Hour Timer**: If someone is silent for 24 hours, the system assumes they aren't coming and automatically passes the seat to the next person in line.
- **The Weekend Cutoff**: To ensure everyone has time to plan, the "Waterfall" stops on Saturday evening. No one will get a "surprise" invitation on Sunday morning.

---

## 📖 The Reader's Experience (User Flow)

We want the experience to feel like a high-end club—simple, fair, and professional.

### 1. One-Time Setup

A reader registers and verifies their email just once. After that, they are "recognized" by the system. On Monday morning, they get a notification, tap a single button and they are done. No passwords to remember, simply fill the form and register.

### 2. The Decision Window

On Tuesday, they receive their invitation with the location and time. They have a clear choice: "Yes, I'll be there" or "No, I can't make it."

**Accountability**: Once they say "Yes," their seat is locked. To keep things clean, they can't change their email address while they have an active invitation (Until they havd decided Yes or No or their 24 hours period expires). It ensures the person who registered is the one who shows up.

**The 24-Hour Rule**: If a reader doesn't respond to their invitation within 24 hours, the system automatically assumes they can't make it and passes their seat to the next person in line. This keeps the queue moving fairly and ensures seats don't sit in limbo.

**The Waitlist Advantage**: If someone ahead declines their invitation or doesn't respond in time, readers further down the queue automatically get promoted and receive their own invitation instantly. This means even if you're #150 on Monday, you could still get a seat by Wednesday if enough people decline.

### 3. The "Hero" Cancellation

If a reader says "Yes" on Tuesday but realizes on Friday they are sick or for any reason they won't be able to attend, they can release their spot. Because they did this before the Saturday cutoff, the system instantly gifts that seat to the next person waiting. It makes our readers feel good for being responsible.

**Saturday Cutoff**: The automatic seat reassignments stop on Saturday at 8:00 PM. This ensures no one gets a last-minute surprise invitation on Sunday morning when it's too late to plan. After Saturday, the confirmed 100 readers are locked in.

**The Closing Window**: If you receive an invitation close to the Saturday cutoff (for example, at 6:00 PM), your response window is shorter than 24 hours. In this case, you would have only 2 hours to respond before the waterfall stops. The system prioritizes giving everyone fair planning time over holding seats in limbo.

### 4. The Sunday Handshake

When they arrive, they tap "I am here" on the site. This isn't just for us to track attendance; it unlocks their Reading Log. They can log the book they read and leave a review. By Sunday evening, they can browse the "Digital Library" to see what everyone else in the room was reading, creating a connection that lasts beyond the event.

---

## 💡 Why This Works for Us

- **We save 4–6 hours a week**: No more manual waitlist tracking.
- **Priority stays Priority**: If a core member can't make it, the seat doesn't go to a random person—the system holds it for us to decide who to invite next.
- **Fairness**: The community sees exactly where they are in line. There is no favoritism, just a transparent, automated process that works.

---

## 🏗 Technical Architecture & Implementation Plan

### System Overview

We're building a modern, scalable web application that automates the entire event lifecycle while maintaining human oversight and community transparency.

### Tech Stack

**Frontend**
- **Next.js 16** (React 19): App Router for server-side rendering, optimal SEO, and fast page loads
- **Tailwind CSS v4**: Rapid UI development with consistent design system
- **React Query**: Real-time queue updates and optimistic UI
- **Zustand**: Lightweight state management for user sessions

**Backend & Database**
- **Supabase**: PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions for live queue updates
  - Built-in authentication with email verification
  - Edge Functions for serverless automation
- **Supabase Storage**: Book cover uploads for Reading Log

**Communications**
- **Unosend**: Transactional emails (invitations, confirmations, reminders)
  - Reliable delivery tracking
  - Template management
  - Bounce/spam handling

**Automation & Scheduling**
- **Supabase Edge Functions + Cron**: Time-based triggers
  - Monday 9 AM: Open registration
  - Tuesday: Send invitations
  - 24-hour countdown timers
  - Saturday 8 PM: Close waterfall

**Deployment**
- **Vercel**: Edge deployment, zero-config CI/CD
- **GitHub Actions**: Automated testing and quality checks

### Database Schema

```
users
├── id (uuid, primary key)
├── email (unique, verified)
├── full_name
├── registration_date
├── priority_tier (normal | vip | core_team)
└── total_events_attended

events
├── id (uuid, primary key)
├── week_starting (date, unique)
├── status (draft | registration_open | invites_sent | confirmed | completed | cancelled)
├── venue_name
├── venue_address
├── event_datetime
├── total_seats (default: 100)
└── created_at

registrations
├── id (uuid, primary key)
├── event_id (foreign key)
├── user_id (foreign key)
├── registered_at (timestamp)
├── queue_position (integer, calculated)
└── status (queued | invited | confirmed | declined | expired | waitlist_promoted)

invitations
├── id (uuid, primary key)
├── registration_id (foreign key)
├── sent_at (timestamp)
├── expires_at (timestamp, sent_at + 24 hours)
├── response (pending | accepted | declined)
├── responded_at
└── seat_number (1-100)

reading_log
├── id (uuid, primary key)
├── user_id (foreign key)
├── event_id (foreign key)
├── book_title
├── author
├── cover_image_url
├── review_text
└── logged_at
```

### Key Features & Implementation

#### 1. Smart Queue Management

**Registration Priority Algorithm**
```typescript
function calculateQueuePosition(user: User, registrations: Registration[]) {
  // Priority tiers
  if (user.priority_tier === 'core_team') return assignTopSlot();
  if (user.priority_tier === 'vip') return assignVIPSlot();
  
  // First-come-first-served for regular users
  return registrations.length + 1;
}
```

**The Waterfall Engine**
- Real-time seat availability tracking
- Automatic backfill when someone declines
- 24-hour countdown timer per invitation
- Batch processing to prevent race conditions

#### 2. Email Automation Flow

**Monday 9 AM**: "Registration is Open"
- Target: All users in database
- Action: Single-click registration link

**Tuesday Roll-Out**: "You're Invited!"
- Target: Top 100 (by queue position)
- Includes: Venue, time, map link, Yes/No buttons
- Expires: 24 hours from send

**Wednesday-Saturday**: Waterfall Notifications
- Target: Next person in queue when a seat opens
- Dynamic expiry based on Saturday 8 PM cutoff

**Sunday Morning**: "See You Today!"
- Target: Confirmed attendees
- Includes: Check-in link, book logging reminder

#### 3. Admin Dashboard Features

**Event Control Panel**
- Master kill switch (one-click cancel with mass notifications)
- Venue & time input with instant invitation trigger
- Real-time queue visualization
- VIP/priority seat management
- Attendance tracking

**Analytics & Insights**
- Registration velocity (how fast seats fill)
- Decline rate patterns
- No-show tracking (for future improvements)
- Most active readers
- Popular books from Reading Logs

#### 4. User-Facing Features

**Registration Portal**
- One-time email verification
- Single-click "Register for This Week" button
- Live queue position display
- Transparent waitlist status

**Invitation Response**
- Clear Yes/No buttons (no ambiguity)
- Countdown timer showing response deadline
- "Hero Cancel" option (releases seat before Saturday)

**Check-In & Reading Log**
- Sunday morning: "I'm Here" button unlocks logging
- Book entry form (title, author, optional cover upload)
- Browse community's reading list after logging your own

### Security & Data Protection

**Authentication**
- Email-based magic links (no password fatigue)
- Session management with secure HTTP-only cookies
- Rate limiting on registration endpoints

**Authorization**
- Row Level Security (RLS) in Supabase
  - Users can only see their own registrations
  - Admins have elevated permissions
- API routes protected with middleware

**Data Privacy**
- GDPR-compliant data handling
- Email addresses locked during active invitations
- Option to delete account and all data

### Performance & Scalability

**Optimizations**
- Server-side rendering for instant page loads
- Edge caching for static content
- Database indexes on queue_position, event_id, user_id
- Pagination for large reading logs

**Load Handling**
- Supabase can handle 600+ concurrent registrations
- Edge Functions scale automatically
- Rate limiting prevents spam registrations

### Testing Strategy

**Automated Testing**
- **Unit Tests**: Queue algorithm, priority calculations
- **Integration Tests**: Email sending, waterfall logic
- **E2E Tests**: Full registration → invitation → confirmation flow

**Manual Testing Phases**
- **Phase 1**: Internal team (5-10 people)
- **Phase 2**: Beta with 50 readers
- **Phase 3**: Full rollout with 600+ users

### Development Roadmap

**Phase 1: MVP (Weeks 1-3)**
- [ ] User registration & authentication
- [ ] Basic admin dashboard
- [ ] Event creation & seat management
- [ ] Queue position calculation
- [ ] Email integration (Unosend)

**Phase 2: Automation (Weeks 4-5)**
- [ ] Monday auto-open registration
- [ ] Tuesday invitation batch sender
- [ ] 24-hour expiry timers
- [ ] Waterfall backfill engine
- [ ] Saturday cutoff logic

**Phase 3: Polish (Week 6)**
- [ ] Reading Log feature
- [ ] Digital Library view
- [ ] Admin analytics dashboard
- [ ] Mobile responsive design
- [ ] Error handling & edge cases

**Phase 4: Beta Testing (Week 7)**
- [ ] Dry-run with test data
- [ ] Load testing with simulated 600 users
- [ ] Bug fixes & refinements

**Phase 5: Launch (Week 8)**
- [ ] Import existing community data
- [ ] Onboarding guides for users
- [ ] Admin training session
- [ ] Go-live for next event

### Risk Mitigation

**What if email deliverability fails?**
- Unosend has 99.9% uptime SLA
- Fallback: Manual WhatsApp notification for critical invites
- Email bounce monitoring with auto-retry

**What if two people claim the same seat?**
- Database transactions with row locking
- FIFO queue ensures deterministic ordering
- Audit log for dispute resolution

**What if the server goes down during registration?**
- Vercel has 99.99% uptime
- Supabase has automatic failover
- Grace period: Extend registration window if downtime detected

### Cost Breakdown

**Monthly Operating Costs**
- **Vercel Hobby**: $0 (Pro $20 if scaling needed)
- **Supabase Free Tier**: $0 (Pro $25 if exceeding limits)
- **Unosend**: ~$5/month (1,000 emails = 600 users × ~5 emails/week)
- **Domain**: ~$1/month

**Total**: ~$6-50/month depending on scale

**Development Cost** (One-Time)
- Estimated: 60-80 hours
- Timeline: 8 weeks (part-time)

### Success Metrics

**For Organizers**
- Time saved per week: Target 4-6 hours
- Manual interventions needed: <5 per event
- Admin satisfaction score

**For Community**
- Registration completion rate: >90%
- Invitation response rate: >85% within 24 hours
- No-show rate: <10%
- Reading Log participation: >70%

**Technical Health**
- Page load time: <2 seconds
- Email delivery rate: >98%
- Zero data breaches
- Uptime: >99.5%

---

## 🚀 Why This Will Work

**Technical Excellence**
- Built on battle-tested, modern infrastructure
- Scalable from day one (handles 10x growth)
- Automated with human oversight points

**Community-First Design**
- Transparent queue system builds trust
- Fair, automated process removes bias
- Reading Log creates lasting connections

**Business Value**
- Saves significant organizer time
- Improves attendee experience
- Provides data insights for growth
- Low operational cost

**Future-Proof**
- Modular architecture allows feature additions
- API-first design enables mobile app later
- Data export for community insights

---

## 📞 Next Steps

1. **Founder Approval**: Review this plan and provide feedback
2. **Kickoff Meeting**: Finalize requirements and timeline
3. **Design Mockups**: Visualize admin dashboard and user flows
4. **Development Sprint**: Begin Phase 1 implementation
5. **Weekly Check-ins**: Progress updates and course corrections

---

## 🛠 Open Source & Community

This project is built with transparency in mind:
- **License**: MIT
- **Contributing**: See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Security**: Report issues to security@readingroom.dev
- **Changelog**: Track progress in [CHANGELOG.md](CHANGELOG.md)
