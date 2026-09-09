import { expect, it } from 'vitest'
import { readLocalWorkInvitation } from './LocalWorkSessionConnection'

const origin = 'https://outcome-fixture-white-castle.vercel.app'
const invitation = { schemaVersion: 1, endpoint: 'http://127.0.0.1:12345/outcome-session', previewOrigin: origin, challenge: 'a'.repeat(64), expiresAt: 2000 }
const fragment = (value: unknown) => '#local-work-session=' + Buffer.from(JSON.stringify(value)).toString('base64url')
it('accepts only exact same Preview and unexpired explicit loopback invitation', () => {
 expect(readLocalWorkInvitation(fragment(invitation), origin, 1000)).toEqual(invitation)
 for (const endpoint of ['https://evil.example/outcome-session', 'http://localhost:12345/outcome-session', 'http://127.0.0.1:12345/outcome-session?x=1', 'http://user@127.0.0.1:12345/outcome-session', 'http://127.0.0.1:80/outcome-session']) expect(readLocalWorkInvitation(fragment({ ...invitation, endpoint }), origin, 1000)).toBeNull()
 for (const patch of [{ expiresAt: 1000 }, { expiresAt: 301001 }, { extra: true }, { challenge: 'bad' }, { previewOrigin: 'https://other.example' }]) expect(readLocalWorkInvitation(fragment({ ...invitation, ...patch }), origin, 1000)).toBeNull()
 expect(readLocalWorkInvitation('#local-work-session=not-json', origin, 1000)).toBeNull()
})
