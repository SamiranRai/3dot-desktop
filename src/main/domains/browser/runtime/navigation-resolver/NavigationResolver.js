const DEFAULT_SEARCH_ENGINE = "https://www.google.com/search";
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_INPUT_LENGTH = 2048;
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const EXPLICIT_PROTOCOL_RE = /^[a-z][a-z\d+.-]*:\/\//i;
const LOCALHOST_RE = /^localhost(?::\d+)?(?:[/?#].*)?$/i;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:[/?#].*)?$/;
const IPV6_RE = /^\[[0-9a-f:]+\](?::\d+)?(?:[/?#].*)?$/i;
const DOMAIN_RE = /^(?:[\w-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;

class NavigationResolver {
  static resolve(input) {
    if (typeof input !== "string") return null;

    const value = input.trim();
    if (!value || value.length > MAX_INPUT_LENGTH || CONTROL_CHARS_RE.test(value)) {
      return null;
    }

    if (EXPLICIT_PROTOCOL_RE.test(value)) {
      return this.buildSafeUrl(value) || this.createSearchUrl(value);
    }

    if (this.looksLikeUrl(value)) {
      const url = this.buildSafeUrl(`https://${value}`);
      if (url) return url;
    }

    return this.createSearchUrl(value);
  }

  static isSafeUrl(value) {
    return this.buildSafeUrl(value) !== null;
  }

  static buildSafeUrl(value) {
    if (typeof value !== "string") return null;

    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }

    if (!SUPPORTED_PROTOCOLS.has(url.protocol)) return null;
    if (!url.hostname) return null;
    if (url.username || url.password) return null;

    return url.href;
  }

  static looksLikeUrl(value) {
    return (
      LOCALHOST_RE.test(value) ||
      IPV4_RE.test(value) ||
      IPV6_RE.test(value) ||
      DOMAIN_RE.test(value)
    );
  }

  static createSearchUrl(query) {
    const url = new URL(DEFAULT_SEARCH_ENGINE);
    url.searchParams.set("q", query);
    return url.href;
  }
}

module.exports = NavigationResolver;
