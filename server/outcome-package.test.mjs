import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { buildPackageModel, collectOutcomePackages, installOutcomeSessions, loadBindingRegistry, loadProjectRegistry, parseGateLedger, parseGithubConnector, projectPublicPackages } from './outcome-package.mjs'
import { createEmptyRegistry, mutateRegistry } from './outcome-session-registry-persistence.mjs'

const map = (overrides = '') => `# Map\n\`\`\`yaml\nschema_version: 1\nproject_id: demo\ntitle: Demo\nphases:\n  - id: phase-one\n    title: Phase\n    purpose: Phase purpose\n    scopes:\n      - id: scope-one\n        title: Scope\n        purpose: Scope purpose\n        stages:\n          - id: stage-one\n            title: Stage\n            purpose: Stage purpose\n            depends_on: []\n            gates_file: GATES_STAGE.md\n            implementation_state: work_in_progress\n            evidence_closure_state: pending\n${overrides}\n\`\`\`\n`
const contract = '- Project ID: `demo`\n- Project name: `Demo`\n- Outcome: Measured outcome\n- Acceptance authority: `Cherry`\n'
const sessions = '# Sessions\n```yaml\nschema_version: 2\nproject_id: demo\nroles:\n  planner: { required: true, active_binding_ref: null, binding_version: 0, state: unbound }\n  builder: { required: true, active_binding_ref: null, binding_version: 0, state: unbound }\n  ux_product_qa: { required: true, active_binding_ref: null, binding_version: 0, state: unbound }\n  release_audit: { required: true, active_binding_ref: null, binding_version: 0, state: unbound }\n```\n'
const declared = (role, alias, version, state = 'active', source = sessions) => source.replace(`  ${role}: { required: true, active_binding_ref: null, binding_version: 0, state: unbound }`, `  ${role}: { required: true, active_binding_ref: ${alias}, binding_version: ${version}, state: ${state} }`)
const runtime = (role, alias, version = 1, status = 'active') => ({ project_id: 'demo', role, public_alias: alias, status, binding_version: version, history_count: version, bound_at: '2026-08-27T00:00:00.000Z', observed_at: null })
function fixture({ contractText = contract, mapText = map(), gateText = '- [x] G1: first\n- [ ] G2: second', sessionsText = sessions, registry = [], fileTime, now = new Date() } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'outcome-package-')); mkdirSync(join(root, 'docs'))
  writeFileSync(join(root, 'docs/OUTCOME_CONTRACT.md'), contractText); writeFileSync(join(root, 'docs/OUTCOME_MAP.md'), mapText); if (gateText !== null) writeFileSync(join(root, 'docs/GATES_STAGE.md'), gateText)
  if (sessionsText !== null) writeFileSync(join(root, 'docs/OUTCOME_SESSIONS.md'), sessionsText)
  if (fileTime) for (const name of ['OUTCOME_CONTRACT.md', 'OUTCOME_MAP.md', ...(gateText === null ? [] : ['GATES_STAGE.md'])]) utimesSync(join(root, 'docs', name), fileTime, fileTime)
  return buildPackageModel({ root, contractFile: 'docs/OUTCOME_CONTRACT.md', mapFile: 'docs/OUTCOME_MAP.md', sessionsFile: sessionsText === null ? null : 'docs/OUTCOME_SESSIONS.md', bindingRegistry: registry, now, staleAfterSeconds: 3600 })
}

test('sessions manifest and private runtime reconcile aliases versions states and transitions fail closed', () => {
  const runtimeOnly = fixture({ registry: [runtime('builder', 'builder-primary')] })
  assert.equal(runtimeOnly.status, 'conflict'); assert.ok(runtimeOnly.errors.includes('sessions_registry_conflict:builder'))
  const manifestOnly = fixture({ sessionsText: declared('builder', 'builder-primary', 1) })
  assert.equal(manifestOnly.status, 'conflict'); assert.ok(manifestOnly.errors.includes('sessions_registry_conflict:builder'))
  const matching = fixture({ sessionsText: declared('builder', 'builder-primary', 1), registry: [runtime('builder', 'builder-primary')] })
  assert.equal(matching.status, 'valid')
  for (const [alias, version] of [['builder-other', 1], ['builder-primary', 2]]) {
    const mismatch = fixture({ sessionsText: declared('builder', alias, version), registry: [runtime('builder', 'builder-primary')] })
    assert.equal(mismatch.status, 'conflict'); assert.ok(mismatch.errors.includes('sessions_registry_conflict:builder'))
  }
  const replaced = fixture({ sessionsText: declared('builder', 'builder-successor', 2), registry: [runtime('builder', 'builder-successor', 2)] })
  assert.equal(replaced.status, 'valid')
  const revoked = fixture({ sessionsText: sessions, registry: [{ ...runtime('builder', 'builder-primary'), public_alias: null, status: 'unbound', history_count: 1 }] })
  assert.equal(revoked.status, 'valid')
})

function registryFixture(ids = ['alpha', 'beta', 'gamma']) {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'outcome-registry-'))
  const projects = ids.map((id) => {
    const root = join(repositoryRoot, id); mkdirSync(root)
    writeFileSync(join(root, 'CONTRACT.md'), `- Project ID: \`${id}\`\n- Project name: \`${id} source title\`\n- Outcome: ${id} source outcome\n- Acceptance authority: \`Cherry\`\n`)
    writeFileSync(join(root, 'MAP.md'), map().replaceAll('demo', id).replace('title: Demo', `title: ${id} source title`).replace('title: Phase', `title: ${id} source phase`).replace('purpose: Phase purpose', `purpose: ${id} source phase purpose`).replace('title: Scope', `title: ${id} source scope`).replace('purpose: Scope purpose', `purpose: ${id} source scope purpose`).replace('title: Stage', `title: ${id} source stage`).replace('purpose: Stage purpose', `purpose: ${id} source stage purpose`).replace('GATES_STAGE.md', 'GATES.md'))
    writeFileSync(join(root, 'GATES.md'), '- [ ] G1: source Gate')
    return { root: id, contract_file: 'CONTRACT.md', map_file: 'MAP.md' }
  })
  const registryPath = join(repositoryRoot, 'registry.json'); writeFileSync(registryPath, JSON.stringify({ schema_version: 1, projects }))
  return { repositoryRoot, registryPath, projects }
}

test('project registry default config preserves Cherry Note and OUTCOME through the validated loader', () => {
  const definitions = loadProjectRegistry({ repositoryRoot: resolve('.') })
  assert.equal(definitions.length, 2)
  assert.deepEqual(definitions.map(({ contractFile, mapFile, sessionsFile }) => [contractFile, mapFile, sessionsFile]), [
    ['OUTCOME_CONTRACT.md', 'OUTCOME_MAP.md', 'OUTCOME_SESSIONS.md'],
    ['docs/OUTCOME_CONTRACT.md', 'docs/OUTCOME_MAP.md', 'docs/OUTCOME_SESSIONS.md'],
  ])
  assert.equal(definitions.every(({ root }) => isAbsolute(root)), true)
})

test('project registry collects three isolated Package identities through one loader', () => {
  const value = registryFixture(); const collected = collectOutcomePackages({ environment: { OUTCOME_PROJECT_REGISTRY: value.registryPath }, repositoryRoot: value.repositoryRoot })
  assert.deepEqual(collected.projects.map((project) => project.project.id), ['alpha', 'beta', 'gamma'])
  assert.equal(collected.projects.every((project) => project.progress.available === false && project.connectors.github.completionAuthority === false), true)
  const absolute = JSON.parse(readFileSync(value.registryPath, 'utf8')); absolute.projects[0].root = join(value.repositoryRoot, 'alpha'); writeFileSync(value.registryPath, JSON.stringify(absolute))
  assert.deepEqual(collectOutcomePackages({ environment: { OUTCOME_PROJECT_REGISTRY: value.registryPath }, repositoryRoot: value.repositoryRoot }).projects.map((project) => project.project.id), ['alpha', 'beta', 'gamma'])
})

test('registry rejects empty malformed schema duplicate entries project IDs absolute documents and traversal', () => {
  const value = registryFixture(); const valid = JSON.parse(String(readFileSync(value.registryPath)))
  const cases = [
    [{ schema_version: 1, projects: [] }, /project_registry_projects_invalid/],
    [{ schema_version: 2, projects: valid.projects }, /project_registry_schema_invalid/],
    [{ schema_version: 1, projects: [...valid.projects, valid.projects[0]] }, /project_registry_duplicate_entry/],
    [{ schema_version: 1, projects: [{ ...valid.projects[0], contract_file: '/tmp/CONTRACT.md' }] }, /project_registry_document_absolute/],
    [{ schema_version: 1, projects: [{ ...valid.projects[0], map_file: '../MAP.md' }] }, /project_registry_document_traversal/],
    [{ schema_version: 1, projects: [{ ...valid.projects[0], sessions_file: '../SESSIONS.md' }] }, /project_registry_document_traversal/],
  ]
  for (const [index, [body, expected]] of cases.entries()) { const path = join(value.repositoryRoot, `invalid-${index}.json`); writeFileSync(path, JSON.stringify(body)); assert.throws(() => loadProjectRegistry({ environment: { OUTCOME_PROJECT_REGISTRY: path }, repositoryRoot: value.repositoryRoot }), expected) }
  writeFileSync(value.registryPath, ''); assert.throws(() => loadProjectRegistry({ environment: { OUTCOME_PROJECT_REGISTRY: value.registryPath }, repositoryRoot: value.repositoryRoot }), /project_registry_json_invalid/)
  writeFileSync(value.registryPath, '{'); assert.throws(() => loadProjectRegistry({ environment: { OUTCOME_PROJECT_REGISTRY: value.registryPath }, repositoryRoot: value.repositoryRoot }), /project_registry_json_invalid/)
  const duplicate = registryFixture(['same-a', 'same-b']); for (const id of ['same-a', 'same-b']) { writeFileSync(join(duplicate.repositoryRoot, id, 'CONTRACT.md'), contract.replaceAll('demo', 'same').replace('Demo', 'Same')); writeFileSync(join(duplicate.repositoryRoot, id, 'MAP.md'), map().replaceAll('demo', 'same').replace('GATES_STAGE.md', 'GATES.md')) }; assert.throws(() => loadProjectRegistry({ environment: { OUTCOME_PROJECT_REGISTRY: duplicate.registryPath }, repositoryRoot: duplicate.repositoryRoot }), /project_registry_duplicate_project_id/)
})

test('override registry error fails closed without default fallback', () => {
  const value = registryFixture(); writeFileSync(value.registryPath, JSON.stringify({ schema_version: 1, projects: [] }))
  const prior = process.env.OUTCOME_PROJECT_REGISTRY; process.env.OUTCOME_PROJECT_REGISTRY = value.registryPath
  try { assert.throws(() => collectOutcomePackages({ repositoryRoot: value.repositoryRoot }), /project_registry_projects_invalid/) } finally { if (prior === undefined) delete process.env.OUTCOME_PROJECT_REGISTRY; else process.env.OUTCOME_PROJECT_REGISTRY = prior }
})

test('public portfolio projection never contains registry roots or document paths', () => {
  const value = registryFixture(); const projected = projectPublicPackages(collectOutcomePackages({ environment: { OUTCOME_PROJECT_REGISTRY: value.registryPath }, repositoryRoot: value.repositoryRoot })); const text = JSON.stringify(projected)
  assert.equal(text.includes(value.repositoryRoot), false); for (const token of ['CONTRACT.md', 'MAP.md', 'registry.json']) assert.equal(text.includes(token), false)
})

test('tracked portfolio browser registry is worktree-contained and yields three valid distinct Packages', () => {
  const repositoryRoot = resolve('.'); const fixtureRoot = join(repositoryRoot, 'test', 'fixtures'); const environment = { OUTCOME_PROJECT_REGISTRY: join(fixtureRoot, 'portfolio-registry.json') }
  const definitions = loadProjectRegistry({ environment, repositoryRoot }); assert.equal(definitions.every(({ root }) => root.startsWith(`${fixtureRoot}/`)), true)
  const projects = collectOutcomePackages({ environment, repositoryRoot }).projects; assert.equal(projects.length, 3); assert.equal(projects.every(({ status }) => status === 'valid'), true); assert.equal(new Set(projects.map(({ project }) => project.id)).size, 3)
})

test('valid package parses contract map and referenced gates', () => { const model = fixture(); assert.equal(model.errors.length, 0); assert.equal(model.phases[0].scopes[0].stages[0].gate.total, 2) })
test('missing optional sessions companion keeps Package valid and projects four setup-required roles', () => {
  const model = fixture({ sessionsText: null })
  assert.equal(model.status, 'valid')
  assert.deepEqual(model.bindings.map(({ role, status, bindingVersion }) => [role, status, bindingVersion]), [
    ['planner', 'setup_required', 0], ['builder', 'setup_required', 0], ['ux_product_qa', 'setup_required', 0], ['release_audit', 'setup_required', 0],
  ])
})

test('project registry accepts a bounded sessions_file and uses its unassigned role slots', () => {
  const value = registryFixture(['demo'])
  const registry = JSON.parse(readFileSync(value.registryPath, 'utf8'))
  registry.projects[0].sessions_file = 'SESSIONS.md'
  writeFileSync(value.registryPath, JSON.stringify(registry))
  writeFileSync(join(value.repositoryRoot, 'demo', 'SESSIONS.md'), sessions)
  const [model] = collectOutcomePackages({ environment: { OUTCOME_PROJECT_REGISTRY: value.registryPath }, repositoryRoot: value.repositoryRoot }).projects
  assert.equal(model.status, 'valid')
  assert.equal(model.bindings.every(({ status }) => status === 'unbound'), true)
})

test('Package installer creates the four-slot sessions companion without assignment', () => {
  const root = mkdtempSync(join(tmpdir(), 'outcome-session-install-'))
  assert.deepEqual(installOutcomeSessions({ root, projectId: 'new-project' }), { created: true, projectId: 'new-project', roles: ['planner', 'builder', 'ux_product_qa', 'release_audit'] })
  const text = readFileSync(join(root, 'OUTCOME_SESSIONS.md'), 'utf8')
  for (const role of ['planner', 'builder', 'ux_product_qa', 'release_audit']) assert.match(text, new RegExp(`^  ${role}:`, 'm'))
  assert.equal((text.match(/active_binding_ref: null/g) ?? []).length, 4)
  assert.throws(() => installOutcomeSessions({ root, projectId: 'new-project' }), /EEXIST/)
})

test('sessions manifest accepts a stable public alias and rejects private or secret-bearing shapes', () => {
  const active = sessions.replace('active_binding_ref: null, binding_version: 0, state: unbound', 'active_binding_ref: planner-primary, binding_version: 1, state: active')
  assert.equal(fixture({ sessionsText: active, registry: [runtime('planner', 'planner-primary')] }).errors.length, 0)
  assert.equal(fixture({ sessionsText: active.replace('planner-primary', 'outcome-local-private'), registry: [runtime('planner', 'outcome-local-private')] }).errors.length, 0)
  const hostile = [
    'codex://tenant-alpha/private-conversation/short',
    'session_id=private-value',
    'thread_private_value',
    'task_private_value',
    'turn_private_value',
    '123e4567-e89b-12d3-a456-426614174000',
    '/Users/cherry/private-registry',
    'token=private-value',
    'sk-privatevalue123456',
    'ghp_privatevalue123456',
    'session-private-value',
    'thread-private-value',
    'task-private-value',
    'turn-private-value',
    'sess-private-value',
    'provider-session-12345',
    'codex-thread-12345',
    'openai-primary-alias',
    'claude-primary-alias',
  ]
  for (const marker of hostile) {
    const text = active.replace('planner-primary', JSON.stringify(marker))
    assert.ok(fixture({ sessionsText: text }).errors.includes('sessions_manifest_invalid'), marker)
  }
  for (const injected of [
    active.replace('required: true,', 'required: true, provider_locator: private,') ,
    active.replace('roles:', 'api_token: private\nroles:'),
    active.replace('state: active', 'state: active, unexpected_secret: private'),
    `${active}\nsecret_note: private\n`,
  ]) assert.ok(fixture({ sessionsText: injected }).errors.includes('sessions_manifest_invalid'))
})

test('runtime collector projects corrupt v2 state as unavailable instead of unbound', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'outcome-corrupt-registry-')), 'registry.json')
  writeFileSync(path, '{')
  const model = fixture({ registry: loadBindingRegistry(path) })
  assert.equal(model.bindings.every(({ status }) => status === 'registry_unavailable'), true)
  assert.equal(model.now.status, 'registry_unavailable')
})

test('QA hostile persisted metadata fails closed and reaches no public dashboard byte', () => {
  const marker = 'codex://tenant-alpha/private-conversation/short'
  const path = join(mkdtempSync(join(tmpdir(), 'outcome-hostile-registry-')), 'registry.json')
  createEmptyRegistry(path, ['demo'])
  mutateRegistry(path, { action: 'assign', projectId: 'demo', role: 'planner', expectedVersion: 0, locator: 'private', publicAlias: 'planner-primary', stageId: 'stage-one', actorClass: 'builder', reasonClass: 'approved_local_test', occurredAt: '2026-08-27T00:00:00.000Z' })
  const value = JSON.parse(readFileSync(path, 'utf8'))
  value.bindings[0].stage_id = marker; value.events[0].reason_class = marker; value.events[0].stage_id = marker
  writeFileSync(path, JSON.stringify(value))
  const registry = loadBindingRegistry(path)
  const publicText = JSON.stringify(projectPublicPackages({ projects: [fixture({ registry })] }))
  assert.equal(registry.error, 'registry_conflict')
  assert.equal(publicText.includes(marker), false)
  for (const token of ['locator_ref', 'provider_locator', 'session_id', 'thread_id', 'task_id', 'turn_id']) assert.equal(publicText.includes(token), false, token)
})

test('role history summary keeps a 44px target and focus indication through responsive CSS', () => {
  const styles = readFileSync(resolve('src/styles.css'), 'utf8')
  const summaryRules = [...styles.matchAll(/\.oc-role-row>summary\{([^}]*)\}/g)].map((match) => match[1])
  assert.equal(summaryRules.length > 0, true)
  assert.equal(summaryRules.every((rule) => /min-height:44px/.test(rule)), true)
  assert.match(styles, /\.oc-role-row>summary:focus-visible\{[^}]*outline:/)
  assert.doesNotMatch(styles, /@media\(max-width:[^)]+\)\{[^}]*\.oc-role-row>summary\{[^}]*min-height:(?:3[0-9]|4[0-3])px/)
  assert.doesNotMatch(styles, /\.oc-role-row\{[^}]*min-height:(?:3[0-9]|4[0-3])px/)
})
test('missing package documents fail closed unknown', () => { const model = buildPackageModel({ root: '/missing', contractFile: 'none', mapFile: 'none' }); assert.equal(model.status, 'unknown'); assert.ok(model.errors.includes('contract_missing')) })
test('reference mismatch fails closed conflict', () => { const model = fixture({ mapText: map().replace('project_id: demo', 'project_id: other') }); assert.equal(model.status, 'conflict'); assert.ok(model.errors.includes('project_reference_mismatch')) })
test('missing Gate reference fails closed unknown', () => { const model = fixture({ gateText: null }); assert.equal(model.status, 'unknown'); assert.ok(model.errors.includes('gate_reference_missing:stage-one')) })
test('unknown current Stage reference fails closed conflict', () => { const model = fixture({ mapText: `${map()}\n- Current: \`stage-missing\`` }); assert.equal(model.status, 'conflict'); assert.ok(model.errors.includes('current_reference_mismatch')) })
test('conflicting current boundaries fail closed conflict', () => { const model = fixture({ mapText: `${map()}\n- Current: \`stage-one\`\n- Current: \`stage-two\`` }); assert.equal(model.status, 'conflict') })
test('stable hierarchy has project phase scope stage and Gate acceptance child', () => { const model = fixture(); const stage = model.phases[0].scopes[0].stages[0]; assert.equal(stage.gate.gates[0].stageId, stage.id); assert.equal(stage.gatePurpose.includes('acceptance checklist'), true) })
test('invalid stable id fails closed unknown', () => { const model = fixture({ mapText: map().replace('id: stage-one', 'id: Stage One') }); assert.equal(model.status, 'unknown'); assert.ok(model.errors.includes('invalid_stable_id')) })
test('gate acceptance child preserves closed and total without aggregate inference', () => { const ledger = parseGateLedger('- [x] A1: done\n- [ ] A2: open', 'stage-one'); assert.deepEqual({ closed: ledger.closed, total: ledger.total }, { closed: 1, total: 2 }) })
test('gate reference anchor selects only the owning Stage range', () => { const ledger = parseGateLedger('- [x] M5: parser\n- [x] M6: ids\n- [ ] M10: ui', 'stage-four', 'M5-M9'); assert.deepEqual(ledger.gates.map((gate) => gate.id), ['M5', 'M6']) })
test('role bindings are project scoped with replaced history', () => { const now = new Date().toISOString(); const model = fixture({ sessionsText: declared('builder', 'builder-primary', 2), registry: [{ project_id: 'demo', role: 'builder', status: 'replaced', binding_version: 1, public_alias: 'builder-old', bound_at: '2026-01-01T00:00:00Z', replaced_at: '2026-02-01T00:00:00Z' }, { project_id: 'demo', role: 'builder', status: 'active', binding_version: 2, public_alias: 'builder-primary', bound_at: now, observed_at: now, activity: 'current work' }, { project_id: 'other', role: 'builder', status: 'active', binding_version: 1, public_alias: 'other-builder', bound_at: now }] }); const builder = model.bindings.find((item) => item.role === 'builder'); assert.equal(builder.status, 'active'); assert.equal(builder.historyCount, 2) })
test('role bindings preserve observed idle status without synthesizing activity', () => { const now = new Date().toISOString(); const model = fixture({ sessionsText: declared('ux_product_qa', 'quality-primary', 1, 'idle'), registry: [{ project_id: 'demo', role: 'ux_product_qa', status: 'idle', binding_version: 1, public_alias: 'quality-primary', bound_at: now, observed_at: now, activity: null }] }); const qa = model.bindings.find((item) => item.role === 'ux_product_qa'); assert.equal(qa.status, 'idle'); assert.equal(qa.activity, null); assert.equal(qa.freshness, 'fresh') })
test('blocked and rotating registry states are not weakened to stale when observation is absent', () => { for (const status of ['blocked', 'rotating']) { const model = fixture({ sessionsText: declared('planner', 'planner-primary', 1, status), registry: [{ project_id: 'demo', role: 'planner', status, binding_version: 1, public_alias: 'planner-primary', bound_at: new Date().toISOString(), observed_at: null }] }); assert.equal(model.bindings.find(({ role }) => role === 'planner').status, status) } })
test('role binding public model preserves bound_at separately from observed_at', () => { const model = fixture({ now: new Date('2026-08-24T01:00:00Z'), sessionsText: declared('builder', 'builder-primary', 1), registry: [{ project_id: 'demo', role: 'builder', status: 'active', binding_version: 1, public_alias: 'builder-primary', stage_id: 'stage-one', bound_at: '2026-08-24T00:00:00Z', observed_at: '2026-08-24T00:59:00Z' }] }); const builder = model.bindings.find((item) => item.role === 'builder'); assert.equal(builder.boundAt, '2026-08-24T00:00:00Z'); assert.equal(builder.observedAt, '2026-08-24T00:59:00Z') })
test('optional expected duration is source-grounded and missing remains unavailable', () => { const absent = fixture(); const present = fixture({ mapText: map().replace('            gates_file: GATES_STAGE.md', '            gates_file: GATES_STAGE.md\n            expected_duration_minutes: 120') }); assert.equal(absent.phases[0].scopes[0].stages[0].expectedDurationMinutes, null); assert.equal(present.phases[0].scopes[0].stages[0].expectedDurationMinutes, 120) })
test('invalid expected duration fails closed unknown', () => { const model = fixture({ mapText: map().replace('            gates_file: GATES_STAGE.md', '            gates_file: GATES_STAGE.md\n            expected_duration_minutes: estimated') }); assert.equal(model.status, 'unknown'); assert.equal(model.phases[0].scopes[0].stages[0].expectedDurationMinutes, null); assert.ok(model.errors.includes('invalid_expected_duration_minutes:stage-one')) })
test('NOW separation uses Builder binding while progress refuses activity inference', () => { const now = new Date().toISOString(); const model = fixture({ sessionsText: declared('builder', 'builder-primary', 1), registry: [{ project_id: 'demo', role: 'builder', status: 'active', binding_version: 1, public_alias: 'builder-primary', bound_at: now, observed_at: now, activity: 'edited 200 files' }] }); assert.equal(model.now.activity, 'edited 200 files'); assert.deepEqual(model.progress, { available: false, reason: 'no_cross_stage_aggregate' }) })
test('fail-closed states cover missing stale conflicting unbound blocked and locked inputs', () => { const model = fixture({ gateText: null }); assert.equal(model.phases[0].scopes[0].stages[0].state, 'unknown'); assert.equal(model.bindings.every((item) => item.status === 'unbound'), true); assert.equal(model.progress.available, false) })
test('GitHub connector missing remains optional and has no completion authority', () => { const connector = parseGithubConnector(undefined); assert.equal(connector.state, 'missing'); assert.equal(connector.required, false); assert.equal(connector.localCandidate.sync, 'unknown'); assert.equal(connector.completionAuthority, false) })
test('GitHub connector connected separates local candidate and published evidence', () => { const connector = parseGithubConnector({ adopted: true, required: false, repository: 'dltmddnr3/dock', remote_name: 'origin', default_branch: 'main', binding_state: 'connected', completion_authority: false }, { state: 'available', branch: 'main', ahead: 15, behind: 0, observedRepository: 'dltmddnr3/dock', remoteState: 'published' }); assert.equal(connector.state, 'connected'); assert.deepEqual(connector.localCandidate, { state: 'available', branch: 'main', ahead: 15, behind: 0, sync: 'ahead' }); assert.equal(connector.published.ref, 'origin/main'); assert.equal(connector.published.state, 'connected'); assert.equal(connector.checks.state, 'unknown'); assert.equal(connector.release.state, 'unknown'); assert.equal(connector.completionAuthority, false) })
test('GitHub connector connected empty remote is not published and not conflict', () => { const connector = parseGithubConnector({ adopted: true, required: false, repository: 'dltmddnr3/outcome', remote_name: 'origin', default_branch: 'main', binding_state: 'connected', completion_authority: false }, { state: 'available', branch: 'main', ahead: null, behind: null, observedRepository: 'dltmddnr3/outcome', remoteState: 'empty_remote' }); assert.equal(connector.state, 'connected'); assert.equal(connector.published.state, 'not_published'); assert.equal(connector.published.detail, 'empty_remote'); assert.equal(connector.completionAuthority, false) })
test('GitHub connector adopted repository null remains unbound', () => { const connector = parseGithubConnector({ adopted: true, required: false, repository: null, default_branch: 'main', binding_state: 'unbound', completion_authority: false }, { state: 'available', branch: 'main', ahead: null, behind: null, observedRepository: null }); assert.equal(connector.state, 'unbound'); assert.equal(connector.repository, null); assert.equal(connector.defaultBranch, 'main') })
test('GitHub connector conflicts on unsafe authority repository mismatch credential URL or invalid ref', () => { const unsafe = parseGithubConnector({ adopted: true, required: false, repository: 'owner/repo', remote_name: 'origin', default_branch: 'main', binding_state: 'connected', completion_authority: true }); const mismatch = parseGithubConnector({ adopted: true, required: false, repository: 'owner/repo', remote_name: 'origin', default_branch: 'main', binding_state: 'connected', completion_authority: false }, { state: 'available', branch: 'main', ahead: 0, behind: 0, observedRepository: 'other/repo' }); const credential = parseGithubConnector({ adopted: true, required: false, repository: 'https://token@github.com/owner/repo.git', remote_name: 'origin', default_branch: 'main', binding_state: 'connected', completion_authority: false }); const invalidRef = parseGithubConnector({ adopted: true, required: false, repository: 'owner/repo', remote_name: '--upload-pack', default_branch: 'main..other', binding_state: 'connected', completion_authority: false }); assert.equal(unsafe.state, 'conflict'); assert.equal(mismatch.state, 'conflict'); assert.equal(credential.state, 'conflict'); assert.equal(credential.repository, null); assert.equal(invalidRef.state, 'conflict'); assert.equal(unsafe.completionAuthority, false) })
test('source-grounded Stage semantics derive axes from Gate PROVES and evidence', () => { const mapText = map().replace('            implementation_state: work_in_progress\n            evidence_closure_state: pending\n', ''); const model = fixture({ mapText, gateText: '- [x] G1: implementation done\n  PROVES: implementation\n  EVIDENCE: exact implementation receipt\n- [x] G2: tests done\n  PROVES: test\n  EVIDENCE: exact test receipt' }); const stage = model.phases[0].scopes[0].stages[0]; assert.equal(stage.state, 'complete'); assert.deepEqual({ implementation: stage.axes.implementation, test: stage.axes.test, evidence: stage.axes.evidence }, { implementation: 'evidence_closed', test: 'evidence_closed', evidence: 'evidence_closed' }) })
test('bottom-shell closed Gates remain evidence pending when implementation is not a candidate', () => { const mapText = map().replace('implementation_state: work_in_progress', 'implementation_state: work_in_progress_not_candidate'); const model = fixture({ mapText, gateText: '- [x] S1: correction implemented\n- [x] S2: checks closed' }); const stage = model.phases[0].scopes[0].stages[0]; assert.equal(stage.gate.closed, 2); assert.equal(stage.gate.total, 2); assert.equal(stage.axes.evidence, 'pending'); assert.equal(stage.state, 'gates_closed_evidence_pending') })
test('entity state vocabulary projects active queued and locked from current and dependencies', () => { const mapText = map().replace('            evidence_closure_state: pending', '            evidence_closure_state: pending\n          - id: stage-two\n            title: Stage Two\n            purpose: queued after first\n            depends_on: [stage-one]\n            gates_file: GATES_STAGE.md\n          - id: stage-three\n            title: Stage Three\n            purpose: locked after second\n            depends_on: [stage-two]\n            gates_file: GATES_STAGE.md'); const model = fixture({ mapText, gateText: '- [ ] G1: open' }); const stages = model.phases[0].scopes[0].stages; assert.deepEqual(stages.map((stage) => stage.state), ['active', 'locked', 'locked']) })
test('evidence freshness does not make a structurally valid Package stale by file age', () => { const old = new Date('2025-01-01T00:00:00Z'); const model = fixture({ fileTime: old, now: new Date('2026-08-23T12:00:00Z') }); assert.equal(model.status, 'valid'); assert.equal(model.sourceFreshness.state, 'observed'); assert.equal(model.observedAt, old.toISOString()) })
test('source group labels come from Gate headings rather than a code lookup', () => { const ledger = parseGateLedger('YouTube addition gates (written before mutation):\n\n- [x] Y1: done', 'stage-one'); assert.equal(ledger.groups[0].name, 'YouTube addition gates (written before mutation)') })
test('Package Gate group labels project exact primary labels onto source groups', () => { const mapText = map().replace('            gates_file: GATES_STAGE.md', '            gates_file: GATES_STAGE.md\n            gate_groups:\n              - code: Y\n                primary_label: 링크 미리보기\n              - code: G\n                primary_label: 엔지니어링 완료 증거'); const model = fixture({ mapText, gateText: 'YouTube addition gates:\n- [x] Y1: done\nEngineering gates:\n- [ ] G1: open' }); const groups = model.phases[0].scopes[0].stages[0].gate.groups; assert.equal(model.status, 'valid'); assert.deepEqual(groups.map(({ code, name, sourceName }) => ({ code, name, sourceName })), [{ code: 'Y', name: '링크 미리보기', sourceName: 'YouTube addition gates' }, { code: 'G', name: '엔지니어링 완료 증거', sourceName: 'Engineering gates' }]) })
test('Package Gate group labels reject duplicate codes', () => { const mapText = map().replace('            gates_file: GATES_STAGE.md', '            gates_file: GATES_STAGE.md\n            gate_groups:\n              - code: G\n                primary_label: 첫 이름\n              - code: G\n                primary_label: 중복 이름'); const model = fixture({ mapText }); assert.equal(model.status, 'conflict'); assert.ok(model.errors.includes('gate_group_metadata_conflict:stage-one:duplicate_code')) })
test('Package Gate group labels reject missing or blank primary labels', () => { const mapText = map().replace('            gates_file: GATES_STAGE.md', '            gates_file: GATES_STAGE.md\n            gate_groups:\n              - code: G\n                primary_label: ""'); const model = fixture({ mapText }); assert.equal(model.status, 'conflict'); assert.ok(model.errors.includes('gate_group_metadata_conflict:stage-one:invalid_entry')) })
test('Package Gate group labels reject code mismatch with Gate source', () => { const mapText = map().replace('            gates_file: GATES_STAGE.md', '            gates_file: GATES_STAGE.md\n            gate_groups:\n              - code: Y\n                primary_label: 링크 미리보기'); const model = fixture({ mapText }); assert.equal(model.status, 'conflict'); assert.ok(model.errors.includes('gate_group_metadata_conflict:stage-one:code_mismatch')) })
test('absent Package Gate group labels preserve source headings without translation', () => { const model = fixture({ gateText: 'English source gates:\n- [x] G1: done' }); const group = model.phases[0].scopes[0].stages[0].gate.groups[0]; assert.equal(model.status, 'valid'); assert.deepEqual({ name: group.name, sourceName: group.sourceName }, { name: 'English source gates', sourceName: 'English source gates' }) })
test('public projection removes raw Gate evidence while preserving Stage evidence axis', () => { const mapText = map().replace('            implementation_state: work_in_progress\n            evidence_closure_state: pending\n', ''); const model = fixture({ mapText, gateText: '- [x] G1: done\n  EVIDENCE: /tmp/private-result.log\n  PROVES: implementation' }); const projected = projectPublicPackages({ schemaVersion: 2, projects: [model] }); const stage = projected.projects[0].phases[0].scopes[0].stages[0]; assert.equal(Object.hasOwn(stage.gate.gates[0], 'evidence'), false); assert.equal(stage.axes.evidence, 'evidence_closed'); assert.equal(stage.gate.gates[0].title, 'done') })

test('D2 public v2 projection omits raw prompt result and private evidence carriers', () => {
  const value = { schemaVersion: 2, projects: [], modelV2: { schemaVersion: 2, authority: 'projection_only', raw_prompt: 'direct-private-instruction', projects: [{ project_id: 'outcome', raw_result: 'direct-private-output', graph: { schema_version: 2, project: { id: 'outcome', name: 'raw_prompt=hidden', terminal_outcome: 'raw_result=hidden' }, destinations: [{ id: 'destination-one', project_id: 'outcome', title: 'raw_prompt=hidden', outcome: 'raw_result=hidden', depends_on: [], primary: true }], milestones: [{ id: 'milestone-one', destination_id: 'destination-one', title: 'raw_prompt=hidden', expected_user_delta: 'raw_result=hidden', depends_on: [], predicate_ids: ['predicate-one'] }], acceptance_predicates: [{ id: 'predicate-one', milestone_id: 'milestone-one', description: 'raw_prompt=hidden', check: 'raw_result=hidden', expect: 'token=secret-value /Users/private/result', authority: 'predicate-policy' }], evidence_claims: [{ id: 'claim-one', predicate_id: 'predicate-one', source_ref: 'raw_prompt=private-instruction raw_result=private-output token=secret-value /Users/private/evidence.json', producer: 'builder', freshness: 'source-pinned', reproducible: true }] }, projection: { schema_version: 2, source_revision: 'a'.repeat(40), observed_at: '2026-08-31T00:00:00.000Z', primary_destination: 'destination-one', ready_frontier: ['milestone-one'], progress: { closed: 0, total: 1 }, next_action: 'work-one', cherry_action: null, stale: false, conflict: false, blockers: {}, delivery_unknown_count: 0, automatic_retry_count: 0, verification_required: [] } }] } }
  const projected = projectPublicPackages(value); const serialized = JSON.stringify(projected)
  for (const marker of ['raw_prompt', 'raw_result', 'private-instruction', 'private-output', 'secret-value', '/Users/private']) assert.equal(serialized.includes(marker), false, marker)
  const publicProject = projected.modelV2.projects[0]
  assert.equal(publicProject.graph.evidence_claims[0].id, 'claim-one'); assert.equal(publicProject.graph.evidence_claims[0].freshness, 'source-pinned'); assert.equal(Object.hasOwn(publicProject.graph.evidence_claims[0], 'source_ref'), false)
  assert.equal(publicProject.projection.primary_destination, 'destination-one'); assert.deepEqual(publicProject.projection.ready_frontier, ['milestone-one']); assert.equal(publicProject.projection.next_action, 'work-one')
})
