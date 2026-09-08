const result = outcome => Object.freeze({outcome,completionAuthority:false,executionAuthority:false})
const hash=(value,length)=>typeof value==='string'&&new RegExp(`^[a-f0-9]{${length}}$`).test(value)

// All ports are trusted local composition, never supplied by an HTTP caller.
// verifyEligibility must actually verify authority, dependencies, immutable
// evidence and current owner binding; a stored reference or observer label is insufficient.
export function createWorkContinuationController({enabled=false,journal,verifyEligibility,dispatch,now=Date.now,timeoutMs=5000}={}) {
  const invoke=async(port,input)=>{
    const abort=new AbortController();let timer
    try{return await Promise.race([
      Promise.resolve().then(()=>port(input,{signal:abort.signal})),
      new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(new Error('port_timeout'))},timeoutMs)}),
    ])}finally{clearTimeout(timer)}
  }
  return Object.freeze({
    async runOnce(inputJson){
      if(enabled!==true) return result('disabled')
      if(!journal||typeof verifyEligibility!=='function'||typeof dispatch!=='function'||typeof now!=='function'
        ||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000) return result('configuration_hold')
      let input,reservationDigest,dispatchStarted=false,resultWriteAttempted=false
      try {
        if(typeof inputJson!=='string'||Buffer.byteLength(inputJson)>4096) return result('input_invalid')
        input=JSON.parse(inputJson)
        const keys=['scopeJson','expectedSequence','candidateCommit','candidateTree','authorityRef','action']
        if(!input||Array.isArray(input)||Object.keys(input).length!==keys.length||!keys.every(key=>Object.hasOwn(input,key))
          ||typeof input.scopeJson!=='string'||!Number.isSafeInteger(input.expectedSequence)||input.expectedSequence<1
          ||!hash(input.candidateCommit,40)||!hash(input.candidateTree,40)||!hash(input.authorityRef,64)
          ||!['implementing','qa_verifying','release_verifying','awaiting_owner'].includes(input.action)) return result('input_invalid')
        Object.freeze(input)
        const current=journal.read(input.scopeJson,now())
        if(current.sequence!==input.expectedSequence||current.projection.continuation!=='next_action_recorded'||current.projection.nextAction!==input.action) return result('source_hold')
        if(input.action==='awaiting_owner') return result('needs_owner')
        if(await invoke(verifyEligibility,input)!==true) return result('authority_hold')
        const reserved=journal.reserveContinuation(input.scopeJson,input.expectedSequence,input.candidateCommit,input.candidateTree,input.authorityRef,now())
        reservationDigest=reserved.reservationDigest
        if(reserved.outcome==='already_reserved') {
          // Recover only a durable result for this exact reservation. Receipt
          // acknowledgement is not execution start, and uncertain starts never replay.
          const saved=journal.readContinuationDispatch(input.scopeJson,reservationDigest,now())
          if(saved.state==='acknowledged' && hash(saved.receiptDigest,64)) return result('acknowledged')
          if(saved.state==='delivery_unknown' && saved.receiptDigest===null) return result('delivery_unknown')
          return result('reconciliation_required')
        }
        if(reserved.outcome!=='reserved') return result('reconciliation_required')
        // No automatic reuse if eligibility changed while the reservation was made.
        if(await invoke(verifyEligibility,input)!==true) return result('pre_dispatch_hold')
        const begun=journal.beginContinuationDispatch(input.scopeJson,input.expectedSequence,reservationDigest,now())
        if(begun.outcome!=='dispatch_started') return result('reconciliation_required')
        dispatchStarted=true
        const raw=await invoke(dispatch,Object.freeze({...input,reservationDigest}))
        let receipt
        if(typeof raw==='string'&&Buffer.byteLength(raw)<=512) {try{receipt=JSON.parse(raw)}catch{}}
        const acknowledged=receipt && Object.keys(receipt).sort().join(',')==='delivery,sourceDigest'
          && receipt.delivery==='acknowledged' && hash(receipt.sourceDigest,64)
        const state=acknowledged?'acknowledged':'delivery_unknown'
        resultWriteAttempted=true
        journal.recordContinuationResult(input.scopeJson,reservationDigest,state,acknowledged?receipt.sourceDigest:null,now())
        const confirmed=journal.readContinuationDispatch(input.scopeJson,reservationDigest,now())
        if(confirmed.state!==state||confirmed.receiptDigest!==(acknowledged?receipt.sourceDigest:null)) throw new Error('result_readback_unavailable')
        return result(state)
      } catch {
        if(dispatchStarted) {
          if(!resultWriteAttempted) try{journal.recordContinuationResult(input.scopeJson,reservationDigest,'delivery_unknown',null,now())}catch{}
          return result('delivery_unknown')
        }
        return result(reservationDigest?'reconciliation_required':'safe_hold')
      }
    },
  })
}
