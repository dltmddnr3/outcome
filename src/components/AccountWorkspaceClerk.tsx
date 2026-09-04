import { AuthenticateWithRedirectCallback, ClerkProvider, useAuth, useSignIn, useUser } from '@clerk/react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { fetchPrivateOwnerSession, fetchPrivateWorkspace, type PrivateWorkspaceView } from '../lib/api'
import { AccountWorkspace, type AccountWorkspaceState } from './AccountWorkspace'
import { PlannerConversationSession } from './PlannerConversation'

const callbackPaths = new Set(['/workspace/sso-callback', '/workspace/apple-callback'])
export const hostedGoogleSsoParameters = Object.freeze({ strategy: 'oauth_google' as const, redirectCallbackUrl: '/workspace/sso-callback', redirectUrl: '/workspace' })
type HostedNavigate = (input: { decorateUrl: (url: string) => string }) => void | Promise<void>
type HostedFinalizableSignIn = {
  status: string
  isTransferable?: boolean
  finalize: (parameters: { navigate: HostedNavigate }) => Promise<{ error: unknown }>
}
type EmailCodeSender = { emailCode: { sendCode: (input: { emailAddress: string }) => Promise<{ error: unknown }> } }
type EmailCodeSignIn = HostedFinalizableSignIn & {
  emailCode: {
    sendCode: (input: { emailAddress: string }) => Promise<{ error: unknown }>
    verifyCode: (input: { code: string }) => Promise<{ error: unknown }>
  }
}
export async function requestHostedEmailCode(signIn: EmailCodeSender | undefined, emailAddress: string) {
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

type HostedGoogleSignIn = HostedFinalizableSignIn & {
  sso: (parameters: typeof hostedGoogleSsoParameters & { popup: Window }) => Promise<{ error: unknown }>
}
type HostedGoogleAttempt = 'complete' | 'sso_failed' | 'blocked_existing_account' | 'incomplete' | 'session_activation_failed' | 'popup_blocked' | 'unavailable' | 'ignored'
export type HostedEmailAttempt = 'complete' | 'verification_failed' | 'blocked_existing_account' | 'incomplete' | 'session_activation_failed' | 'unavailable' | 'ignored'
const openHostedGooglePopup = () => window.open('about:blank', 'outcome-google-auth', 'popup,width=600,height=800')
const navigateHostedWorkspace: HostedNavigate = ({ decorateUrl }) => window.location.assign(decorateUrl('/workspace'))
const classifyHostedSignIn = (signIn: HostedFinalizableSignIn) => signIn.isTransferable === true ? 'blocked_existing_account' : signIn.status === 'complete' ? 'complete' : 'incomplete'
async function finalizeHostedSignIn(signIn: HostedFinalizableSignIn, navigate: HostedNavigate) {
  let navigationCount = 0
  let finalized
  try {
    finalized = await signIn.finalize({
      navigate: async (destination) => {
        if (navigationCount !== 0) throw new Error('duplicate_navigation')
        navigationCount += 1
        await navigate(destination)
      },
    })
  } catch {
    return false
  }
  return Boolean(finalized && !finalized.error && navigationCount === 1)
}
export function hostedGoogleAttemptError(result: HostedGoogleAttempt) {
  if (result === 'unavailable') return '인증 공급자를 불러오지 못했습니다. 다시 시도해 주세요.'
  if (result === 'popup_blocked') return 'Google 로그인 창을 열 수 없습니다. 팝업을 허용한 뒤 다시 시도해 주세요.'
  if (result === 'sso_failed') return 'Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.'
  if (result === 'blocked_existing_account') return '승인된 기존 계정으로만 로그인할 수 있습니다.'
  if (result === 'incomplete') return '추가 인증이 필요합니다. 로그인을 완료해 주세요.'
  if (result === 'session_activation_failed') return '인증은 확인되었지만 세션을 활성화하지 못했습니다. 다시 시도해 주세요.'
  return null
}
export function hostedEmailAttemptError(result: HostedEmailAttempt) {
  if (result === 'unavailable') return '인증 공급자를 불러오지 못했습니다.'
  if (result === 'verification_failed') return '인증 코드를 확인하지 못했습니다.'
  if (result === 'blocked_existing_account') return '승인된 기존 계정으로만 로그인할 수 있습니다.'
  if (result === 'incomplete') return '추가 인증이 필요합니다. 로그인을 완료해 주세요.'
  if (result === 'session_activation_failed') return '인증은 확인되었지만 세션을 활성화하지 못했습니다. 다시 시도해 주세요.'
  return null
}
export async function attemptHostedEmailCodeVerification(signIn: EmailCodeSignIn | null | undefined, code: string, lock: { current: boolean }, navigate: HostedNavigate = navigateHostedWorkspace, currentSignIn: () => EmailCodeSignIn | null | undefined = () => signIn): Promise<HostedEmailAttempt> {
  if (lock.current) return 'ignored'
  if (!signIn) return 'unavailable'
  lock.current = true
  try {
    let verified
    try { verified = await signIn.emailCode.verifyCode({ code }) } catch { return 'verification_failed' }
    if (verified.error) return 'verification_failed'
    const completedSignIn = currentSignIn()
    if (!completedSignIn) return 'unavailable'
    const state = classifyHostedSignIn(completedSignIn)
    if (state !== 'complete') return state
    return await finalizeHostedSignIn(completedSignIn, navigate) ? 'complete' : 'session_activation_failed'
  } finally {
    lock.current = false
  }
}
export async function attemptHostedGoogleSignIn(signIn: HostedGoogleSignIn | null | undefined, lock: { current: boolean }, openPopup: () => Window | null = openHostedGooglePopup, navigate: HostedNavigate = navigateHostedWorkspace, currentSignIn: () => HostedGoogleSignIn | null | undefined = () => signIn): Promise<HostedGoogleAttempt> {
  if (lock.current) return 'ignored'
  if (!signIn) return 'unavailable'
  lock.current = true
  const popup = openPopup()
  if (!popup) { lock.current = false; return 'popup_blocked' }
  let closePopup = true
  try {
    const result = await signIn.sso({ ...hostedGoogleSsoParameters, popup })
    if (result.error) return 'sso_failed'
    const completedSignIn = currentSignIn()
    if (!completedSignIn) return 'unavailable'
    const state = classifyHostedSignIn(completedSignIn)
    if (state !== 'complete') { closePopup = false; return state }
    return await finalizeHostedSignIn(completedSignIn, navigate) ? 'complete' : 'session_activation_failed'
  } catch {
    return 'sso_failed'
  } finally {
    if (closePopup && !popup.closed) popup.close()
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
  const [sessionToken, setSessionToken] = useState<string>()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)
  const googleLock = useRef(false)
  const emailVerifyLock = useRef(false)
  const signInRef = useRef(signIn)
  signInRef.current = signIn
  const googleBusy = googlePending || fetchStatus === 'fetching'

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { setOwnerVerified(false); setSessionToken(undefined); setState(ownerWasReady || hostedSignedOutState() === 'session_expired' ? 'session_expired' : 'login'); setWorkspace(undefined); return }
    void requireHostedSessionToken(getToken)
      .then((token) => { setSessionToken(token); return confirmHostedOwnerWorkspace(token, undefined, undefined, () => setOwnerVerified(true)) })
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
    const result = await attemptHostedGoogleSignIn(signIn, googleLock, openHostedGooglePopup, navigateHostedWorkspace, () => signInRef.current)
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
    const result = await attemptHostedEmailCodeVerification(signIn, code, emailVerifyLock, navigateHostedWorkspace, () => signInRef.current)
    setError(hostedEmailAttemptError(result))
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
    setSessionToken(undefined)
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
  return <PlannerConversationSession.Provider value={{ sessionCredential: sessionToken }}><AccountWorkspace state={state} workspace={workspace} ownerVerified={ownerVerified} sessionPresent={Boolean(isSignedIn)} loginContent={loginContent} onLogout={isSignedIn || ownerWasReady ? returnToLogin : undefined} onAppleLink={ownerVerified ? linkApple : undefined} transitionError={error} /></PlannerConversationSession.Provider>
}

export function HostedClerkWorkspace({ publishableKey, pathname = window.location.pathname }: { publishableKey: string; pathname?: string }) {
  return <ClerkProvider publishableKey={publishableKey}>
    {callbackPaths.has(pathname)
      ? <AuthenticateWithRedirectCallback transferable={false} signInFallbackRedirectUrl="/workspace" signUpFallbackRedirectUrl="/workspace" />
      : <HostedWorkspaceBody />}
  </ClerkProvider>
}
