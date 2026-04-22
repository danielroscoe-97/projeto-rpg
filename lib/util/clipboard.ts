"use client";

/**
 * Thin wrapper over `navigator.clipboard.writeText` with graceful
 * fallback to the legacy `document.execCommand('copy')` path.
 *
 * Returns true on success, false on any failure — the caller decides
 * how to surface the outcome (toast, analytics flag, etc.). Never
 * throws so call sites don't need try/catch.
 *
 * Why a helper: several components (InvitePlayerDialog's link copy,
 * the past-companions share button, the campaign settings share
 * action) share this exact shape. Extracting the one-liner also gives
 * the test suite a stable mock seam — `jest.mock("@/lib/util/clipboard")`
 * — since JSDOM's navigator.clipboard is non-configurable in some Node
 * versions.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  // This module is "use client", so window/document are always
  // defined at call time. Any caller that somehow reaches this on
  // SSR has a bigger problem than a failed copy — let the browser
  // APIs throw and the catch below turns it into `false`.
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback below.
  }
  // Legacy fallback for browsers / contexts without clipboard API
  // (e.g. iOS <13.4 non-HTTPS, WebView sandboxes). Not perfect but
  // preserves the primary use case.
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
