const PROJECT_REF = /^[a-z]{20}$/
const POOLER_HOST = /^aws-0-[a-z0-9]+(?:-[a-z0-9]+)*\.pooler\.supabase\.com$/

export function readOutcomeChatPoolerUrl(databaseUrl) {
  if (typeof databaseUrl !== 'string') return null
  const match = /^postgresql:\/\/outcome_chat_runtime\.([a-z]{20}):([^@/?#]+)@(aws-0-[a-z0-9]+(?:-[a-z0-9]+)*\.pooler\.supabase\.com):6543\/postgres\?sslmode=verify-full$/.exec(databaseUrl)
  if (!match) return null
  try {
    const url = new URL(databaseUrl)
    if (url.protocol !== 'postgresql:' || url.username !== `outcome_chat_runtime.${match[1]}` || decodeURIComponent(url.username) !== url.username || decodeURIComponent(url.password).length === 0 || url.hostname !== match[3] || !POOLER_HOST.test(url.hostname) || url.port !== '6543' || url.pathname !== '/postgres' || url.search !== '?sslmode=verify-full' || url.searchParams.size !== 1 || url.hash !== '') return null
    return Object.freeze({ projectRef: match[1] })
  } catch { return null }
}

export function readOutcomeSupabaseProjectRef(supabaseUrl) {
  if (typeof supabaseUrl !== 'string') return null
  const match = /^https:\/\/([a-z]{20})\.supabase\.co\/?$/.exec(supabaseUrl)
  if (!match || !PROJECT_REF.test(match[1])) return null
  try {
    const url = new URL(supabaseUrl)
    return url.username === '' && url.password === '' && url.hostname === `${match[1]}.supabase.co` && url.port === '' && url.pathname === '/' && url.search === '' && url.hash === '' ? match[1] : null
  } catch { return null }
}
