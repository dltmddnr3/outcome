import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const baseline = process.argv[2]
assert.match(baseline ?? '', /^[a-f0-9]{40}$/, 'exact baseline commit required')
const before = JSON.parse(execFileSync('git', ['show', `${baseline}:snapshot/outcome-package-source.json`], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }))
const after = JSON.parse(readFileSync('snapshot/outcome-package-source.json', 'utf8'))
const select = (snapshot) => {
  const matches = snapshot.projects.filter(project => project.project.id === 'outcome')
  assert.equal(matches.length, 1)
  return matches[0]
}
const old = select(before), current = select(after)
const historical = project => project.phases.filter(phase => phase.id !== 'outcome-phase-5')
assert.deepEqual(historical(current), historical(old), 'historical phases must preserve every field, including observation times')
const pilot = project => project.phases.flatMap(phase => phase.scopes).flatMap(scope => scope.stages).find(stage => stage.id === 'outcome-milestone-model-v2-pilot')
assert.ok(pilot(old))
assert.deepEqual(pilot(current), pilot(old))
assert.equal(current.observedAt, old.observedAt)
assert.deepEqual(current.sourceFreshness, old.sourceFreshness)
assert.deepEqual(after.projects.filter(project => project.project.id !== 'outcome'), before.projects.filter(project => project.project.id !== 'outcome'))
assert.equal(current.resultView.completion_authority, false)
console.log('source recovery history PASS: all non-Phase5 fields, historical pilot, project source time and unrelated projects preserved')
