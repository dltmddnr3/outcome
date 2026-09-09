import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createPreviewWorkIdentity } from './outcome-preview-work-identity.mjs'
const subject = 'synthetic-owner', now = 20000
const token = `e30.${Buffer.from(JSON.stringify({ sub: subject, exp: 1000 })).toString('base64url')}.c2ln`
const accountRef = createHash('sha256').update('outcome-bridge-account-v1\0').update(subject).digest('hex')
const options = { previewOrigin: 'https://outcome-test-white-castle.vercel.app', accountRef, workspaceId: 'workspace-one', projectId: 'outcome', now: () => now }
const body = () => ({ workspace: { access: 'private_read_only', workspace: { id: 'workspace-one', role: 'owner-viewer' }, projects: [{ project: { id: 'outcome' } }], session: { expiresAt: new Date(100000).toISOString() }, completionAuthority: false } })
const response = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } })
test('same token must pass pinned Preview server; resulting identity has no execution grant', async () => {
  let calls = 0
  const runtime = createPreviewWorkIdentity({ ...options, fetchImpl: async (url, init) => {
    calls++; assert.equal(url, `${options.previewOrigin}/api/private/workspace`)
    assert.equal(init.headers.authorization, `Bearer ${token}`); assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit'); assert.equal(init.method, 'GET')
    return response(body())
  } })
  assert.deepEqual(await runtime.service.resolveBridgeAuthority({ token }), { account_ref: accountRef, workspace_id: options.workspaceId, project_ids: ['outcome'] })
  assert.equal(calls, 1)
  assert.deepEqual(await runtime.service.readWorkObservation({ token, requestedProjectId: 'outcome' }), { projectId: 'outcome', observation: null, completionAuthority: false })
  assert.equal(calls, 2) // Never cache an earlier owner check.
  await assert.rejects(() => runtime.service.resolveBridgeAuthority({ token: 'invalid' }), /preview_identity_unavailable/)
  assert.equal(calls, 2)
})
test('remote denial, wrong scope, expired session, malformed response and oversized payload reject', async () => {
  for (const make of [
    () => new Response('{}', { status: 401 }),
    () => new Response('{}', { status: 302, headers: { location: 'https://foreign.invalid' } }),
    () => new Response('{}'),
    () => response({}),
    () => { const b = body(); b.workspace.workspace.id = 'foreign'; return response(b) },
    () => { const b = body(); b.workspace.workspace.role = 'admin'; return response(b) },
    () => { const b = body(); b.workspace.projects.push(b.workspace.projects[0]); return response(b) },
    () => { const b = body(); b.workspace.session.expiresAt = new Date(now).toISOString(); return response(b) },
    () => response({ ...body(), extra: 'x'.repeat(1048576) }),
  ]) {
    const service = createPreviewWorkIdentity({ ...options, fetchImpl: async () => make() }).service
    await assert.rejects(() => service.resolveBridgeAuthority({ token }), /preview_identity_unavailable/)
  }
  for (const previewOrigin of ['http://outcome-test-white-castle.vercel.app', 'https://outcome-test-white-castle.vercel.app/path', 'https://foreign.vercel.app']) assert.throws(() => createPreviewWorkIdentity({ ...options, previewOrigin }), /preview_identity_unavailable/)
})
