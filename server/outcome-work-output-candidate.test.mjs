import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {verifyWorkOutputCandidate} from './outcome-work-output-candidate.mjs'

test('real Git output scope rejects reverted forbidden changes, merges, unrelated commits and QA candidate changes',()=>{
  const checkout=mkdtempSync(join(tmpdir(),'outcome-output-scope-'))
  const git=(args,input)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false',...args],{cwd:checkout,input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
  const write=(path,text)=>writeFileSync(join(checkout,path),text)
  const commit=message=>{git(['add','.']);git(['commit','-qm',message]);return git(['rev-parse','HEAD'])}
  try{
    git(['init','-q']);git(['config','user.name','OUTCOME Test']);git(['config','user.email','outcome-test.invalid'])
    write('allowed.txt','base');write('forbidden.txt','base')
    const sourceCommit=commit('base'),sourceTree=git(['rev-parse','HEAD^{tree}'])
    write('allowed.txt','approved');const allowed=commit('approved')
    const check=(outputCommit,extra={})=>verifyWorkOutputCandidate({checkout,sourceCommit,sourceTree,outputCommit,outputTree:git(['rev-parse',`${outputCommit}^{tree}`]),stage:'implementing',writePaths:['allowed.txt'],...extra})
    assert.equal(check(sourceCommit),true)
    assert.equal(check(allowed),true)
    assert.equal(check(allowed,{writePaths:[]}),false)
    assert.equal(check(allowed,{stage:'qa_verifying'}),false)
    assert.equal(check(allowed,{stage:'release_verifying'}),false)
    assert.equal(check(allowed,{outputTree:'0'.repeat(40)}),false)
    write('forbidden.txt','outside');commit('forbidden')
    write('forbidden.txt','base');const reverted=commit('hide forbidden net diff')
    assert.equal(git(['diff','--name-only',sourceCommit,reverted]),'allowed.txt')
    assert.equal(check(reverted),false)
    git(['checkout','-qb','test-side',sourceCommit]);write('forbidden.txt','side');const side=commit('side forbidden')
    git(['checkout','-qb','test-main',allowed]);git(['merge','--no-ff','-qm','merge forbidden',side])
    assert.equal(check(git(['rev-parse','HEAD'])),false)
    const unrelated=git(['commit-tree',sourceTree], 'unrelated\n')
    assert.equal(check(unrelated),false)
    git(['replace',unrelated,allowed])
    assert.equal(verifyWorkOutputCandidate({checkout,sourceCommit,sourceTree,outputCommit:unrelated,outputTree:git(['rev-parse',`${allowed}^{tree}`]),stage:'implementing',writePaths:['allowed.txt']}),false)
    assert.equal(check(sourceCommit,{writePaths:['../forbidden.txt']}),false)
  }finally{rmSync(checkout,{recursive:true,force:true})}
})
