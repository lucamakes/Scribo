# Tech Stack Guidelines

This document defines the technology stack and patterns for this project. Follow these conventions when writing code.

## Core Stack

- **Framework**: Next.js latest (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: CSS Modules (`.module.css` files)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Polar
- **Analytics**: PostHog
- **Email**: Resend

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth route group
│   └── [feature]/         # Feature routes
├── components/            # React components
│   ├── ui/               # Primitives (Button, Input, Modal)
│   └── [Feature]/        # Feature components
├── lib/                   # Shared utilities
│   ├── supabase.ts       # Supabase client
│   ├── polar.ts          # Polar client
│   ├── posthog.ts        # PostHog client
│   ├── resend.ts         # Resend client
│   ├── services/         # Data services
│   ├── hooks/            # Custom hooks
│   └── utils/            # Helper functions
├── styles/               # Global styles and design tokens
│   └── design-tokens.css # CSS custom properties
└── types/                 # TypeScript types
```

## Polar Patterns

### Setup
```typescript
// src/lib/polar.ts
import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});
```

### Checkout Session
```typescript
const checkout = await polar.checkouts.create({
  productId,
  successUrl: `${origin}/success?checkout_id={CHECKOUT_ID}`,
  customerEmail: user.email,
  metadata: { supabase_user_id: user.id },
});
```

### Webhook Handler
```typescript
// src/app/api/polar/webhook/route.ts
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

export async function POST(req: Request) {
  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });
  
  const event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET!);
  
  switch (event.type) {
    case 'subscription.created':
      // Handle new subscription
      break;
    case 'subscription.updated':
      // Handle subscription changes
      break;
    case 'subscription.canceled':
      // Handle cancellation
      break;
  }
  
  return Response.json({ received: true });
}
```

## PostHog Patterns

### Setup
```typescript
// src/lib/posthog.ts
import posthog from 'posthog-js'

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // Handle manually in App Router
    })
  }
}
```

### Event Tracking
```typescript
import posthog from 'posthog-js'

// Track events
posthog.capture('button_clicked', { button_name: 'signup' })

// Identify users
posthog.identify(user.id, { email: user.email, plan: 'pro' })
```

## Resend Patterns

### Setup
```typescript
// src/lib/resend.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
```

### Send Email
```typescript
await resend.emails.send({
  from: 'App <noreply@yourdomain.com>',
  to: user.email,
  subject: 'Welcome!',
  react: WelcomeEmail({ name: user.name }),
})
```

## CSS Modules Patterns

### Component Styling
```tsx
// ComponentName.tsx
import styles from './ComponentName.module.css'

export function ComponentName() {
  return (
    <button className={styles.button}>
      Click me
    </button>
  )
}
```

### Using Design Tokens
```css
/* ComponentName.module.css */
.button {
  padding: 10px 20px;
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-btn);
  color: var(--color-bg-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.button:hover:not(:disabled) {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}
```

### Conditional Classes
```tsx
import styles from './Button.module.css'

<button className={`${styles.button} ${variant === 'primary' ? styles.primary : styles.secondary}`}>
```

### File Structure
- Each component has its own `.module.css` file
- Import design tokens via CSS custom properties (defined in `src/styles/design-tokens.css`)
- Never hardcode colors — always use `var(--color-*)` tokens

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Polar
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
NEXT_PUBLIC_POLAR_PRODUCT_MONTHLY=
NEXT_PUBLIC_POLAR_PRODUCT_YEARLY=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Resend
RESEND_API_KEY=
```

## API Route Patterns

### Standard Response Format
```typescript
// Success
return Response.json({ data: result })

// Error
return Response.json({ error: 'Message' }, { status: 400 })
```

### Auth Check
```typescript
export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Verify user from request or token
  // Continue with authenticated user
}
```

## Component Patterns

### Client Components
```tsx
'use client'

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Server Components (default)
```tsx
// No 'use client' directive needed
export default async function Page() {
  // Server-side data fetching
  return <ItemList items={data} />
}
```

## TypeScript Conventions

- Use `interface` for object shapes, `type` for unions/primitives
- Export types from `src/types/` for shared types
- Use strict mode (`"strict": true` in tsconfig)
- Prefer explicit return types on exported functions

## File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `camelCase.ts` or inline
- API routes: `route.ts`
- Pages: `page.tsx`
- Layouts: `layout.tsx`
