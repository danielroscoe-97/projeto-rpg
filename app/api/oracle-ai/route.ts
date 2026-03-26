import { ORACLE_SYSTEM_PROMPT } from "@/lib/oracle-ai/system-prompt";

export const runtime = "nodejs";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_MAX_ENTRIES = 1_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Evict expired entries to prevent unbounded memory growth
  if (rateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

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

  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 },
    );
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
                  const parsed = JSON.parse(json);
                  const text = parsed?.candidates?.[0]?.content?.parts
                    ?.map((p: any) => p.text || "")
                    .join("") || "";

                  if (text) {
                    ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                  }

                  const groundingMeta = parsed?.candidates?.[0]?.groundingMetadata;
                  if (groundingMeta?.groundingChunks?.length) {
                    const sources = groundingMeta.groundingChunks
                      .filter((c: any) => c.web)
                      .map((c: any) => ({
                        title: c.web?.title || "",
                        uri: c.web?.uri || "",
                      }));
                    if (sources.length > 0) {
                      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`));
                    }
                  }
                } catch {
                  // Skip malformed chunks
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
