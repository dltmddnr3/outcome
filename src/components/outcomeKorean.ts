const phaseCopy: Record<string, [string, string]> = {
  'phase-1-mvp-closure': ['1단계 · 최소 제품 마무리', '실제 사용 경계, 불변 근거, 독립 검수와 Cherry 승인을 거쳐 기록·정리·재발견 최소 제품을 마무리합니다.'],
  'outcome-phase-1': ['1단계 · 로컬 최소 제품', 'Cherry Note와 OUTCOME을 같은 표준 계약으로 추적하는 독립 로컬 대시보드를 Cherry가 실제 사용할 수 있는 상태로 닫습니다.'],
  'outcome-phase-2': ['2단계 · 공개 다중 프로젝트 서비스', '여러 프로젝트를 계정 기반 공개 서비스에서 안전하게 전환하고 조회합니다.'],
  'outcome-phase-3': ['3단계 · 목적 정의 대기', 'Cherry가 제품 목적을 결정하기 전까지 기능과 진행을 추론하지 않습니다.'],
  'outcome-phase-4': ['4단계 · OUTCOME 안에서 개발', '외부 작업 화면 없이 OUTCOME 안에서 프로젝트 생성, 역할 구성과 개발 흐름을 수행합니다.'],
  'outcome-phase-5': ['5단계 · 결과 우선 생성', '원하는 목적지를 명확히 찾고 필요한 실행 구조를 결과에 맞게 구성합니다.'],
}

export const hierarchyLabels = ['프로젝트', '큰 단계', '범위', '작업 단계', '완료 조건'] as const
export const projectOutcomePresentation = (id: string, value: string) => id === 'outcome' ? '인공지능 역할의 작업을 결과 구조와 근거에 연결해 현재 위치와 다음 경계를 보여줍니다.' : value

const scopeCopy: Record<string, [string, string]> = {
  'scope-stage-33-physical-boundary': ['33단계 실제 사용 경계', '열려 있는 빌드 41 하단 셸 의견을 검증된 불변 후보와 Cherry의 실제 사용 판정으로 전환하되 피드는 시작하지 않습니다.'],
  'scope-final-feed': ['최종 피드', '기존 로컬 기록과 조회를 시간순으로 보여주는 개인 화면인 마지막 최소 제품 단계를 제공합니다.'],
  'scope-mvp-handoff-and-acceptance': ['불변 인계와 최소 제품 승인', '정확한 1단계 후보를 고정하고 두 독립 검증을 거쳐 Cherry의 실제 사용 승인과 최소 제품 범위 마감을 기록합니다.'],
  'outcome-scope-contract': ['계약 기반', '모든 프로젝트가 같은 의미로 등록되도록 계약, 위계, 완료 조건과 역할 경계를 고정합니다.'],
  'outcome-scope-runtime': ['독립 실행 환경과 범용 추적', '기존 대시보드를 OUTCOME으로 분리하고 프로젝트 문서와 역할 연결을 일반화해 MacBook과 모바일에서도 안전하게 읽습니다.'],
  'outcome-scope-acceptance': ['독립 승인', '구현자와 분리된 검증과 Cherry의 실제 사용으로 로컬 최소 제품 결과를 닫습니다.'],
  'outcome-phase-2-public-hosting': ['안정적인 공개 전달', '임시 연결이 아닌 안정 주소와 운영 경계를 정의합니다.'],
  'outcome-phase-2-project-portfolio': ['다중 프로젝트 모음', '등록 프로젝트를 같은 원본 묶음 의미로 전환하고 조회합니다.'],
  'outcome-phase-2-account-service': ['계정 기반 접근', '프로젝트별 가시성과 접근 권한을 계정 기반으로 관리합니다.'],
  'outcome-phase-3-definition': ['목적 정의 대기', '3단계의 목적, 범위, 스테이지와 완료 조건을 Cherry와 정의합니다.'],
  'outcome-phase-4-project-creation': ['프로젝트와 원본 묶음 생성', 'OUTCOME에서 프로젝트와 표준 원본 묶음을 직접 만듭니다.'],
  'outcome-phase-4-role-sessions': ['네 역할 작업 구성', '기획, 구현, 사용성·제품 검수와 출시 감사 작업을 프로젝트에 연결합니다.'],
  'outcome-phase-4-linked-chat': ['연결 작업 대화와 제어', 'OUTCOME 안에서 역할별 작업 지시와 결과 대화를 수행합니다.'],
  'outcome-phase-4-full-development': ['전체 개발 작업 공간', '외부 작업 화면 없이 개발 흐름을 완결합니다.'],
  'outcome-phase-5-destination': ['목적지 발견', '프로젝트 시작 전에 원하는 결과와 성공 조건을 명확히 파악합니다.'],
  'outcome-phase-5-question-200': ['질문 200', '질문을 통해 목적, 사용자, 제약과 완료 조건을 결과 계약으로 만듭니다.'],
  'outcome-phase-5-composition': ['고정 역할을 넘는 구성', '필요한 역할, 도구와 실행 단위를 결과에 맞게 구성합니다.'],
}

const stageCopy: Record<string, [string, string]> = {
  'stage-33-engineering-build-41': ['33단계 엔지니어링·빌드 41 근거', '실제 사용 승인에 앞서는 정확한 엔지니어링 및 내부 배포 기준선을 보존합니다.'],
  'stage-33-bottom-shell-seam-correction': ['하단 셸 경계 교정', '피드, 데이터, 탐색 동작과 검증된 여백 계약을 바꾸지 않고 눈에 띄는 직사각형 경계를 제거합니다.'],
  'stage-33-physical-acceptance-boundary': ['33단계 실제 사용 승인 경계', '교정된 정확한 TestFlight 빌드를 Cherry가 이름 붙인 실제 사용 판정에 연결하고 최종 피드의 선행 조건을 닫습니다.'],
  'stage-35-note-detail-engineering-candidate': ['35단계 노트 상세 엔지니어링 후보', 'Cherry가 엔지니어링 후속 경계로 승인한 불변 노트 상세 교정 후보를 보존합니다.'],
  'stage-final-feed': ['최종 피드 제품 단계', '시간순 최종 피드 한 단계를 계획·구현·검증하고 실제 사용으로 승인합니다.'],
  'stage-user-visible-app-name-correction': ['사용자 표시 앱 이름 교정', '내부 식별자나 동작을 바꾸지 않고 앱, 공유, 위젯과 권한 화면의 정식 이름 체리노트를 복원합니다.'],
  'stage-immutable-handoff': ['불변 인계', '독립 검증자가 사용할 정확한 버전 관리, 산출물, 완료 조건, 테스트, 범위와 되돌리기 근거를 고정합니다.'],
  'stage-ux-product-qa': ['새 사용성·제품 검수', '불변 인계를 기준으로 실제 사용, 이해도, 지정 패턴과 반례를 독립 검증합니다.'],
  'stage-release-audit': ['별도 신규 출시 감사', '정확한 버전 관리·산출물 식별자, 테스트, 서명, 개인정보, 인증, 데이터, 충돌, 되돌리기와 출시 경계를 독립 감사로 확인합니다.'],
  'stage-mvp-scope-closure': ['Cherry 실제 사용 승인과 최소 제품 범위 마감', '어떤 판정도 자동 결합하지 않고, 두 독립 보고서와 실제 사용 근거 및 Cherry의 명시적 결정 뒤에만 범위를 닫습니다.'],
  'outcome-stage-1': ['문서 기반 구축', '새 역할 작업이 대화 기록 없이 OUTCOME의 목적과 현재 경계를 이해하도록 합니다.'],
  'outcome-stage-2': ['표준 입력과 자체 추적 계약', '세 표준 문서, 역할 연결, OUTCOME 자체 지도와 전달 완료 조건을 확정합니다.'],
  'outcome-stage-3': ['독립 제품 이전과 원격 피드백 기반', '대시보드 전용 코드와 최소 실행 환경을 OUTCOME 저장소의 단일 원본으로 옮기고 Cherry 승인 공개 읽기 전용 후보를 만듭니다.'],
  'outcome-stage-4': ['범용 원본 모델', 'Cherry Note 하드코딩을 제거하고 세 표준 문서와 역할 연결로 프로젝트 모델을 만듭니다.'],
  'outcome-stage-5': ['OUTCOME 자체 추적 화면', 'Cherry Note와 OUTCOME의 목적, 현재 위치, 작업 단계 완료 조건과 현재 작업을 같은 위계와 상태 언어로 보여줍니다.'],
  'outcome-stage-6': ['사용성·제품 검수', '실제 화면에서 위계, 목적, 현재 위치와 다음 경계가 오해 없이 읽히는지 반증합니다.'],
  'outcome-stage-7': ['출시 감사', '고정 후보의 독립 실행, 개인정보, 원본 격리, 빌드와 되돌리기 준비도를 감사합니다.'],
  'outcome-stage-8': ['Cherry 승인', 'Cherry가 OUTCOME으로 Cherry Note와 OUTCOME의 현재 위치와 다음 행동을 30초 안에 판단합니다.'],
  'outcome-stage-stable-snapshot-host': ['안정적인 배포 스냅샷 호스트', '로컬 원본과 임시 연결 없이 고정 보안 웹 주소에서 정제된 프로젝트 스냅샷을 제공합니다.'],
  'outcome-stage-project-portfolio-foundation': ['등록 원본 묶음 포트폴리오 기반', '명시적 등록부와 원본 묶음 표시 정보로 세 번째 이후 프로젝트도 코드별 고정값 없이 같은 읽기 전용 프로젝트 여정에 등록합니다.'],
  'outcome-stage-account-access-definition': ['계정 접근 계약 정의', '공개 배포본과 인증된 비공개 작업공간의 사용자·권한·데이터·운영 경계를 구현 전에 Cherry 결정으로 고정합니다.'],
  'outcome-stage-account-access-implementation': ['계정 접근 구현 후보', '승인된 계정 접근 계약을 로컬·미리보기에서 검증 가능한 읽기 전용 후보와 재현 가능한 근거로 구현합니다.'],
  'outcome-stage-account-access-ux-product-qa': ['계정 접근 사용성·제품 검수', '구현자와 분리된 새 검수자가 정확한 후보의 공개·비공개 사용자 여정과 원본 사실을 반증합니다.'],
  'outcome-stage-account-access-release-audit': ['계정 접근 출시 감사', '별도 신규 감사자가 같은 후보의 인증, 행 수준 보안, 개인정보·데이터, 운영, 비용, 실행 환경과 되돌리기를 검증합니다.'],
  'outcome-stage-account-access-cherry-acceptance': ['계정 접근 Cherry 승인', '두 독립 검증을 통과한 정확한 후보를 Cherry가 MacBook과 모바일에서 직접 판정합니다.'],
}

const gateCopy: Record<string, string> = {
  'stage-33-physical-acceptance-boundary:P33A3': 'Cherry가 빌드 43을 설치하고 정확한 기기·빌드·시각 근거를 기록합니다.',
  'stage-33-physical-acceptance-boundary:P33A4': '하단 셸 경계, 가독성과 여백에 명시적인 실제 사용 판정을 남깁니다.',
  'stage-33-physical-acceptance-boundary:P33A5': '노트 상세 의견과 35단계 전체 흐름을 Cherry가 명시적으로 승인합니다.',
  'stage-user-visible-app-name-correction:ANC3': '구현자가 추적 파일이 깨끗한 정확한 엔지니어링 후보 하나를 제출합니다.',
  'stage-user-visible-app-name-correction:ANC4': '빌드된 앱·공유·위젯 이름과 권한 문구를 독립 근거로 확인합니다.',
  'stage-user-visible-app-name-correction:ANC5': '갱신된 불변 인계와 새 사용성·제품 검수가 새로운 사용자 표시 바이트를 확인합니다.',
  'stage-release-audit:RA6': '정식 출시 검수 티켓과 검증된 전문 역할 구성이 존재합니다.',
  'stage-release-audit:RA7': '새 독립 출시 감사 실행이 이 정확한 후보에 연결됩니다.',
  'stage-release-audit:RA8': '별도 신규 출시 감사 보고서가 허용된 최종 판정에 도달합니다.',
  'stage-mvp-scope-closure:MC4': '별도 신규 출시 감사가 정확한 후보에 대해 출시 감사만 통과 판정에 도달합니다.',
  'stage-mvp-scope-closure:MC5': '최종 피드의 정확한 후보에 승인된 내부 TestFlight 배포 산출물이 있습니다.',
  'stage-mvp-scope-closure:MC6': 'Cherry가 35단계 노트 상세와 하단 셸 경험을 실제로 승인합니다.',
  'stage-ux-product-qa:ANQ1': '새 독립 검수자가 정확한 후보 식별자와 다섯 변경 경로를 고정합니다.',
  'stage-ux-product-qa:ANQ2': '원본, 생성된 설정 파일과 빌드 묶음의 이름이 정식 값과 일치하는지 독립 확인합니다.',
  'stage-ux-product-qa:ANQ3': '달력·미리 알림·사진 권한 설명 세 곳에 명확한 한글 체리노트 문구가 있는지 독립 확인합니다.',
  'stage-ux-product-qa:ANQ4': '내부 식별자와 빌드·버전 불변 조건이 유지됐는지 독립 확인합니다.',
  'stage-ux-product-qa:ANQ5': '이름 계약 검사와 변경 범위에 맞춘 회귀 검사가 새 검수 흐름에서 통과해야 합니다.',
  'stage-ux-product-qa:ANQ6': '렌더링 화면이나 설치된 시뮬레이터 근거로 사용자에게 보이는 이름 영역을 확인합니다.',
  'stage-ux-product-qa:ANQ7': '이전 판정을 재사용하지 않고 실패·불안정 검사·누적 오완료 수를 기록합니다.',
  'stage-ux-product-qa:ANQ8': '새 사용성·제품 검수 판정을 명시하고, 출시 감사·배포·Cherry 승인 권한이 없음을 확인합니다.',
  'stage-mvp-scope-closure:MC7': 'Cherry가 정확히 배포된 빌드에서 최종 피드를 실제로 승인합니다.',
  'stage-mvp-scope-closure:MC8': '두 독립 보고서와 두 실제 사용 흐름을 검토한 뒤 Cherry가 1단계 최소 제품 범위 마감을 명시적으로 승인합니다.',
  'stage-mvp-scope-closure:MC9': 'MC1부터 MC8까지 기계적으로 완료된 뒤에만 상위 관리 역할이 최소 제품 범위 마감 상태를 기록합니다.',
  'outcome-stage-8:C1': 'Cherry가 OUTCOME을 사용해 Cherry Note와 OUTCOME의 현재 위치와 다음 행동을 30초 안에 이해할 수 있는지 확인합니다.',
  'outcome-stage-8:C2': 'Cherry가 로컬 최소 제품 마감을 명시적으로 승인하며, 출시와 외부 완료는 별도 결정으로 남깁니다.',
  'outcome-stage-project-portfolio-foundation:P1': '프로젝트 등록부가 명시적 형식과 원본 묶음의 루트·계약·지도 입력을 가지며 기존 두 프로젝트도 같은 경로로 등록되는지 확인합니다.',
  'outcome-stage-project-portfolio-foundation:P2': '누락·형식 오류·중복·허용되지 않은 경로를 실패로 닫고 기본값 대체나 프로젝트 식별자 혼합이 없는지 확인합니다.',
  'outcome-stage-project-portfolio-foundation:P3': '새 프로젝트의 사용자 표시명과 목적이 원본 묶음에서 오며 프로젝트별 코드 번역표를 요구하지 않는지 확인합니다.',
  'outcome-stage-project-portfolio-foundation:P4': '세 프로젝트 이상 검증 묶음에서 전환·현재 위치·위계 탐색과 모바일 단계 탐색이 각 프로젝트 식별자를 보존하는지 확인합니다.',
  'outcome-stage-project-portfolio-foundation:P5': '로컬 등록 경로와 인증 정보가 공개 결과에 포함되지 않고 읽기 전용·변경 차단·완료 권한 없음 경계를 유지하는지 확인합니다.',
  'outcome-stage-project-portfolio-foundation:P6': '정확한 후보가 전체 회귀와 새 사용성·제품 검수를 통과하고 고정 공개 주소의 버전 관리·트리·에셋과 일치하는지 확인합니다.',
  'outcome-stage-account-access-implementation:I1': '정확한 구현 작업 지시, 기준 커밋, 허용 경로와 제외 범위를 고정합니다.',
  'outcome-stage-account-access-implementation:I2': '공개 화면·API·상태 확인과 변경 요청 405 차단, 정제 및 배포 영수증 동작이 그대로 유지되는지 확인합니다.',
  'outcome-stage-account-access-implementation:I3': '구글 우선, 연결된 애플 접근, 이메일 인증 코드 대체 흐름과 접속·로그아웃·철회·복구 실패 상태를 실패 우선 검사로 검증합니다.',
  'outcome-stage-account-access-implementation:I4': '서버가 소유자와 작업공간 소속을 판정하고, 두 프로젝트 허용 목록과 작업공간 간 접근 차단을 실제 행 수준 보안으로 검증합니다.',
  'outcome-stage-account-access-implementation:I5': '추가 전용 배포본과 현재 포인터, 이전, 보존·내보내기·삭제·복구 계약을 합성 검증 자료로 확인합니다.',
  'outcome-stage-account-access-implementation:I6': '요청 제한, 정제된 측정·경보, 비용 경계, 사고 영수증과 안전한 되돌리기 연결을 검증합니다.',
  'outcome-stage-account-access-implementation:I7': 'MacBook과 모바일에서 로그인부터 안전한 제한 상태까지 모든 화면과 접근성을 검증합니다.',
  'outcome-stage-account-access-implementation:I8': '정확한 후보 커밋·트리·에셋, 검사, 이전, 합성 자료, 적용·되돌리기와 변경 파일 영수증을 불변 인계로 전달합니다.',
  'outcome-stage-account-access-ux-product-qa:Q1': '검수자 식별자와 정확한 후보·인계 고정값이 구현자와 분리되어 있는지 확인합니다.',
  'outcome-stage-account-access-ux-product-qa:Q2': '로그인 없는 공개 여정과 Cherry 전용 비공개 로그인·로그아웃·만료·접근 거부·오류 여정을 MacBook과 모바일에서 검증합니다.',
  'outcome-stage-account-access-ux-product-qa:Q3': '프로젝트 표시 범위, 현재 위치와 탐색 위치, 오래됨·충돌·비어 있음·안전 제한 상태와 접근성을 검증합니다.',
  'outcome-stage-account-access-ux-product-qa:Q4': '검수 보고서는 사용성·제품 검수만 통과 또는 실패로 끝나며 출시 감사·Cherry 승인·출시 권한을 주장하지 않습니다.',
  'outcome-stage-account-access-release-audit:A1': '감사자 식별자, 정확한 버전 관리·빌드·이전·배포본 고정값과 사용성·제품 검수 입력이 유효한지 확인합니다.',
  'outcome-stage-account-access-release-audit:A2': '인증·접속·요청 위조 방지, 행 수준 접근 차단, 비밀정보 정제, 보존·내보내기·삭제·복구와 제공자 장애가 안전하게 차단되는지 검증합니다.',
  'outcome-stage-account-access-release-audit:A3': '요청 제한, 관측·경보, 비용 상한, 사고 대응, 단계적 적용과 되돌리기 영수증을 재현합니다.',
  'outcome-stage-account-access-release-audit:A4': '감사 보고서는 출시 감사만 통과 또는 실패로 끝나며 Cherry 승인, 운영 자원 변경과 출시 승인을 주장하지 않습니다.',
  'outcome-stage-account-access-cherry-acceptance:C1': '정확한 후보에 새 사용성·제품 검수 통과와 별도 출시 감사 통과가 모두 있는지 확인합니다.',
  'outcome-stage-account-access-cherry-acceptance:C2': 'Cherry가 MacBook과 모바일에서 공개·비공개 전환, 로그인·로그아웃·접근 거부, 두 프로젝트 탐색과 오류·복구 상태를 직접 수용합니다.',
  'outcome-stage-account-access-cherry-acceptance:C3': 'Cherry가 계정 접근 결과 스테이지의 마감을 명시적으로 승인합니다.',
  'outcome-stage-account-access-cherry-acceptance:C4': '공개 서비스 출시와 외부 결과 완료는 별도 결정으로 열려 있음을 확인합니다.',
}

const stateCopy: Record<string, string> = {
  active: '진행 중', idle: '대기 중', terminal: '종료됨', unbound: '연결 없음', connected: '연결됨', missing: '채택 안 됨', not_published: '게시 안 됨', replaced: '교체됨', blocked: '차단됨', pending: '증거 대기', complete: '완료 조건 충족', gates_closed_evidence_pending: '체크 항목 닫힘 · 증거 대기', queued: '진입 대기', locked: '선행 완료 조건 대기', unknown: '근거 없음', stale: '관측 오래됨', available: '로컬에 있음', ahead: '로컬 앞섬', behind: '로컬 뒤처짐', diverged: '분기됨', synced: '동기화됨', evidence_closed: '증거 확정', partially_evidenced: '일부 증거 있음', not_sourced: '해당 축 근거 없음', not_started: '시작 전', present: '원본 있음', conflict: '충돌', valid: '정상',
}

const axisCopy: Record<string, string> = {
  ...stateCopy,
  complete_on_exact_1cdec3f_candidate: '정확한 1cdec3f 후보에서 완료',
  complete_523_foundation_248_docktests_and_signed_build_matrix: '기반 검사 523개·도크 검사 248개와 서명 빌드 조합 완료',
  complete_receipt_87b4523_and_handoff_verified: '87b4523 완료 영수증과 인계 검증 완료',
  exact_1cdec3f_frozen: '정확한 1cdec3f 후보 고정됨',
  complete_for_fresh_independent_review: '새 독립 검수 준비 완료',
  not_started_preflight_hold: '시작 전 · 사전 점검 대기',
  complete: '완료',
  audit_not_release: '감사 근거이며 출시 아님', both_reports_required: '두 독립 보고서 필요', builder_dispatched_on_exact_4a3ad80_baseline: '정확한 4a3ad80 기준선에서 구현자 작업 배정됨', complete_4a3ad80_candidate_receipt_and_handoff_verified: '4a3ad80 후보 영수증과 인계 검증 완료', complete_523_246_41_plus_small_clearance_and_no_inset_mutation_red: '523·246·41 검사와 작은 화면 여백 완료, 안쪽 여백 제거 변경은 실패 확인', complete_57_of_57_engineering_gates: '엔지니어링 완료 조건 57/57 충족', complete_for_engineering_and_internal_distribution: '엔지니어링과 내부 배포 기준 완료', complete_for_engineering_candidate: '엔지니어링 후보 기준 완료', complete_on_pinned_candidate: '고정 후보에서 완료', evidence_manifest_validated: '근거 목록 검증됨', frozen_candidate_only: '고정 후보에만 해당', independently_reproduced_523_246_41_and_mutation_restored: '523·246·41 검사를 독립 재현하고 변경 원복 확인', independently_reproduced_not_started: '독립 재현 시작 전', internal_testflight_available_not_release: '내부 TestFlight 사용 가능 · 출시 아님', internal_testflight_build_43_available: '내부 TestFlight 빌드 43 사용 가능', internal_testflight_build_43_available_no_external_release: '내부 TestFlight 빌드 43 사용 가능 · 외부 출시 아님', must_be_complete_but_not_sufficient: '완료가 필요하지만 이것만으로 충분하지 않음', no_build_bump_or_testflight_upload: '빌드 번호 증가·TestFlight 업로드 없음', no_build_bump_upload_or_release_authority: '빌드 번호 증가·업로드·출시 권한 없음', not_applicable_at_this_boundary: '현재 경계에는 해당 없음', not_final_phase_qa: '최종 단계 검수 아님', pass_ux_product_qa_only_cumulative_false_completion_6: '사용성·제품 검수만 통과 · 누적 오완료 6', pending_cherry_physical_verdict: 'Cherry 실제 사용 판정 대기', pending_fresh_review_of_name_corrected_candidate: '이름 교정 후보 신규 검수 대기', pending_new_candidate_and_receipt: '새 후보와 영수증 대기', pending_parallel_lane: '병렬 검증 흐름 대기', pending_red_first_and_built_plist_evidence: '실패 우선 검사와 빌드 설정 근거 대기', pending_refresh_after_app_name_correction: '앱 이름 교정 후 갱신 대기', pending_refresh_after_new_user_visible_bytes: '새 사용자 표시 바이트 반영 후 갱신 대기', physical_verdict_pending: '실제 사용 판정 대기', present_open_2_of_6: '원본 있음 · 6개 중 2개 열림', present_open_4_of_10: '원본 있음 · 10개 중 4개 열림', present_package_projection_complete_3_of_3_source_12_of_12: '원본 묶음 투영 3/3, 원본 확인 12/12 완료', present_preflight_5_of_8_three_delivery_gates_open: '사전 점검 8개 중 5개 완료 · 전달 완료 조건 3개 열림', present_read_only: '읽기 전용 원본 있음', present_read_only_complete_10_of_10: '읽기 전용 원본 있음 · 10/10 완료', present_read_only_complete_9_of_9: '읽기 전용 원본 있음 · 9/9 완료', prior_4a3ad80_frozen: '이전 4a3ad80 후보 고정됨', prior_4a3ad80_frozen_superseded_for_release_eligibility: '이전 4a3ad80 고정 후보는 출시 자격 기준에서 대체됨', prior_candidate_complete_8_of_8_refresh_required: '이전 후보 8/8 완료 · 갱신 필요', prior_pass_not_current_candidate: '이전 통과이며 현재 후보 아님', prior_pass_preserved_not_transferable: '이전 통과 보존 · 현재 후보로 이전 불가', prior_profile_preactivation_pass_requires_candidate_repin: '이전 역할 구성 사전 통과 · 후보 재고정 필요', separate_explicit_authority_required: '별도 명시 권한 필요', third_test_evidence_correction_complete_on_4a3ad80: '4a3ad80에서 세 번째 테스트 근거 교정 완료',
}

export const roleLabel = (value: string) => ({ planner: '기획', builder: '구현', ux_product_qa: '사용성·제품 검수', release_audit: '출시 감사' }[value] ?? '역할 미상')
export const sourceStateLabelKo = (value: string) => ({ valid: '원본 묶음 정상', stale: '원본 관측 오래됨', unknown: '원본 묶음 근거 없음', conflict: '원본 묶음 충돌' }[value] ?? '원본 묶음 상태 미상')
export const stateLabelKo = (value: string) => stateCopy[value] ?? '상태 한글화 대기'
export const axisLabelKo = (value: string) => axisCopy[value] ?? '원본 상태 한글화 대기'
export const freshnessLabelKo = (value: string) => ({ fresh: '최근 관측', stale: '관측 오래됨', unknown: '관측 근거 없음', replaced: '교체된 관측' }[value] ?? '관측 상태 미상')
export const sourceLabelKo = (value: string) => ({ runtime_registry: '실시간 역할 연결', builder_binding: '구현 역할 연결' }[value] ?? '원본 연결')
export const activityLabelKo = (value: string | null) => value === 'Stage 6 NEEDS_REVISION correction is active; fresh independent QA remains required' ? '6단계 수정 진행 중 · 새 독립 검수가 필요합니다' : value ? '현재 작업 설명 한글화 대기' : null
export const phasePresentation = (id: string, sourceTitle?: string, sourcePurpose?: string) => phaseCopy[id] ?? [sourceTitle || '큰 단계 제목 한글화 대기', sourcePurpose || '큰 단계 목적 한글화 대기']
export const scopePresentation = (id: string, sourceTitle?: string, sourcePurpose?: string) => scopeCopy[id] ?? [sourceTitle || '범위 제목 한글화 대기', sourcePurpose || '범위 목적 한글화 대기']
export const stagePresentation = (id: string, sourceTitle?: string, sourcePurpose?: string) => stageCopy[id] ?? [sourceTitle || '작업 단계 제목 한글화 대기', sourcePurpose || '작업 단계 목적 한글화 대기']
export const gatePresentation = (stageId: string, gateId: string, sourceTitle?: string) => gateCopy[`${stageId}:${gateId}`] ?? (sourceTitle || '원본 완료 조건 설명 한글화 대기')
export const groupPresentation = (name: string, code: string) => name === code ? '완료 조건 그룹' : name
export const loginErrorPresentation = (value: string) => ({
  invalid_credentials: '접근 암호가 올바르지 않습니다.',
  too_many_attempts: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
}[value] ?? '로그인하지 못했습니다.')
