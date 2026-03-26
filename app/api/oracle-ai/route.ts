import { GoogleGenerativeAI } from "@google/generative-ai";
import { ORACLE_SYSTEM_PROMPT } from "@/lib/oracle-ai/system-prompt";

export const runtime = "nodejs";

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Models to try in order (fallback chain)
const MODEL_CHAIN = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
];

async function tryGenerateStream(
  genAI: GoogleGenerativeAI,
  question: string,
) {
  let lastError: Error | null = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: ORACLE_SYSTEM_PROMPT,
        tools: [{ googleSearch: {} } as any],
      });
      const result = await model.generateContentStream(question);
      return { result, modelName };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on 429 (quota) or 503 (overloaded)
      const msg = lastError.message;
      if (msg.includes("429") || msg.includes("503") || msg.includes("quota")) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("All models failed");
}

export async function POST(request: Request) {
  // Check API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Oracle AI is not configured. Missing GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  // Rate limiting
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

  // Parse request
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const { result } = await tryGenerateStream(genAI, question);

    // Stream the response as SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
              );
            }
          }

          // Extract grounding metadata from the final response
          const response = await result.response;
          const candidate = response.candidates?.[0];
          const groundingMeta = candidate?.groundingMetadata;

          if (groundingMeta?.groundingChunks?.length) {
            const sources = groundingMeta.groundingChunks
              .filter((c: any) => c.web)
              .map((c: any) => ({
                title: c.web.title || "",
                uri: c.web.uri || "",
              }));
            if (sources.length > 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ sources })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to call Gemini API";
    // Friendly message for quota errors
    if (message.includes("429") || message.includes("quota")) {
      return Response.json(
        { error: "O Oráculo atingiu o limite de consultas. Tente novamente em alguns segundos." },
        { status: 429 },
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
