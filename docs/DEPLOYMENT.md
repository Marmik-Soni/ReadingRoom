# 🚀 Deployment Guide

> **Production Deployment for The Reading Room Engine**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Supabase Setup](#supabase-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [Email Configuration](#email-configuration)
6. [Domain & SSL](#domain--ssl)
7. [Post-Deployment](#post-deployment)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] **GitHub Account** (for code hosting)
- [ ] **Vercel Account** ([vercel.com](https://vercel.com))
- [ ] **Supabase Account** ([supabase.com](https://supabase.com))
- [ ] **Resend Account** ([resend.com](https://resend.com))
- [ ] **Custom Domain** (optional, e.g., `readingroom.com`)
- [ ] **Admin Email** for first admin account

---

## Environment Setup

### **1. Clone Repository**

```bash
git clone <your-repo-url>
cd my-app
```

### **2. Install Dependencies**

```bash
pnpm install
# or
npm install
```

### **3. Create Environment Files**

Create `.env.local` for local development:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Resend (Email)
RESEND_API_KEY=re_your_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_EVENT_TIMEZONE=Asia/Kolkata
NEXT_PUBLIC_DEFAULT_CITY=Ahmedabad

# Admin Setup (First-time only)
ADMIN_EMAIL=admin@readingroom.com
ADMIN_PASSWORD=SecurePassword123!

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
```

---

## Supabase Setup

### **Step 1: Create Project**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `reading-room-production`
   - **Database Password**: Generate strong password (save this!)
   - **Region**: Choose closest to Ahmedabad (e.g., Mumbai/Singapore)
   - **Pricing Plan**: Free tier for development, Pro for production

### **Step 2: Get API Keys**

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### **Step 3: Run Database Migrations**

#### **Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

#### **Option B: Manual SQL Execution**

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and click **"Run"**
4. Repeat for all migration files in order

### **Step 4: Deploy Edge Functions**

```bash
# Deploy waterfall function
supabase functions deploy waterfall --project-ref <your-project-ref>

# Deploy expiry cron
supabase functions deploy expire-invites --project-ref <your-project-ref>

# Deploy reminder cron
supabase functions deploy send-reminders --project-ref <your-project-ref>
```

### **Step 5: Configure Cron Jobs**

1. Go to **Database** → **Cron Jobs** in Supabase Dashboard
2. Add the following jobs:

#### **Expire Invitations (Every 10 minutes)**

```sql
SELECT cron.schedule(
  'expire-old-invitations',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/expire-invites',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

#### **Send Reminders (Every 30 minutes)**

```sql
SELECT cron.schedule(
  'send-reminder-emails',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### **Step 6: Configure Authentication**

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates:

#### **Magic Link Template**

**Subject**: `Your Reading Room Login Link 🔑`

**Body**:

```html
<h2>Welcome back to The Reading Room!</h2>
<p>Click the button below to log in:</p>
<a
  href="{{ .ConfirmationURL }}"
  style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;"
>
  Log In
</a>
<p>This link expires in 15 minutes.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

#### **Password Reset Template**

**Subject**: `Reset Your Reading Room Password`

**Body**:

```html
<h2>Reset Your Password</h2>
<p>Click below to reset your password:</p>
<a
  href="{{ .ConfirmationURL }}"
  style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;"
>
  Reset Password
</a>
<p>This link expires in 1 hour.</p>
```

### **Step 7: Enable Row Level Security**

Already configured in migration files, but verify:

1. Go to **Database** → **Tables**
2. For each table, ensure **RLS Enabled** is checked
3. Go to **Database** → **Policies** to view all policies

---

## Vercel Deployment

### **Step 1: Push to GitHub**

```bash
git add .
git commit -m "Initial commit: The Reading Room Engine"
git push origin main
```

### **Step 2: Import to Vercel**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Select your GitHub repository
4. Configure settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `pnpm build` or `npm run build`
   - **Output Directory**: `.next` (auto-detected)

### **Step 3: Add Environment Variables**

In Vercel project settings → **Environment Variables**, add:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend
RESEND_API_KEY=re_your_api_key

# App Config
NEXT_PUBLIC_APP_URL=https://readingroom.com
NEXT_PUBLIC_EVENT_TIMEZONE=Asia/Kolkata
NEXT_PUBLIC_DEFAULT_CITY=Ahmedabad
```

**⚠️ Important**: Set environment for **Production**, **Preview**, and **Development**

### **Step 4: Deploy**

Click **"Deploy"** and wait for build to complete (~2-3 minutes).

### **Step 5: Verify Deployment**

1. Visit your Vercel URL (e.g., `your-project.vercel.app`)
2. Test:
   - Homepage loads
   - Authentication works
   - Database connection successful

---

## Email Configuration

### **Step 1: Create Resend Account**

1. Sign up at [resend.com](https://resend.com)
2. Verify your email
3. Go to **API Keys** → **Create API Key**
4. Copy the key → Add to Vercel env vars as `RESEND_API_KEY`

### **Step 2: Add Sender Domain**

#### **Option A: Use Resend's Test Domain (Development)**

```typescript
// Free tier: can send to verified emails only
from: "noreply@resend.dev";
```

#### **Option B: Custom Domain (Production - Recommended)**

1. Go to **Domains** in Resend Dashboard
2. Click **"Add Domain"**
3. Enter your domain: `readingroom.com`
4. Add DNS records to your domain registrar:

```
Type: TXT
Name: @
Value: resend-verification=abc123...

Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com

Type: MX
Priority: 10
Value: mx1.resend.com
```

5. Wait for verification (up to 48 hours)
6. Update Edge Function to use:

```typescript
from: "The Reading Room <noreply@readingroom.com>";
```

### **Step 3: Test Email Delivery**

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@readingroom.com",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>Email delivery working!</p>"
  }'
```

---

## Domain & SSL

### **Step 1: Add Custom Domain to Vercel**

1. Go to Vercel project → **Settings** → **Domains**
2. Add your domain: `readingroom.com`
3. Add DNS records to your registrar:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### **Step 2: Configure Redirects**

In `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "www.readingroom.com"
        }
      ],
      "destination": "https://readingroom.com/:path*",
      "permanent": true
    }
  ]
}
```

### **Step 3: SSL Certificate**

Vercel automatically provisions SSL via Let's Encrypt. Verify:

1. Visit `https://readingroom.com`
2. Check for 🔒 padlock in browser
3. Certificate should be valid for 90 days (auto-renewed)

---

## Post-Deployment

### **Step 1: Create First Admin Account**

```bash
# Run this script once
node scripts/create-admin.js
```

Or manually via Supabase SQL Editor:

```sql
-- Insert admin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  gen_random_uuid(),
  'admin@readingroom.com',
  crypt('YourSecurePassword123!', gen_salt('bf')),
  NOW()
);

-- Get the user ID
SELECT id FROM auth.users WHERE email = 'admin@readingroom.com';

-- Insert admin profile
INSERT INTO profiles (id, full_name, role)
VALUES (
  '<user-id-from-above>',
  'Admin User',
  'admin'
);
```

### **Step 2: Test Full User Flow**

1. **Register as User**:
   - Create profile
   - Wait for Monday 9 AM IST (or change date logic temporarily)
   - Register for event

2. **Admin Actions**:
   - Log in as admin
   - Create event
   - Roll out invitations

3. **Waterfall Test**:
   - Have a test user decline invitation
   - Verify next user is auto-promoted
   - Check email delivery

### **Step 3: Configure Monitoring**

#### **Enable Vercel Analytics**

1. Go to Vercel project → **Analytics**
2. Click **"Enable Analytics"**
3. Add to `layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

#### **Set Up Error Tracking (Optional: Sentry)**

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

Add to `sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

## Monitoring

### **Key Metrics to Track**

#### **Application Health**

| Metric        | Tool               | Alert Threshold |
| ------------- | ------------------ | --------------- |
| Uptime        | Vercel Analytics   | < 99.5%         |
| Response Time | Vercel Analytics   | > 2 seconds     |
| Error Rate    | Sentry             | > 1%            |
| Database CPU  | Supabase Dashboard | > 80%           |

#### **Business Metrics**

| Metric                     | Source           | Check Frequency   |
| -------------------------- | ---------------- | ----------------- |
| Weekly Registrations       | Database Query   | Monday 12 PM      |
| Invitation Acceptance Rate | Database Query   | Wednesday         |
| No-Show Rate               | Database Query   | Sunday Post-Event |
| Email Delivery Rate        | Resend Dashboard | Daily             |

### **Database Health Checks**

Run this query weekly:

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'WAITING') AS waiting,
  COUNT(*) FILTER (WHERE status = 'INVITED') AS invited,
  COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed,
  COUNT(*) FILTER (WHERE status = 'ATTENDED') AS attended,
  COUNT(*) FILTER (WHERE status = 'EXPIRED') AS expired
FROM registrations
WHERE event_id = (SELECT id FROM events ORDER BY event_date DESC LIMIT 1);
```

### **Set Up Alerts**

Create a Slack/Discord webhook for critical alerts:

```typescript
// lib/alerts.ts
export async function sendAlert(message: string) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `🚨 Reading Room Alert: ${message}`,
      channel: "#production-alerts",
    }),
  });
}

// Use in Edge Functions
if (promotedCount === 0 && waitingCount > 0) {
  await sendAlert("Waterfall stuck! No promotions in last hour.");
}
```

---

## Troubleshooting

### **Common Issues**

#### **1. "Registration Closed" Error on Monday**

**Symptom**: Users can't register even though it's Monday.

**Causes**:

- Server timezone mismatch
- Hardcoded date check in middleware

**Fix**:

```typescript
// middleware.ts - Ensure IST timezone
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(timezone);

const now = dayjs().tz("Asia/Kolkata"); // Force IST
const isMonday = now.day() === 1;
```

---

#### **2. Emails Not Sending**

**Symptom**: Users not receiving invitations.

**Debugging**:

```bash
# Check Resend logs
curl https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check Supabase Edge Function logs
supabase functions logs waterfall --project-ref <your-ref>
```

**Common Fixes**:

- Verify `RESEND_API_KEY` in Vercel env vars
- Check domain verification in Resend
- Ensure `from` email matches verified domain

---

#### **3. Waterfall Not Promoting**

**Symptom**: Users decline, but next person not invited.

**Debugging**:

```sql
-- Check waterfall status
SELECT is_waterfall_active FROM events
WHERE id = 'event-id-here';

-- Check waiting queue
SELECT COUNT(*) FROM registrations
WHERE event_id = 'event-id-here' AND status = 'WAITING';
```

**Fixes**:

- Ensure `is_waterfall_active = true`
- Check Edge Function deployment: `supabase functions list`
- Verify cron jobs running: Check Supabase logs

---

#### **4. Database Connection Errors**

**Symptom**: 500 errors, "Connection timeout" in logs.

**Fixes**:

- Check Supabase dashboard for database pause (free tier auto-pauses after 7 days inactivity)
- Verify `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars
- Increase connection pool in Supabase settings (Pro plan)

---

#### **5. Build Failures on Vercel**

**Common Errors**:

```
Error: Missing environment variable NEXT_PUBLIC_SUPABASE_URL
```

**Fix**: Add all env vars to Vercel project settings (Production + Preview environments).

```
Error: Type error in src/app/page.tsx
```

**Fix**: Run type check locally:

```bash
pnpm tsc --noEmit
```

---

### **Emergency Procedures**

#### **Kill Switch (Pause All Automation)**

```sql
-- Pause all events
UPDATE events
SET is_waterfall_active = false
WHERE status IN ('open', 'rolled_out');
```

Or via Admin UI: Click "Kill Switch" button.

---

#### **Rollback Deployment**

1. Go to Vercel project → **Deployments**
2. Find last working deployment
3. Click **"..."** → **"Promote to Production"**

---

#### **Database Backup & Restore**

```bash
# Backup (run weekly)
supabase db dump --project-ref <your-ref> > backup-2024-12-31.sql

# Restore (if needed)
supabase db reset --project-ref <your-ref>
psql -h db.your-project.supabase.co -U postgres -d postgres -f backup-2024-12-31.sql
```

---

## Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Database migrations run successfully
- [ ] Edge Functions deployed and tested
- [ ] Cron jobs configured and running
- [ ] Email domain verified in Resend
- [ ] SSL certificate active (HTTPS working)
- [ ] First admin account created
- [ ] Test registration flow (Monday)
- [ ] Test invitation flow (YES/NO)
- [ ] Test waterfall promotion (decline → next user)
- [ ] Test attendance marking (Sunday)
- [ ] Monitoring/alerts configured
- [ ] Backup strategy in place

---

## Maintenance

### **Weekly Tasks**

- [ ] Review error logs in Sentry
- [ ] Check email delivery rate in Resend
- [ ] Verify database disk usage in Supabase
- [ ] Review registration numbers

### **Monthly Tasks**

- [ ] Database backup
- [ ] Review and optimize slow queries
- [ ] Update dependencies (`pnpm update`)
- [ ] Check for Supabase/Vercel service updates

### **Quarterly Tasks**

- [ ] Security audit (check RLS policies)
- [ ] Performance review (optimize indexes)
- [ ] Cost analysis (Supabase/Vercel usage)
- [ ] User feedback review

---

**Last Updated**: December 31, 2025  
**Deployment Version**: 1.0  
**Maintained By**: Engineering Team
