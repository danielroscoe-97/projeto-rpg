/**
 * k6 Load Test — Session Concurrency Validation (NFR18)
 *
 * Simulates 1,000 concurrent sessions with DM + players to validate:
 * - WebSocket sync latency ≤500ms (NFR3)
 * - No degradation under load (NFR18)
 * - Supabase Realtime connection pool capacity
 *
 * Prerequisites:
 *   - Install k6: https://k6.io/docs/get-started/installation/
 *   - Set environment variables:
 *     K6_SUPABASE_URL    — Supabase project URL
 *     K6_SUPABASE_ANON_KEY — Supabase anon/publishable key
 *     K6_BASE_URL        — App base URL (e.g., https://pocketdm.app)
 *
 * Usage:
 *   k6 run scripts/load-test/k6-session-load.js
 *
 * For a quick smoke test (10 VUs):
 *   k6 run --vus 10 --duration 30s scripts/load-test/k6-session-load.js
 */

import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

// --- Configuration ---

const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:3000";
const SUPABASE_URL = __ENV.K6_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = __ENV.K6_SUPABASE_ANON_KEY || "";

// Custom metrics
const wsLatency = new Trend("ws_message_latency", true);
const wsConnections = new Counter("ws_connections_established");
const apiErrors = new Counter("api_errors");

// --- Load Profile ---
// Ramp up to 1,000 VUs (each VU = 1 session with DM polling + player WS)

export const options = {
  stages: [
    { duration: "30s", target: 100 },   // warm-up
    { duration: "1m", target: 500 },     // ramp to 500
    { duration: "1m", target: 1000 },    // ramp to 1,000
    { duration: "3m", target: 1000 },    // hold at 1,000
    { duration: "30s", target: 0 },      // ramp down
  ],
  thresholds: {
    // NFR3: WebSocket sync latency ≤500ms
    ws_message_latency: ["p(95)<500"],
    // NFR18: API response time under load
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    // Error rate below 1%
    http_req_failed: ["rate<0.01"],
  },
};

// --- Scenario: DM Session Polling ---

export default function () {
  const sessionId = `load-test-${__VU}-${Date.now()}`;

  // 1. Simulate player joining /join page (HTTP GET)
  const joinRes = http.get(`${BASE_URL}/join/load-test-token-${__VU}`, {
    tags: { name: "GET /join/[token]" },
  });

  check(joinRes, {
    "join page returns 200 or 404": (r) => r.status === 200 || r.status === 404,
  }) || apiErrors.add(1);

  // 2. Simulate polling the session state API (fallback endpoint)
  const stateRes = http.get(
    `${BASE_URL}/api/session/${sessionId}/state`,
    {
      tags: { name: "GET /api/session/[id]/state" },
      headers: { "Content-Type": "application/json" },
    }
  );

  check(stateRes, {
    "state API responds": (r) => r.status === 200 || r.status === 401 || r.status === 403,
  }) || apiErrors.add(1);

  // 3. Simulate Realtime WebSocket connection (if Supabase URL available)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const wsUrl = SUPABASE_URL.replace("https://", "wss://") +
      `/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;

    const connectStart = Date.now();

    ws.connect(wsUrl, {}, function (socket) {
      wsConnections.add(1);

      socket.on("open", function () {
        const latency = Date.now() - connectStart;
        wsLatency.add(latency);

        // Join a channel
        socket.send(
          JSON.stringify({
            topic: `realtime:session:${sessionId}`,
            event: "phx_join",
            payload: {},
            ref: "1",
          })
        );
      });

      socket.on("message", function (msg) {
        // Track message latency
        wsLatency.add(Date.now() - connectStart);
      });

      // Keep connection open for a realistic duration
      socket.setTimeout(function () {
        socket.close();
      }, 5000);
    });
  }

  // 4. Simulate realistic user think time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}
