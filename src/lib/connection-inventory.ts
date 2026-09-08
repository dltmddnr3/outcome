export const connectionLabels = { workspace_api: '프로젝트 접근', execution_observer: '작업 관측', mcp: 'MCP 도구', provider_api: '외부 서비스 API', cli: '로컬 실행 도구', environment: '실행 환경', deployment: '배포 상태' } as const
type ConnectionId = keyof typeof connectionLabels
export type ConnectionEntry = { id: ConnectionId; state: 'access_verified' | 'source_observed' | 'stale' | 'not_observed'; observedAtMs: number | null }
export type ConnectionInventory = { schemaVersion: 1; projectId: string; checkedAtMs: number; entries: ConnectionEntry[]; completionAuthority: false; executionAuthority: false }
const exact = (value: unknown, keys: string): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys
export function parseConnectionInventory(value: unknown, projectId: string): ConnectionInventory | null {
 try {
  if (!['outcome', 'cherry-note'].includes(projectId) || !exact(value, 'checkedAtMs,completionAuthority,entries,executionAuthority,projectId,schemaVersion') || value.schemaVersion !== 1 || value.projectId !== projectId || value.completionAuthority !== false || value.executionAuthority !== false || !Number.isSafeInteger(value.checkedAtMs) || (value.checkedAtMs as number) < 0 || (value.checkedAtMs as number) > 8640000000000000 || !Array.isArray(value.entries) || value.entries.length !== 7) return null
  const ids = Object.keys(connectionLabels)
  for (const [index, entry] of value.entries.entries()) {
   if (!exact(entry, 'id,observedAtMs,state') || entry.id !== ids[index]) return null
   const states = index === 0 ? ['access_verified'] : index === 1 ? ['source_observed', 'stale', 'not_observed'] : ['not_observed']
   if (!states.includes(entry.state as string)) return null
   if (entry.state === 'not_observed' ? entry.observedAtMs !== null : !Number.isSafeInteger(entry.observedAtMs) || (entry.observedAtMs as number) < 0 || (entry.observedAtMs as number) > (value.checkedAtMs as number)) return null
  }
  return value as ConnectionInventory
 } catch { return null }
}
