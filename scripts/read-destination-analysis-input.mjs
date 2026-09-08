import {fileURLToPath} from 'node:url'
import {createDestinationInputStore} from '../server/outcome-destination-input-store.mjs'

export async function readDestinationAnalysisInput({reference,environment=process.env}={}) {
 try{
  if(environment.OUTCOME_DESTINATION_INPUT_READER_ENABLED!=='1')throw Error()
  const store=createDestinationInputStore({directory:environment.OUTCOME_DESTINATION_INPUT_DIRECTORY,scopeKey:environment.OUTCOME_DESTINATION_INPUT_SCOPE_SHA256})
  const input=await store.read(reference)
  return {schemaVersion:1,reference,...input}
 }catch{throw Error('destination_input_unavailable')}
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
 try{
  if(process.argv.length!==3)throw Error()
  const input=await readDestinationAnalysisInput({reference:process.argv[2]})
  // Intentional private data output to the configured same-owner Planner process.
  process.stdout.write(`${JSON.stringify(input)}\n`)
 }catch{
  process.stderr.write('destination_input_unavailable\n')
  process.exitCode=1
 }
}
