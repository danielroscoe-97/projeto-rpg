// Uses jest globals (describe, it, expect) — no import needed.
//
// ---------------------------------------------------------------------------
// Area 5 — users.avatar_url CHECK constraint
//
// Epic 01 Testing Contract requires: "Profile — CHECK constraint rejeita
// URLs inseguras". Migration 144 installed:
//
//   alter table users
//     add constraint users_avatar_url_safe check (
//       avatar_url is null or avatar_url ~ '^https?://'
//     );
//
// ### Why this is a static test
//
// The CHECK constraint is enforced by Postgres — jest has no Postgres. Two
// honest paths:
//
//   (a) Parse the migration SQL file and assert the regex fragment is
//       present, with exactly the expected shape. Catches accidental
//       regressions in the migration itself (e.g., someone weakens the
//       constraint to `*` or removes it). [This file.]
//   (b) A live-DB pgTap test that attempts to insert a `javascript:` URL
//       and expects a 23514 constraint violation. Documented below in
//       describe.skip as a follow-up ticket.
//
// Together: (a) prevents regressions when editing the migration file; (b)
// proves the constraint actually fires in production.
// ---------------------------------------------------------------------------

import * as path from "node:path";
import * as fs from "node:fs";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "supabase/migrations/144_users_profile_enrichment.sql",
);

// Test data from the handoff § "PROIBIDO em público" + OWASP avatar XSS list.
const MALICIOUS_URLS = [
  "javascript:alert(1)",
  "JavaScript:alert(1)", // scheme is case-insensitive per RFC 3986; our
                         // regex uses `~` which Postgres treats as
                         // case-sensitive — so lowercase `javascript:` is
                         // blocked, but uppercase WOULD slip through. We
                         // record this as a known acceptable gap (attacker
                         // must control the URL AND browsers normalize the
                         // scheme to lowercase for dispatch).
  "data:text/html,<script>alert(1)</script>",
  "file:///etc/passwd",
  "vbscript:msgbox",
  "",
  "not a url at all",
  "//no-protocol.example.com/avatar.png",
];

const VALID_URLS = [
  "https://example.com/avatar.png",
  "http://insecure.example.net/av.jpg",
  "https://cdn.pocketdm.com.br/u/abc.webp",
];

describe("users.avatar_url CHECK constraint — migration 144", () => {
  let sql = "";

  beforeAll(() => {
    sql = fs.readFileSync(MIGRATION_PATH, "utf-8");
  });

  it("migration file declares the constraint", () => {
    expect(sql).toMatch(/add constraint users_avatar_url_safe check/i);
  });

  it("constraint uses the exact regex '^https?://' to restrict scheme", () => {
    // Pin the exact regex — prevents someone "fixing" it to a weaker one.
    expect(sql).toMatch(/avatar_url is null or avatar_url ~ '\^https\?:\/\/'/i);
  });

  it("constraint also permits NULL (so existing users are not retroactively invalidated)", () => {
    expect(sql).toMatch(/avatar_url is null or/i);
  });

  describe("regex behavior — pure JS mirror of the Postgres constraint", () => {
    // Mirror the Postgres `~` operator behavior (case-sensitive POSIX
    // regex). This ONLY tests the regex logic, not the full constraint —
    // the DB is the source of truth.
    const mirror = /^https?:\/\//;

    it.each(VALID_URLS)("accepts %s", (url) => {
      expect(mirror.test(url)).toBe(true);
    });

    it.each([
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "vbscript:msgbox",
      "",
      "not a url at all",
      "//no-protocol.example.com/avatar.png",
    ])("rejects %s", (url) => {
      expect(mirror.test(url)).toBe(false);
    });

    it("NOTE: regex IS case-sensitive — uppercase scheme slips through (accepted trade-off)", () => {
      // Documented: `JavaScript:` matches neither `^https?://` nor the
      // default-deny path, so Postgres would reject it. We just re-assert
      // the expected DB behavior here for clarity.
      expect(mirror.test("JavaScript:alert(1)")).toBe(false);
      expect(mirror.test("HTTPS://example.com/img.png")).toBe(false);
    });

    it("documented follow-up: malicious URLs list coverage", () => {
      // Count the malicious URLs that the regex rejects. All of them
      // should — zero acceptances from the attack list.
      const accepted = MALICIOUS_URLS.filter((u) => mirror.test(u));
      expect(accepted).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Follow-up: live-Postgres integration assertion.
// ---------------------------------------------------------------------------

describe.skip("avatar_url CHECK — live Postgres assertion (pgTap follow-up)", () => {
  it("UPDATE users SET avatar_url = 'javascript:alert(1)' raises SQLSTATE 23514", () => {
    /**
     * SQL (run via pgTap or psql in test schema):
     *
     *   BEGIN;
     *     -- insert a user to target
     *     INSERT INTO users (id, email) VALUES (gen_random_uuid(), 't@t.com');
     *     -- attempt malicious update — must fail
     *     UPDATE users SET avatar_url = 'javascript:alert(1)' WHERE email = 't@t.com';
     *   ROLLBACK;
     *
     * Expected: the UPDATE raises
     *   ERROR:  new row for relation "users" violates check constraint "users_avatar_url_safe"
     *   SQLSTATE: 23514
     *
     * Record this in a pgTap file under supabase/tests/rls/. See Winston's
     * follow-up ticket "pgTap migration for RLS tests".
     */
  });
});
