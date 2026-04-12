import { Buffer } from 'node:buffer'
import http from 'node:http'
import https from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

type ProxyPayload = {
  baseUrl: string
  schema: string
  trustSelfSigned: boolean
}

type ImportPayload = ProxyPayload & {
  gzipBase64: string
}

type AlivePayload = {
  baseUrl: string
  trustSelfSigned: boolean
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

function buildCandidateUrls(baseUrl: string, schema: string): string[] {
  const normalized = normalizeBaseUrl(baseUrl)
  const encodedSchema = encodeURIComponent(schema)
  return [
    `${normalized}/db/${encodedSchema}/enm/v2/alle/gzip`,
    `${normalized}/db/${encodedSchema}/enm/v1/alle/gzip`,
    `${normalized}/api/v1/schule/${encodedSchema}/export/enm`,
    `${normalized}/api/v1/schule/export/enm?schema=${encodedSchema}`,
    `${normalized}/api/v1/schule/export/enm`,
  ]
}

function requestBuffer(
  targetUrl: string,
  trustSelfSigned: boolean,
  headers: Record<string, string>,
  method: 'GET' | 'POST' = 'GET',
  body?: Buffer,
): Promise<{
  statusCode: number
  statusMessage: string
  headers: http.IncomingHttpHeaders
  body: Buffer
}> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl)
    const isHttps = parsed.protocol === 'https:'
    const requestFn = isHttps ? https.request : http.request
    const requestOptions: https.RequestOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      path: `${parsed.pathname}${parsed.search}`,
      method,
      headers,
      rejectUnauthorized: isHttps ? !trustSelfSigned : undefined,
    }

    const request = requestFn(requestOptions, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode ?? 500,
          statusMessage: response.statusMessage ?? 'Unknown Error',
          headers: response.headers,
          body: Buffer.concat(chunks),
        })
      })
    })

    request.on('error', reject)
    if (body) {
      request.write(body)
    }
    request.end()
  })
}

function isAlivePayload(value: unknown): value is AlivePayload {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AlivePayload>
  return typeof candidate.baseUrl === 'string'
    && typeof candidate.trustSelfSigned === 'boolean'
}

function isProxyPayload(value: unknown): value is ProxyPayload {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ProxyPayload>
  return typeof candidate.baseUrl === 'string'
    && typeof candidate.schema === 'string'
    && typeof candidate.trustSelfSigned === 'boolean'
}

function isImportPayload(value: unknown): value is ImportPayload {
  if (!isProxyPayload(value)) return false
  return typeof (value as Partial<ImportPayload>).gzipBase64 === 'string'
}

function readBasicCredentials(req: IncomingMessage): { username: string, password: string } | null {
  const authorization = req.headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Basic ')) {
    return null
  }

  try {
    const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8')
    const separatorIndex = decoded.indexOf(':')
    if (separatorIndex < 0) return null
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    }
  } catch {
    return null
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: './',
    define: {
      __SVWS_DEFAULTS__: JSON.stringify({
        host: env.SVWSSERVER_HOST ?? '',
        port: env.SVWSSERVER_PORT ?? '',
        schema: env.SVWSSERVER_SCHEMA ?? '',
        user: env.SVWSSERVER_USER ?? '',
        password: env.SVWSSERVER_PASSWORD ?? '',
      }),
    },
    server: {
      host: true,
      port: 5173,
    },
    plugins: [
      vue(),
      {
        name: 'svws-enm-proxy',
        configureServer(server) {
          server.middlewares.use('/api/svws/alive', async (req, res) => {
            if (req.method !== 'POST') {
              sendJson(res, 405, { error: 'Nur POST wird unterstützt.' })
              return
            }

            try {
              const raw = await readBody(req)
              const parsed: unknown = JSON.parse(raw)

              if (!isAlivePayload(parsed)) {
                sendJson(res, 400, { error: 'Ungültige Alive-Parameter.' })
                return
              }

              const payload = parsed
              if (!payload.baseUrl.trim()) {
                sendJson(res, 400, { error: 'Server-URL ist erforderlich.' })
                return
              }

              const targetUrl = `${normalizeBaseUrl(payload.baseUrl)}/status/alive`
              const upstream = await requestBuffer(targetUrl, payload.trustSelfSigned, {
                'Accept': 'text/plain, application/json;q=0.9, */*;q=0.8',
              })

              if (upstream.statusCode >= 200 && upstream.statusCode < 300) {
                const contentType = upstream.headers['content-type'] ?? 'text/plain; charset=utf-8'
                res.writeHead(200, {
                  'Content-Type': Array.isArray(contentType) ? contentType[0] : contentType,
                  'Cache-Control': 'no-store',
                })
                res.end(upstream.body)
                return
              }

              const upstreamMessage = upstream.body.toString('utf8').trim()
              sendJson(res, upstream.statusCode, {
                error: `SVWS-Alive-Fehler ${upstream.statusCode} ${upstream.statusMessage}${upstreamMessage ? `: ${upstreamMessage}` : ''}`,
              })
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unbekannter Proxy-Fehler'
              sendJson(res, 502, { error: message })
            }
          })

          server.middlewares.use('/api/svws/enm', async (req, res) => {
            if (req.method !== 'POST') {
              sendJson(res, 405, { error: 'Nur POST wird unterstützt.' })
              return
            }

            try {
              const raw = await readBody(req)
              const parsed: unknown = JSON.parse(raw)

              if (!isProxyPayload(parsed)) {
                sendJson(res, 400, { error: 'Ungültige Verbindungsparameter.' })
                return
              }

              const credentials = readBasicCredentials(req)
              if (!credentials || !credentials.username.trim()) {
                sendJson(res, 400, { error: 'Authorization-Header mit BasicAuth ist erforderlich.' })
                return
              }

              const payload = parsed
              if (!payload.baseUrl.trim() || !payload.schema.trim()) {
                sendJson(res, 400, { error: 'Server-URL und Schema sind erforderlich.' })
                return
              }

              const basic = Buffer.from(`${credentials.username}:${credentials.password}`, 'utf8').toString('base64')
              const authHeader = `Basic ${basic}`
              const candidateUrls = buildCandidateUrls(payload.baseUrl, payload.schema)

              let lastResponse: {
                statusCode: number
                statusMessage: string
                body: Buffer
              } | null = null

              for (const candidateUrl of candidateUrls) {
                const upstream = await requestBuffer(candidateUrl, payload.trustSelfSigned, {
                  'Authorization': authHeader,
                  'Accept': 'application/octet-stream, application/gzip;q=0.9',
                })
                if (upstream.statusCode >= 200 && upstream.statusCode < 300) {
                  const contentType = upstream.headers['content-type'] ?? 'application/gzip'
                  res.writeHead(200, {
                    'Content-Type': Array.isArray(contentType) ? contentType[0] : contentType,
                    'Cache-Control': 'no-store',
                  })
                  res.end(upstream.body)
                  return
                }

                lastResponse = {
                  statusCode: upstream.statusCode,
                  statusMessage: upstream.statusMessage,
                  body: upstream.body,
                }

                if (upstream.statusCode !== 404) {
                  break
                }
              }

              if (!lastResponse) {
                sendJson(res, 502, { error: 'SVWS-Server antwortet nicht.' })
                return
              }

              const upstreamMessage = lastResponse.body.toString('utf8').trim()
              sendJson(res, lastResponse.statusCode, {
                error: `SVWS-Fehler ${lastResponse.statusCode} ${lastResponse.statusMessage}${upstreamMessage ? `: ${upstreamMessage}` : ''}`,
              })
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unbekannter Proxy-Fehler'
              sendJson(res, 502, { error: message })
            }
          })

          server.middlewares.use('/api/svws/enm-import', async (req, res) => {
            if (req.method !== 'POST') {
              sendJson(res, 405, { error: 'Nur POST wird unterstützt.' })
              return
            }

            try {
              const raw = await readBody(req)
              const parsed: unknown = JSON.parse(raw)

              if (!isImportPayload(parsed)) {
                sendJson(res, 400, { error: 'Ungültige Import-Parameter.' })
                return
              }

              const credentials = readBasicCredentials(req)
              if (!credentials || !credentials.username.trim()) {
                sendJson(res, 400, { error: 'Authorization-Header mit BasicAuth ist erforderlich.' })
                return
              }

              const payload = parsed
              if (!payload.baseUrl.trim() || !payload.schema.trim()) {
                sendJson(res, 400, { error: 'Server-URL und Schema sind erforderlich.' })
                return
              }

              const basic = Buffer.from(`${credentials.username}:${credentials.password}`, 'utf8').toString('base64')
              const authHeader = `Basic ${basic}`
              const targetUrl = `${normalizeBaseUrl(payload.baseUrl)}/db/${encodeURIComponent(payload.schema)}/enm/v2/import/gzip`
              const bodyBuffer = Buffer.from(payload.gzipBase64, 'base64')
              const boundary = `----svwsconference${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
              const preamble = Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="data"; filename="enm.json.gz"\r\n` +
                `Content-Type: application/gzip\r\n\r\n`,
                'utf8',
              )
              const ending = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
              const multipartBody = Buffer.concat([preamble, bodyBuffer, ending])

              const upstream = await requestBuffer(
                targetUrl,
                payload.trustSelfSigned,
                {
                  'Authorization': authHeader,
                  'Accept': '*/*',
                  'Content-Type': `multipart/form-data; boundary=${boundary}`,
                  'Content-Length': String(multipartBody.byteLength),
                },
                'POST',
                multipartBody,
              )

              if (upstream.statusCode >= 200 && upstream.statusCode < 300) {
                const contentType = upstream.headers['content-type'] ?? 'application/json; charset=utf-8'
                res.writeHead(200, {
                  'Content-Type': Array.isArray(contentType) ? contentType[0] : contentType,
                  'Cache-Control': 'no-store',
                })
                res.end(upstream.body)
                return
              }

              const upstreamMessage = upstream.body.toString('utf8').trim()
              sendJson(res, upstream.statusCode, {
                error: `SVWS-Import-Fehler ${upstream.statusCode} ${upstream.statusMessage}${upstreamMessage ? `: ${upstreamMessage}` : ''}`,
              })
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unbekannter Proxy-Fehler'
              sendJson(res, 502, { error: message })
            }
          })
        },
      },
    ],
  }
})
