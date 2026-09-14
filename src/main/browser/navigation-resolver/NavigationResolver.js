/**
 * Resolves raw address-bar input into a safe, navigable http(s) URL or a
 * search-engine query URL.
 *
 * SECURITY MODEL
 * ------------------------------------------------------------------------
 * - Only `http:` / `https:` are ever returned (allow-list, not block-list).
 *   This is what actually prevents navigation to `javascript:`, `data:`,
 *   `file:`, `vbscript:`, `chrome:`, or arbitrary OS-registered custom
 *   protocol handlers (relevant if the result ever reaches
 *   `shell.openExternal`, which has historically been abused via custom
 *   scheme chaining on Windows).
 * - URLs with embedded credentials (`https://trusted-name@evil.com`) are
 *   rejected. This is a classic authority-spoofing / phishing technique.
 * - Any candidate that fails real parsing/validation falls back to a
 *   search query instead of dead-ending as `null`. This is safe (a search
 *   query is just encoded text — it is never executed) and avoids
 *   surprising "nothing happened" results for ordinary text that happens
 *   to contain a colon (e.g. "re: hello", "score: 2:1").
 * - This module is a UX heuristic, not a trust boundary. If the resolved
 *   value crosses a process/IPC boundary before being used (e.g. renderer
 *   -> main in Electron, then `shell.openExternal` / `loadURL`), the
 *   receiving side MUST re-validate with `isSafeUrl()` below rather than
 *   trusting the renderer's output — a compromised renderer can send any
 *   IPC payload it likes.
 * ------------------------------------------------------------------------
 */

const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search';

const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

// Real addresses/queries are never this long; beyond this is either
// paste-abuse or a mistake, and it keeps every regex below bounded.
const MAX_INPUT_LENGTH = 2048;

// Reject stray control characters. (Tab/CR/LF are excluded here because
// the WHATWG URL parser itself strips those per spec; anything else -
// NUL, other C0 controls, DEL - is treated as invalid rather than passed
// silently to native OS APIs downstream.)
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

// Require `://` (not just a colon) to identify an explicit scheme. This
// matters because http/https are always written with `://`, and it avoids
// misclassifying host:port input like "localhost:3000" or plain text like
// "re: hello" as an explicit-scheme attempt. Any single-colon scheme we
// don't recognize (mailto:, tel:, javascript:, etc.) simply falls through
// to looksLikeUrl/search below - which is always safe, since a search
// query is inert text, never executed.
const PROTOCOL_RE = /^[a-z][a-z\d+\-.]*:\/\//i;
const LOCALHOST_RE = /^localhost(?::\d+)?(?:[/?#].*)?$/i;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:[/?#].*)?$/;
const IPV6_RE = /^\[[0-9a-f:]+\](?::\d+)?(?:[/?#].*)?$/i;
const DOMAIN_RE = /^(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;

class NavigationResolver {
  /**
   * @param {string} input
   * @returns {string|null} A safe http(s) URL, a search URL, or null for
   *   degenerate input (empty, too long, or containing control chars).
   */
  static resolve(input) {
    if (typeof input !== 'string') {
      return null;
    }

    const value = input.trim();

    if (!value) {
      return null;
    }

    if (value.length > MAX_INPUT_LENGTH || CONTROL_CHARS_RE.test(value)) {
      return null;
    }

    if (PROTOCOL_RE.test(value)) {
      // Explicit protocol. If it's disallowed/malformed, fall back to a
      // search instead of a dead end - still never navigates anywhere.
      return this.buildSafeUrl(value) ?? this.createSearchUrl(value);
    }

    if (this.looksLikeUrl(value)) {
      const url = this.buildSafeUrl(`https://${value}`);
      if (url) {
        return url;
      }
      // Heuristic matched but didn't actually parse (e.g. bad port,
      // invalid IPv4 octets) - fall through to search below.
    }

    return this.createSearchUrl(value);
  }

  static looksLikeUrl(value) {
    return (
      LOCALHOST_RE.test(value) ||
      IPV4_RE.test(value) ||
      IPV6_RE.test(value) ||
      DOMAIN_RE.test(value)
    );
  }

  /**
   * Parses `value` and returns a normalized href only if it is a
   * syntactically valid, credential-free http(s) URL with a non-empty
   * host. Never throws; returns null on any failure.
   */
  static buildSafeUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }

    if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
      return null;
    }

    if (!url.hostname) {
      return null;
    }

    // Block the userinfo phishing vector: https://trusted-name@evil.com
    if (url.username || url.password) {
      return null;
    }

    return url.href;
  }

  /**
   * Re-validates a URL string on the far side of a trust boundary (e.g. in
   * the Electron main process, right before `shell.openExternal` or
   * `loadURL`). Do not assume a value is safe just because it previously
   * passed through `resolve()` in the renderer.
   *
   * @param {string} href
   * @returns {boolean}
   */
  static isSafeUrl(href) {
    return typeof href === 'string' && this.buildSafeUrl(href) !== null;
  }

  static createSearchUrl(query) {
    const url = new URL(DEFAULT_SEARCH_ENGINE);
    url.searchParams.set('q', query);
    return url.href;
  }
}

module.exports = NavigationResolver;
