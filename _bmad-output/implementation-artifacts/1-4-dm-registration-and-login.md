# Story 1.4: DM Registration & Login

Status: review

## Story

As a **DM**,
I want to create an account with email and password, log in, and log out,
So that my campaigns and encounters are saved to my account.

## Acceptance Criteria

1. **Given** the auth pages at `/auth/sign-up` and `/auth/login`, **When** a new user submits a valid email and password, **Then** an account is created via Supabase Auth and the user is redirected to `/app/dashboard`
2. **Given** registration, **Then** passwords are hashed via Supabase Auth (bcrypt, never stored in plaintext) (NFR12)
3. **Given** a registered user, **When** they log in with correct credentials, **Then** they are authenticated and redirected to `/app/dashboard`
4. **Given** a logged-in user, **When** they click logout, **Then** the session is destroyed and they are redirected to the landing page
5. **Given** an unauthenticated user, **When** they attempt to access `/app/*` routes, **Then** they are redirected to `/auth/login`
6. **Given** auth endpoints, **When** more than 10 login attempts are made from the same IP in 15 minutes, **Then** subsequent attempts are rate-limited (NFR14)

## Current State Assessment

### What Already Exists — FULLY IMPLEMENTED
- **Login page**: `app/auth/login/page.tsx` → `components/login-form.tsx` — Email/password form, redirects to `/app/dashboard` on success
- **Signup page**: `app/auth/sign-up/page.tsx` → `components/sign-up-form.tsx` — Email/password with confirm password, redirects to success page
- **Forgot password**: `app/auth/forgot-password/page.tsx` — Password reset flow
- **Update password**: `app/auth/update-password/page.tsx` — Password change from reset token
- **Auth callback**: `app/auth/confirm/route.ts` — Supabase email confirmation handler
- **Error page**: `app/auth/error/page.tsx` — Error display
- **Success page**: `app/auth/sign-up-success/page.tsx` — Post-signup confirmation
- **Logout**: `components/logout-button.tsx` — Calls `supabase.auth.signOut()` and redirects
- **Route protection**: `app/app/layout.tsx` — Server-side `getUser()` check, redirects to `/auth/login` if unauthenticated
- **User profile trigger**: Migration `006_auth_user_trigger.sql` — Auto-creates `users` table row on auth signup
- **Supabase client utilities**: `lib/supabase/server.ts` (cookie-based SSR), `lib/supabase/client.ts` (browser)

### What May Need Validation/Hardening
1. **Rate limiting (AC #6)**: Supabase Auth has built-in rate limiting, but verify configuration matches NFR14 (10 attempts / 15 min). No custom `middleware.ts` exists — may need one for additional protection.
2. **Redirect after logout (AC #4)**: Verify logout redirects to landing page (not `/auth/login`)
3. **Dark theme consistency**: Auth pages use default shadcn/ui card styling — may not match the app's dark theme (`#1a1a2e` background)
4. **WCAG 2.1 AA compliance**: Auth forms need minimum 44×44px tap targets, 16px minimum font, proper ARIA labels, keyboard navigation
5. **Error messaging**: Current error display is basic `<p className="text-sm text-red-500">` — should use Toast component for consistency

### What Needs To Be Done
This story is primarily a **validation and hardening** pass on the existing auth implementation. The core flow works. Focus on:
1. Verify all AC are met end-to-end
2. Apply dark theme styling to auth pages
3. Ensure WCAG 2.1 AA compliance on auth forms
4. Verify rate limiting configuration
5. Add middleware.ts if needed for auth route protection and rate limiting

## Tasks / Subtasks

- [ ] Task 1: Validate existing auth flow end-to-end (AC: #1, #2, #3, #4, #5)
  - [ ] 1.1 Test signup flow: email/password → success page → email confirmation → dashboard
  - [ ] 1.2 Test login flow: email/password → dashboard redirect
  - [ ] 1.3 Test logout: button click → session destroyed → landing page redirect
  - [ ] 1.4 Test route protection: unauthenticated access to `/app/dashboard` → redirect to `/auth/login`
  - [ ] 1.5 Verify user profile auto-creation trigger fires on signup
- [ ] Task 2: Dark theme and design consistency (UX-DR6, UX-DR7)
  - [ ] 2.1 Apply dark background (`#1a1a2e`) to auth page layouts
  - [ ] 2.2 Style auth cards to match surface color (`#16213e`) and accent (`#e94560`)
  - [ ] 2.3 Ensure Inter font is used for body text, 16px minimum
  - [ ] 2.4 Style error states with accent color, not raw red
- [ ] Task 3: WCAG 2.1 AA compliance (NFR20, NFR24, NFR25)
  - [ ] 3.1 Add proper `aria-label` and `aria-describedby` on form inputs
  - [ ] 3.2 Ensure all interactive elements have 44×44px minimum tap target
  - [ ] 3.3 Verify keyboard navigation (Tab through fields, Enter to submit)
  - [ ] 3.4 Ensure error messages are announced via `aria-live="polite"`
  - [ ] 3.5 Verify color contrast ratios meet AA (4.5:1 for text)
- [ ] Task 4: Rate limiting verification (AC: #6, NFR14)
  - [ ] 4.1 Check Supabase Auth rate limiting config (GoTrue settings)
  - [ ] 4.2 If Supabase built-in is insufficient, create `middleware.ts` with rate limiting logic for `/auth/*` routes
  - [ ] 4.3 Document rate limiting approach in dev notes
- [ ] Task 5: Error handling improvements
  - [ ] 5.1 Replace inline error `<p>` with Toast component (shadcn/ui) for auth errors
  - [ ] 5.2 Add specific error messages for common failures (invalid email, weak password, account exists)

## Dev Notes

### Auth Architecture
- **Supabase Auth** handles all authentication — no custom JWT or session management needed
- **Cookie-based sessions** via `@supabase/ssr` — required for SSR compatibility in Next.js App Router
- **Server-side check** in `app/app/layout.tsx` using `supabase.auth.getUser()` — this is the SSR guard
- **No middleware.ts exists** — auth redirect is handled at layout level, not middleware level
- **User profile trigger** (migration 006): `auth.users` INSERT → auto-creates `public.users` row

### Route Structure
```
app/
  auth/
    login/page.tsx          ← Login form
    sign-up/page.tsx        ← Registration form
    forgot-password/page.tsx ← Password reset request
    update-password/page.tsx ← Password reset confirmation
    confirm/route.ts        ← Supabase email callback
    error/page.tsx          ← Auth error display
    sign-up-success/page.tsx ← Post-signup success
  app/
    layout.tsx              ← Auth guard (redirects if not logged in)
    dashboard/page.tsx      ← Protected DM dashboard
```

### Supabase Client Files
- `lib/supabase/server.ts` — Server-side client (reads cookies for auth)
- `lib/supabase/client.ts` — Browser client (direct Supabase calls)
- Both are from the `with-supabase` starter template

### Anti-Patterns to Avoid
- **DO NOT create custom JWT handling** — Supabase Auth manages tokens/cookies
- **DO NOT add a separate auth middleware** unless rate limiting requires it — layout-level guard is sufficient and simpler
- **DO NOT modify the auth trigger migration** (006) — it works correctly
- **DO NOT add OAuth/social login** — V1 is email/password only per architecture
- **DO NOT move auth pages** from `/auth/` to `/(marketing)/` — they're already working at current routes

### Design Tokens for Auth Pages
- Background: `#1a1a2e`
- Surface/Card: `#16213e`
- Accent/CTA: `#e94560`
- Text primary: white
- Text secondary: `white/70`
- Font: Inter (body), 16px minimum
- Input focus ring: accent color

### Testing
- Manual testing of auth flows is sufficient for V1
- Existing test infrastructure (Jest + RTL) can be used for component tests if time permits
- Key test: unauthenticated redirect works consistently

### Project Structure Notes
- Auth pages are at `/auth/*` (not `/(auth)/*` route group) — this is intentional and matches the starter template
- The `app/app/layout.tsx` server component acts as the auth guard for all protected routes
- No middleware.ts exists in the project — this is fine for the current auth model

### References
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication section]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR6, UX-DR7]
- [Source: app/app/layout.tsx — Auth guard implementation]
- [Source: supabase/migrations/006_auth_user_trigger.sql — Profile auto-creation]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
