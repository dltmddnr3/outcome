import { AuthenticateWithRedirectCallback, ClerkProvider, useAuth, useSignIn, useUser } from '@clerk/react'
import { type FormEvent, useEffect, useState } from 'react'
import { fetchPrivateOwnerSession, fetchPrivateWorkspace, type PrivateWorkspaceView } from '../lib/api'
import { AccountWorkspace, type AccountWorkspaceState } from './AccountWorkspace'

const callbackPaths = new Set(['/workspace/sso-callback', '/workspace/apple-callback'])
export const hostedGoogleSsoParameters = Object.freeze({ strategy: 'oauth_google' as const, redirectCallbackUrl: '/workspace/sso-callback', redirectUrl: '/workspace' })
type EmailCodeSignIn = { emailCode: { sendCode: (input: { emailAddress: string }) => Promise<{ error: unknown }> } }
export async function requestHostedEmailCode(signIn: EmailCodeSignIn | undefined, emailAddress: string) {
  if (!signIn) return false
  return !(await signIn.emailCode.sendCode({ emailAddress })).error
}
export async function requireHostedSessionToken(getToken: () => Promise<string | null>) {
  const sessionToken = await getToken()
  if (!sessionToken) throw new Error('authentication_required')
  return sessionToken
}

function HostedWorkspaceBody() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { signIn } = useSignIn()
  const { user } = useUser()
  const [state, setState] = useState<AccountWorkspaceState>('loading')
  const [ownerVerified, setOwnerVerified] = useState(false)
  const [workspace, setWorkspace] = useState<PrivateWorkspaceView>()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { setOwnerVerified(false); setState('login'); setWorkspace(undefined); return }
    void requireHostedSessionToken(getToken)
      .then((sessionToken) => fetchPrivateOwnerSession(sessionToken).then(() => sessionToken))
      .then((sessionToken) => { setOwnerVerified(true); return fetchPrivateWorkspace(sessionToken) })
      .then((value) => { setWorkspace(value.workspace); setState('ready') })
      .catch((reason) => { setWorkspace(undefined); if (!(reason instanceof Error && reason.message === 'private_workspace_unavailable')) setOwnerVerified(false); setState(reason instanceof Error && reason.message === 'private_workspace_unavailable' ? 'unavailable' : 'access_denied') })
  }, [getToken, isLoaded, isSignedIn])

  const google = async () => {
    setError(null)
    if (!signIn) { setError('인증 공급자를 불러오지 못했습니다.'); return }
    const result = await signIn.sso(hostedGoogleSsoParameters)
    if (result?.error) setError('Google 로그인을 시작하지 못했습니다.')
  }
  const sendCode = async (event: FormEvent) => {
    event.preventDefault(); setError(null)
    if (!(await requestHostedEmailCode(signIn, email))) { setError(signIn ? '인증 코드를 보내지 못했습니다.' : '인증 공급자를 불러오지 못했습니다.'); return }
    setCodeSent(true)
  }
  const verifyCode = async (event: FormEvent) => {
    event.preventDefault(); setError(null)
    if (!signIn) { setError('인증 공급자를 불러오지 못했습니다.'); return }
    const result = await signIn.emailCode.verifyCode({ code })
    if (result?.error) { setError('인증 코드를 확인하지 못했습니다.'); return }
    await signIn.finalize({ navigate: ({ decorateUrl }) => window.location.assign(decorateUrl('/workspace')) })
  }
  const linkApple = async () => {
    const result = await user?.createExternalAccount({ strategy: 'oauth_apple', redirectUrl: '/workspace/apple-callback' })
    const redirect = result?.verification?.externalVerificationRedirectURL
    if (redirect) window.location.assign(redirect.href)
  }
  const loginContent = <div className="account-workspace__actions" data-clerk-browser-auth="true">
    <button type="button" data-touch-target="44" data-private-login-provider="google" onClick={() => void google()}>Google로 계속</button>
    <form onSubmit={codeSent ? verifyCode : sendCode}>
      {!codeSent ? <><label htmlFor="private-email">이메일</label><input id="private-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></> : <><label htmlFor="private-code">인증 코드</label><input id="private-code" inputMode="numeric" required value={code} onChange={(event) => setCode(event.target.value)} /></>}
      <button type="submit" data-touch-target="44">{codeSent ? '인증 코드 확인' : '이메일 인증 코드 받기'}</button>
    </form>
    <span>Apple은 소유자 로그인 확인 후 연결</span>
    <p className="account-workspace__adapter-note">Clerk 브라우저 세션 · 회원가입 전환 차단</p>
  </div>
  return <AccountWorkspace state={state} workspace={workspace} ownerVerified={ownerVerified} sessionPresent={Boolean(isSignedIn)} loginContent={loginContent} onLogout={isSignedIn ? async () => { await signOut({ redirectUrl: '/workspace' }) } : undefined} onAppleLink={ownerVerified ? linkApple : undefined} transitionError={error} />
}

export function HostedClerkWorkspace({ publishableKey, pathname = window.location.pathname }: { publishableKey: string; pathname?: string }) {
  return <ClerkProvider publishableKey={publishableKey}>
    {callbackPaths.has(pathname)
      ? <AuthenticateWithRedirectCallback transferable={false} signInFallbackRedirectUrl="/workspace" signUpFallbackRedirectUrl="/workspace" />
      : <HostedWorkspaceBody />}
  </ClerkProvider>
}
