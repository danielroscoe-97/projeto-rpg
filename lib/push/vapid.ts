/**
 * Web Push / VAPID helpers.
 * Server-side only — never import this in client components.
 */
import webpush from "web-push";

let configured = false;

/**
 * Configure webpush with VAPID keys.
 * Lazy — call once before any send operations.
 * Fails silently if env vars are missing (push is best-effort).
 */
export function configureWebPush(): boolean {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? `mailto:noreply@pocketdm.com.br`;

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface TurnPushPayload {
  title: string;
  body: string;
  /** Optional: URL to open when notification is tapped */
  url?: string;
  /** Session ID for deduplication */
  sessionId?: string;
}

/**
 * Send a Web Push notification to a single subscription.
 * Returns true on success, false on failure (fail-open).
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: TurnPushPayload
): Promise<boolean> {
  if (!configureWebPush()) return false;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url,
        sessionId: payload.sessionId,
      })
    );
    return true;
  } catch (err: unknown) {
    // 410 Gone = subscription expired/revoked — caller should delete it
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 410 || status === 404) {
      throw new PushSubscriptionExpiredError(subscription.endpoint);
    }
    return false;
  }
}

export class PushSubscriptionExpiredError extends Error {
  constructor(public endpoint: string) {
    super(`Push subscription expired: ${endpoint}`);
    this.name = "PushSubscriptionExpiredError";
  }
}
