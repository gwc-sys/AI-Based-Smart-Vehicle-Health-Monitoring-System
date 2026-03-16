export function formatDate(input?: string | Date): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleDateString();
}

export function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

export function noop() {
  // no operation
}

export function safeParseJSON<T = any>(text: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export default { formatDate, clamp, noop, safeParseJSON };
