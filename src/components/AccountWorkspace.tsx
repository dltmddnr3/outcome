export const accountWorkspaceStateCopy = {
  login: { title: 'Cherry 계정으로 확인', detail: '승인된 한 명의 소유자만 비공개 프로젝트를 볼 수 있습니다.' },
  loading: { title: '비공개 결과를 확인하는 중', detail: '인증과 프로젝트 권한을 서버에서 확인하고 있습니다.' },
  empty: { title: '연결된 프로젝트가 없습니다', detail: '프로젝트를 임의로 대신 표시하지 않습니다.' },
  stale: { title: '마지막 확인 결과를 표시합니다', detail: '새 수집이 확인될 때까지 기존 스냅샷 시간을 유지합니다.' },
  conflict: { title: '계정 연결을 확인할 수 없습니다', detail: '서로 충돌하는 워크스페이스 정보가 있어 접근을 중단했습니다.' },
  unavailable: { title: '비공개 워크스페이스를 열 수 없습니다', detail: '공급자 설정 또는 저장소 연결이 준비되지 않았습니다.' },
  session_expired: { title: '로그인이 만료되었습니다', detail: 'Google 또는 이메일 인증 코드로 다시 확인해 주세요.' },
  access_denied: { title: '이 프로젝트에 접근할 수 없습니다', detail: '다른 프로젝트나 공개 데이터로 대신 연결하지 않습니다.' },
  safe_degraded: { title: '안전한 읽기 전용 상태입니다', detail: '마지막 검증 결과만 보이며 새로고침과 변경 작업은 중단되었습니다.' },
  ready: { title: '비공개 결과를 확인할 수 있습니다', detail: '허용된 프로젝트만 읽기 전용으로 표시합니다.' },
} as const

export type AccountWorkspaceState = keyof typeof accountWorkspaceStateCopy

export function AccountWorkspace({ state = 'unavailable' }: { state?: AccountWorkspaceState }) {
  const copy = accountWorkspaceStateCopy[state]
  const alert = ['conflict', 'unavailable', 'session_expired', 'access_denied'].includes(state)
  return <main className="account-workspace" data-completion-authority="false">
    <header className="account-workspace__header">
      <div><span className="account-workspace__eyebrow">OUTCOME PRIVATE</span><h1>Cherry 전용 비공개 워크스페이스</h1></div>
      <span className="account-workspace__mode">읽기 전용</span>
    </header>
    <section className="account-workspace__state" role={alert ? 'alert' : 'status'} aria-live={alert ? 'assertive' : 'polite'}>
      <span className="account-workspace__state-code">{state}</span>
      <h2>{copy.title}</h2>
      <p>{copy.detail}</p>
      {state === 'login' && <div className="account-workspace__actions">
        <button type="button" data-touch-target="44">Google로 계속</button>
        <button type="button" data-touch-target="44">이메일 인증 코드</button>
        <span>Apple은 로그인 후 연결</span>
      </div>}
      {state === 'session_expired' && <button type="button" data-touch-target="44">다시 로그인</button>}
      {state === 'safe_degraded' && <p className="account-workspace__notice">변경 기능 없음 · 자동 동기화 없음 · 마지막 검증 시각 유지</p>}
    </section>
    <footer>
      <span>허용 범위 · Cherry Note / OUTCOME</span>
      <code>completionAuthority=false</code>
    </footer>
  </main>
}
