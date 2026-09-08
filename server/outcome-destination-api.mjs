import {types} from 'node:util'
import {timingSafeEqual} from 'node:crypto'
const result=(status,error)=>({status,body:{error}})
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))
const data=(value,keys)=>{
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)return null
 const fields=Object.getOwnPropertyDescriptors(value)
 if(Reflect.ownKeys(value).length!==keys.length||keys.some(key=>!fields[key]?.enumerable||!Object.hasOwn(fields[key],'value')))return null
 return Object.fromEntries(keys.map(key=>[key,fields[key].value]))
}
const errorCode=error=>{
 if(!error||typeof error!=='object'||types.isProxy(error))return null
 return Object.getOwnPropertyDescriptor(error,'message')?.value
}
export async function handleDestinationDraftRequest({method='GET',pathname='',token,identityService,runtime,headers={},body}={}){
 const match=/^\/api\/private\/destination\/(drafts|analysis|discovery|questions|question-requests|review|confirmation-review|confirmations)\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.exec(pathname)
 if(!match)return result(404,'not_found')
 const confirmation=match[1]==='confirmations',confirmationReview=match[1]==='confirmation-review'
 const analysis=match[1]==='analysis',discovery=match[1]==='discovery',questions=match[1]==='questions',questionRequest=match[1]==='question-requests',writeMethod=analysis||questionRequest||confirmation?'POST':'PUT'
 const review=match[1]==='review'
 if((questions||review||confirmationReview)&&method!=='GET')return result(405,'method_not_allowed')
 if(!['GET',writeMethod].includes(method))return result(405,'method_not_allowed')
 if(!token||!identityService)return result(401,'authentication_required')
 let authority
 try{await identityService.authenticate(token);authority=await identityService.resolveBridgeAuthority({token})}catch{return result(403,'destination_access_denied')}
 if(!authority?.workspace_id||!authority?.account_ref||!authority?.project_ids?.includes('outcome'))return result(403,'destination_access_denied')
 const repository=confirmation||confirmationReview?runtime?.confirmationRepository:analysis?runtime?.analysisRepository:questionRequest?runtime?.questionRequests:questions||review?runtime?.questionRepository:discovery?runtime?.discoveryRepository:runtime?.repository
 if(!repository||typeof repository.load!=='function'||(review||confirmationReview)&&typeof repository.review!=='function'||!questions&&!review&&!confirmationReview&&typeof repository[confirmation?'confirm':analysis||questionRequest?'enqueue':'save']!=='function')return result(503,'destination_unavailable')
 const scope={workspaceId:authority.workspace_id,accountRef:authority.account_ref,[analysis?'requestId':'draftId']:match[2]}
 if(method===writeMethod){
  if(headers['content-type']!=='application/json')return result(415,'content_type_invalid')
  if(!equal(headers.origin,runtime.allowedOrigin)||!runtime.allowedOrigin)return result(403,'origin_forbidden')
  if(!runtime.csrfSecret||!equal(headers['x-outcome-csrf'],runtime.csrfSecret))return result(403,'csrf_invalid')
 }
 try{
  if(review)return {status:200,body:{review:await repository.review(scope),completionAuthority:false}}
  if(confirmationReview)return {status:200,body:{confirmationReview:await repository.review(scope),completionAuthority:false}}
  const field=confirmation?'confirmation':analysis?'analysis':questionRequest?'questionRequest':questions?'questions':discovery?'discovery':'draft'
  if(questionRequest&&method==='GET'){
   const current=await runtime.discoveryRepository.load(scope)
   return {status:200,body:{questionRequest:current?await repository.load({...scope,contextDigest:current.contextDigest}):null,completionAuthority:false}}
  }
  if(method==='GET')return {status:200,body:{[field]:await repository.load(scope),completionAuthority:false}}
  if(typeof body!=='string'||Buffer.byteLength(body)>(analysis||questionRequest||confirmation?4096:discovery?4194304:262144))return result(400,'invalid_request')
  let parsed;try{parsed=JSON.parse(body)}catch{return result(400,'invalid_request')}
  const input=data(parsed,confirmation?['requestId','reviewDigest','confirmed']:analysis?['draftId','draftRevision','documentDigest']:questionRequest?['contextDigest']:discovery?['requestId','expectedRevision','intakeRevision','context']:['requestId','expectedRevision','document'])
  if(!input)return result(400,'invalid_request')
  if(confirmation&&(input.confirmed!==true||typeof input.requestId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(input.requestId)||typeof input.reviewDigest!=='string'||!/^[a-f0-9]{64}$/.test(input.reviewDigest)))return result(400,'invalid_request')
  if(questionRequest&&(typeof input.contextDigest!=='string'||!/^[a-f0-9]{64}$/.test(input.contextDigest)))return result(400,'invalid_request')
  const value=await repository[confirmation?'confirm':analysis||questionRequest?'enqueue':'save']({...scope,...input})
  return {status:analysis||questionRequest||confirmation?202:200,body:{[field]:value,completionAuthority:false}}
 }catch(error){
  const code=errorCode(error)
  if(['destination_revision_conflict','destination_request_conflict','discovery_revision_conflict','discovery_request_conflict','discovery_intake_stale'].includes(code))return result(409,code)
  if(['destination_invalid','discovery_invalid'].includes(code))return result(400,'invalid_request')
  return result(503,'destination_unavailable')
 }
}
