import { isProxy } from 'node:util/types'
import { HostedObserverBridgeError } from './phase3-observer-bridge-hosted.mjs'

const response = (status, body) => ({ status, body })
const PRIVATE_PREFIX = '/api/private/bridge/'
const INPUT_FIELDS = new Set(['bridge', 'allowed_origin', 'csrf_secret', 'method', 'path', 'headers', 'body', 'authContext', 'query'])

function ownRecord(value, allowed, required = new Set(), code = 'bad_request') {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) throw new HostedObserverBridgeError(code)
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { throw new HostedObserverBridgeError(code) }
  if (prototype !== Object.prototype && prototype !== null) throw new HostedObserverBridgeError(code)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key)) || [...required].some((key) => !Object.hasOwn(descriptors, key))) throw new HostedObserverBridgeError(code)
  const output = {}
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw new HostedObserverBridgeError(code)
    output[key] = descriptor.value
  }
  return output
}

function materializeJson(value, depth = 0) {
  if (depth > 5) throw new HostedObserverBridgeError('bad_request')
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isSafeInteger(value))) return value
  if (Array.isArray(value)) {
    if (isProxy(value)) throw new HostedObserverBridgeError('bad_request')
    let descriptors
    let prototype
    try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { throw new HostedObserverBridgeError('bad_request') }
    if (prototype !== Array.prototype) throw new HostedObserverBridgeError('bad_request')
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || (key !== 'length' && !/^(0|[1-9][0-9]*)$/.test(key)))) throw new HostedObserverBridgeError('bad_request')
    const output = []
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)]
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw new HostedObserverBridgeError('bad_request')
      output.push(materializeJson(descriptor.value, depth + 1))
    }
    return output
  }
  if (typeof value !== 'object' || value === null || isProxy(value)) throw new HostedObserverBridgeError('bad_request')
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { throw new HostedObserverBridgeError('bad_request') }
  if (prototype !== Object.prototype && prototype !== null) throw new HostedObserverBridgeError('bad_request')
  const output = {}
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key]
    if (typeof key !== 'string' || !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw new HostedObserverBridgeError('bad_request')
    output[key] = materializeJson(descriptor.value, depth + 1)
  }
  return output
}

const errorResponse = (error) => {
  if (!(error instanceof HostedObserverBridgeError)) return response(503, { error: 'bridge_unavailable' })
  const status = {
    unavailable: 404,
    access_denied: 404,
    auth_unavailable: 503,
    enrollment_invalid: 409,
    enrollment_conflict: 409,
    idempotency_conflict: 409,
    request_conflict: 409,
    sequence_conflict: 409,
    signature_invalid: 401,
    csrf_invalid: 403,
    rate_limited: 429,
    bad_request: 400,
    input_invalid: 400,
  }[error.code] ?? 503
  const safe = status === 404 ? 'bridge_unavailable' : (status === 503 ? 'bridge_unavailable' : error.code)
  return response(status, { error: safe })
}

function jsonHeaders(value) {
  const headers = ownRecord(value ?? {}, new Set(['content-type', 'origin', 'x-outcome-csrf', 'cookie', 'authorization']), new Set(), 'bad_request')
  for (const item of Object.values(headers)) if (typeof item !== 'string') throw new HostedObserverBridgeError('bad_request')
  return headers
}

function requireJson(headers) {
  if (headers['content-type'] !== 'application/json') throw new HostedObserverBridgeError('bad_request')
}

function requireOwnerBoundary(headers, allowedOrigin, csrfSecret) {
  if (typeof allowedOrigin !== 'string' || typeof csrfSecret !== 'string' || headers.origin !== allowedOrigin || headers['x-outcome-csrf'] !== csrfSecret) throw new HostedObserverBridgeError('csrf_invalid')
}

export function handleHostedObserverBridgeRequest(input = {}) {
  let request
  try { request = ownRecord(input, INPUT_FIELDS, new Set(['method', 'path'])) } catch (error) { return errorResponse(error) }
  const method = request.method
  const path = request.path
  if (typeof method !== 'string' || typeof path !== 'string') return response(400, { error: 'bad_request' })
  if (!path.startsWith(PRIVATE_PREFIX)) return method === 'GET' ? response(404, { error: 'not_found' }) : response(405, { error: 'read_only' })
  if (!request.bridge) return method === 'GET' ? response(404, { error: 'bridge_unavailable' }) : response(404, { error: 'bridge_unavailable' })
  try {
    const headers = jsonHeaders(request.headers)
    if (path === '/api/private/bridge/projection') {
      if (method !== 'GET') return response(405, { error: 'read_only' })
      const query = materializeJson(request.query ?? {})
      return response(200, request.bridge.read({ auth_context: request.authContext, viewer_ref: query.viewer_ref, viewer_class: query.viewer_class, project_id: query.project_id }))
    }
    const postPaths = new Set(['/api/private/bridge/enrollments', '/api/private/bridge/enrollments/complete', '/api/private/bridge/sources/revoke', '/api/private/bridge/sources/rotate', '/api/private/bridge/events'])
    if (!postPaths.has(path)) return response(404, { error: 'bridge_unavailable' })
    if (method !== 'POST') return response(405, { error: 'read_only' })
    if (path === '/api/private/bridge/enrollments') {
      requireJson(headers)
      requireOwnerBoundary(headers, request.allowed_origin, request.csrf_secret)
      return response(201, request.bridge.createEnrollment({ ...materializeJson(request.body), auth_context: request.authContext }))
    }
    if (path === '/api/private/bridge/enrollments/complete') {
      requireJson(headers)
      return response(200, request.bridge.completeEnrollment(materializeJson(request.body)))
    }
    if (path === '/api/private/bridge/sources/revoke') {
      requireJson(headers)
      requireOwnerBoundary(headers, request.allowed_origin, request.csrf_secret)
      return response(200, request.bridge.revokeSource({ ...materializeJson(request.body), auth_context: request.authContext }))
    }
    if (path === '/api/private/bridge/sources/rotate') {
      requireJson(headers)
      requireOwnerBoundary(headers, request.allowed_origin, request.csrf_secret)
      return response(201, request.bridge.createEnrollment({ ...materializeJson(request.body), mode: 'rotate', auth_context: request.authContext }))
    }
    if (path === '/api/private/bridge/events') {
      requireJson(headers)
      const body = materializeJson(request.body)
      const bodyBytes = Buffer.byteLength(JSON.stringify(body), 'utf8')
      return response(200, request.bridge.ingest({ ...body, body_bytes: bodyBytes }))
    }
    return response(404, { error: 'bridge_unavailable' })
  } catch (error) {
    return errorResponse(error)
  }
}
