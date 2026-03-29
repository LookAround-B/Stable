/**
 * Input Validation & Sanitisation Utilities
 *
 * Central module used by every API route to reject bad data at the
 * boundary – before it reaches Prisma / S3 / business logic.
 */

// ─── Primitives ─────────────────────────────────────────────

/** Strip HTML tags and dangerous characters from a plain-text string */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '')            // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
    .trim()
}

/** Validate that a trimmed string is between `min` and `max` code-units */
export function isValidString(
  input: unknown,
  min = 1,
  max = 500
): input is string {
  if (typeof input !== 'string') return false
  const len = input.trim().length
  return len >= min && len <= max
}

/** Validate a CUID / UUID-shaped id (Prisma default) */
const CUID_RE = /^c[a-z0-9]{24,}$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isValidId(id: unknown): id is string {
  if (typeof id !== 'string') return false
  return CUID_RE.test(id) || UUID_RE.test(id)
}

/** Validate email address (RFC-ish, not exhaustive) */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email)
}

/** Validate a phone number (digits, optional leading +, spaces/dashes) */
const PHONE_RE = /^\+?[\d\s\-()]{6,20}$/
export function isValidPhone(phone: unknown): phone is string {
  return typeof phone === 'string' && PHONE_RE.test(phone.trim())
}

/** Parse & clamp a positive integer query-param (pagination, etc.) */
export function safePositiveInt(
  value: unknown,
  defaultVal: number,
  max = 10000
): number {
  const n = parseInt(String(value), 10)
  if (isNaN(n) || n < 0) return defaultVal
  return Math.min(n, max)
}

/** Validate ISO-8601-ish date string and return a Date, or null */
export function safeDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return null
  // Reject dates far outside reasonable range (1900–2100)
  if (d.getFullYear() < 1900 || d.getFullYear() > 2100) return null
  return d
}

/** Validate that a value is strictly one of the provided options */
export function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[]
): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
}

// ─── File / Upload helpers ──────────────────────────────────

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const

/**
 * Validate a mimetype against the image allowlist.
 * Accepts optional extras (e.g. PDF for expense receipts).
 */
export function isAllowedMime(
  mime: string,
  extras: string[] = []
): boolean {
  const allowed = [...ALLOWED_IMAGE_MIMES, ...extras]
  return allowed.includes(mime.toLowerCase())
}

/**
 * Validate a base64 data-URI.
 * Returns `{ mime, data }` if valid, or `null`.
 */
export function parseBase64DataUri(
  input: string
): { mime: string; data: string } | null {
  if (typeof input !== 'string') return null
  const m = input.match(/^data:([a-zA-Z0-9+/.-]+\/[a-zA-Z0-9+/.-]+);base64,(.+)$/)
  if (!m) return null
  return { mime: m[1], data: m[2] }
}

/**
 * Validate a base64 image (data-URI).  Checks mime against allowlist and
 * decoded size does not exceed `maxBytes`.
 */
export function validateBase64Image(
  input: string,
  maxBytes: number = 5 * 1024 * 1024,
  extraMimes: string[] = []
): { valid: true; mime: string; data: string } | { valid: false; reason: string } {
  const parsed = parseBase64DataUri(input)
  if (!parsed) return { valid: false, reason: 'Invalid base64 data URI format' }
  if (!isAllowedMime(parsed.mime, extraMimes)) {
    return { valid: false, reason: `Disallowed file type: ${parsed.mime}` }
  }
  // Estimate decoded size: base64 is ~4/3 of raw
  const estimatedSize = Math.ceil((parsed.data.length * 3) / 4)
  if (estimatedSize > maxBytes) {
    return {
      valid: false,
      reason: `File too large (${(estimatedSize / 1024 / 1024).toFixed(1)} MB). Max ${(maxBytes / 1024 / 1024).toFixed(1)} MB`,
    }
  }
  return { valid: true, mime: parsed.mime, data: parsed.data }
}

// ─── Convenience: build 400 error ──────────────────────────

export function validationError(res: any, message: string) {
  return res.status(400).json({ error: message })
}
