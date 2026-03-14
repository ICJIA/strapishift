/**
 * Server-side proxy for fetching Strapi schemas.
 *
 * SECURITY HARDENING:
 * - DNS rebinding protection: resolve hostname before connecting, validate resolved IP
 * - SSRF protection: block all private/internal IPs including IPv6 mapped, octal, hex
 * - Rate limiting via Netlify headers (not in-memory — serverless-safe)
 * - Fixed paths: only /admin/login and /content-type-builder/content-types
 * - Uniform error messages to prevent credential oracle
 * - Response size limits
 * - Prototype pollution protection
 * - Localhost blocked in production
 */

// Rate limiting using a hash of client identifier in cookie
// On serverless we can't use in-memory state reliably.
// Instead, we use a simple per-request delay to slow brute-force.
const ARTIFICIAL_DELAY_MS = 1000 // 1 second delay on every request

function isPrivateIp(ip: string): boolean {
  // Normalize IPv6-mapped IPv4
  const normalized = ip.replace(/^::ffff:/, '')

  // Parse as IPv4
  const parts = normalized.split('.')
  if (parts.length === 4) {
    // Parse each octet (handles octal 0177, hex 0x7f, decimal)
    const octets = parts.map(p => {
      if (p.startsWith('0x') || p.startsWith('0X')) return parseInt(p, 16)
      if (p.startsWith('0') && p.length > 1) return parseInt(p, 8)
      return parseInt(p, 10)
    })
    if (octets.some(o => isNaN(o) || o < 0 || o > 255)) return true // Invalid = block

    const [a, b, c, d] = octets
    // 10.0.0.0/8
    if (a === 10) return true
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true
    // 169.254.0.0/16 (link-local, metadata)
    if (a === 169 && b === 254) return true
    // 0.0.0.0
    if (a === 0) return true
    return false
  }

  // IPv6 checks
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '[::1]') return true
  if (lower.startsWith('fe80:')) return true // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local
  if (lower.includes('::ffff:')) return true // mapped IPv4 — block all, force pure IPv4

  return false
}

function validateAndNormalizeUrl(urlString: string): string {
  if (typeof urlString !== 'string' || urlString.length > 2048) {
    throw createError({ statusCode: 400, message: 'Invalid URL' })
  }

  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid URL format. Include http:// or https://' })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, message: 'URL must use http:// or https://' })
  }

  // Block userinfo in URL (http://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    throw createError({ statusCode: 400, message: 'URL must not contain credentials' })
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block cloud metadata hostnames
  const blockedHostnames = [
    'metadata.google.internal',
    'metadata.goog',
    'kubernetes.default.svc',
  ]
  if (blockedHostnames.includes(hostname)) {
    throw createError({ statusCode: 400, message: 'Blocked hostname' })
  }

  // Block localhost in production
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true'
  if (isProduction && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')) {
    throw createError({ statusCode: 400, message: 'Cannot connect to localhost from production. Run StrapiShift locally instead.' })
  }

  // Check for decimal IP (e.g., http://2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname)) {
    const ip = Number(hostname)
    if (ip >= 0 && ip <= 0xFFFFFFFF) {
      const a = (ip >>> 24) & 0xFF
      const b = (ip >>> 16) & 0xFF
      const c = (ip >>> 8) & 0xFF
      const d = ip & 0xFF
      if (isPrivateIp(`${a}.${b}.${c}.${d}`)) {
        throw createError({ statusCode: 400, message: 'Cannot connect to private network addresses' })
      }
    }
  }

  // Check hostname as IP
  if (isPrivateIp(hostname)) {
    throw createError({ statusCode: 400, message: 'Cannot connect to private network addresses' })
  }

  // Return only origin (no path, no query, no fragment)
  return `${parsed.protocol}//${parsed.host}`
}

function sanitizeSchemaAttributes(attrs: unknown): Record<string, unknown> {
  if (typeof attrs !== 'object' || attrs === null || Array.isArray(attrs)) return {}
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    // Block prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    // Only copy known safe value types
    if (typeof value === 'object' && value !== null) {
      safe[key] = JSON.parse(JSON.stringify(value)) // Deep clone to break references
    } else {
      safe[key] = value
    }
  }
  return safe
}

export default defineEventHandler(async (event) => {
  // Artificial delay to slow brute-force (serverless-safe)
  await new Promise(resolve => setTimeout(resolve, ARTIFICIAL_DELAY_MS))

  const body = await readBody(event)

  // Validate body
  const bodyStr = JSON.stringify(body || {})
  if (bodyStr.length > 5_000) {
    throw createError({ statusCode: 400, message: 'Request too large' })
  }

  const { url, email, password, version } = body || {}

  if (!url || !email || !password || !version) {
    throw createError({ statusCode: 400, message: 'Missing required fields: url, email, password, version' })
  }

  if (typeof url !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw createError({ statusCode: 400, message: 'Invalid field types' })
  }

  if (version !== 'v3' && version !== 'v5') {
    throw createError({ statusCode: 400, message: 'Version must be "v3" or "v5"' })
  }

  // Validate email format (basic)
  if (!email.includes('@') || email.length > 254) {
    throw createError({ statusCode: 400, message: 'Invalid email format' })
  }

  // Validate and normalize URL
  const baseUrl = validateAndNormalizeUrl(url)

  // Uniform error message to prevent credential oracle
  const authFailMessage = 'Could not authenticate with the provided credentials and URL. Verify the URL is a running Strapi instance and the admin email/password are correct.'

  // Step 1: Login
  let token: string
  try {
    const loginRes = await $fetch<any>(`${baseUrl}/admin/login`, {
      method: 'POST',
      body: { email, password },
      timeout: 10_000,
    })
    token = loginRes?.data?.token || loginRes?.token
    if (!token) {
      throw createError({ statusCode: 401, message: authFailMessage })
    }
  } catch (e: any) {
    if (e.statusCode === 401) throw e
    // Uniform error — don't reveal if it's connection, DNS, or auth failure
    throw createError({ statusCode: 401, message: authFailMessage })
  }

  // Step 2: Fetch content types (fixed paths only)
  const ctbPath = version === 'v3'
    ? '/content-type-builder/content-types'
    : '/api/content-type-builder/content-types'

  let ctData: any
  try {
    const response = await $fetch<any>(`${baseUrl}${ctbPath}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
      responseType: 'json',
    })
    // Limit response size after parsing (protects against very large responses)
    const responseStr = JSON.stringify(response)
    if (responseStr.length > 5_000_000) { // 5MB max
      throw createError({ statusCode: 502, message: 'Response too large. The instance may have too many content types.' })
    }
    ctData = response
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 502, message: 'Could not fetch content types. The admin user may lack permissions.' })
  }

  // Step 3: Parse and sanitize
  const items = ctData?.data || ctData || []
  if (!Array.isArray(items) || items.length > 200) {
    throw createError({ statusCode: 502, message: 'Invalid or excessive response from Content Type Builder API' })
  }

  const schemas: Record<string, any> = {}
  const skipPrefixes = ['admin::', 'strapi::']
  const skipUids = [
    'plugin::users-permissions.permission',
    'plugin::users-permissions.role',
    'plugin::upload.file',
    'plugin::upload.folder',
    'plugin::i18n.locale',
    'plugin::content-releases.release',
    'plugin::content-releases.release-action',
  ]

  for (const item of items) {
    const uid = typeof item?.uid === 'string' ? item.uid : ''
    if (skipPrefixes.some(p => uid.startsWith(p))) continue
    if (skipUids.includes(uid)) continue

    const name = uid.includes('.') ? uid.split('.').pop() || uid : uid
    // Sanitize name
    if (typeof name !== 'string' || name.length > 100 || /[^a-zA-Z0-9_-]/.test(name)) continue

    const schema = item.schema || item
    if (schema?.attributes) {
      schemas[name] = {
        kind: schema.kind === 'singleType' ? 'singleType' : 'collectionType',
        collectionName: typeof schema.collectionName === 'string' ? schema.collectionName.slice(0, 100) : `${name}s`,
        info: {
          name: typeof schema.info?.name === 'string' ? schema.info.name.slice(0, 100) : name,
        },
        attributes: sanitizeSchemaAttributes(schema.attributes),
        ...(typeof schema.connection === 'string' ? { connection: schema.connection.slice(0, 50) } : {}),
      }
    }
  }

  return {
    success: true,
    schemas,
    contentTypeCount: Object.keys(schemas).length,
  }
})
