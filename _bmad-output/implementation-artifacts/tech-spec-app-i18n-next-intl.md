---
title: 'App Internationalization (i18n) with next-intl'
slug: 'app-i18n-next-intl'
created: '2026-03-24'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 15.3 (App Router)', 'React 19', 'TypeScript 5', 'next-intl', 'Supabase SSR', 'Zustand 5', 'next-themes 0.4', 'Jest 30', '@testing-library/react 16']
files_to_modify: ['next.config.ts', 'middleware.ts (new)', 'i18n/request.ts (new)', 'i18n/routing.ts (new)', 'messages/pt-BR.json (new)', 'messages/en.json (new)', 'app/layout.tsx', 'app/app/layout.tsx', 'app/app/settings/page.tsx', 'app/app/dashboard/page.tsx', 'app/auth/login/page.tsx', 'app/auth/sign-up/page.tsx', 'lib/types/database.ts', 'lib/supabase/user.ts (new)', 'supabase/migrations/010_add_user_language_preference.sql (new)', 'components/combat/CombatantRow.tsx', 'components/combat/AddCombatantForm.tsx', 'components/combat/CombatantSetupRow.tsx', 'components/combat/EncounterSetup.tsx', 'components/session/CombatSessionClient.tsx', 'components/settings/LanguageSwitcher.tsx (new)', 'components/combat/ConditionSelector.tsx', 'components/player/PlayerInitiativeBoard.tsx', 'app/admin/*']
code_patterns: ['ThemeProvider wraps children in root layout (NextIntlClientProvider goes outside)', 'Async server components for pages (use getTranslations)', 'Supabase client created per-request via lib/supabase/server.ts', 'Zustand stores for combat state', 'shadcn/ui components with Tailwind', 'data-testid pattern in tests']
test_patterns: ['Jest 30 + @testing-library/react 16 + jsdom', 'jest.mock() for dependencies', 'screen.getByText/getByTestId assertions', 'Will need useTranslations mock in test setup']
---

# Tech-Spec: App Internationalization (i18n) with next-intl

**Created:** 2026-03-24

## Overview

### Problem Statement

The app has ~440 hardcoded strings in a mix of PT-BR (landing page) and EN (dashboard, combat, auth, admin). There's no way for users to switch language or persist their preference. The main audience is Brazilian but the app needs to support EN as well.

### Solution

Implement `next-intl` with cookie-based locale detection (no URL restructuring). PT-BR as default locale. Persist preference in Supabase user profile + cookie. Language switcher in Settings page. SRD game terms (conditions, spell names, monster names) stay in English by default but are configurable per-user in preferences.

### Scope

**In Scope:**
- Install & configure `next-intl` (cookie-based, no `[locale]` route segments)
- Create translation JSON files for PT-BR and EN
- Extract ~300+ hardcoded strings across all components (dashboard, combat, auth, admin, settings)
- Landing page stays PT-BR only (not translated)
- SRD terms default to English, with user-configurable override in preferences
- Supabase migration: add `preferred_language` to users table
- Middleware for locale detection (cookie → Accept-Language → default PT-BR)
- Language switcher in Settings page
- Preference persistence: Supabase (logged in) + cookie (fallback)
- Translate admin panel fully

**Out of Scope:**
- `[locale]` URL segments / route restructuring
- Landing page EN translation
- SRD data content translation (only UI labels around SRD)
- Third language support (just EN + PT-BR for now)

## Context for Development

### Codebase Patterns

- **Provider chain:** Root layout → `ThemeProvider` (next-themes) → children. `NextIntlClientProvider` must wrap outside `ThemeProvider`.
- **Root `<html>` tag** has `lang="en"` hardcoded at `app/layout.tsx:44` — must become dynamic.
- **Async server components:** Dashboard page, app layout, settings page are all async server components. Use `getTranslations()` for server-side i18n.
- **Client components:** Combat components use `"use client"`. Use `useTranslations()` hook.
- **Supabase client:** Created per-request via `lib/supabase/server.ts`. No user profile helpers exist yet.
- **State management:** Zustand stores for combat. Locale should NOT go into combat store — keep separate.
- **UI framework:** shadcn/ui (Radix) + Tailwind. Font: Cinzel (headings), Plus Jakarta Sans (body).
- **File naming:** kebab-case for files, PascalCase for components.
- **No middleware exists** — will create fresh `middleware.ts` at root.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `app/layout.tsx` | Root layout — providers, `<html lang>` tag, ThemeProvider |
| `app/app/layout.tsx` | Authenticated layout — nav labels, sidebar links |
| `app/app/settings/page.tsx` | Settings page — where language switcher goes |
| `app/app/dashboard/page.tsx` | Dashboard — headings, descriptions, buttons |
| `next.config.ts` | Next.js config — needs next-intl plugin wrapper |
| `lib/types/database.ts` | DB types — needs `preferred_language` field on users |
| `lib/supabase/server.ts` | Supabase client factory — reference for new user.ts |
| `supabase/migrations/009_fix_rls_recursion.sql` | Latest migration — next is 010 |
| `components/combat/CombatantRow.tsx` | Heaviest component (~25 strings) |
| `components/session/CombatSessionClient.tsx` | Session orchestrator (~15 strings) |
| `components/combat/ConditionSelector.tsx` | D&D conditions — SRD terms in English |
| `app/auth/login/page.tsx` | Auth form — labels, validation messages |

### Technical Decisions

1. **Cookie-based locale** — no `[locale]` URL segments, simpler migration. next-intl supports this via `createMiddleware` with `localePrefix: 'never'`.
2. **PT-BR default** — main audience is Brazilian. Fallback chain: cookie → Accept-Language → `pt-BR`.
3. **SRD terms in English by default** — standard D&D terminology, configurable per-user in preferences.
4. **Landing page PT-BR only** — not translated, stays as-is. Excluded from i18n extraction.
5. **Preference persistence** — Supabase `preferred_language` column (logged in) + `NEXT_LOCALE` cookie (fallback/anonymous).
6. **Provider order** — `NextIntlClientProvider` wraps `ThemeProvider` in root layout.
7. **Translation file structure** — Single JSON per locale (`messages/pt-BR.json`, `messages/en.json`) with namespaced keys (e.g., `dashboard.title`, `combat.actions.damage`).
8. **Test strategy** — Mock `useTranslations()` globally in Jest setup. Use `data-testid` for assertions instead of text matching where possible.

## Implementation Plan

### Tasks

Tasks are ordered by dependency (infrastructure first, then integration, then string extraction).

- [ ] **Task 1: Install next-intl & Create Configuration Files**
  - File: `package.json` — run `npm install next-intl`
  - File: `i18n/request.ts` (new) — Create next-intl request configuration:
    ```ts
    import { getRequestConfig } from 'next-intl/server';
    import { cookies } from 'next/headers';

    export const locales = ['pt-BR', 'en'] as const;
    export type Locale = (typeof locales)[number];
    export const defaultLocale: Locale = 'pt-BR';

    export default getRequestConfig(async () => {
      const cookieStore = await cookies();
      const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || defaultLocale;
      return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
      };
    });
    ```
  - File: `next.config.ts` — Wrap with next-intl plugin:
    ```ts
    import createNextIntlPlugin from 'next-intl/plugin';
    const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
    // ... existing config ...
    export default withNextIntl(nextConfig);
    ```
  - Notes: `i18n/request.ts` uses cookie-based locale detection. No `[locale]` routing needed. The `getRequestConfig` function runs on every request to resolve the active locale from the `NEXT_LOCALE` cookie.

- [ ] **Task 2: Create Middleware for Locale Detection**
  - File: `middleware.ts` (new, project root) — Create locale detection middleware:
    ```ts
    import createMiddleware from 'next-intl/middleware';
    import { locales, defaultLocale } from './i18n/request';

    export default createMiddleware({
      locales,
      defaultLocale,
      localePrefix: 'never', // No /pt-BR/ or /en/ in URLs
      localeDetection: true,  // Detect from Accept-Language header
    });

    export const config = {
      // Match all routes except static files, API routes, and _next
      matcher: ['/((?!api|_next|.*\\..*).*)'],
    };
    ```
  - Notes: `localePrefix: 'never'` is the key setting — it keeps URLs clean (no `/en/dashboard`). The middleware sets the `NEXT_LOCALE` cookie automatically based on Accept-Language header on first visit, and respects existing cookie on subsequent visits.

- [ ] **Task 3: Create Translation JSON Files**
  - File: `messages/pt-BR.json` (new) — Complete PT-BR translations with 348 keys across 12 namespaces:
    - Namespaces: `common`, `nav`, `auth`, `dashboard`, `onboarding`, `combat`, `session`, `player`, `oracle`, `settings`, `admin`, `conditions`
    - Structure: flat namespaced keys (e.g., `{"common": {"save": "Salvar"}, "nav": {"dashboard": "Dashboard"}}`)
    - All PT-BR values from the string inventory
  - File: `messages/en.json` (new) — Complete EN translations with identical key structure
    - All EN values from the string inventory
  - Notes: Both files must have identical key structures. The `conditions` namespace contains D&D SRD terms — PT-BR translations are provided but users can configure whether to show English or translated condition names. See string inventory for all 348 key-value pairs.

- [ ] **Task 4: Supabase Migration — Add Language Preference**
  - File: `supabase/migrations/010_add_user_language_preference.sql` (new):
    ```sql
    -- Add language preference column to users table
    ALTER TABLE public.users
      ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'pt-BR';

    -- Add check constraint for supported locales
    ALTER TABLE public.users
      ADD CONSTRAINT users_preferred_language_check
      CHECK (preferred_language IN ('pt-BR', 'en'));
    ```
  - File: `lib/types/database.ts` — Add `preferred_language` to users Row, Insert, and Update types:
    ```ts
    preferred_language: string; // Row
    preferred_language?: string; // Insert (has default)
    preferred_language?: string; // Update
    ```
  - Notes: Default is `pt-BR` (matching app default). Check constraint enforces supported locales only. Migration number is 010, following the existing 009_fix_rls_recursion.sql.

- [ ] **Task 5: Create User Language Preference Helpers**
  - File: `lib/supabase/user.ts` (new) — User profile helpers:
    ```ts
    import { createClient } from './server';

    export async function getUserLanguagePreference(): Promise<string> {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'pt-BR';
      const { data } = await supabase
        .from('users')
        .select('preferred_language')
        .eq('id', user.id)
        .single();
      return data?.preferred_language || 'pt-BR';
    }

    export async function updateUserLanguagePreference(locale: string): Promise<void> {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('users')
        .update({ preferred_language: locale })
        .eq('id', user.id);
    }
    ```
  - Notes: These functions use the existing Supabase client factory pattern from `lib/supabase/server.ts`. Called from server components and server actions.

- [ ] **Task 6: Integrate NextIntlClientProvider into Root Layout**
  - File: `app/layout.tsx` — Modifications:
    1. Import `NextIntlClientProvider` from `next-intl`
    2. Import `getMessages, getLocale` from `next-intl/server`
    3. Make `RootLayout` async (if not already)
    4. Call `const locale = await getLocale()` and `const messages = await getMessages()`
    5. Change `<html lang="en">` to `<html lang={locale}>`
    6. Wrap children with `<NextIntlClientProvider messages={messages}>` outside `ThemeProvider`
  - Notes: This is the critical integration point. All client components below this will have access to `useTranslations()`. The `getLocale()` reads from the cookie set by middleware.

- [ ] **Task 7: Create Language Switcher Component**
  - File: `components/settings/LanguageSwitcher.tsx` (new) — Client component:
    ```tsx
    'use client';
    import { useLocale, useTranslations } from 'next-intl';
    import { useRouter } from 'next/navigation';
    import { useTransition } from 'react';

    export function LanguageSwitcher() {
      const locale = useLocale();
      const t = useTranslations('settings');
      const router = useRouter();
      const [isPending, startTransition] = useTransition();

      async function onChange(newLocale: string) {
        // Set cookie
        document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
        // Update Supabase preference via server action
        await fetch('/api/user/language', {
          method: 'POST',
          body: JSON.stringify({ locale: newLocale }),
        });
        // Refresh page to apply new locale
        startTransition(() => router.refresh());
      }

      return (
        <div>
          <h2>{t('language_title')}</h2>
          <p>{t('language_description')}</p>
          <select value={locale} onChange={(e) => onChange(e.target.value)} disabled={isPending}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
          </select>
        </div>
      );
    }
    ```
  - File: `app/api/user/language/route.ts` (new) — API route for persisting preference:
    ```ts
    import { updateUserLanguagePreference } from '@/lib/supabase/user';
    import { NextResponse } from 'next/server';

    export async function POST(request: Request) {
      const { locale } = await request.json();
      await updateUserLanguagePreference(locale);
      return NextResponse.json({ ok: true });
    }
    ```
  - File: `app/app/settings/page.tsx` — Import and render `<LanguageSwitcher />` before `<AccountDeletion />`
  - Notes: The LanguageSwitcher sets both cookie (for middleware) and Supabase column (for persistence across devices). `router.refresh()` triggers a soft refresh that re-runs server components with the new locale. Style the select with shadcn/ui Select component to match existing UI patterns.

- [ ] **Task 8: Extract Strings — Auth Pages**
  - Files: `components/login-form.tsx`, `components/sign-up-form.tsx`, `components/forgot-password-form.tsx`, `components/update-password-form.tsx`
  - Action: For each file:
    1. Add `import { useTranslations } from 'next-intl';` (these are client components)
    2. Add `const t = useTranslations('auth');` at top of component
    3. Replace all hardcoded strings with `t('key')` calls using keys from `auth` namespace
  - Keys: `auth.login.title`, `auth.login.description`, `auth.login.email_label`, `auth.login.password_label`, `auth.login.forgot_password`, `auth.login.submit`, `auth.login.submit_idle`, `auth.login.no_account`, `auth.login.signup_link`, `auth.signup.title`, `auth.signup.description`, `auth.signup.repeat_password_label`, `auth.signup.error_passwords_mismatch`, `auth.signup.submit`, `auth.signup.submit_idle`, `auth.signup.have_account`, `auth.signup.login_link`, `auth.forgot_password.title`, `auth.forgot_password.description`, `auth.forgot_password.submit`, `auth.forgot_password.submit_idle`, `auth.forgot_password.success`, `auth.forgot_password.login_link`, `auth.update_password.title`, `auth.update_password.description`, `auth.update_password.new_password_label`, `auth.update_password.submit`, `auth.update_password.submit_idle`, `auth.update_password.success`, `common.errors.generic` (from `common` namespace)
  - Notes: Auth forms are all client components (`"use client"`). Use `useTranslations()` hook. Error messages use both `auth` and `common` namespaces.

- [ ] **Task 9: Extract Strings — Navigation & Layout**
  - File: `app/app/layout.tsx` — Server component. Use `getTranslations('nav')`:
    - Replace: "Skip to main content", "RPG Tracker", "Dashboard", "Settings", "Attribution", "Privacy"
  - File: `components/layout/Navbar.tsx` — Client component. Use `useTranslations('nav')`:
    - Replace brand text and navigation labels
  - File: `components/marketing/Footer.tsx` — Use `useTranslations('nav')`:
    - Replace: "Sign Up", "Combat tracker for D&D 5e Masters", "Attribution", "Privacy"
  - Notes: Navigation strings are shared between app layout and marketing footer via the `nav` namespace.

- [ ] **Task 10: Extract Strings — Dashboard & Onboarding**
  - File: `app/app/dashboard/page.tsx` — Server component. Use `getTranslations('dashboard')`:
    - Replace: "Dashboard", "Manage your campaigns and start combat encounters.", "New Combat Session"
  - File: `components/dashboard/CampaignManager.tsx` — Client component. Use `useTranslations('dashboard')`:
    - Replace all campaign management labels, buttons, empty states, form fields
  - File: `components/dashboard/SavedEncounters.tsx` — Use `useTranslations('dashboard')`:
    - Replace encounter list labels and empty states
  - File: `components/dashboard/PlayerCharacterManager.tsx` — Use `useTranslations('dashboard')`:
    - Replace all player character form labels, buttons, validation messages
  - File: `components/dashboard/OnboardingWizard.tsx` — Use `useTranslations('onboarding')`:
    - Replace all 4 step titles, descriptions, button labels, form fields (~40 strings)
  - Notes: Dashboard namespace is the second heaviest after combat. OnboardingWizard has its own namespace due to its distinct UX flow.

- [ ] **Task 11: Extract Strings — Combat System**
  - File: `components/combat/CombatantRow.tsx` — Use `useTranslations('combat')`:
    - Replace ~25 strings: HP labels, action buttons (Defeat, Revive, Edit, Remove, Cond), aria-labels, notes titles, stat labels (AC, DC)
  - File: `components/combat/AddCombatantForm.tsx` — Use `useTranslations('combat')`:
    - Replace: form labels (Name, HP, AC, Initiative, Spell DC), placeholders, "Add to Combat" button
  - File: `components/combat/CombatantSetupRow.tsx` — Use `useTranslations('combat')`:
    - Replace: placeholders (Init, Name, HP, AC, Notes), "Player" badge, "Remove" button, aria-labels
  - File: `components/combat/EncounterSetup.tsx` — Use `useTranslations('combat')`:
    - Replace: "Encounter Setup" title, "Add Combatant" heading, "Start Combat" button, monster search integration labels, error messages, version selector labels
  - File: `components/combat/HpAdjuster.tsx` — Use `useTranslations('combat')`:
    - Replace: "Dmg", "Heal", "Temp" mode buttons, "Apply" button, "Close HP adjuster" aria-label
  - File: `components/combat/StatsEditor.tsx` — Use `useTranslations('combat')`:
    - Replace: form labels (Name, Max HP, AC, Spell DC), Save/Cancel buttons
  - File: `components/combat/ConditionSelector.tsx` — Use `useTranslations('conditions')`:
    - Replace all 13 D&D condition names with i18n keys from `conditions` namespace
    - Replace "Done" button with `combat.condition_done`
  - File: `components/combat/SortableCombatantList.tsx` — Use `useTranslations('combat')` if it has labels
  - Notes: Combat is the heaviest namespace (~80 strings). Condition names use a separate `conditions` namespace since they're SRD terms that the user may want in English regardless of UI language.

- [ ] **Task 12: Extract Strings — Session Management**
  - File: `components/session/CombatSessionClient.tsx` — Use `useTranslations('combat')`:
    - Replace: "Round", "combatants", "End", "+ Add", "Next Turn →", "Saving…", "Initiative order"
  - File: `components/session/ShareSessionButton.tsx` — Use `useTranslations('session')`:
    - Replace: "Share Session", "Generating...", "Session join link", "Copy", "Copied!", error messages
  - File: `components/session/CampaignLoader.tsx` — Use `useTranslations('session')`:
    - Replace: "Load Campaign", "Load Player Group", "Loading campaigns…", "No campaigns found.", campaign empty state, "Load" button, player count labels
  - File: `components/session/RulesetSelector.tsx` — Use `useTranslations('session')`:
    - Replace: "Ruleset:", "Ruleset version" aria-label
  - Notes: Session namespace handles session lifecycle. Combat-related strings within CombatSessionClient use the `combat` namespace for consistency.

- [ ] **Task 13: Extract Strings — Player View**
  - File: `components/player/PlayerJoinClient.tsx` — Use `useTranslations('player')`:
    - Replace: "Connecting to session...", "Connection Error", "Waiting for the DM to start combat...", "Round", spell oracle labels
  - File: `components/player/PlayerInitiativeBoard.tsx` — Use `useTranslations('player')`:
    - Replace: "HP", "temp" labels
  - File: `components/player/SyncIndicator.tsx` — Use `useTranslations('player')`:
    - Replace: "Connected", "Connecting...", "Reconnecting..."
  - File: `app/join/[token]/page.tsx` — Server component. Use `getTranslations('player')`:
    - Replace: "Session Not Found", "Session Ended", and their descriptions
  - Notes: Player view is accessed by unauthenticated users via join links. The NEXT_LOCALE cookie still applies, and Accept-Language header detection works for first-time visitors.

- [ ] **Task 14: Extract Strings — Oracle (SRD Search)**
  - File: `components/oracle/MonsterSearch.tsx` — Use `useTranslations('oracle')`:
    - Replace: search labels, placeholders, "No monsters found for", "+ Add" button, "CR" label, aria-labels
  - File: `components/oracle/SpellSearch.tsx` — Use `useTranslations('oracle')`:
    - Replace: search labels, placeholders, "No spells found for", spell level labels ("Cantrip", "Lvl"), aria-labels
  - File: `components/oracle/ConditionLookup.tsx` — Use `useTranslations('oracle')`:
    - Replace: "Conditions" title, "All Versions", "View rules", "No conditions loaded.", aria-labels
  - Notes: SRD data content (monster names, spell descriptions) stays in English — only UI chrome around the search is translated.

- [ ] **Task 15: Extract Strings — Settings & Admin**
  - File: `app/app/settings/page.tsx` — Server component. Use `getTranslations('settings')`:
    - Replace: "Account Settings", "Manage your account preferences and data."
  - File: `components/settings/AccountDeletion.tsx` — Use `useTranslations('settings')`:
    - Replace: "Danger Zone", delete account descriptions, confirmation dialog texts
  - File: `app/admin/page.tsx` — Use `getTranslations('admin')`:
    - Replace: "Usage Metrics", description
  - File: `app/admin/users/page.tsx` — Use `getTranslations('admin')`:
    - Replace: "User Management", description
  - File: `app/admin/content/monsters/page.tsx` — Use `getTranslations('admin')`:
    - Replace: "Monster Content", description
  - File: `app/admin/content/spells/page.tsx` — Use `getTranslations('admin')`:
    - Replace: "Spell Content", description
  - Notes: Admin pages are server components. Settings uses both server (`getTranslations`) and client (`useTranslations`) patterns.

- [ ] **Task 16: Add i18n Test Utilities & Update Existing Tests**
  - File: `lib/test-utils.ts` or `jest.setup.ts` — Add global `useTranslations` mock:
    ```ts
    jest.mock('next-intl', () => ({
      useTranslations: (namespace?: string) => {
        return (key: string, params?: Record<string, unknown>) => {
          const fullKey = namespace ? `${namespace}.${key}` : key;
          if (params) {
            return Object.entries(params).reduce(
              (str, [k, v]) => str.replace(`{${k}}`, String(v)),
              fullKey
            );
          }
          return fullKey;
        };
      },
      useLocale: () => 'pt-BR',
    }));
    ```
  - Files: All existing test files that assert on text content — update assertions to match i18n keys or use `data-testid`:
    - `components/combat/CombatantRow.test.tsx`
    - `components/combat/CombatantSetupRow.test.tsx`
    - `components/combat/EncounterSetup.test.tsx`
    - `components/session/CombatSessionClient.test.tsx`
    - `components/player/PlayerInitiativeBoard.test.tsx`
    - `lib/stores/combat-store.test.ts`
  - Notes: The mock returns the key itself (e.g., `combat.hp_label`) instead of the translated value. Tests that use `getByText("HP")` would change to `getByText("combat.hp_label")` or preferably `getByTestId("hp-label")`. Prioritize `data-testid` to decouple tests from i18n.

- [ ] **Task 17: Sync User Preference on Login**
  - File: `app/auth/callback/route.ts` (or equivalent auth callback) — After successful login:
    1. Fetch user's `preferred_language` from Supabase
    2. Set `NEXT_LOCALE` cookie to match stored preference
  - Notes: This ensures that when a user logs in on a new device, their stored language preference takes effect immediately. The cookie is set server-side in the auth callback response.

### Acceptance Criteria

**AC1: next-intl Infrastructure**
- Given next-intl is installed and configured
- When the app starts
- Then the middleware detects locale from cookie (or Accept-Language header as fallback)
- And the default locale is `pt-BR`
- And no `[locale]` URL segments appear in any route

**AC2: Translation Files Complete**
- Given translation JSON files exist for `pt-BR` and `en`
- When both files are compared
- Then they have identical key structures across all 12 namespaces
- And no keys have empty or placeholder values
- And the total key count is ~348 per locale

**AC3: Root Layout Integration**
- Given `NextIntlClientProvider` wraps the app in root layout
- When a page loads
- Then the `<html lang>` attribute matches the active locale
- And all client components have access to `useTranslations()`
- And all server components can use `getTranslations()`

**AC4: Language Switcher**
- Given a logged-in user visits Settings
- When they change the language selector from PT-BR to EN
- Then all UI strings update to English immediately (via `router.refresh()`)
- And the `NEXT_LOCALE` cookie is set to `en`
- And the Supabase `preferred_language` column is updated to `en`
- And on subsequent page loads, the app renders in English

**AC5: Language Persistence — Anonymous Users**
- Given an anonymous user visits the app for the first time
- When their browser's Accept-Language header is `en`
- Then the app renders in English
- And the `NEXT_LOCALE` cookie is set to `en`
- And on subsequent visits, the cookie is respected over Accept-Language

**AC6: Language Persistence — Logged-in Users**
- Given a user has `preferred_language: 'en'` in their Supabase profile
- When they log in on a new device (no cookie)
- Then the auth callback sets `NEXT_LOCALE=en` cookie
- And the app renders in English

**AC7: String Extraction Complete**
- Given all hardcoded strings have been extracted
- When browsing the app in PT-BR
- Then no English UI strings appear (except SRD terms: monster names, spell names, condition names by default)
- And when switching to EN, no Portuguese UI strings appear (except the landing page which stays PT-BR)

**AC8: SRD Terms Configurable**
- Given D&D condition names are in the `conditions` namespace
- When the user's locale is PT-BR
- Then conditions display with Portuguese translations by default
- And the conditions namespace follows the same i18n pattern as other namespaces

**AC9: Landing Page Unchanged**
- Given the landing page (`app/page.tsx`) is excluded from i18n
- When visiting the landing page in any locale
- Then it always renders in Portuguese
- And no i18n hooks or translation calls are present in `app/page.tsx`

**AC10: Tests Pass**
- Given `useTranslations` is mocked globally in test setup
- When running the full test suite
- Then all existing tests pass (with updated assertions where needed)
- And no test relies on hardcoded translated strings for assertions

## Additional Context

### Dependencies

- `next-intl` — npm package (only new dependency)
- Supabase migration 010 must run before preference persistence works
- Auth callback modification depends on Task 5 (user helpers)

### Testing Strategy

- **Unit tests:** Mock `useTranslations` globally in Jest setup. Tests return i18n keys as strings. Update assertions that match on text content to use `data-testid` where possible.
- **Integration tests:** Verify language switcher sets cookie + updates Supabase. Verify middleware reads cookie correctly.
- **Manual testing checklist:**
  1. Fresh visit (no cookie) → app loads in PT-BR (default)
  2. Browser with Accept-Language: en → app loads in EN
  3. Change language in Settings → all strings update
  4. Refresh page → language persists (cookie)
  5. Log out, clear cookies, log back in → language restores from Supabase
  6. Landing page always PT-BR regardless of locale
  7. Combat session with conditions → verify condition names follow locale
  8. Player join view (unauthenticated) → uses Accept-Language or cookie
  9. Admin panel → fully translated in both languages
  10. Onboarding wizard → all 4 steps translated

### Notes

- **Risk: Missing translations at runtime.** If a key is missing from a JSON file, next-intl will show the key path (e.g., `combat.hp_label`) instead of crashing. This is acceptable as a fallback but should be caught in review.
- **Risk: Test breakage.** ~6 test files assert on hardcoded text. The global mock prevents breakage, but tests should migrate to `data-testid` over time.
- **Future: Additional languages.** Adding a third locale (e.g., Spanish) only requires a new JSON file and adding the locale to the `locales` array. No code changes needed.
- **Future: Landing page translation.** If the landing page needs EN translation later, it's a separate task — just add i18n hooks to `app/page.tsx` and create the LP-specific keys.
- **Performance:** next-intl loads only the active locale's messages. No bundle size impact from unused translations. The middleware adds negligible latency (cookie read only).
