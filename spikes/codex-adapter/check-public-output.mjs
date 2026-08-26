import {
  PROHIBITED_PUBLIC_PATTERN,
  SyntheticDispatchAdapter,
  decideCapability,
  observeSynthetic,
  sanitizePublic,
} from './codex-adapter.mjs'

const expected = { projectId: 'outcome', role: 'builder' }
const binding = { state: 'bound', projectId: 'outcome', role: 'builder', targetRef: 'private-synthetic-target' }
const adapter = new SyntheticDispatchAdapter(expected)
const observation = observeSynthetic({ binding, expected, observation: { state: 'idle', observedAt: 'synthetic-observation' } })
const receipt = adapter.submit({
  binding,
  projectId: 'outcome',
  role: 'builder',
  instruction: 'synthetic instruction',
  idempotencyKey: 'synthetic-attempt',
})
const output = JSON.stringify(sanitizePublic({ observation, receipt, decision: decideCapability() }))
const hits = PROHIBITED_PUBLIC_PATTERN.test(output) ? 1 : 0

if (hits !== 0 || adapter.actualExecutionCount !== 0) process.exitCode = 1
console.log(`prohibited_hits=${hits}`)
console.log(`high_risk_execution_count=${adapter.actualExecutionCount}`)
console.log('decision=NO_GO')
console.log('fallback=UNBOUND_MANUAL_NAVIGATION')
