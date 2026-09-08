import { projectSingleSessionWork } from './outcome-work-observer.mjs'

const unavailable = () => Object.freeze({ state:'unknown', reason:'source_unavailable', observationAgeMs:null })
const validTime = value => Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)

// observedAtMs is supplied by the authenticated owner-runtime reader. Never use
// thread.updatedAt, a stored turn timestamp, or a viewer refresh as a live probe.
// The same protocol on an unrelated stdio server may report notLoaded.
export function projectCodexRuntimeObservation(json, expectedThreadId, observedAtMs, nowMs, freshnessMs=15000) {
  if(typeof json!=='string' || Buffer.byteLength(json)>262144 || !uuid(expectedThreadId)
    || !validTime(observedAtMs) || !validTime(nowMs) || observedAtMs>nowMs
    || !Number.isSafeInteger(freshnessMs) || freshnessMs<1 || freshnessMs>300000) return unavailable()
  try {
    const raw=JSON.parse(json)
    let id,status
    if(raw?.method==='thread/status/changed') {id=raw.params?.threadId;status=raw.params?.status}
    else if(raw?.method===undefined && raw?.thread) {id=raw.thread.id;status=raw.thread.status}
    else return unavailable()
    if(id!==expectedThreadId || !status || typeof status!=='object' || Array.isArray(status)) return unavailable()
    const age=nowMs-observedAtMs
    if(age>freshnessMs) return Object.freeze({state:'unknown',reason:'observation_stale',observationAgeMs:age})
    if(status.type==='active') {
      if(Object.keys(status).sort().join(',')!=='activeFlags,type' || !Array.isArray(status.activeFlags)
        || status.activeFlags.length>2 || new Set(status.activeFlags).size!==status.activeFlags.length
        || status.activeFlags.some(flag=>!['waitingOnApproval','waitingOnUserInput'].includes(flag))) return unavailable()
      const flags=status.activeFlags
      const state=flags.length===2?'waiting_approval_and_user':flags[0]==='waitingOnApproval'?'waiting_approval'
        :flags[0]==='waitingOnUserInput'?'waiting_user':'active'
      return Object.freeze({state,reason:null,observationAgeMs:age})
    }
    if(Object.keys(status).join(',')!=='type' || !['idle','notLoaded','systemError'].includes(status.type)) return unavailable()
    return Object.freeze({state:status.type==='idle'?'idle':'unknown',
      reason:status.type==='idle'?null:status.type==='notLoaded'?'source_not_loaded':'source_error',observationAgeMs:age})
  } catch {return unavailable()}
}

// Keep execution observation and product stage evidence on separate axes.
// This function reads only; it cannot authenticate a source or drive a transition.
export function projectObservedSingleSessionWork(journalJson, scopeJson, runtimeJson, observedAtMs, nowMs, freshnessMs=15000) {
  const work=projectSingleSessionWork(journalJson,scopeJson,nowMs,freshnessMs)
  const scope=JSON.parse(scopeJson)
  const runtime=projectCodexRuntimeObservation(runtimeJson,scope.sessionRef,observedAtMs,nowMs,freshnessMs)
  const executionState=runtime.state==='active'
    ? work.freshness==='fresh' && work.activity==='running'?'running':'stage_unconfirmed'
    : runtime.state==='idle'?'idle':runtime.state
  // Browser expiry retains the older of the stage and runtime observations.
  // A fresh HTTP response must never make an older source look freshly observed.
  const sourceObservedAtMs=work.observationAgeMs===null ? observedAtMs : Math.min(observedAtMs,nowMs-work.observationAgeMs)
  return Object.freeze({schemaVersion:1,observedAtMs:sourceObservedAtMs,work,runtime,executionState,completionAuthority:false,executionAuthority:false})
}
