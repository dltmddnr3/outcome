import { isNativeError, isProxy } from 'node:util/types'
import { HostedObserverBridgeError } from './phase3-observer-bridge-hosted.mjs'

const response = (status, body) => ({ status, body })
const PRIVATE_PREFIX = '/api/private/bridge/'
const INPUT_FIELDS = new Set(['bridge', 'allowed_origin', 'csrf_secret', 'method', 'path', 'headers', 'rawBody', 'authContext', 'query'])
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function ownRecord(value, allowed, required = new Set(), code = 'bad_request') {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || isProxy(value)) throw new HostedObserverBridgeError(code)
  let descriptors
  let prototype
  try { descriptors = Object.getOwnPropertyDescriptors(value); prototype = Object.getPrototypeOf(value) } catch { throw new HostedObserverBridgeError(code) }
  if (prototype !== Object.prototype && prototype !== null) throw new HostedObserverBridgeError(code)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key)) || [...required].some((key) => !Object.hasOwn(descriptors, key))) throw new HostedObserverBridgeError(code)
  const output = Object.create(null)
  for (const key of keys) {
    const descriptor = descriptors[key]
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw new HostedObserverBridgeError(code)
    Object.defineProperty(output, key, { value: descriptor.value, enumerable: true, writable: true, configurable: true })
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
  const output = Object.create(null)
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key]
    if (typeof key !== 'string' || FORBIDDEN_KEYS.has(key) || !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw new HostedObserverBridgeError('bad_request')
    Object.defineProperty(output, key, { value: materializeJson(descriptor.value, depth + 1), enumerable: true, writable: true, configurable: true })
  }
  return output
}

function parseRawJson(rawBody, maximumBytes) {
  let text
  let bytes
  if (typeof rawBody === 'string') {
    text = rawBody
    bytes = Buffer.byteLength(text, 'utf8')
  } else if (Buffer.isBuffer(rawBody)) {
    bytes = rawBody.length
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(rawBody) } catch { throw new HostedObserverBridgeError('bad_request') }
  } else throw new HostedObserverBridgeError('bad_request')
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0 || bytes > maximumBytes) throw new HostedObserverBridgeError('body_too_large')

  let index = 0
  const whitespace = () => { while (index < text.length && /[\u0009\u000a\u000d\u0020]/.test(text[index])) index += 1 }
  const string = () => {
    if (text[index] !== '"') throw new HostedObserverBridgeError('bad_request')
    const start = index
    index += 1
    let escaped = false
    while (index < text.length) {
      const character = text[index]
      index += 1
      if (escaped) { escaped = false; continue }
      if (character === '\\') { escaped = true; continue }
      if (character === '"') {
        try { return JSON.parse(text.slice(start, index)) } catch { throw new HostedObserverBridgeError('bad_request') }
      }
      if (character.charCodeAt(0) < 0x20) throw new HostedObserverBridgeError('bad_request')
    }
    throw new HostedObserverBridgeError('bad_request')
  }
  const value = (depth = 0) => {
    if (depth > 5) throw new HostedObserverBridgeError('bad_request')
    whitespace()
    if (text[index] === '"') return string()
    if (text[index] === '{') {
      index += 1
      whitespace()
      const output = Object.create(null)
      const keys = new Set()
      if (text[index] === '}') { index += 1; return output }
      while (index < text.length) {
        whitespace()
        const key = string()
        if (FORBIDDEN_KEYS.has(key) || keys.has(key)) throw new HostedObserverBridgeError('bad_request')
        keys.add(key)
        whitespace()
        if (text[index] !== ':') throw new HostedObserverBridgeError('bad_request')
        index += 1
        const item = value(depth + 1)
        Object.defineProperty(output, key, { value: item, enumerable: true, writable: true, configurable: true })
        whitespace()
        if (text[index] === '}') { index += 1; return output }
        if (text[index] !== ',') throw new HostedObserverBridgeError('bad_request')
        index += 1
      }
      throw new HostedObserverBridgeError('bad_request')
    }
    if (text[index] === '[') {
      index += 1
      whitespace()
      const output = []
      if (text[index] === ']') { index += 1; return output }
      while (index < text.length) {
        output.push(value(depth + 1))
        whitespace()
        if (text[index] === ']') { index += 1; return output }
        if (text[index] !== ',') throw new HostedObserverBridgeError('bad_request')
        index += 1
      }
      throw new HostedObserverBridgeError('bad_request')
    }
    for (const [literal, result] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(literal, index)) { index += literal.length; return result }
    }
    const number = text.slice(index).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/)
    if (!number) throw new HostedObserverBridgeError('bad_request')
    index += number[0].length
    const parsed = Number(number[0])
    if (!Number.isSafeInteger(parsed)) throw new HostedObserverBridgeError('bad_request')
    return parsed
  }
  const output = value()
  whitespace()
  if (index !== text.length) throw new HostedObserverBridgeError('bad_request')
  return { value: output, bytes }
}

function withServerFields(record, fields) {
  const output = Object.create(null)
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(record))) {
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) throw new HostedObserverBridgeError('bad_request')
    Object.defineProperty(output, key, { value: descriptor.value, enumerable: true, writable: true, configurable: true })
  }
  for (const [key, value] of Object.entries(fields)) {
    if (FORBIDDEN_KEYS.has(key) || Object.hasOwn(output, key)) throw new HostedObserverBridgeError('bad_request')
    Object.defineProperty(output, key, { value, enumerable: true, writable: true, configurable: true })
  }
  return output
}

const ERROR_STATUS = Object.freeze({
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
  body_too_large: 400,
  bad_request: 400,
  input_invalid: 400,
})

const safeHostedErrorCode = (error) => {
  try {
    if (typeof error !== 'object' || error === null || isProxy(error) || !isNativeError(error)) return null
    if (Object.getPrototypeOf(error) !== HostedObserverBridgeError.prototype) return null
    const descriptor = Object.getOwnPropertyDescriptor(error, 'code')
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'string' || !Object.hasOwn(ERROR_STATUS, descriptor.value)) return null
    return descriptor.value
  } catch {
    return null
  }
}

const errorResponse = (error) => {
  const code = safeHostedErrorCode(error)
  if (code === null) return response(503, { error: 'bridge_unavailable' })
  const status = ERROR_STATUS[code]
  const safe = status === 404 || status === 503 ? 'bridge_unavailable' : code
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

export async function handleHostedObserverBridgeRequest(input = {}) {
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
      return response(200, await request.bridge.read({ auth_context: request.authContext, viewer_ref: query.viewer_ref, viewer_class: query.viewer_class, project_id: query.project_id }))
    }
    const postPaths = new Set(['/api/private/bridge/enrollments', '/api/private/bridge/enrollments/complete', '/api/private/bridge/sources/revoke', '/api/private/bridge/sources/rotate', '/api/private/bridge/events'])
    if (!postPaths.has(path)) return response(404, { error: 'bridge_unavailable' })
    if (method !== 'POST') return response(405, { error: 'read_only' })
    if (path === '/api/private/bridge/enrollments') {
      requireJson(headers)
      const parsed = parseRawJson(request.rawBody, request.bridge.maxBodyBytes)
      if (Object.hasOwn(parsed.value, 'auth_context')) throw new HostedObserverBridgeError('bad_request')
      requireOwnerBoundary(headers, request.allowed_origin, request.csrf_secret)
      return response(201, await request.bridge.createEnrollment(withServerFields(parsed.value, { auth_context: request.authContext })))
    }
    if (path === '/api/private/bridge/enrollments/complete') {
      requireJson(headers)
      return response(200, await request.bridge.completeEnrollment(parseRawJson(request.rawBody, request.bridge.maxBodyBytes).value))
    }
    if (path === '/api/private/bridge/sources/revoke') {
      requireJson(headers)
      const parsed = parseRawJson(request.rawBody, request.bridge.maxBodyBytes)
      if (Object.hasOwn(parsed.value, 'auth_context')) throw new HostedObserverBridgeError('bad_request')
      requireOwnerBoundary(headers, request.allowed_origin, request.csrf_secret)
      return response(200, await request.bridge.revokeSource(withServerFields(parsed.value, { auth_context: request.authContext })))
    }
    if (path === '/api/private/bridge/sources/rotate') {
      requireJson(headers)
      const parsed = parseRawJson(request.rawBody, request.bridge.maxBodyBytes)
      if (Object.hasOwn(parsed.value, 'auth_context')) throw new HostedObserverBridgeError('bad_request')
      requireOwnerBoundary(headers, request.allowed_origin, request.csrf_secret)
      return response(201, await request.bridge.createEnrollment(withServerFields(parsed.value, { mode: 'rotate', auth_context: request.authContext })))
    }
    if (path === '/api/private/bridge/events') {
      requireJson(headers)
      const parsed = parseRawJson(request.rawBody, request.bridge.maxBodyBytes)
      if (Object.hasOwn(parsed.value, 'body_bytes')) throw new HostedObserverBridgeError('bad_request')
      return response(200, await request.bridge.ingest(withServerFields(parsed.value, { body_bytes: parsed.bytes })))
    }
    return response(404, { error: 'bridge_unavailable' })
  } catch (error) {
    return errorResponse(error)
  }
}
