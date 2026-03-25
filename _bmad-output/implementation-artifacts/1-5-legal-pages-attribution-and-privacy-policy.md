# Story 1.5: Legal Pages (Attribution & Privacy Policy)

Status: review

## Story

As a **user**,
I want to view the CC-BY-4.0 attribution and Privacy Policy pages,
So that I understand the content licensing and my data rights.

## Acceptance Criteria

1. **Given** the site layout, **When** a user navigates to `/legal/attribution`, **Then** the CC-BY-4.0 attribution statement is displayed: "This product uses the System Reference Document 5.1 and 5.2, available under the Creative Commons Attribution 4.0 International License." (FR36)
2. **Given** the site layout, **When** a user navigates to `/legal/privacy`, **Then** a Privacy Policy is displayed describing data collection, retention, and user rights under LGPD/GDPR (FR37)
3. **Given** the legal pages, **Then** both pages are accessible without authentication
4. **Given** the legal pages, **Then** both pages are server-side rendered for SEO

## Current State Assessment

### What Already Exists — FULLY IMPLEMENTED

**Attribution page** (`app/legal/attribution/page.tsx`):
- Displays CC-BY-4.0 attribution statement with link to license
- References SRD 5.1 (© 2016) and SRD 5.2 (© 2025) Wizards of the Coast
- Lists covered content (monster stat blocks, spell descriptions, condition rules)
- Lists what is NOT covered (proprietary content, app software)
- Has proper metadata (title, description)
- Uses dark theme styling (`bg-[#1a1a2e]`, `prose-invert`)

**Privacy policy page** (`app/legal/privacy/page.tsx`):
- Written in Portuguese (matches target audience — Brazilian LGPD compliance)
- Covers: data collected (email, campaign data, session data), how data is used, anonymous players, data retention, security measures, user rights
- Lists user rights: access, correct, delete, portability
- Mentions Supabase encryption, bcrypt hashing, RLS policies
- Contact email: privacidade@tavernadomestre.com.br
- Has proper metadata

**Both pages:**
- Server-rendered (no "use client" directive) — SSR for SEO ✓
- Accessible without authentication (under `/legal/`, not `/app/`) ✓
- Dark theme styling consistent with app design

### What May Need Validation/Hardening
1. **Footer links**: Verify the marketing/app footer links to these legal pages
2. **WCAG 2.1 AA compliance**: Check contrast ratios, heading hierarchy, keyboard navigation
3. **Marketing layout integration**: Pages exist at `/legal/` but should ideally be under a `(marketing)` route group with shared nav/footer — architecture specifies `/(marketing)/legal/`
4. **SEO metadata**: Verify `<meta>` tags and Open Graph tags are present
5. **Link from footer**: Attribution page should be linked from ALL pages (FR36 says "visible, persistent page")

### What Needs To Be Done
This story is primarily a **validation and polish** pass. The content exists and is complete. Focus on:
1. Verify FR36 and FR37 are fully satisfied
2. Ensure legal pages are linked from the site footer (all pages)
3. Apply WCAG 2.1 AA compliance checks
4. Consider moving to `(marketing)` route group if a shared marketing layout exists

## Tasks / Subtasks

- [ ] Task 1: Validate attribution page content (AC: #1)
  - [ ] 1.1 Verify the exact CC-BY-4.0 statement text matches FR36 requirement
  - [ ] 1.2 Verify link to Creative Commons license is correct and opens in new tab
  - [ ] 1.3 Verify SRD 5.1 and 5.2 copyright years are accurate
- [ ] Task 2: Validate privacy policy content (AC: #2)
  - [ ] 2.1 Verify LGPD/GDPR required sections are present: data collected, purpose, retention, rights, contact
  - [ ] 2.2 Verify account deletion procedure is mentioned (FR26)
  - [ ] 2.3 Verify third-party services are listed (Supabase, Vercel, Sentry)
- [ ] Task 3: Verify public access and SSR (AC: #3, #4)
  - [ ] 3.1 Confirm pages are accessible without login (no auth redirect)
  - [ ] 3.2 Confirm pages are server-rendered (no "use client", Next.js SSR)
  - [ ] 3.3 Verify SEO metadata exports (title, description)
- [ ] Task 4: Footer integration and persistent attribution (FR36)
  - [ ] 4.1 Check if a Footer component exists and links to `/legal/attribution` and `/legal/privacy`
  - [ ] 4.2 If no footer exists on legal pages, create or integrate a shared footer with legal links
  - [ ] 4.3 Ensure attribution link is visible on marketing pages and app layout
- [ ] Task 5: WCAG 2.1 AA compliance (NFR20)
  - [ ] 5.1 Verify heading hierarchy (h1 → h2, no skipped levels)
  - [ ] 5.2 Verify color contrast ratios (4.5:1 minimum for body text)
  - [ ] 5.3 Verify minimum 16px font size (NFR23)
  - [ ] 5.4 Verify `lang` attribute matches content language (pt-BR for privacy, en for attribution)
  - [ ] 5.5 Verify external links have appropriate `rel` attributes

## Dev Notes

### File Structure
```
app/
  legal/
    attribution/page.tsx    ← EXISTS, CC-BY-4.0 attribution (English)
    privacy/page.tsx        ← EXISTS, LGPD/GDPR privacy policy (Portuguese)
```

### Architecture Note: Route Group
The architecture specifies `/(marketing)/legal/` as the route group, but the current implementation is at `/legal/` (no route group). Both work identically for the user — the `(marketing)` prefix is only organizational. Moving them is optional and low priority unless a shared marketing layout (nav + footer) is being introduced.

### Content Language
- **Attribution page**: English (international license, SRD is in English)
- **Privacy policy**: Portuguese (LGPD compliance, Brazilian target audience)
- Both are appropriate for their purpose

### Design Tokens Applied
- Background: `#1a1a2e` ✓
- Text primary: `text-white` ✓
- Text secondary: `text-white/80`, `text-white/50` ✓
- Accent links: `text-[#e94560]` ✓
- Uses `prose prose-invert` for readable long-form content

### Footer Component
Check if `components/marketing/Footer.tsx` exists. If not, a simple footer with legal links should be added to the legal pages or to a shared layout. FR36 requires the attribution to be on a "visible, persistent page" — the dedicated page satisfies this, but a footer link makes it discoverable.

### Anti-Patterns to Avoid
- **DO NOT rewrite the privacy policy content** — it was carefully crafted for LGPD compliance
- **DO NOT translate the privacy policy to English** — Portuguese is required for LGPD
- **DO NOT add cookie consent banners** — not required for the current data model (no tracking cookies)
- **DO NOT move pages to a different route** unless explicitly requested — `/legal/` works and is already indexed
- **DO NOT add interactive elements** to legal pages — they are read-only by design

### Testing
- Manual verification is sufficient for legal pages
- Lighthouse accessibility audit can validate WCAG compliance
- Check pages render correctly at mobile viewport (375px width)

### References
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — Marketing Layout section]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Marketing page design]
- [Source: app/legal/attribution/page.tsx — Existing attribution page]
- [Source: app/legal/privacy/page.tsx — Existing privacy policy]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
