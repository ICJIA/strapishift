/**
 * Fetch content-type schemas from a running Strapi instance.
 *
 * Primary: Uses the server-side proxy at /api/fetch-schema to avoid CORS.
 * Fallback: Direct client-side fetch (requires CORS enabled on Strapi).
 *
 * On Netlify, the server route deploys as a serverless function automatically.
 * In dev, Nitro serves it as a local API route.
 */

interface FetchResult {
  success: boolean
  schemas: Record<string, any> | null
  contentTypeCount: number
  error: string | null
  helpMessage: string | null
}

export function useStrapiFetch() {
  const fetching = ref(false)

  async function fetchSchemas(
    url: string,
    email: string,
    password: string,
    version: 'v3' | 'v5',
  ): Promise<FetchResult> {
    fetching.value = true

    // Try server-side proxy first (avoids CORS)
    try {
      const proxyResult = await $fetch<any>('/api/fetch-schema', {
        method: 'POST',
        body: { url, email, password, version },
      })
      fetching.value = false
      return {
        success: true,
        schemas: proxyResult.schemas,
        contentTypeCount: proxyResult.contentTypeCount,
        error: null,
        helpMessage: null,
      }
    } catch (proxyError: any) {
      // If the proxy endpoint itself doesn't exist (static build), fall through to client-side
      const status = proxyError?.statusCode || proxyError?.status
      if (status === 404 || status === 405) {
        // Proxy not available — fall through to direct fetch
      } else if (status) {
        // Proxy returned a real error from Strapi
        fetching.value = false
        const msg = proxyError?.data?.message || proxyError?.message || 'Server proxy error'
        return {
          success: false,
          schemas: null,
          contentTypeCount: 0,
          error: msg,
          helpMessage: buildManualHelp(version),
        }
      }
      // else: network error reaching proxy, fall through
    }

    // Fallback: direct client-side fetch (CORS required)
    const baseUrl = url.replace(/\/+$/, '')

    try {
      // Step 1: Authenticate with admin panel
      const loginUrl = version === 'v3'
        ? `${baseUrl}/admin/login`
        : `${baseUrl}/admin/login`

      let loginRes: Response
      try {
        loginRes = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
          }),
        })
      } catch (e) {
        return {
          success: false,
          schemas: null,
          contentTypeCount: 0,
          error: `Cannot reach ${baseUrl}`,
          helpMessage: buildConnectionHelp(baseUrl, version),
        }
      }

      if (!loginRes.ok) {
        const status = loginRes.status
        if (status === 401 || status === 400) {
          return {
            success: false,
            schemas: null,
            contentTypeCount: 0,
            error: 'Invalid admin credentials. Check your email and password.',
            helpMessage: 'These are your Strapi admin panel credentials — the email and password you use to log into the Strapi admin at /admin. They are NOT API tokens.',
          }
        }
        return {
          success: false,
          schemas: null,
          contentTypeCount: 0,
          error: `Login failed with status ${status}`,
          helpMessage: buildConnectionHelp(baseUrl, version),
        }
      }

      let token: string
      try {
        const loginData = await loginRes.json()
        token = loginData.data?.token || loginData.token
        if (!token) throw new Error('No token in response')
      } catch {
        return {
          success: false,
          schemas: null,
          contentTypeCount: 0,
          error: 'Login succeeded but no auth token was returned. The Strapi version may not be compatible.',
          helpMessage: buildManualHelp(version),
        }
      }

      // Step 2: Fetch content types
      const ctbUrl = version === 'v3'
        ? `${baseUrl}/content-type-builder/content-types`
        : `${baseUrl}/api/content-type-builder/content-types`

      let ctRes: Response
      try {
        ctRes = await fetch(ctbUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        return {
          success: false,
          schemas: null,
          contentTypeCount: 0,
          error: `Authenticated successfully but cannot reach the Content Type Builder API at ${ctbUrl}`,
          helpMessage: buildCtbHelp(version),
        }
      }

      if (!ctRes.ok) {
        return {
          success: false,
          schemas: null,
          contentTypeCount: 0,
          error: `Content Type Builder API returned status ${ctRes.status}. The admin user may not have permission to access this endpoint.`,
          helpMessage: buildCtbHelp(version),
        }
      }

      const ctData = await ctRes.json()

      // Step 3: Parse the response into a schema object
      const schemas = parseCtbResponse(ctData, version)
      const count = Object.keys(schemas).length

      if (count === 0) {
        return {
          success: false,
          schemas: null,
          contentTypeCount: 0,
          error: 'No content types found. The instance may have no custom content types defined.',
          helpMessage: null,
        }
      }

      return {
        success: true,
        schemas,
        contentTypeCount: count,
        error: null,
        helpMessage: null,
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      return {
        success: false,
        schemas: null,
        contentTypeCount: 0,
        error: `Unexpected error: ${msg}`,
        helpMessage: buildManualHelp(version),
      }
    } finally {
      fetching.value = false
    }
  }

  return { fetchSchemas, fetching }
}

function parseCtbResponse(data: any, version: 'v3' | 'v5'): Record<string, any> {
  const schemas: Record<string, any> = {}

  // v3 and v5 both return { data: [...] }
  const items = data.data || data || []
  if (!Array.isArray(items)) return schemas

  for (const item of items) {
    const uid = item.uid || ''
    // Skip internal Strapi types (admin, plugin internals)
    if (uid.startsWith('admin::')) continue
    if (uid.startsWith('strapi::')) continue
    if (uid === 'plugin::users-permissions.permission') continue
    if (uid === 'plugin::users-permissions.role') continue
    if (uid === 'plugin::upload.file') continue
    if (uid === 'plugin::upload.folder') continue
    if (uid === 'plugin::i18n.locale') continue
    if (uid === 'plugin::content-releases.release') continue
    if (uid === 'plugin::content-releases.release-action') continue

    // Extract the short name
    const name = uid.includes('.')
      ? uid.split('.').pop() || uid
      : uid

    const schema = item.schema || item
    if (schema && schema.attributes) {
      schemas[name] = {
        kind: schema.kind || 'collectionType',
        collectionName: schema.collectionName || `${name}s`,
        info: schema.info || { name },
        attributes: schema.attributes,
        ...(schema.connection ? { connection: schema.connection } : {}),
      }
    }
  }

  return schemas
}

function buildConnectionHelp(url: string, version: string): string {
  return `Could not connect to ${url}. Please check:

1. The URL is correct and the Strapi instance is running
2. Include the full URL with protocol (e.g., http://localhost:1337)
3. If running locally, make sure the Strapi dev server is started
4. If the instance is remote, CORS must allow requests from this origin

If you can't resolve the connection, get the schema files manually instead:
${version === 'v3'
    ? '• Copy from: api/[content-type]/models/[name].settings.json'
    : '• Copy from: src/api/[content-type]/content-types/[name]/schema.json'
  }`
}

function buildCtbHelp(version: string): string {
  return `The Content Type Builder API is not accessible. This can happen if:

1. The admin user doesn't have Super Admin role
2. The Content Type Builder plugin is disabled
3. The Strapi version doesn't support this endpoint

To get schemas manually instead:
${version === 'v3'
    ? '• Open each file at: api/[content-type]/models/[name].settings.json'
    : '• Open each file at: src/api/[content-type]/content-types/[name]/schema.json'
  }

Combine multiple content types into one JSON object like:
{"article": {"kind": "collectionType", "attributes": {...}}, "category": {...}}`
}

function buildManualHelp(version: string): string {
  return `Auto-fetch didn't work. You can get the schemas manually:

${version === 'v3'
    ? `1. Open your Strapi v3 project directory
2. Look in: api/[content-type]/models/[name].settings.json
3. Each .settings.json file is one content type schema
4. Paste the contents here (combine multiple as a JSON object)`
    : `1. Open your Strapi v5 project directory
2. Look in: src/api/[content-type]/content-types/[name]/schema.json
3. Each schema.json file is one content type schema
4. Paste the contents here (combine multiple as a JSON object)`
  }`
}
