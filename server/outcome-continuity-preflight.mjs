import { types } from 'node:util'

const SHA1 = /^[a-f0-9]{40}$/
const SHA256 = /^[a-f0-9]{64}$/
const PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const REMOTE_REF = /^refs\/remotes\/[A-Za-z0-9._/-]+$/
const ROLES = new Set(['planner', 'builder', 'ux_product_qa', 'release_audit'])
const STATUSES = new Set(['active', 'idle', 'stale', 'rotating', 'blocked'])
const REQUEST_KEYS = [
  'builderReceiptPath',
  'candidateRoot',
  'expectedAppSelfMatchCount',
  'expectedBindingStatus',
  'expectedBindingVersion',
  'expectedBuilderReceiptSha256',
  'expectedCandidateCommit',
  'expectedCandidateParent',
  'expectedCandidateTree',
  'expectedHistoryCount',
  'expectedProtectedSelfMatchCount',
  'expectedQaReceiptSha256',
  'expectedRegistryRevision',
  'expectedRegistrySchemaVersion',
  'expectedRemoteCommit',
  'expectedSharedHead',
  'expectedSharedIndexPath',
  'projectId',
  'qaReceiptPath',
  'registryPath',
  'remoteRef',
  'role',
  'sharedRoot',
].sort()
const ADAPTER_KEYS = [
  'hashReceipt',
  'readAppSelfMatchCount',
  'readCandidate',
  'readDoctor',
  'readProtectedSelfMatchCount',
  'readRegistryPublic',
  'readSharedRoot',
].sort()
const CANDIDATE_KEYS = ['cleanCount', 'commit', 'headKind', 'parent', 'remoteCommit', 'tree'].sort()
const SHARED_KEYS = ['dirtyEntryCount', 'dirtyFingerprint', 'head', 'indexPath'].sort()
const REGISTRY_KEYS = ['bindingVersion', 'historyCount', 'revision', 'role', 'schemaVersion', 'status'].sort()
const DOCTOR_KEYS = ['issuesCount', 'lockState', 'ok', 'revision', 'schemaVersion'].sort()

const fail = (reason) => ({ ready: false, reason, mutation_count: 0, automatic_retry_count: 0 })
const integer = (value) => Number.isSafeInteger(value) && value >= 0
const absolutePath = (value) => typeof value === 'string' && value.startsWith('/') && value.length <= 1024 && !/[\u0000-\u001f\u007f]/.test(value) && !value.split('/').includes('..')

function materialize(value, expectedKeys) {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const ownKeys = Reflect.ownKeys(descriptors)
    if (ownKeys.some((key) => typeof key !== 'string') || ownKeys.sort().join(',') !== expectedKeys.join(',') || Object.values(descriptors).some((descriptor) => !Object.hasOwn(descriptor, 'value'))) return null
    return Object.fromEntries(expectedKeys.map((key) => [key, descriptors[key].value]))
  } catch {
    return null
  }
}

function materializeRequest(input) {
  const request = materialize(input, REQUEST_KEYS)
  if (!request) return null
  if (![request.candidateRoot, request.sharedRoot, request.expectedSharedIndexPath, request.builderReceiptPath, request.qaReceiptPath, request.registryPath].every(absolutePath)) return null
  if (typeof request.remoteRef !== 'string' || request.remoteRef.length > 256 || !REMOTE_REF.test(request.remoteRef) || request.remoteRef.split('/').some((segment) => !segment || segment === '.' || segment === '..')) return null
  if (![request.expectedCandidateCommit, request.expectedCandidateTree, request.expectedCandidateParent, request.expectedRemoteCommit, request.expectedSharedHead].every((value) => typeof value === 'string' && SHA1.test(value))) return null
  if (![request.expectedBuilderReceiptSha256, request.expectedQaReceiptSha256].every((value) => typeof value === 'string' && SHA256.test(value))) return null
  if (typeof request.projectId !== 'string' || !PROJECT_ID.test(request.projectId) || !ROLES.has(request.role)) return null
  if (![request.expectedRegistrySchemaVersion, request.expectedRegistryRevision, request.expectedBindingVersion, request.expectedHistoryCount, request.expectedProtectedSelfMatchCount].every(integer)) return null
  if (request.expectedRegistrySchemaVersion < 1 || request.expectedBindingVersion < 1 || request.expectedHistoryCount < 1) return null
  if (request.expectedAppSelfMatchCount !== 1 || request.expectedBindingStatus !== 'active') return null
  return request
}

function materializeAdapters(input) {
  const adapters = materialize(input, ADAPTER_KEYS)
  if (!adapters || Object.values(adapters).some((value) => typeof value !== 'function')) return null
  return adapters
}

export function verifyOutcomeContinuityPreflight(input, injectedAdapters) {
  const request = materializeRequest(input)
  if (!request) return fail('invalid_request')
  const adapters = materializeAdapters(injectedAdapters)
  if (!adapters) return fail('invalid_adapters')

  let candidateValue
  try {
    candidateValue = adapters.readCandidate(request.candidateRoot, request.remoteRef)
  } catch {
    return fail('candidate_read_unavailable')
  }
  const candidate = materialize(candidateValue, CANDIDATE_KEYS)
  if (!candidate || !SHA1.test(candidate.commit) || !SHA1.test(candidate.tree) || !SHA1.test(candidate.parent) || !SHA1.test(candidate.remoteCommit) || !integer(candidate.cleanCount) || !['detached', 'branch'].includes(candidate.headKind)) return fail('candidate_carrier_invalid')
  if (candidate.commit !== request.expectedCandidateCommit) return fail('candidate_commit_mismatch')
  if (candidate.tree !== request.expectedCandidateTree) return fail('candidate_tree_mismatch')
  if (candidate.parent !== request.expectedCandidateParent) return fail('candidate_parent_mismatch')
  if (candidate.cleanCount !== 0) return fail('candidate_not_clean')
  if (candidate.remoteCommit !== request.expectedRemoteCommit) return fail('remote_ref_mismatch')

  let sharedValue
  try {
    sharedValue = adapters.readSharedRoot(request.sharedRoot)
  } catch {
    return fail('shared_root_read_unavailable')
  }
  const shared = materialize(sharedValue, SHARED_KEYS)
  if (!shared || !SHA1.test(shared.head) || !absolutePath(shared.indexPath) || !integer(shared.dirtyEntryCount) || !(shared.dirtyFingerprint === null || typeof shared.dirtyFingerprint === 'string' && SHA256.test(shared.dirtyFingerprint))) return fail('shared_root_carrier_invalid')
  if (shared.head !== request.expectedSharedHead) return fail('shared_root_head_mismatch')
  if (shared.indexPath !== request.expectedSharedIndexPath) return fail('shared_root_index_mismatch')

  let builderHash
  try {
    builderHash = adapters.hashReceipt(request.builderReceiptPath)
  } catch {
    return fail('builder_receipt_read_unavailable')
  }
  if (typeof builderHash !== 'string' || !SHA256.test(builderHash)) return fail('builder_receipt_carrier_invalid')
  if (builderHash !== request.expectedBuilderReceiptSha256) return fail('builder_receipt_hash_mismatch')

  let qaHash
  try {
    qaHash = adapters.hashReceipt(request.qaReceiptPath)
  } catch {
    return fail('qa_receipt_read_unavailable')
  }
  if (typeof qaHash !== 'string' || !SHA256.test(qaHash)) return fail('qa_receipt_carrier_invalid')
  if (qaHash !== request.expectedQaReceiptSha256) return fail('qa_receipt_hash_mismatch')

  let appCount
  try {
    appCount = adapters.readAppSelfMatchCount()
  } catch {
    return fail('app_inventory_read_unavailable')
  }
  if (!integer(appCount)) return fail('app_inventory_carrier_invalid')
  if (appCount !== request.expectedAppSelfMatchCount) return fail('app_inventory_self_match_mismatch')

  let registryValue
  try {
    registryValue = adapters.readRegistryPublic(request.registryPath, request.projectId, request.role)
  } catch {
    return fail('registry_read_unavailable')
  }
  if (registryValue === null || registryValue === undefined) return fail('registry_carrier_missing')
  const registry = materialize(registryValue, REGISTRY_KEYS)
  if (!registry || !integer(registry.schemaVersion) || !integer(registry.revision) || !ROLES.has(registry.role) || !integer(registry.bindingVersion) || !integer(registry.historyCount) || !STATUSES.has(registry.status)) return fail('registry_carrier_invalid')
  if (registry.schemaVersion !== request.expectedRegistrySchemaVersion) return fail('registry_schema_mismatch')
  if (registry.revision !== request.expectedRegistryRevision) return fail('registry_revision_mismatch')
  if (registry.role !== request.role) return fail('registry_role_mismatch')
  if (registry.bindingVersion !== request.expectedBindingVersion) return fail('registry_binding_version_mismatch')
  if (registry.historyCount !== request.expectedHistoryCount) return fail('registry_history_count_mismatch')
  if (registry.status !== request.expectedBindingStatus) return fail('registry_status_mismatch')

  let doctorValue
  try {
    doctorValue = adapters.readDoctor(request.registryPath, request.projectId)
  } catch {
    return fail('doctor_read_unavailable')
  }
  const doctor = materialize(doctorValue, DOCTOR_KEYS)
  if (!doctor || typeof doctor.ok !== 'boolean' || !integer(doctor.schemaVersion) || !integer(doctor.revision) || !integer(doctor.issuesCount) || typeof doctor.lockState !== 'string') return fail('doctor_carrier_invalid')
  if (!doctor.ok) return fail('doctor_not_clean')
  if (doctor.schemaVersion !== request.expectedRegistrySchemaVersion) return fail('doctor_schema_mismatch')
  if (doctor.revision !== request.expectedRegistryRevision) return fail('doctor_revision_mismatch')
  if (doctor.issuesCount !== 0) return fail('doctor_issues_present')
  if (doctor.lockState !== 'clear') return fail('registry_lock_not_clear')

  let selfMatchCount
  try {
    selfMatchCount = adapters.readProtectedSelfMatchCount()
  } catch {
    return fail('protected_self_match_read_unavailable')
  }
  if (!integer(selfMatchCount)) return fail('protected_self_match_carrier_invalid')
  if (selfMatchCount !== request.expectedProtectedSelfMatchCount) return fail('protected_self_match_mismatch')

  return {
    ready: true,
    status: 'continuity_ready',
    candidate: { commit: candidate.commit, tree: candidate.tree, parent: candidate.parent, remote_commit: candidate.remoteCommit, clean_count: candidate.cleanCount, head_kind: candidate.headKind },
    shared_dirty_entry_count: shared.dirtyEntryCount,
    receipt_match_count: 2,
    app_self_match_count: appCount,
    registry: { schema_version: registry.schemaVersion, revision: registry.revision, role: registry.role, binding_version: registry.bindingVersion, history_count: registry.historyCount, status: registry.status },
    doctor: { ok: doctor.ok, issues_count: doctor.issuesCount, lock_state: doctor.lockState },
    protected_self_match_count: selfMatchCount,
    mutation_count: 0,
    automatic_retry_count: 0,
  }
}
