/**
 * SRD data mode — controls whether the client fetches SRD-only public
 * files or the full dataset (including non-SRD) via auth-gated API.
 *
 * Guest (/try)     → SRD mode  → fetches from /srd/*.json (static, filtered)
 * Auth  (/app/)    → Full mode → fetches from /api/srd/full/*.json (auth-gated)
 */

let _fullDataMode = false;

/** Enable full data mode (auth users only). Must be called BEFORE initializeSrd(). */
export function setFullDataMode(enabled: boolean) {
  _fullDataMode = enabled;
}

export function isFullDataMode(): boolean {
  return _fullDataMode;
}

/** Returns the base URL for SRD data fetches based on current mode. */
export function srdDataUrl(filename: string): string {
  return _fullDataMode ? `/api/srd/full/${filename}` : `/srd/${filename}`;
}

/** Returns cache key suffix to keep guest and auth caches separate in IndexedDB. */
export function cacheSuffix(): string {
  return _fullDataMode ? "-full" : "";
}
