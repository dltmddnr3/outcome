import {readFileSync} from 'node:fs'
import YAML from 'yaml'
import {parseDestinationDraft} from './outcome-destination-postgres.mjs'
import {parseDiscoveryContext,discoveryContextDigest} from './outcome-destination-discovery-repository.mjs'
import {validateDestinationQuestionReceipt} from './outcome-destination-question-receipt.mjs'

const fields=['problem','targetUser','outcome','scope','nonGoals','constraints','acceptance','failureRecovery']
const fail=()=>{throw Error('destination_package_unavailable')}
const canonical=value=>JSON.stringify(sort(value))
const sort=value=>Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value
// Pure source conversion, not a verifier or execution authority. The publisher
// must first obtain this snapshot from readConfirmedCreation's trusted proof.
export function renderConfirmedDestinationPackage({projectId,serializedSnapshot}={}){
 try{
  if(typeof projectId!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projectId)||projectId.length>100||typeof serializedSnapshot!=='string'||Buffer.byteLength(serializedSnapshot)>8388608)fail()
  const snapshot=JSON.parse(serializedSnapshot)
  if(snapshot?.schemaVersion!==1||snapshot.completionAuthority!==false||snapshot.executionAuthority!==false||!Number.isSafeInteger(snapshot.intakeRevision)||snapshot.intakeRevision<1)fail()
  const document=parseDestinationDraft(JSON.stringify(snapshot.document)),context=parseDiscoveryContext(JSON.stringify(snapshot.context))
  if(document.unknowns.length||context.unknowns.length||fields.some(key=>!document.answers[key])||context.askedQuestionIds.some(id=>!context.answers.some(answer=>answer.questionId===id))
   ||snapshot.contextRevision!==context.revision||snapshot.contextDigest!==discoveryContextDigest(context)
   ||canonical(document)!==canonical({schemaVersion:1,mode:context.mode,source:context.source,answers:context.seedAnswers,unknowns:context.unknowns}))fail()
  const {plan}=validateDestinationQuestionReceipt({serializedContext:JSON.stringify(context),serializedReceipt:JSON.stringify(snapshot.questionReceipt)})
  if(plan.state!=='coverage_ready_for_review'||plan.unresolvedDomains.length||plan.batch.length)fail()
  const a=document.answers,phaseId='confirmed-destination'
  const metadata={schemaVersion:1,projectId,projectName:a.outcome,outcome:a.outcome,acceptanceAuthority:'Cherry',phaseId}
  // Single-line JSON preserves multiline and Markdown-like source literally;
  // source text cannot inject contract fields, fences or checked Gate entries.
  const contract=`# Outcome Contract\n\nStatus: DESTINATION_CONFIRMED_IMPLEMENTATION_PENDING\n\n\`\`\`outcome-contract\n${JSON.stringify(metadata)}\n\`\`\`\n\n## 확인된 목적지 원문과 기존 답변\n\n\`\`\`destination-source\n${JSON.stringify({document,answers:context.answers,contextDigest:snapshot.contextDigest,intakeRevision:snapshot.intakeRevision,contextRevision:snapshot.contextRevision})}\n\`\`\`\n\n목적지 확인은 구현 완료·실행 권한·최종 수용이 아닙니다. 세부 실행 계획과 기존 담당 연결은 별도로 검증합니다.\n`
  const map={schema_version:1,project_id:projectId,title:a.outcome,project_title:a.outcome,project_purpose:a.outcome,phases:[{id:phaseId,title:a.outcome,purpose:a.outcome,scopes:[{id:'confirmed-scope',title:'확인된 범위',purpose:a.scope,included:[a.scope],excluded:[a.nonGoals],stages:[{id:'verify-destination',title:'확인된 완료 조건 검증',purpose:a.acceptance,depends_on:[],gates_file:'GATES.md',implementation_state:'not_started',test_state:'pending',evidence_closure_state:'pending',independent_qa_state:'pending',cherry_acceptance_state:'pending',release_state:'pending'}]}]}]}
  return {
   'OUTCOME_CONTRACT.md':contract,
   'OUTCOME_MAP.md':`# Outcome Map\n\nCompatibility input · initial confirmed scope, not an inferred delivery plan.\n\n\`\`\`yaml\n${YAML.stringify(map).trimEnd()}\n\`\`\`\n`,
   'GATES.md':`# Destination verification\n\nStage ID: verify-destination\n\n- [ ] G1: 확인된 완료 조건 충족\n  - EXPECT: ${JSON.stringify(a.acceptance)}\n  - EVIDENCE: pending\n\n이 Gate는 확인된 완료 조건 전체를 보존하는 초기 검증 경계입니다. 구현·검증·실사용 근거 및 Cherry 수용 전에는 닫지 않습니다.\n`,
   'OUTCOME_SESSIONS.md':readFileSync(new URL('../templates/OUTCOME_SESSIONS_RESULT_OWNED.md',import.meta.url),'utf8').replaceAll('<stable-project-id>',projectId),
  }
 }catch{fail()}
}
