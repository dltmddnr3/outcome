import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function assertAutoDetectedNodeRuntime(config) {
  const configured = Object.values(config.functions ?? {}).find((value) => value && typeof value === 'object' && Object.hasOwn(value, 'runtime'))
  assert.equal(configured, undefined, 'official Node.js functions must use Vercel runtime auto-detection; remove functions.*.runtime')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assertAutoDetectedNodeRuntime(config)
  console.log('Vercel config PASS: Node.js function runtime uses platform auto-detection')
}
