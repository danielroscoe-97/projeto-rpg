/**
 * Persistent player identity for resilient reconnection.
 * Uses sessionStorage (survives refresh) + localStorage (survives browser close, 24h TTL).
 * Both are best-effort — mobile OS can clear localStorage under memory pressure.
 */

const STORAGE_KEY_PREFIX = "pocketdm:session:";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface StoredIdentity {
  tokenId: string;
  playerName: string;
  registeredAt: number;
  expiresAt?: number;
}

export interface PlayerIdentity {
  tokenId: string;
  playerName: string;
}

export function persistPlayerIdentity(
  sessionId: string,
  tokenId: string,
  playerName: string
) {
  const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
  const base = { tokenId, playerName, registeredAt: Date.now() };

  try {
    sessionStorage.setItem(key, JSON.stringify(base));
  } catch {
    /* quota exceeded */
  }

  try {
    localStorage.setItem(
      key,
      JSON.stringify({ ...base, expiresAt: Date.now() + TTL_MS })
    );
  } catch {
    /* quota exceeded */
  }
}

export function loadPlayerIdentity(
  sessionId: string
): PlayerIdentity | null {
  const key = `${STORAGE_KEY_PREFIX}${sessionId}`;

  const raw = (() => {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch {
      return null;
    }
  })();

  if (!raw) return null;

  try {
    const data: StoredIdentity = JSON.parse(raw);

    if (data.expiresAt && Date.now() > data.expiresAt) {
      clearPlayerIdentity(sessionId);
      return null;
    }

    if (data.tokenId && data.playerName) {
      return { tokenId: data.tokenId, playerName: data.playerName };
    }
  } catch {
    /* corrupted JSON */
  }

  return null;
}

export function clearPlayerIdentity(sessionId: string) {
  const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
