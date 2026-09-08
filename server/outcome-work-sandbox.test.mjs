import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtempSync,realpathSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createServer} from 'node:net'

// Native feasibility proof only, not the final production execution profile.
// All writes target test-owned files. Other platforms must not infer support.
test('native local sandbox restricts writes to an explicit task-owned path',{skip:process.platform!=='darwin'},()=>{
  const root=realpathSync(mkdtempSync(join(tmpdir(),'outcome-sandbox-proof-')))
  const allowed=join(root,'allowed'),outside=join(root,'outside')
  mkdirSync(allowed);writeFileSync(outside,'preserve')
  try{
    const profile=`(version 1)(allow default)(deny network*)(deny file-write*)(allow file-write* (subpath ${JSON.stringify(allowed)}))`
    const code=`const fs=require('node:fs');let denied=false;fs.writeFileSync(process.argv[1],'allowed');try{fs.writeFileSync(process.argv[2],'changed')}catch(e){denied=['EPERM','EACCES'].includes(e.code)}process.stdout.write(JSON.stringify({denied}))`
    const result=spawnSync('/usr/bin/sandbox-exec',['-p',profile,process.execPath,'-e',code,join(allowed,'result'),outside],{encoding:'utf8',timeout:5000,env:{PATH:'/usr/bin:/bin'},maxBuffer:4096})
    assert.equal(result.status,0)
    assert.deepEqual(JSON.parse(result.stdout),{denied:true})
    assert.equal(readFileSync(outside,'utf8'),'preserve')
    assert.equal(readFileSync(join(allowed,'result'),'utf8'),'allowed')
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('native sandbox denies TCP access to a listening local test server',{skip:process.platform!=='darwin'},async()=>{
  const server=createServer(socket=>socket.destroy())
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
  try{
    const code=`const socket=require('node:net').connect({host:'127.0.0.1',port:Number(process.argv[1])});socket.setTimeout(1000,()=>{socket.destroy();process.exitCode=2});socket.on('connect',()=>{socket.destroy();process.exitCode=3});socket.on('error',e=>process.stdout.write(JSON.stringify({denied:['EPERM','EACCES'].includes(e.code)})))`
    const result=spawnSync('/usr/bin/sandbox-exec',['-p','(version 1)(allow default)(deny network*)(deny file-write*)',process.execPath,'-e',code,String(server.address().port)],{encoding:'utf8',timeout:5000,env:{PATH:'/usr/bin:/bin'},maxBuffer:4096})
    assert.equal(result.status,0);assert.deepEqual(JSON.parse(result.stdout),{denied:true})
  }finally{await new Promise(resolve=>server.close(resolve))}
})
