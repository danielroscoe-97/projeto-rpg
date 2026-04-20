/**
 * @jest-environment node
 *
 * Integration-style unit tests for `app/api/track/route.ts` (Epic 03, Story 03-A).
 *
 * CRITICAL: F29 regression guard — this suite locks in the fact that:
 *   (a) Every `conversion:*` event name is present in ALLOWED_EVENTS (returns 200).
 *   (b) A typo'd event name (e.g. `conversion:typo_event`) is rejected with
 *       HTTP 400 and the error code `unknown_event`.
 *
 * Without (b), a future refactor could silently drop conversion telemetry
 * and nobody would notice until we missed funnel data. The assertion on
 * `error: "unknown_event"` is the canary.
 *
 * Uses the `node` test environment because the route imports `next/server`
 * which expects the Fetch API globals (`Request`, `Response`) that jsdom does
 * not expose — Node 18+ provides them natively via `undici`.
 */

// Mocks must be declared before importing the route so they are in place at
// module evaluation time.

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
    },
  })),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    getAll: () => [],
  })),
}));

jest.mock("@/lib/analytics/track-server", () => ({
  trackServerEvent: jest.fn(),
}));

import { POST } from "@/app/api/track/route";
import { trackServerEvent } from "@/lib/analytics/track-server";

const trackServerEventMock = trackServerEvent as jest.MockedFunction<
  typeof trackServerEvent
>;

function makeRequest(body: unknown, ip = "10.0.0.1"): Request {
  return new Request("http://localhost/api/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": ip,
    },
    body: JSON.stringify(body),
  });
}

const CONVERSION_EVENTS = [
  "conversion:cta_shown",
  "conversion:cta_clicked",
  "conversion:cta_dismissed",
  "conversion:modal_opened",
  "conversion:completed",
  "conversion:failed",
] as const;

describe("POST /api/track — Epic 03 conversion events", () => {
  beforeEach(() => {
    trackServerEventMock.mockClear();
  });

  // Use a different IP per test so the in-process rate limiter (60/min per IP)
  // never trips when the suite runs many events back-to-back.
  let ipCounter = 0;
  const nextIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

  describe("accepts all 6 conversion:* events (allowlist update)", () => {
    it.each(CONVERSION_EVENTS)(
      "returns 200 for %s",
      async (eventName) => {
        const req = makeRequest(
          {
            event_name: eventName,
            properties: { moment: "waiting" },
          },
          nextIp(),
        );
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ ok: true });
        expect(trackServerEventMock).toHaveBeenCalledWith(
          eventName,
          expect.any(Object),
        );
      },
    );
  });

  describe("F29 regression guard — unknown event name is rejected", () => {
    it("returns 400 with error code 'unknown_event' for a typo'd conversion event", async () => {
      const req = makeRequest(
        { event_name: "conversion:typo_event" },
        nextIp(),
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({ error: "unknown_event" });
      expect(trackServerEventMock).not.toHaveBeenCalled();
    });

    it("returns 400 for a random non-conversion unknown event", async () => {
      const req = makeRequest(
        { event_name: "totally:not_registered" },
        nextIp(),
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("unknown_event");
    });

    it("returns 400 when event_name is missing entirely", async () => {
      const req = makeRequest({ properties: {} }, nextIp());
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
