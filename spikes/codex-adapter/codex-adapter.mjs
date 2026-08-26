const STATUSES = new Set(['supported', 'unsupported', 'unknown'])
const BINDING_STATES = new Set(['bound', 'unbound', 'conflict', 'unknown'])

export const INVENTORY = Object.freeze({
  observedAt: '2026-08-26 KST',
  cliVersion: 'codex-cli 0.149.0-alpha.4',
  schemaSha256: '02a4c63a638fdae4a5f6c3ad32a41a377b642c66f3abc84f6fc47c7f3d6074df',
  schemaV2Sha256: '9b3de71a5a2ffc980b792a18aa8f8dec3f85f48829560222a0264fe494b679a9',
  sources: [
    'https://developers.openai.com/codex/app-server',
    'https://developers.openai.com/codex/cli/reference',
    'https://developers.openai.com/codex/sdk',
    'https://developers.openai.com/codex/pricing',
  ],
  capabilities: {
    observeExactThread: { status: 'supported', interface: 'thread/read', maturity: 'experimental' },
    enumerateThreads: { status: 'supported', interface: 'thread/list', use: 'forbidden_without_explicit_bind' },
    resumeExactThread: { status: 'supported', interface: 'thread/resume', maturity: 'experimental' },
    startTurn: { status: 'supported', interface: 'turn/start', maturity: 'experimental' },
    acceptedAck: { status: 'supported', interface: 'JSON-RPC response and turn/started' },
    terminalAck: { status: 'supported', interface: 'turn/completed' },
    authenticationSurface: { status: 'supported', interface: 'app-server account and initialize protocol' },
    nativeProjectRoleBinding: { status: 'unsupported', reason: 'no OUTCOME project-role contract in protocol' },
    duplicateIdempotency: { status: 'unknown', reason: 'no documented provider idempotency guarantee' },
    timeoutRetry: { status: 'unknown', reason: 'no documented exactly-once retry guarantee' },
    productRateLimit: { status: 'unknown', reason: 'no app-server-specific limit pinned' },
    incrementalCost: { status: 'unknown', reason: 'no app-server-call-specific price pinned' },
    unattendedMacMiniPermission: { status: 'unknown', reason: 'no explicit unattended-host permission pinned' },
    integrationTerms: { status: 'unknown', reason: 'enterprise known-client registration and unattended terms not pinned' },
    credentialLifecycle: { status: 'unknown', reason: 'least-privilege rotation and revocation design not proven' },
    websocketProduction: { status: 'unsupported', reason: 'official documentation marks WebSocket experimental' },
  },
})

export function validateInventory(inventory = INVENTORY) {
  if (!inventory.observedAt || !inventory.cliVersion || inventory.sources.length !== 4) return false
  return Object.values(inventory.capabilities).every(({ status }) => STATUSES.has(status))
}

export function normalizeBinding(binding, expected) {
  if (!binding || !BINDING_STATES.has(binding.state)) return { state: 'unknown', reason: 'invalid_binding' }
  if (binding.state !== 'bound') return { state: binding.state, reason: `binding_${binding.state}` }
  if (binding.projectId !== expected.projectId || binding.role !== expected.role) {
    return { state: 'conflict', reason: 'project_role_mismatch' }
  }
  if (!binding.targetRef) return { state: 'unknown', reason: 'missing_private_target' }
  return { state: 'bound', reason: null, privateTarget: binding.targetRef }
}

export function observeSynthetic({ binding, expected, observation }) {
  const normalized = normalizeBinding(binding, expected)
  if (normalized.state !== 'bound') {
    return { source: 'codex_app_server', state: normalized.state, reason: normalized.reason, observedAt: null }
  }
  if (!observation || !['active', 'idle', 'stale', 'unknown'].includes(observation.state)) {
    return { source: 'codex_app_server', state: 'unknown', reason: 'invalid_observation', observedAt: null }
  }
  return {
    source: 'codex_app_server',
    state: observation.state,
    reason: null,
    observedAt: observation.observedAt ?? null,
  }
}

export function buildNoopTurnStart({ privateTarget, instruction }) {
  if (!privateTarget || !instruction) throw new Error('exact private target and instruction are required')
  return {
    method: 'turn/start',
    params: {
      threadId: privateTarget,
      input: [{ type: 'text', text: instruction }],
    },
    transmitted: false,
  }
}

export class SyntheticDispatchAdapter {
  #seen = new Map()
  constructor(expected) {
    this.expected = expected
    this.syntheticAttemptCount = 0
    this.actualExecutionCount = 0
  }

  submit({ binding, projectId, role, instruction, idempotencyKey, highRisk = false, exactConfirmation = false, outcome = 'accepted' }) {
    const normalized = normalizeBinding(binding, this.expected)
    if (projectId !== this.expected.projectId) return this.#denied('wrong_project')
    if (role !== this.expected.role) return this.#denied('wrong_role')
    if (normalized.state !== 'bound') return this.#denied(normalized.reason)
    if (!instruction || !idempotencyKey) return this.#denied('invalid_request')
    if (highRisk && !exactConfirmation) return this.#denied('confirmation_required')
    if (this.#seen.has(idempotencyKey)) return { ...this.#seen.get(idempotencyKey), duplicate: true }

    this.syntheticAttemptCount += 1
    const envelope = buildNoopTurnStart({ privateTarget: normalized.privateTarget, instruction })
    const receipt = outcome === 'timeout'
      ? { state: 'delivery_unknown', acknowledged: false, terminal: false, retryAllowed: false, duplicate: false, transmitted: envelope.transmitted }
      : { state: 'accepted_not_complete', acknowledged: true, terminal: false, retryAllowed: false, duplicate: false, transmitted: envelope.transmitted }
    this.#seen.set(idempotencyKey, receipt)
    return receipt
  }

  acknowledge(event) {
    if (event === 'turn/completed') return { state: 'completed', acknowledged: true, terminal: true }
    if (event === 'turn/started' || event === 'response') return { state: 'accepted_not_complete', acknowledged: true, terminal: false }
    if (event === 'failed' || event === 'interrupted') return { state: event, acknowledged: true, terminal: true }
    return { state: 'unknown', acknowledged: false, terminal: false }
  }

  #denied(reason) {
    return { state: 'denied', reason, acknowledged: false, terminal: true, retryAllowed: false, transmitted: false }
  }
}

const SENSITIVE_KEY = /(?:session|thread|task|turn)[_-]?id|targetref|credential|secret|token|cookie|authorization|prompt|result/i
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi
const FULL_HASH = /\b[0-9a-f]{40}\b|\b[0-9a-f]{64}\b/gi
const ABSOLUTE_PATH = /(?:^|[\s"'`])\/(?:Users|home|tmp|private\/tmp|var|opt|etc|Volumes|Library)(?:\/[^\s"'`]*)?/gi
const CREDENTIAL = /\b(?:sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]+\b/gi

export function sanitizePublic(value) {
  if (Array.isArray(value)) return value.map(sanitizePublic)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, entry]) => [key, sanitizePublic(entry)]))
  }
  if (typeof value !== 'string') return value
  return value
    .replace(UUID, '[redacted]')
    .replace(FULL_HASH, '[redacted]')
    .replace(ABSOLUTE_PATH, ' [redacted-path]')
    .replace(CREDENTIAL, '[redacted]')
}

export const PROHIBITED_PUBLIC_PATTERN = /"(?:(?:session|thread|task|turn)[_-]?id|targetref|credential|secret|token|cookie|authorization|prompt|result)"\s*:|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|\b[0-9a-f]{40}\b|\b[0-9a-f]{64}\b|(?:^|[\s"'`])\/(?:Users|home|tmp|private\/tmp|var|opt|etc|Volumes|Library)(?:\/[^\s"'`]*)?|\b(?:sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]+\b/i

export function decideCapability(inventory = INVENTORY) {
  const blockers = [
    'duplicateIdempotency',
    'timeoutRetry',
    'productRateLimit',
    'incrementalCost',
    'unattendedMacMiniPermission',
    'integrationTerms',
    'credentialLifecycle',
  ].filter((name) => inventory.capabilities[name]?.status !== 'supported')
  return {
    decision: blockers.length ? 'NO_GO' : 'GO',
    scope: 'production_relay',
    blockers,
    fallback: 'UNBOUND_MANUAL_NAVIGATION',
  }
}
