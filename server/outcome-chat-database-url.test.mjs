import assert from 'node:assert/strict'
import test from 'node:test'
import { readOutcomeChatPoolerUrl, readOutcomeSupabaseProjectRef } from './outcome-chat-database-url.mjs'

const ref = 'abcdefghijklmnopqrst'
const valid = `postgresql://outcome_chat_runtime.${ref}:synthetic%40secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full`

test('accepts only the canonical shared transaction pooler URL shape', () => {
  assert.deepEqual(readOutcomeChatPoolerUrl(valid), { projectRef: ref })
  for (const value of [
    valid.replace('outcome_chat_runtime.', 'postgres.'),
    valid.replace('outcome_chat_runtime.', 'other.'),
    valid.replace(ref, 'ABCDEFGHIJKLMNOPQRST'),
    valid.replace(ref, `${ref}.extra`),
    valid.replace('.', '%2E'),
    valid.replace('aws-0-us-east-1.pooler.supabase.com', 'db.invalid'),
    valid.replace(':6543', ':5432'),
    valid.replace('/postgres', '/outcome'),
    valid.replace('?sslmode=verify-full', ''),
    `${valid}&extra=1`,
    valid.replace('verify-full', 'verify%2Dfull'),
  ]) assert.equal(readOutcomeChatPoolerUrl(value), null)
})

test('accepts only the exact canonical Supabase project origin', () => {
  for (const value of [`https://${ref}.supabase.co`, `https://${ref}.supabase.co/`]) assert.equal(readOutcomeSupabaseProjectRef(value), ref)
  for (const value of [`http://${ref}.supabase.co`, `https://user@${ref}.supabase.co`, `https://${ref}.extra.supabase.co`, `https://${ref.toUpperCase()}.supabase.co`, `https://${ref}.supabase.co/path`, `https://${ref}.supabase.co?x=1`, `https://${ref}.supabase.co#x`, `https://%61bcdefghijklmnopqrst.supabase.co`]) assert.equal(readOutcomeSupabaseProjectRef(value), null)
})
