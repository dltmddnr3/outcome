import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {readDestinationProtectedBytes} from './run-destination-questions.mjs'
import {readDestinationHostedConfiguration} from '../server/outcome-destination-hosted-runtime.mjs'
import {createDestinationTransactionPort} from '../server/outcome-destination-runtime.mjs'
import {createDestinationConfirmationRepository} from '../server/outcome-destination-confirmation-repository.mjs'
import {createDestinationSourceVerifier} from '../server/outcome-destination-source-verifier.mjs'
import {createDestinationEvidencePublisher} from '../server/outcome-destination-evidence-publisher.mjs'

const hash=value=>createHash('sha256').update(value).digest('hex')
const fail=()=>{throw Error('evidence_unavailable')}
const emit=(write,state)=>{try{write(JSON.stringify({state,completionAuthority:false,executionAuthority:false})+'\n');return true}catch{return false}}

// Trusted host ports only. Check does not publish; publish is invoked at most
// once. Neither mode creates an assessment or interprets source as authority.
export async function runDestinationEvidenceOnce({mode,input,inspectionRepository,publisher,ready,signal,write=line=>process.stdout.write(line)}={}){
 let attempted=false
 try{
  if(!['--check','--publish-once'].includes(mode)||!signal||signal.aborted||await ready()!==true)fail()
  const inspected=await inspectionRepository.inspect(input)
  if(inspected.reviewDigest!==input.expectedReviewDigest||inspected.blockers.length)fail()
  const sources=JSON.parse(input.serializedSources)
  const verify=createDestinationSourceVerifier({readAssessment:async()=>input.assessment,readSource:async({ref})=>Object.hasOwn(sources,ref)?sources[ref]:null})
  await verify({...input,reviewDigest:inspected.reviewDigest,serializedSnapshot:inspected.serializedSnapshot})
  if(signal.aborted||await ready()!==true||signal.aborted)fail()
  if(mode==='--check')return emit(write,'CHECKED_NO_MUTATION')?0:70
  attempted=true
  const receipt=await publisher.publish(input)
  if(receipt?.state!=='evidence_recorded'||receipt.reviewDigest!==input.expectedReviewDigest||receipt.completionAuthority!==false||receipt.executionAuthority!==false)fail()
  return emit(write,'EVIDENCE_RECORDED')?0:70
 }catch{emit(write,attempted?'PUBLICATION_UNKNOWN':'PREFLIGHT_SAFE_HOLD');return 70}
}

// Existing process environment supplies the already configured database
// connection. No env file, secret file, policy, account or migration is created.
export async function runConfiguredDestinationEvidence({configPath,mode,signal,environment=process.env,write=line=>process.stdout.write(line)}={}){
 let pool
 try{
  if(!['--check','--publish-once'].includes(mode)||!signal)fail()
  const configBytes=await readDestinationProtectedBytes(configPath),config=JSON.parse(configBytes)
  const keys=['schemaVersion','purpose','candidatePin','expiresAt','workspaceId','accountRef','draftId','expectedReviewDigest','assessmentPath','assessmentSha256','sourcesPath','sourcesSha256']
  if(!config||Object.keys(config).sort().join(',')!==keys.sort().join(',')||config.schemaVersion!==1||config.purpose!=='destination_evidence_once'||!Number.isSafeInteger(config.expiresAt)||config.expiresAt<=Date.now())fail()
  if(!/^[a-f0-9]{40}$/.test(config.candidatePin)||!['expectedReviewDigest','assessmentSha256','sourcesSha256','accountRef'].every(key=>/^[a-f0-9]{64}$/.test(config[key]))||!/^[-a-z0-9]{1,128}$/.test(config.workspaceId)||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(config.draftId))fail()
  const assessmentBytes=await readDestinationProtectedBytes(config.assessmentPath),sourceBytes=await readDestinationProtectedBytes(config.sourcesPath)
  if(hash(assessmentBytes)!==config.assessmentSha256||hash(sourceBytes)!==config.sourcesSha256)fail()
  const cwd=fileURLToPath(new URL('..',import.meta.url))
  const git=args=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000}).trim()
  const ready=async()=>!signal.aborted&&config.expiresAt>Date.now()&&git(['rev-parse','HEAD'])===config.candidatePin&&!git(['status','--porcelain','--untracked-files=all','--','scripts','server','src/lib','package.json','package-lock.json'])&&hash(await readDestinationProtectedBytes(configPath))===hash(configBytes)&&hash(await readDestinationProtectedBytes(config.assessmentPath))===config.assessmentSha256&&hash(await readDestinationProtectedBytes(config.sourcesPath))===config.sourcesSha256
  if(!await ready()||!readDestinationHostedConfiguration(environment).enabled)fail()
  const {Pool}=await import('pg'),url=new URL(environment.OUTCOME_DESTINATION_DATABASE_URL);url.search=''
  pool=new Pool({connectionString:url.toString(),ssl:{ca:environment.OUTCOME_DESTINATION_DATABASE_CA_PEM,rejectUnauthorized:true},max:1,allowExitOnIdle:true,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:15000})
  pool.on('error',()=>{})
  const transact=createDestinationTransactionPort({pool})
  return await runDestinationEvidenceOnce({mode,signal,ready,write,input:{workspaceId:config.workspaceId,accountRef:config.accountRef,draftId:config.draftId,expectedReviewDigest:config.expectedReviewDigest,assessment:assessmentBytes.toString('utf8'),serializedSources:sourceBytes.toString('utf8')},inspectionRepository:createDestinationConfirmationRepository({transact}),publisher:createDestinationEvidencePublisher({transact})})
 }catch{emit(write,'CONFIG_SAFE_HOLD');return 70}finally{if(pool)try{await pool.end()}catch{}}
}

if(typeof process.argv[1]==='string'&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const controller=new AbortController(),stop=()=>controller.abort()
 process.once('SIGINT',stop);process.once('SIGTERM',stop)
 try{process.exitCode=await runConfiguredDestinationEvidence({mode:process.argv[2],configPath:process.argv.length===4?process.argv[3]:null,signal:controller.signal})}
 finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop)}
}
