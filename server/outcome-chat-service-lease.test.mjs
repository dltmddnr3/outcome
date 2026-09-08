import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { acquireChatServiceLease } from './outcome-chat-service-lease.mjs'
import { runOutcomeChatService } from './outcome-chat-service.mjs'

test('real listener excludes another owner and permits restart after release', async () => {
  const probe = createServer()
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  const release = await acquireChatServiceLease({ port })
  assert.equal(typeof release, 'function')
  try { assert.equal(await acquireChatServiceLease({ port }), null) }
  finally { await release() }
  await release()
  const restarted = await acquireChatServiceLease({ port })
  assert.equal(typeof restarted, 'function')
  await restarted()
})

test('unavailable lease never starts runner or leaks acquisition errors', async () => {
  for (const acquireLease of [async () => null, async () => { throw new Error('private') }]) {
    let calls = 0; const logs = []
    assert.equal(await runOutcomeChatService({ enabled: true, signal: new AbortController().signal,
      acquireLease, runOnce: async () => { calls++; return 0 }, write: line => logs.push(line),
    }), 70)
    assert.equal(calls, 0)
    assert.deepEqual(logs, ['OUTCOME_CHAT_SERVICE_LEASE_SAFE_HOLD\n'])
  }
})

test('normal stop and runner failure each release exactly once', async () => {
  for (const failure of [false, true]) {
    const controller = new AbortController(); let releases = 0
    const result = await runOutcomeChatService({ enabled: true, signal: controller.signal, write() {},
      acquireLease: async () => async () => { releases++ },
      runOnce: async () => { if (failure) throw new Error('private'); controller.abort(); return 0 },
    })
    assert.equal(result, failure ? 70 : 0)
    assert.equal(releases, 1)
  }
})

test('lease cleanup failure is redacted and not reported as success', async () => {
  const controller = new AbortController(); controller.abort()
  const logs = []
  assert.equal(await runOutcomeChatService({ enabled: true, signal: controller.signal,
    acquireLease: async () => async () => { throw new Error('private locator') },
    write: line => logs.push(line),
  }), 70)
  assert.equal(logs.at(-1), 'OUTCOME_CHAT_SERVICE_LEASE_RELEASE_SAFE_HOLD\n')
  assert(!logs.join('').includes('private'))
})
