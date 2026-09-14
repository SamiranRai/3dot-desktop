const test  = require('node:test');
const assert = require('node:assert/strict');
const NavigationResolver = require('./NavigationResolver');

const r = (v) => NavigationResolver.resolve(v);

test('empty / whitespace-only input -> null', () => {
  assert.equal(r(''), null);
  assert.equal(r('   '), null);
});

test('plain search terms', () => {
  assert.equal(r('best pizza near me'), 'https://www.google.com/search?q=best+pizza+near+me');
});

test('localhost, IPv4, IPv6, domains', () => {
  assert.equal(r('localhost:3000'), 'https://localhost:3000/');
  assert.equal(r('127.0.0.1'), 'https://127.0.0.1/');
  assert.equal(r('[::1]:8080'), 'https://[::1]:8080/');
  assert.equal(r('example.com/path?x=1'), 'https://example.com/path?x=1');
});

test('explicit http/https is preserved', () => {
  assert.equal(r('http://example.com'), 'http://example.com/');
  assert.equal(r('HTTPS://Example.com'), 'https://example.com/');
});

test('dangerous protocols are never navigated to', () => {
  assert.doesNotMatch(r('javascript:alert(1)'), /^javascript:/);
  assert.doesNotMatch(r('data:text/html,<script>alert(1)</script>'), /^data:/);
  assert.doesNotMatch(r('file:///etc/passwd'), /^file:/);
  assert.doesNotMatch(r('vbscript:msgbox(1)'), /^vbscript:/);
});

test('credentials in URL are rejected, not silently navigated', () => {
  const result = r('https://accounts.google.com@evil.com/login');
  assert.ok(!result.includes('@'));
  // Falls back to a search (safe, inert text) rather than navigating.
  assert.match(result, /^https:\/\/www\.google\.com\/search\?q=/);
});

test('malformed heuristic matches fall back to search instead of breaking', () => {
  const result = r('999.999.999.999');
  assert.match(result, /^https:\/\/www\.google\.com\/search\?q=/);
});

test('plain text with a colon does not dead-end', () => {
  assert.match(r('re: hello there'), /^https:\/\/www\.google\.com\/search\?q=/);
  assert.notEqual(r('re: hello there'), null);
});

test('unsupported but well-formed scheme falls back to search', () => {
  assert.match(r('ftp://example.com'), /^https:\/\/www\.google\.com\/search\?q=/);
});

test('oversized input is rejected', () => {
  assert.equal(r('a'.repeat(3000)), null);
});

test('control characters are rejected', () => {
  assert.equal(r('exa\x00mple.com'), null);
});

test('isSafeUrl re-validation helper', () => {
  assert.equal(NavigationResolver.isSafeUrl('https://example.com/'), true);
  assert.equal(NavigationResolver.isSafeUrl('javascript:alert(1)'), false);
  assert.equal(NavigationResolver.isSafeUrl('https://user:pass@example.com'), false);
  assert.equal(NavigationResolver.isSafeUrl('not a url'), false);
});