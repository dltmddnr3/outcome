import {execFileSync} from 'node:child_process'
import {isAbsolute} from 'node:path'

const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value)
// Trusted local checkout and an already-verified grant only. This checks Git
// output ancestry/scope, not runtime sandboxing, test success or acceptance.
export function verifyWorkOutputCandidate({checkout,sourceCommit,sourceTree,outputCommit,outputTree,stage,writePaths}={}){
  try{
    if(typeof checkout!=='string'||!isAbsolute(checkout)||![sourceCommit,sourceTree,outputCommit,outputTree].every(sha)
      ||!['implementing','qa_verifying','release_verifying'].includes(stage)
      ||!Array.isArray(writePaths)||writePaths.length>128||!writePaths.every(path=>typeof path==='string'&&/^[a-zA-Z0-9_-][a-zA-Z0-9_./-]*$/.test(path)&&path.split('/').every(part=>part&&!part.startsWith('.'))))return false
    const git=args=>execFileSync('git',args,{cwd:checkout,encoding:'utf8',timeout:5000,maxBuffer:1024*1024,stdio:['ignore','pipe','ignore']}).trim()
    if(git(['cat-file','-t',sourceCommit])!=='commit'||git(['cat-file','-t',outputCommit])!=='commit')return false
    if(git(['rev-parse',`${sourceCommit}^{tree}`])!==sourceTree||git(['rev-parse',`${outputCommit}^{tree}`])!==outputTree)return false
    if(sourceCommit===outputCommit)return true
    if(stage!=='implementing')return false
    git(['merge-base','--is-ancestor',sourceCommit,outputCommit])
    const paths=[...git(['log','--format=','--name-only','--no-renames','--diff-merges=first-parent',`${sourceCommit}..${outputCommit}`]).split('\n'),
      ...git(['diff','--name-only','--no-renames',sourceCommit,outputCommit]).split('\n')].filter(Boolean)
    return paths.every(path=>writePaths.includes(path))
  }catch{return false}
}
