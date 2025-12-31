# 📡 API Reference

> **Complete REST API & Edge Functions Documentation**

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [REST Endpoints](#rest-endpoints)
4. [Edge Functions](#edge-functions)
5. [Webhooks](#webhooks)
6. [Rate Limits](#rate-limits)
7. [Error Handling](#error-handling)

---

## API Overview

### **Base URLs**

```
Production:  https://readingroom.com/api
Development: http://localhost:3000/api
```

### **Authentication Methods**

| Endpoint Type | Auth Method                 | Header                |
| ------------- | --------------------------- | --------------------- |
| Public Routes | None                        | -                     |
| Reader Routes | Session Cookie              | `Cookie: session=...` |
| Admin Routes  | Session Cookie + Role Check | `Cookie: session=...` |

### **Request/Response Format**

```typescript
// All requests/responses use JSON
Content-Type: application/json

// Standard success response
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}

// Standard error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { ... }
  }
}
```

---

## Authentication

### **1. Send Magic Link (Readers)**

**POST** `/api/auth/login`

Send a magic link to user's email for passwordless login.

#### Request

```json
{
  "email": "user@example.com"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Magic link sent to user@example.com",
  "expiresIn": "15 minutes"
}
```

#### Rate Limit

- 5 requests per email per hour
- 10 requests per IP per hour

---

### **2. Verify Magic Link**

**GET** `/api/auth/verify?token=<jwt_token>`

Verify magic link token and create session.

#### Query Parameters

| Parameter | Type   | Required | Description          |
| --------- | ------ | -------- | -------------------- |
| `token`   | string | Yes      | JWT token from email |

#### Response (302 Redirect)

```
Success: /reader/dashboard
Invalid: /?error=invalid_token
Expired: /?error=token_expired
```

#### Sets Cookie

```
Set-Cookie: session=<encrypted_session>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

---

### **3. Admin Login**

**POST** `/api/auth/admin/login`

Login with email and password (admins only).

#### Request

```json
{
  "email": "admin@readingroom.com",
  "password": "SecurePassword123!"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@readingroom.com",
    "role": "admin"
  },
  "redirectTo": "/admin/dashboard"
}
```

#### Response (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### **4. Logout**

**POST** `/api/auth/logout`

Clear session cookie.

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## REST Endpoints

### **Events**

#### **1. Get Current Event**

**GET** `/api/events/current`

Get the currently active event for registration.

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "eventDate": "2025-01-05",
    "registrationOpensAt": "2024-12-30T09:00:00+05:30",
    "venue": {
      "name": "The Reading Lounge",
      "address": "123 Book Street, Ahmedabad",
      "mapLink": "https://maps.google.com/...",
      "capacity": 100
    },
    "city": "Ahmedabad",
    "status": "open",
    "stats": {
      "totalRegistered": 387,
      "confirmed": 92,
      "waiting": 295
    }
  }
}
```

---

#### **2. Register for Event**

**POST** `/api/events/register`

Join the queue for the current event.

**Auth Required**: Reader session

**Time Gate**: Monday 9 AM - 11:59 PM IST only

#### Request

```json
{
  "eventId": "uuid"
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "registrationId": "uuid",
    "eventId": "uuid",
    "queuePosition": 388,
    "status": "WAITING",
    "message": "You're registered! We'll notify you if a spot opens."
  }
}
```

#### Response (201 Created - VIP Auto-Invited)

```json
{
  "success": true,
  "data": {
    "registrationId": "uuid",
    "status": "INVITED",
    "expiresAt": "2024-12-31T09:00:00+05:30",
    "message": "You've been invited! Please respond within 24 hours."
  }
}
```

#### Response (409 Conflict)

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_REGISTERED",
    "message": "You're already registered for this event"
  }
}
```

#### Response (403 Forbidden)

```json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_CLOSED",
    "message": "Registration is only open on Mondays from 9 AM to 11:59 PM IST"
  }
}
```

---

#### **3. Respond to Invitation**

**POST** `/api/events/respond`

Accept or decline an invitation (YES/NO).

**Auth Required**: Reader session

#### Request

```json
{
  "registrationId": "uuid",
  "decision": "confirm" // or "decline"
}
```

#### Response (200 OK - Confirmed)

```json
{
  "success": true,
  "data": {
    "status": "CONFIRMED",
    "message": "You're confirmed! See you on Sunday 🎉",
    "event": {
      "date": "2025-01-05",
      "venue": { ... }
    }
  }
}
```

#### Response (200 OK - Declined)

```json
{
  "success": true,
  "data": {
    "status": "DECLINED",
    "message": "We'll miss you! Join us next time."
  }
}
```

#### Response (410 Gone)

```json
{
  "success": false,
  "error": {
    "code": "INVITATION_EXPIRED",
    "message": "Your 24-hour response window has expired"
  }
}
```

---

#### **4. Mark Attendance**

**POST** `/api/events/attend`

Mark yourself as present at the event.

**Auth Required**: Reader session

**Time Gate**: Sunday during event hours only

#### Request

```json
{
  "registrationId": "uuid"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "status": "ATTENDED",
    "message": "Attendance marked! Enjoy the reading session.",
    "feedbackUnlocked": true
  }
}
```

---

### **User Profile**

#### **1. Get Profile**

**GET** `/api/profile`

Get current user's profile.

**Auth Required**: Reader/Admin session

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "instagramHandle": "@johndoe",
    "bio": "Avid reader and coffee enthusiast",
    "role": "reader",
    "isVIP": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

#### **2. Update Profile**

**PATCH** `/api/profile`

Update user's profile information.

**Auth Required**: Reader/Admin session

#### Request

```json
{
  "fullName": "John Doe",
  "instagramHandle": "@johndoe",
  "bio": "Updated bio",
  "email": "newemail@example.com" // Will fail if INVITED/CONFIRMED
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "newemail@example.com",
    "updatedAt": "2024-12-31T12:00:00Z"
  }
}
```

#### Response (403 Forbidden - Email Lock)

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_LOCKED",
    "message": "Cannot change email while you have an active invitation or confirmed attendance"
  }
}
```

---

### **Feedback**

#### **1. Submit Feedback**

**POST** `/api/feedback`

Submit book review and event rating.

**Auth Required**: Reader session

**Prerequisite**: Must have ATTENDED status for the event

#### Request

```json
{
  "eventId": "uuid",
  "bookReview": {
    "title": "Atomic Habits",
    "author": "James Clear",
    "review": "Life-changing insights on building better habits..."
  },
  "eventFeedback": {
    "rating": 5,
    "comments": "Amazing atmosphere, great discussions!"
  }
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "bookReviewId": "uuid",
    "eventFeedbackId": "uuid",
    "message": "Thank you for your feedback!"
  }
}
```

---

### **Admin Endpoints**

#### **1. Create Event**

**POST** `/api/admin/events`

Create a new event.

**Auth Required**: Admin session

#### Request

```json
{
  "eventDate": "2025-01-12", // Must be Sunday
  "registrationOpensAt": "2025-01-06T09:00:00+05:30", // Must be Monday
  "venue": {
    "name": "The Reading Lounge",
    "address": "123 Book Street, Ahmedabad",
    "mapLink": "https://maps.google.com/...",
    "capacity": 100,
    "instructions": "Enter through main gate"
  },
  "city": "Ahmedabad",
  "timezone": "Asia/Kolkata"
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "eventDate": "2025-01-12",
    "status": "draft",
    "message": "Event created. Click 'Roll Out' on Monday to send invitations."
  }
}
```

---

#### **2. Roll Out Invitations**

**POST** `/api/admin/events/:id/rollout`

Start the waterfall engine and send invitations to first 100 users.

**Auth Required**: Admin session

**Idempotency**: Button disabled after first click

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "invitationsSent": 100,
    "waterfallActive": true,
    "message": "100 invitations sent successfully"
  }
}
```

#### Response (409 Conflict)

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_ROLLED_OUT",
    "message": "Invitations have already been sent for this event"
  }
}
```

---

#### **3. Toggle Kill Switch**

**POST** `/api/admin/events/:id/kill-switch`

Pause or resume the waterfall automation.

**Auth Required**: Admin session

#### Request

```json
{
  "active": false // Pause waterfall
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "isWaterfallActive": false,
    "message": "Waterfall paused. No automatic promotions will occur."
  }
}
```

---

#### **4. Update Venue (Hotfix)**

**PATCH** `/api/admin/events/:id/venue`

Update venue details after rollout (e.g., fix typo, change location).

**Auth Required**: Admin session

#### Request

```json
{
  "venue": {
    "name": "The NEW Reading Lounge",
    "address": "456 Different Street, Ahmedabad",
    "mapLink": "https://maps.google.com/...",
    "capacity": 100
  }
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "venue": { ... },
    "message": "Venue updated. All confirmed attendees will be notified."
  }
}
```

---

#### **5. Get Attendee List**

**GET** `/api/admin/events/:id/attendees`

Get list of all registrations for an event.

**Auth Required**: Admin session

#### Query Parameters

| Parameter | Type    | Default | Description                                          |
| --------- | ------- | ------- | ---------------------------------------------------- |
| `status`  | string  | all     | Filter by status (WAITING, INVITED, CONFIRMED, etc.) |
| `page`    | integer | 1       | Page number                                          |
| `limit`   | integer | 100     | Results per page                                     |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "total": 387,
    "page": 1,
    "limit": 100,
    "attendees": [
      {
        "id": "uuid",
        "user": {
          "fullName": "John Doe",
          "email": "john@example.com",
          "instagramHandle": "@johndoe"
        },
        "queuePosition": 1,
        "status": "CONFIRMED",
        "invitedAt": "2024-12-30T12:00:00Z",
        "respondedAt": "2024-12-30T14:30:00Z",
        "isManualOverride": false
      }
      // ... 99 more
    ]
  }
}
```

---

#### **6. Manage VIP List**

**GET** `/api/admin/vips`

Get all VIP users.

**Auth Required**: Admin session

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user": {
        "fullName": "VIP Reader",
        "email": "vip@example.com"
      },
      "addedBy": {
        "fullName": "Admin User"
      },
      "addedAt": "2024-01-01T00:00:00Z",
      "notes": "Founding member"
    }
  ]
}
```

---

**POST** `/api/admin/vips`

Add a user to VIP list.

**Auth Required**: Admin session

#### Request

```json
{
  "userId": "uuid",
  "notes": "Community organizer"
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "User added to VIP list"
  }
}
```

---

**DELETE** `/api/admin/vips/:id`

Remove a user from VIP list.

**Auth Required**: Admin session

#### Response (200 OK)

```json
{
  "success": true,
  "message": "User removed from VIP list"
}
```

---

## Edge Functions

### **1. Waterfall Promotion**

**Function**: `supabase/functions/waterfall/index.ts`

**Trigger**: HTTP POST from Next.js API when vacancy occurs

**Invocation**:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/waterfall \
  -H "Authorization: Bearer <anon_key>" \
  -d '{"eventId": "uuid", "triggeredBy": "user_decline"}'
```

#### Request Payload

```json
{
  "eventId": "uuid",
  "triggeredBy": "user_decline" | "timer_expiry" | "admin_removal"
}
```

#### Response

```json
{
  "success": true,
  "promoted": {
    "userId": "uuid",
    "email": "next@example.com",
    "queuePosition": 101
  },
  "emailSent": true
}
```

#### Logic Flow

1. Check `is_waterfall_active` flag
2. Call `promote_next_user()` stored procedure
3. Send invitation email via Resend
4. Schedule 30-min reminder email
5. Return promoted user details

---

### **2. Expire Invitations (Cron)**

**Function**: `supabase/functions/expire-invites/index.ts`

**Trigger**: Cron job (every 10 minutes)

**Schedule**: `*/10 * * * *`

#### Logic Flow

1. Query all registrations where `status = 'INVITED'` AND `expires_at < NOW()`
2. Update status to `EXPIRED`
3. For each expired registration, call waterfall function
4. Log expiry count to analytics

---

### **3. Send Reminder Emails**

**Function**: `supabase/functions/send-reminders/index.ts`

**Trigger**: Cron job (every 30 minutes)

**Schedule**: `*/30 * * * *`

#### Logic Flow

1. Query registrations where `status = 'INVITED'` AND `expires_at - NOW() < 30 minutes`
2. Check if reminder already sent (flag in metadata)
3. Send "30 minutes remaining" email
4. Mark reminder as sent

---

## Webhooks

### **Resend Email Delivery**

**POST** `/api/webhooks/resend`

Receive email delivery status from Resend.

#### Request (Resend sends this)

```json
{
  "type": "email.delivered",
  "created_at": "2024-12-31T12:00:00Z",
  "data": {
    "email_id": "uuid",
    "to": "user@example.com",
    "subject": "You've Been Invited! 🎉"
  }
}
```

#### Response (200 OK)

```json
{
  "received": true
}
```

#### Handled Events

- `email.delivered` → Update delivery status in logs
- `email.bounced` → Mark email as invalid, notify admin
- `email.opened` → Track engagement (optional)

---

## Rate Limits

| Endpoint               | Limit | Window    | Scope     |
| ---------------------- | ----- | --------- | --------- |
| `/api/auth/login`      | 5     | 1 hour    | Per email |
| `/api/auth/verify`     | 10    | 10 min    | Per IP    |
| `/api/events/register` | 1     | Per event | Per user  |
| `/api/events/respond`  | 3     | 1 hour    | Per user  |
| `/api/profile` (PATCH) | 10    | 1 hour    | Per user  |
| `/api/admin/*`         | 100   | 1 hour    | Per admin |

### **Rate Limit Response (429 Too Many Requests)**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 45 minutes.",
    "retryAfter": 2700 // seconds
  }
}
```

---

## Error Handling

### **Error Codes**

| Code                  | HTTP Status | Description                |
| --------------------- | ----------- | -------------------------- |
| `VALIDATION_ERROR`    | 400         | Invalid request payload    |
| `UNAUTHORIZED`        | 401         | Missing or invalid session |
| `FORBIDDEN`           | 403         | Insufficient permissions   |
| `NOT_FOUND`           | 404         | Resource not found         |
| `CONFLICT`            | 409         | Resource already exists    |
| `GONE`                | 410         | Resource expired           |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests          |
| `INTERNAL_ERROR`      | 500         | Server error               |

### **Error Response Format**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": {
      "field": "email",
      "reason": "Invalid format"
    },
    "requestId": "req_abc123", // For support
    "timestamp": "2024-12-31T12:00:00Z"
  }
}
```

---

## Testing

### **cURL Examples**

#### Register for Event

```bash
curl -X POST http://localhost:3000/api/events/register \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "eventId": "event-uuid-here"
  }'
```

#### Admin Rollout

```bash
curl -X POST http://localhost:3000/api/admin/events/event-uuid/rollout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=admin-session-cookie"
```

---

### **Postman Collection**

See [`postman/Reading-Room-API.json`](../postman/Reading-Room-API.json) for full collection with:

- All endpoints
- Environment variables
- Pre-request scripts for auth
- Test assertions

---

**Last Updated**: December 31, 2025  
**API Version**: 1.0  
**Maintained By**: Engineering Team
