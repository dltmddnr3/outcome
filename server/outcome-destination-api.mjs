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
 const match=/^\/api\/private\/destination\/drafts\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.exec(pathname)
 if(!match)return result(404,'not_found')
 if(!['GET','PUT'].includes(method))return result(405,'method_not_allowed')
 if(!token||!identityService)return result(401,'authentication_required')
 let authority
 try{await identityService.authenticate(token);authority=await identityService.resolveBridgeAuthority({token})}catch{return result(403,'destination_access_denied')}
 if(!authority?.workspace_id||!authority?.account_ref||!authority?.project_ids?.includes('outcome'))return result(403,'destination_access_denied')
 if(!runtime?.repository||typeof runtime.repository.load!=='function'||typeof runtime.repository.save!=='function')return result(503,'destination_unavailable')
 const scope={workspaceId:authority.workspace_id,accountRef:authority.account_ref,draftId:match[1]}
 if(method==='PUT'){
  if(headers['content-type']!=='application/json')return result(415,'content_type_invalid')
  if(!equal(headers.origin,runtime.allowedOrigin)||!runtime.allowedOrigin)return result(403,'origin_forbidden')
  if(!runtime.csrfSecret||!equal(headers['x-outcome-csrf'],runtime.csrfSecret))return result(403,'csrf_invalid')
 }
 try{
  if(method==='GET')return {status:200,body:{draft:await runtime.repository.load(scope),completionAuthority:false}}
  if(typeof body!=='string'||Buffer.byteLength(body)>262144)return result(400,'invalid_request')
  let parsed;try{parsed=JSON.parse(body)}catch{return result(400,'invalid_request')}
  const input=data(parsed,['requestId','expectedRevision','document'])
  if(!input)return result(400,'invalid_request')
  const draft=await runtime.repository.save({...scope,...input})
  return {status:200,body:{draft,completionAuthority:false}}
 }catch(error){
  const code=errorCode(error)
  if(['destination_revision_conflict','destination_request_conflict'].includes(code))return result(409,code)
  if(code==='destination_invalid')return result(400,'invalid_request')
  return result(503,'destination_unavailable')
 }
}
