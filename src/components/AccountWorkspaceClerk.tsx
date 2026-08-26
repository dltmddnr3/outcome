import { AuthenticateWithRedirectCallback, ClerkProvider, useAuth, useSignIn, useUser } from '@clerk/react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
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

type HostedTabStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const hostedOwnerReadyKey = 'outcome.owner-ready'
const currentTabStorage = (): HostedTabStorage | undefined => typeof sessionStorage === 'undefined' ? undefined : sessionStorage
export function hostedSignedOutState(storage: HostedTabStorage | undefined = currentTabStorage()): AccountWorkspaceState {
  try { return storage?.getItem(hostedOwnerReadyKey) === '1' ? 'session_expired' : 'login' } catch { return 'login' }
}
export function markHostedOwnerReady(storage: HostedTabStorage | undefined = currentTabStorage()) {
  try { storage?.setItem(hostedOwnerReadyKey, '1') } catch { /* tab storage unavailable; same-render state remains authoritative */ }
}
export function clearHostedOwnerReady(storage: HostedTabStorage | undefined = currentTabStorage()) {
  try { storage?.removeItem(hostedOwnerReadyKey) } catch { /* tab storage unavailable */ }
}

type HostedOwnerLoaders = {
  owner: (sessionToken: string) => Promise<{ authenticated: true; owner: true }>
  workspace: (sessionToken: string) => Promise<{ workspace: PrivateWorkspaceView }>
}
const hostedOwnerLoaders: HostedOwnerLoaders = { owner: fetchPrivateOwnerSession, workspace: fetchPrivateWorkspace }
export async function confirmHostedOwnerWorkspace(sessionToken: string, storage: HostedTabStorage | undefined = currentTabStorage(), loaders: HostedOwnerLoaders = hostedOwnerLoaders, ownerConfirmed: () => void = () => undefined) {
  await loaders.owner(sessionToken)
  ownerConfirmed()
  const value = await loaders.workspace(sessionToken)
  markHostedOwnerReady(storage)
  return value.workspace
}

type HostedGoogleNavigate = (input: { decorateUrl: (url: string) => string }) => void | Promise<void>
type HostedGoogleSignIn = {
  status: string
  sso: (parameters: typeof hostedGoogleSsoParameters & { popup: Window }) => Promise<{ error: unknown }>
  finalize: (parameters: { navigate: HostedGoogleNavigate }) => Promise<{ error: unknown }>
}
type HostedGoogleAttempt = 'complete' | 'failed' | 'incomplete' | 'popup_blocked' | 'unavailable' | 'ignored'
const openHostedGooglePopup = () => window.open('about:blank', 'outcome-google-auth', 'popup,width=600,height=800')
const navigateHostedWorkspace: HostedGoogleNavigate = ({ decorateUrl }) => window.location.assign(decorateUrl('/workspace'))
export function hostedGoogleAttemptError(result: HostedGoogleAttempt) {
  if (result === 'unavailable') return '인증 공급자를 불러오지 못했습니다. 다시 시도해 주세요.'
  if (result === 'popup_blocked') return 'Google 로그인 창을 열 수 없습니다. 팝업을 허용한 뒤 다시 시도해 주세요.'
  if (result === 'failed' || result === 'incomplete') return 'Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.'
  return null
}
export async function attemptHostedGoogleSignIn(signIn: HostedGoogleSignIn | null | undefined, lock: { current: boolean }, openPopup: () => Window | null = openHostedGooglePopup, navigate: HostedGoogleNavigate = navigateHostedWorkspace): Promise<HostedGoogleAttempt> {
  if (lock.current) return 'ignored'
  if (!signIn) return 'unavailable'
  lock.current = true
  const popup = openPopup()
  if (!popup) { lock.current = false; return 'popup_blocked' }
  try {
    const result = await signIn.sso({ ...hostedGoogleSsoParameters, popup })
    if (result.error) return 'failed'
    if (signIn.status !== 'complete') return 'incomplete'
    const finalized = await signIn.finalize({ navigate })
    return finalized.error ? 'failed' : 'complete'
  } catch {
    return 'failed'
  } finally {
    if (!popup.closed) popup.close()
    lock.current = false
  }
}

const hostedFailureStates: Readonly<Record<string, AccountWorkspaceState>> = Object.freeze({
  authentication_required: 'login',
  session_expired: 'session_expired',
  session_revoked: 'session_expired',
  authentication_unavailable: 'unavailable',
  private_workspace_unavailable: 'unavailable',
  membership_conflict: 'conflict',
  owner_mismatch: 'access_denied',
  membership_inactive: 'access_denied',
  project_access_denied: 'access_denied',
})

export function hostedFailureState(reason: unknown): AccountWorkspaceState {
  return reason instanceof Error ? hostedFailureStates[reason.message] ?? 'unavailable' : 'unavailable'
}

type HostedSignOut = (options: { redirectUrl: string }) => Promise<unknown>
export async function returnToHostedLogin(signOut: HostedSignOut, storage: HostedTabStorage | undefined = currentTabStorage()) {
  clearHostedOwnerReady(storage)
  await signOut({ redirectUrl: '/workspace' })
}

function HostedWorkspaceBody() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { signIn, errors: signInErrors, fetchStatus } = useSignIn()
  const { user } = useUser()
  const [ownerWasReady, setOwnerWasReady] = useState(() => hostedSignedOutState() === 'session_expired')
  const [state, setState] = useState<AccountWorkspaceState>(isLoaded && !isSignedIn ? hostedSignedOutState() : 'loading')
  const [ownerVerified, setOwnerVerified] = useState(false)
  const [workspace, setWorkspace] = useState<PrivateWorkspaceView>()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)
  const googleLock = useRef(false)
  const googleBusy = googlePending || fetchStatus === 'fetching'

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { setOwnerVerified(false); setState(ownerWasReady || hostedSignedOutState() === 'session_expired' ? 'session_expired' : 'login'); setWorkspace(undefined); return }
    void requireHostedSessionToken(getToken)
      .then((sessionToken) => confirmHostedOwnerWorkspace(sessionToken, undefined, undefined, () => setOwnerVerified(true)))
      .then((value) => { setOwnerWasReady(true); setWorkspace(value); setState('ready') })
      .catch((reason) => {
        setWorkspace(undefined)
        if (!(reason instanceof Error && reason.message === 'private_workspace_unavailable')) setOwnerVerified(false)
        setState(hostedFailureState(reason))
      })
  }, [getToken, isLoaded, isSignedIn])

  useEffect(() => {
    if (signInErrors.global || signInErrors.raw) setError('인증을 시작하지 못했습니다. 다시 시도해 주세요.')
  }, [signInErrors.global, signInErrors.raw])

  const google = async () => {
    if (googleBusy || googleLock.current) return
    setError(null)
    setGooglePending(true)
    const result = await attemptHostedGoogleSignIn(signIn, googleLock)
    setError(hostedGoogleAttemptError(result))
    setGooglePending(false)
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
  const returnToLogin = async () => {
    clearHostedOwnerReady()
    setOwnerWasReady(false)
    setOwnerVerified(false)
    setWorkspace(undefined)
    setState('login')
    await returnToHostedLogin(signOut)
  }
  const loginContent = <div className="account-workspace__actions" data-clerk-browser-auth="true">
    <button className="account-workspace__google" type="button" data-touch-target="44" data-private-login-provider="google" data-google-start-pending={googleBusy} aria-busy={googleBusy} disabled={googleBusy} onClick={() => void google()}>{googleBusy ? 'Google 로그인 시작 중…' : 'Google로 계속'}</button>
    <div className="account-workspace__separator" aria-hidden="true"><span>또는</span></div>
    <form className="account-workspace__fallback" onSubmit={codeSent ? verifyCode : sendCode}>
      <strong>이메일로 확인</strong>
      {!codeSent ? <><label htmlFor="private-email">이메일</label><input id="private-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></> : <><label htmlFor="private-code">인증 코드</label><input id="private-code" inputMode="numeric" required value={code} onChange={(event) => setCode(event.target.value)} /></>}
      <button type="submit" data-touch-target="44">{codeSent ? '인증 코드 확인' : '이메일 인증 코드 받기'}</button>
    </form>
    <span className="account-workspace__apple-note">Apple은 소유자 로그인 확인 후 연결</span>
    <p className="account-workspace__adapter-note">Clerk 브라우저 세션 · 회원가입 전환 차단</p>
  </div>
  return <AccountWorkspace state={state} workspace={workspace} ownerVerified={ownerVerified} sessionPresent={Boolean(isSignedIn)} loginContent={loginContent} onLogout={isSignedIn || ownerWasReady ? returnToLogin : undefined} onAppleLink={ownerVerified ? linkApple : undefined} transitionError={error} />
}

export function HostedClerkWorkspace({ publishableKey, pathname = window.location.pathname }: { publishableKey: string; pathname?: string }) {
  return <ClerkProvider publishableKey={publishableKey}>
    {callbackPaths.has(pathname)
      ? <AuthenticateWithRedirectCallback transferable={false} signInFallbackRedirectUrl="/workspace" signUpFallbackRedirectUrl="/workspace" />
      : <HostedWorkspaceBody />}
  </ClerkProvider>
}
