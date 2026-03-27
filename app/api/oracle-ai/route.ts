import { ORACLE_SYSTEM_PROMPT } from "@/lib/oracle-ai/system-prompt";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { captureError } from "@/lib/errors/capture";

export const runtime = "nodejs";

// ── Gemini API response types (TD8) ────────────────────────────────

interface GeminiGroundingSource {
  web?: {
    uri: string;
    title: string;
  };
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{
      text?: string;
    }>;
  };
  groundingMetadata?: {
    groundingChunks?: GeminiGroundingSource[];
    webSearchQueries?: string[];
  };
  finishReason?: string;
}

interface GeminiStreamChunk {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

// ── Supabase service client for rate limiting (lazy init) ──────────

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }
  return _supabase;
}

// ── Gemini config ──────────────────────────────────────────────────

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Free tier models (Mar 2026): Flash-Lite 15RPM/1000req, Flash 10RPM/250req, Pro 5RPM/100req
const MODEL_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
];

const REQUEST_TIMEOUT_MS = 8_000;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Oracle AI is not configured. Missing GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Rate limit via Supabase RPC (works across serverless instances)
  const supabase = getSupabase();
  try {
    if (!supabase) throw new Error("Supabase not configured for rate limiting");
    const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
      p_key: `oracle:${ip}`,
      p_max: 20,
      p_window_seconds: 3600,
    });
    if (error) throw error;
    if (!allowed) {
      return Response.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }
  } catch (error) {
    // Fail-open: allow request if rate limit check fails
    captureError(error, { component: "OracleAI", action: "rateLimit", category: "network" });
  }

  let question: string;
  try {
    const body = await request.json();
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!question || question.length < 3 || question.length > 1000) {
    return Response.json(
      { error: "Question must be between 3 and 1000 characters." },
      { status: 400 },
    );
  }

  const requestBody = {
    system_instruction: { parts: [{ text: ORACLE_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: question }] }],
    tools: [{ google_search: {} }],
  };

  let lastError = "";
  for (const modelName of MODEL_CHAIN) {
    const url = `${GEMINI_BASE}/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text().catch(() => "");
        if (geminiRes.status === 429 || errBody.includes("quota")) {
          lastError = errBody;
          continue;
        }
        lastError = errBody || `HTTP ${geminiRes.status}`;
        continue;
      }

      const geminiStream = geminiRes.body;
      if (!geminiStream) {
        lastError = "No response body from Gemini";
        continue;
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const transformStream = new ReadableStream({
        async start(ctrl) {
          const reader = geminiStream.getReader();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              let lineEnd: number;
              while ((lineEnd = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
                buffer = buffer.slice(lineEnd + 1);

                if (!line.startsWith("data: ")) continue;
                const json = line.slice(6).trim();
                if (!json || json === "[DONE]") continue;

                try {
                  const parsed: GeminiStreamChunk = JSON.parse(json);
                  const candidate = parsed?.candidates?.[0];
                  const text = candidate?.content?.parts
                    ?.map((p) => p.text || "")
                    .join("") || "";

                  if (text) {
                    ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }

                  const groundingMeta = candidate?.groundingMetadata;
                  if (groundingMeta?.groundingChunks?.length) {
                    const sources = groundingMeta.groundingChunks
                      .filter((c) => c.web)
                      .map((c) => ({
                        title: c.web?.title || "",
                        uri: c.web?.uri || "",
                      }));
                    if (sources.length > 0) {
                      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`));
                    }
                  }
                } catch {
                  if (process.env.NODE_ENV === "development") {
                    console.warn("[Oracle AI] Malformed Gemini SSE chunk skipped:", json);
                  }
                }
              }
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Stream error";
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          }

          ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
          ctrl.close();
        },
      });

      return new Response(transformStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = `Timeout connecting to ${modelName}`;
        continue;
      }
      lastError = err instanceof Error ? err.message : String(err);
      continue;
    }
  }

  if (lastError.includes("429") || lastError.includes("quota")) {
    return Response.json(
      { error: "O Oráculo atingiu o limite de consultas. Tente novamente em alguns segundos." },
      { status: 429 },
    );
  }

  return Response.json(
    { error: lastError || "All models failed. Please try again." },
    { status: 502 },
  );
}
