import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CURRENT_PROJECTION_SOURCES, compileOutcomeCurrentProjection, outcomeCurrentProjectionInput, serializeOutcomeCurrentProjection } from '../server/outcome-current-projection.mjs'

if (process.argv.length !== 2) throw new Error('arguments_forbidden')
const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceBytes = Object.fromEntries(Object.entries(CURRENT_PROJECTION_SOURCES).map(([sourceClass, row]) => [sourceClass, readFileSync(resolve(repositoryRoot, row.source_ref))]))
const result = compileOutcomeCurrentProjection(outcomeCurrentProjectionInput(sourceBytes))
if (result.outcome !== 'current_projection') throw new Error(`${result.outcome}:${result.reason ?? 'unknown'}`)
writeFileSync(resolve(repositoryRoot, 'snapshot/outcome-model-v2-current.json'), serializeOutcomeCurrentProjection(result))
