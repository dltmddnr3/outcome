import { AccountAccessError, accountAccessPublicContract } from './account-access.mjs'

const response = (status, body) => ({ status, body })
export const privateAccessPublicConfig = (enabled) => ({
  enabled,
  access: accountAccessPublicContract.access,
  providers: accountAccessPublicContract.providers,
  sessionMaximumDays: accountAccessPublicContract.sessionMaximumDays,
  completionAuthority: false,
})

export async function handlePrivateAccessRequest({ method = 'GET', pathname = '/', token, service } = {}) {
  if (method !== 'GET') return response(405, { error: 'read_only' })
  if (pathname === '/api/private/config') return response(200, privateAccessPublicConfig(Boolean(service)))
  if (pathname !== '/api/private/workspace') return response(404, { error: 'not_found' })
  if (!service) return response(401, { error: 'authentication_required' })
  try {
    return response(200, { workspace: await service.readWorkspace({ token }) })
  } catch (error) {
    if (error instanceof AccountAccessError) return response(error.status, { error: error.code })
    return response(503, { error: 'private_workspace_unavailable' })
  }
}
