export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

const PRIVATE_IPV4_RE =
  /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/;

export function validatePublicHttpUrl(raw: string): UrlValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: 'Enter a valid public https:// URL.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Include https:// (e.g. https://yourdomain.com/feed).' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http:// and https:// URLs are supported.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80:') ||
    PRIVATE_IPV4_RE.test(host) ||
    !host.includes('.')
  ) {
    return {
      valid: false,
      error: 'Private network, loopback, and localhost addresses are blocked for security.',
    };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}
