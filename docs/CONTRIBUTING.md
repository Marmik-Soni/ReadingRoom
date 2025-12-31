# 🤝 Contributing Guide

> **Development Workflow & Standards for The Reading Room Engine**

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Component Guidelines](#component-guidelines)
5. [Database Changes](#database-changes)
6. [Testing](#testing)
7. [Pull Request Process](#pull-request-process)
8. [Git Conventions](#git-conventions)

---

## Getting Started

### **Prerequisites**

- Node.js 18+
- pnpm (recommended) or npm
- Git
- VS Code (recommended)
- Supabase CLI

### **Recommended VS Code Extensions**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "supabase.supabase-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### **First-Time Setup**

```bash
# 1. Fork and clone repository
git clone https://github.com/YOUR_USERNAME/reading-room-engine.git
cd reading-room-engine

# 2. Install dependencies
pnpm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Fill in .env.local with your Supabase credentials
# (Get these from Supabase Dashboard)

# 5. Run database migrations
pnpm supabase db push

# 6. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to verify setup.

---

## Development Workflow

### **Branch Strategy**

```
main (production)
  ↓
  └─ dev (staging)
      ↓
      ├─ feature/user-profile-page
      ├─ feature/admin-vip-management
      ├─ fix/email-lock-bug
      └─ refactor/api-error-handling
```

**Branch Naming Convention:**

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code improvements
- `docs/description` - Documentation updates
- `test/description` - Test additions

### **Typical Development Cycle**

```bash
# 1. Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/countdown-timer

# 2. Make changes and commit frequently
git add .
git commit -m "feat: add countdown timer component"

# 3. Keep branch updated with dev
git fetch origin
git rebase origin/dev

# 4. Push to your fork
git push origin feature/countdown-timer

# 5. Open Pull Request to dev branch
# (Use GitHub UI)

# 6. After review and approval, merge to dev
# 7. Weekly: dev is merged to main (production release)
```

---

## Code Standards

### **TypeScript**

✅ **DO:**

```typescript
// Use explicit types
interface Event {
  id: string;
  eventDate: Date;
  venue: Venue;
}

// Use named exports
export function formatEventDate(date: Date): string {
  return dayjs(date).format("MMMM D, YYYY");
}

// Use async/await over promises
async function getEvent(id: string): Promise<Event> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}
```

❌ **DON'T:**

```typescript
// Avoid 'any' type
function processData(data: any) { ... }

// Avoid default exports
export default function MyComponent() { ... }

// Avoid promise chaining when async/await is cleaner
supabase.from('events').select('*').then(data => { ... });
```

### **React/Next.js**

✅ **DO:**

```typescript
// Use Server Components by default
async function EventPage({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id);
  return <EventDetails event={event} />;
}

// Use Client Components only when needed
'use client';
import { useState } from 'react';

export function CountdownTimer({ expiresAt }: { expiresAt: Date }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(expiresAt));
  // ... component logic
}

// Use proper TypeScript props
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  return (
    <button className={cn('btn', `btn-${variant}`)} onClick={onClick}>
      {children}
    </button>
  );
}
```

❌ **DON'T:**

```typescript
// Don't mark everything as 'use client'
'use client'; // Unnecessary if no hooks/interactivity

// Don't use untyped props
export function Button(props) { ... }
```

### **Styling (Tailwind CSS)**

✅ **DO:**

```typescript
// Use Tailwind utilities
<button className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition">
  Register
</button>

// Use cn() helper for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'danger' && 'text-red-500'
)}>
  Content
</div>

// Extract repeated patterns into components
<Button variant="primary" size="lg">Submit</Button>
```

❌ **DON'T:**

```typescript
// Avoid inline styles
<div style={{ backgroundColor: '#000', color: '#fff' }}>...</div>

// Avoid string concatenation for classes
<div className={'btn ' + (isActive ? 'active' : '')}>...</div>
```

### **File Naming**

```
✅ Good:
components/admin/EventForm.tsx
lib/utils/datetime.ts
app/api/events/register/route.ts

❌ Bad:
components/admin/event_form.tsx
lib/utils/DateTime.ts
app/api/events/Register.ts
```

**Convention:**

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Routes: `lowercase/route.ts`

---

## Component Guidelines

### **Component Structure**

```typescript
// 1. Imports (external → internal → types)
import { useState } from 'react';
import { Button } from '@/components/shared/Button';
import type { Event } from '@/types';

// 2. Types/Interfaces
interface EventCardProps {
  event: Event;
  onRegister: (eventId: string) => void;
}

// 3. Component
export function EventCard({ event, onRegister }: EventCardProps) {
  // 3a. Hooks (state, effects, queries)
  const [isLoading, setIsLoading] = useState(false);

  // 3b. Event handlers
  const handleRegister = async () => {
    setIsLoading(true);
    await onRegister(event.id);
    setIsLoading(false);
  };

  // 3c. Render helpers (if complex)
  const renderVenue = () => {
    return <div>{event.venue.name}</div>;
  };

  // 3d. Return JSX
  return (
    <div className="event-card">
      <h3>{event.venue.name}</h3>
      <Button onClick={handleRegister} disabled={isLoading}>
        {isLoading ? 'Registering...' : 'Register'}
      </Button>
    </div>
  );
}
```

### **State Management**

**Server State (API Data):**

```typescript
// Use TanStack Query
import { useQuery, useMutation } from "@tanstack/react-query";

function UserDashboard() {
  const { data: status } = useQuery({
    queryKey: ["registration-status"],
    queryFn: getRegistrationStatus,
    refetchInterval: 10000, // Poll every 10s
  });

  const registerMutation = useMutation({
    mutationFn: registerForEvent,
    onSuccess: () => {
      queryClient.invalidateQueries(["registration-status"]);
    },
  });
}
```

**UI State (Component-Specific):**

```typescript
// Use useState for simple UI state
const [isOpen, setIsOpen] = useState(false);

// Use useReducer for complex state
const [state, dispatch] = useReducer(formReducer, initialState);
```

---

## Database Changes

### **Creating Migrations**

```bash
# 1. Make changes to database schema
# Edit: supabase/migrations/XXX_description.sql

# 2. Test locally
supabase db reset # Resets to clean state
supabase db push  # Applies all migrations

# 3. Verify changes
psql postgres://postgres:postgres@localhost:54322/postgres
\dt # List tables
\d registrations # Describe table
```

### **Migration File Template**

```sql
-- Migration: Add is_featured to event_feedback
-- Created: 2024-12-31
-- Author: Your Name

-- Add column
ALTER TABLE event_feedback
ADD COLUMN is_featured BOOLEAN DEFAULT false;

-- Create index
CREATE INDEX idx_event_feedback_featured
ON event_feedback(is_featured, created_at DESC)
WHERE is_featured = true;

-- Update RLS policy (if needed)
DROP POLICY IF EXISTS "event_feedback_public_read" ON event_feedback;

CREATE POLICY "event_feedback_public_read"
ON event_feedback FOR SELECT
USING (is_featured = true);
```

### **Database Best Practices**

✅ **DO:**

- Use transactions for multi-step operations
- Add indexes for frequently queried columns
- Use constraints to enforce data integrity
- Write reversible migrations (include rollback)

❌ **DON'T:**

- Modify existing migrations (create new ones instead)
- Delete data without backups
- Remove constraints without careful consideration

---

## Testing

### **Unit Tests (Components)**

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByText('Click')).toBeDisabled();
  });
});
```

### **API Tests (Edge Functions)**

```typescript
// waterfall.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("Waterfall promotes next user", async () => {
  const response = await fetch("http://localhost:54321/functions/v1/waterfall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: "test-event-id",
      triggeredBy: "test",
    }),
  });

  const data = await response.json();
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
});
```

### **Running Tests**

```bash
# Unit tests
pnpm test

# Unit tests (watch mode)
pnpm test:watch

# Edge function tests
supabase functions serve
pnpm test:functions
```

---

## Pull Request Process

### **Before Opening PR**

- [ ] Code follows style guide
- [ ] All tests pass (`pnpm test`)
- [ ] No TypeScript errors (`pnpm tsc --noEmit`)
- [ ] No ESLint errors (`pnpm lint`)
- [ ] Tested locally (manual QA)
- [ ] Updated documentation (if needed)
- [ ] Added tests for new features

### **PR Template**

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues

Closes #123

## Changes Made

- Added countdown timer component
- Updated registration API to include timer
- Added tests for timer logic

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases considered

## Screenshots (if UI changes)

[Add screenshots here]

## Checklist

- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console logs/debugger statements
```

### **Review Process**

1. **Self-Review**: Review your own diff before requesting review
2. **Request Review**: Assign 1-2 reviewers
3. **Address Feedback**: Respond to all comments
4. **Re-request Review**: After making changes
5. **Merge**: Only after approval + CI passes

### **Merge Strategy**

```
feature/my-feature → dev: Squash and merge
dev → main: Merge commit (preserves history)
```

---

## Git Conventions

### **Commit Messages**

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Tooling/config changes

**Examples:**

```bash
# Good
feat(auth): add magic link authentication
fix(waterfall): prevent race condition in promotion logic
docs(api): update registration endpoint documentation
refactor(components): extract reusable Button component

# Bad
fixed bug
update code
WIP
asdfasdf
```

### **Commit Guidelines**

✅ **DO:**

- Write clear, descriptive messages
- Commit frequently (small, logical changes)
- Reference issues: `fix(auth): resolve email lock bug (#42)`

❌ **DON'T:**

- Commit commented-out code
- Commit `.env` files
- Create massive commits with unrelated changes
- Use generic messages ("fix", "update")

---

## Code Review Guidelines

### **As a Reviewer**

✅ **DO:**

- Be constructive and respectful
- Explain the "why" behind suggestions
- Approve if changes are minor (don't block on formatting)
- Test the changes locally if complex

**Good Feedback:**

```
Consider using useMemo here to avoid recalculating on every render:
const sortedEvents = useMemo(() => events.sort(...), [events]);
```

**Bad Feedback:**

```
This is wrong.
```

### **As an Author**

✅ **DO:**

- Respond to all comments (even if just 👍)
- Ask questions if feedback is unclear
- Push fixes as separate commits (easier to review)
- Thank reviewers!

---

## Questions & Support

### **Where to Ask**

- **Bug Reports**: [GitHub Issues](https://github.com/your-repo/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Development Help**: [Discord Channel](#) (if applicable)
- **Security Issues**: Email security@readingroom.com (private)

### **Before Asking**

1. Check existing issues/discussions
2. Review documentation
3. Try debugging yourself (use `console.log`, breakpoints)
4. Create a minimal reproduction

---

## Project Values

### **Code Quality**

- "Make it work, then make it right, then make it fast"
- Readability > Cleverness
- DRY (Don't Repeat Yourself) but don't over-abstract

### **User Experience**

- Performance matters (aim for <2s page loads)
- Accessibility is non-negotiable (use semantic HTML, ARIA)
- Mobile-first design (test on real devices)

### **Community**

- Be kind and inclusive
- Help new contributors
- Document tribal knowledge
- Celebrate wins together 🎉

---

**Welcome to the team!** 🚀

If you have questions about this guide, open an issue or ask in Discord.

---

**Last Updated**: December 31, 2025  
**Version**: 1.0  
**Maintained By**: Engineering Team
