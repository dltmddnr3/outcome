const requiredGithubLabels = ['로컬 후보', 'GitHub 게시', '자동 검사', '출시', '완료 판정 권한 없음']
const stage33Expected = [['Y', '링크 미리보기'], ['L', '아이보리 표면·머티리얼'], ['B', '브랜드 아이덴티티'], ['M', '더보기 화면'], ['N', '새 폴더'], ['E', '새 일정 입력'], ['A', '폴더 보관'], ['D', '폴더 하위 트리 복구 삭제'], ['G', '엔지니어링 완료 증거']]

async function assertKeyboardContract(page, name) {
  const options = page.locator('.oc-stage-list [role="option"]')
  const count = await options.count()
  const currentSignature = await page.locator('.oc-dashboard').evaluate((root) => `${root.dataset.currentStageId}|${root.querySelector('.oc-hero-orientation strong')?.textContent}|${root.querySelector('.oc-hero-gate')?.dataset.currentGateSignature}`)
  await page.locator('.oc-stage-list [role="option"][aria-selected="true"]').focus()
  for (const [key, index] of [['End', count - 1], ['Home', 0], ['ArrowDown', 1], ['ArrowUp', 0]]) {
    await page.keyboard.press(key)
    const target = options.nth(index)
    await page.waitForFunction((stageId) => { const option = document.querySelector(`[role="option"][data-stage-id="${stageId}"]`); return option?.getAttribute('aria-selected') === 'true' && option === document.activeElement }, await target.getAttribute('data-stage-id'))
    const after = await page.locator('.oc-dashboard').evaluate((root) => `${root.dataset.currentStageId}|${root.querySelector('.oc-hero-orientation strong')?.textContent}|${root.querySelector('.oc-hero-gate')?.dataset.currentGateSignature}`)
    if (after !== currentSignature) throw new Error(`${name}: ${key} changed current truth`)
  }
  const focus = await options.first().evaluate((element) => {
    const style = getComputedStyle(element)
    const rgb = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null
    const luminance = (channels) => channels.reduce((sum, channel, index) => { const value = channel / 255; const linear = value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; return sum + linear * [.2126, .7152, .0722][index] }, 0)
    const foreground = rgb(style.outlineColor); const background = rgb(style.backgroundColor)
    const contrast = foreground && background ? (Math.max(luminance(foreground), luminance(background)) + .05) / (Math.min(luminance(foreground), luminance(background)) + .05) : 0
    return { width: Number.parseFloat(style.outlineWidth), outline: style.outlineStyle, contrast }
  })
  if (focus.width < 3 || focus.outline === 'none' || focus.contrast < 3) throw new Error(`${name}: focus failed ${JSON.stringify(focus)}`)
  await page.locator('.oc-stage-list [role="option"][aria-current="step"]').click()
  return focus.contrast
}

async function assertStage33PackageProjection(page) {
  const groups = await page.evaluate(() => [...document.querySelectorAll('.oc-groups article')].map((group) => ({ label: group.querySelector('strong')?.textContent?.trim(), code: group.querySelector('small')?.textContent?.replace('코드 ', '').trim(), total: Number(group.querySelector('b')?.textContent?.split('/')[1]) })))
  if (groups.length !== 9 || groups.reduce((sum, group) => sum + group.total, 0) !== 57 || stage33Expected.some(([code, label], index) => groups[index]?.code !== code || groups[index]?.label !== label)) throw new Error(`Stage33 Package labels failed: ${JSON.stringify(groups)}`)
}

export async function measureDashboard(page) {
  return page.evaluate(({ requiredGithubLabels }) => {
    const root = document.querySelector('.oc-dashboard')
    const intentionallyHidden = (element) => Boolean(element.closest('.oc-visually-hidden'))
    const visible = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return !intentionallyHidden(element) && box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' }
    const elements = [root, ...root.querySelectorAll('*')].filter((element) => element && visible(element))
    const rect = (element) => element?.getBoundingClientRect() ?? { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }
    const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
    const siblingIntersections = []
    for (const parent of elements) {
      const children = [...parent.children].filter((child) => child instanceof HTMLElement && visible(child) && !child.matches('[aria-hidden="true"]'))
      for (let left = 0; left < children.length; left += 1) for (let right = left + 1; right < children.length; right += 1) if (intersects(rect(children[left]), rect(children[right]))) siblingIntersections.push(`${parent.tagName.toLowerCase()}.${parent.className || 'no-class'}:${left}-${right}`)
    }
    const clippedDescendants = elements.flatMap((element) => { const style = getComputedStyle(element); const horizontal = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1; const vertical = ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1; return horizontal || vertical ? [`${element.tagName.toLowerCase()}.${element.className || 'no-class'}:${element.clientWidth}x${element.clientHeight}->${element.scrollWidth}x${element.scrollHeight}`] : [] })
    const viewportEscape = elements.flatMap((element) => { const box = rect(element); return box.left < -1 || box.right > document.documentElement.clientWidth + 1 ? [`${element.tagName.toLowerCase()}.${element.className || 'no-class'}:${Math.round(box.left)}-${Math.round(box.right)}`] : [] })
    const textElements = elements.filter((element) => !['SCRIPT', 'STYLE'].includes(element.tagName) && [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()))
    const ellipsisTruncation = textElements.filter((element) => { const style = getComputedStyle(element); return (style.textOverflow === 'ellipsis' || style.webkitLineClamp === '1') && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) }).map((element) => element.textContent.trim().replace(/\s+/g, ' ').slice(0, 70))
    const parseRgb = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null
    const luminance = (rgb) => { const channels = rgb.map((channel) => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] }
    const contrast = (first, second) => { const a = parseRgb(first); const b = parseRgb(second); if (!a || !b) return 0; const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05) }
    const effectiveBackground = (element) => { for (let current = element; current; current = current.parentElement) { const value = getComputedStyle(current).backgroundColor; const channels = value.match(/[\d.]+/g)?.map(Number) ?? []; if (channels.length >= 3 && (channels.length < 4 || channels[3] > 0)) return value } return 'rgb(9,13,10)' }
    const label = (element) => `${element.tagName}:${element.textContent.trim().replace(/\s+/g, ' ').slice(0, 70)}`
    const undersizedText = textElements.filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 11).map((element) => `${label(element)}:${getComputedStyle(element).fontSize}`)
    const lowContrastText = textElements.filter((element) => contrast(getComputedStyle(element).color, effectiveBackground(element)) < 4.5).map((element) => `${label(element)}:${contrast(getComputedStyle(element).color, effectiveBackground(element)).toFixed(2)}`)
    const undersizedControls = elements.filter((element) => ['BUTTON', 'SUMMARY'].includes(element.tagName) && rect(element).height < 43.5).map((element) => `${label(element)}:${Math.round(rect(element).height)}`)
    const projectId = root.dataset.projectId; const currentStageId = root.dataset.currentStageId; const selectedStageId = root.dataset.selectedStageId
    const phase = root.querySelector('.oc-funnel-phase'); const scope = root.querySelector('.oc-funnel-scope'); const stage = root.querySelector('.oc-funnel-stage'); const gate = root.querySelector('.oc-funnel-gate')
    const hero = root.querySelector('.oc-hero'); const heroGate = root.querySelector('.oc-hero-gate'); const gateGauge = heroGate?.querySelector('.oc-gate-gauge')
    const gateClosed = Number(gate?.dataset.closed); const gateTotal = Number(gate?.dataset.total); const expectedGatePercent = gateTotal > 0 ? Math.round(gateClosed / gateTotal * 100) : null
    const gateAvailable = heroGate?.dataset.gateFill === 'available'
    const heroGateContract = gateAvailable ? root.querySelectorAll('.oc-gate-gauge').length === 1 && heroGate.textContent.includes(`${gateClosed}/${gateTotal} · ${expectedGatePercent}%`) && gateGauge?.getAttribute('aria-label')?.includes(`${expectedGatePercent}%`) && heroGate.textContent.includes('프로젝트 전체 진행률이 아닙니다.') : root.querySelectorAll('.oc-gate-gauge').length === 0 && heroGate?.textContent.includes('완료 조건 근거 없음') && !/%/.test(heroGate?.querySelector('strong')?.textContent ?? '')
    const noDuplicateProgress = !root.querySelector('.oc-hero-fill,.oc-confirmed') && root.querySelectorAll('[role="img"][aria-label*="완료 조건"]').length === (gateAvailable ? 1 : 0)
    const roles = [...root.querySelectorAll('.oc-role-row')]; const liveRows = roles.filter((row) => row.dataset.live === 'true')
    const compactRoles = roles.length === 4 && roles.every((row) => rect(row).height >= 43.5 && rect(row).height <= 56.5 && !/(stage-|작업 단계 연결|이력\s*\d+)/i.test(row.textContent)) && !root.querySelector('.oc-bindings article')
    const liveSemantics = liveRows.length <= 1 && liveRows.every((row) => row.querySelector('.oc-live-signal') && row.textContent.includes('실시간'))
    const activity = root.querySelector('.oc-activity-band'); const nowBox = root.querySelector('.oc-now-summary'); const bindingBox = root.querySelector('.oc-bindings')
    const activityBand = innerWidth < 1100 || (Math.abs(rect(nowBox).width / rect(activity).width - .62) < .04 && Math.abs(rect(bindingBox).width / rect(activity).width - .38) < .04)
    const flowRows = [phase, scope, stage, gate]; const flowRects = flowRows.map(rect)
    const unifiedFlow = root.querySelectorAll('.oc-flow-levels').length === 1 && flowRows.every(Boolean) && Math.max(...flowRects.map((box) => box.left)) - Math.min(...flowRects.map((box) => box.left)) <= 1 && Math.max(...flowRects.map((box) => box.width)) - Math.min(...flowRects.map((box) => box.width)) <= 1 && flowRows.every((row) => { const style = getComputedStyle(row); return Number.parseFloat(style.borderRadius) <= 1 && (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') }) && !root.querySelector('.oc-current-stage-rail,.oc-funnel-gate ol')
    const funnelCounts = [phase, scope, stage].every((row) => Number(row?.dataset.index) > 0 && Number(row?.dataset.total) >= Number(row?.dataset.index)) && Number(gate?.dataset.total) >= Number(gate?.dataset.closed)
    const placementOnly = [...root.querySelectorAll('.oc-flow-summary span')].length === 3 && [...root.querySelectorAll('.oc-flow-summary span')].every((value) => /\d+\s*\/\s*\d+/.test(value.textContent) && !value.textContent.includes('%'))
    const funnelPurpose = flowRows.every((row) => (row?.querySelector('.oc-flow-copy > p')?.textContent?.trim().length ?? 0) > 5)
    const scopeRail = root.querySelector('.oc-scope-rail'); const scopeItems = [...scopeRail.querySelectorAll('article')]; const activeScope = scopeItems.filter((item) => item.dataset.railState === 'active')
    const alpha = (value) => { const channels = value.match(/[\d.]+/g)?.map(Number) ?? []; return channels.length > 3 ? channels[3] : value === 'transparent' ? 0 : 1 }
    const connectorChecks = activeScope.map((item) => { const index = scopeItems.indexOf(item); const previous = scopeItems[index - 1]; const node = item.querySelector(':scope > i'); const previousRect = previous?.getBoundingClientRect(); const nodeRect = node?.getBoundingClientRect(); const connectorStyle = previous ? getComputedStyle(previous, '::after') : null; const horizontal = innerWidth > 600; const connectorEnd = previousRect && connectorStyle ? horizontal ? previousRect.left + Number.parseFloat(connectorStyle.left) + Number.parseFloat(connectorStyle.width) : previousRect.top + Number.parseFloat(connectorStyle.top) + Number.parseFloat(connectorStyle.height) : null; const nodeStart = nodeRect ? horizontal ? nodeRect.left : nodeRect.top : null; const gap = previous?.dataset.railState === 'complete' && Number.isFinite(connectorEnd) && Number.isFinite(nodeStart) ? Math.abs(nodeStart - connectorEnd) : 0; const style = getComputedStyle(item); return { background: style.backgroundColor, border: style.borderColor, borderStyle: style.borderStyle, borderWidth: Number.parseFloat(style.borderWidth), gap } })
    const horizontalScope = innerWidth <= 600 || (getComputedStyle(scopeRail).display === 'flex' && scopeItems.every((item, index) => index === scopeItems.length - 1 || Number.parseFloat(getComputedStyle(item, '::after').height) === 2))
    const verticalScope = innerWidth > 600 || (getComputedStyle(scopeRail).display === 'grid' && scopeItems.every((item, index) => index === scopeItems.length - 1 || Number.parseFloat(getComputedStyle(item, '::after').width) === 2))
    const scopeJourney = horizontalScope && verticalScope && activeScope.length <= 1 && connectorChecks.every((check) => alpha(check.background) === 0 && (check.borderStyle === 'none' || check.borderWidth === 0 || alpha(check.border) === 0) && (innerWidth <= 600 || check.gap <= 1)) && scopeItems.every((item) => item.querySelector('svg') && ['완료', '진행 중', '대기', '근거 없음'].includes(item.querySelector('small')?.textContent?.trim()))
    const options = [...root.querySelectorAll('.oc-stage-list [role="option"]')]; const selectedOptions = options.filter((option) => option.getAttribute('aria-selected') === 'true'); const currentOptions = options.filter((option) => option.getAttribute('aria-current') === 'step'); const tabStops = options.filter((option) => option.tabIndex === 0)
    const listbox = root.querySelector('.oc-stage-list[role="listbox"]'); const ownedGroups = [...(listbox?.children ?? [])]; const listboxOwnership = ownedGroups.length > 0 && ownedGroups.every((group) => group.getAttribute('role') === 'group' && group.getAttribute('aria-labelledby') && document.getElementById(group.getAttribute('aria-labelledby'))?.textContent?.trim()) && options.every((option) => option.closest('[role="group"]')?.parentElement === listbox)
    const explorerSemantics = root.querySelectorAll('.oc-stage-list[role="listbox"]').length === 1 && options.length > 0 && selectedOptions.length === 1 && currentOptions.length === 1 && tabStops.length === 1 && root.querySelectorAll('.oc-stage-list [aria-pressed]').length === 0 && listboxOwnership
    const list = root.querySelector('.oc-stage-list'); const detail = root.querySelector('.oc-selected-detail'); const explorerLayout = root.querySelector('.oc-explorer-layout'); const layoutStyle = getComputedStyle(explorerLayout)
    const explorerGeometry = innerWidth >= 1100 ? Math.abs(rect(list).width - 300) <= 2 && Math.abs(Number.parseFloat(layoutStyle.columnGap) - 24) <= 2 && rect(detail).left >= rect(list).right + 23 : layoutStyle.gridTemplateColumns.split(' ').filter(Boolean).length === 1 && rect(detail).top >= rect(list).bottom - 1
    const exploring = selectedStageId !== currentStageId; const currentName = currentOptions[0]?.querySelector('strong')?.textContent?.trim(); const explorationHonest = detail?.dataset.exploring === String(exploring) && (exploring ? detail.querySelector('.oc-exploration-badge')?.textContent.includes(currentName) : !detail.querySelector('.oc-exploration-badge') && detail.querySelector('.oc-selection-status')?.textContent.includes('현재 작업 단계 보조 근거'))
    const detailText = detail?.innerText ?? ''; const detailState = detail?.dataset.stageState; const detailCountTerm = [...(detail?.querySelectorAll('.oc-detail-facts div') ?? [])].find((item) => item.querySelector('dt')?.textContent?.trim() === '완료 조건 확인')?.querySelector('dd')?.textContent?.trim(); const detailGateAvailable = detail?.dataset.gateAvailable === 'true'; const detailGateTruth = detailGateAvailable ? detailCountTerm === `${detail?.dataset.gateClosed}/${detail?.dataset.gateTotal}` : detailCountTerm === '완료 조건 근거 없음'
    const currentBoundaryText = root.querySelector('[data-current-boundary]')?.textContent?.trim(); const currentBoundaryCopies = currentBoundaryText ? [...root.querySelectorAll('p')].filter((item) => item.textContent?.trim() === currentBoundaryText).length : 0
    const currentDetailDedup = exploring ? root.querySelectorAll('[data-current-boundary],[data-selected-boundary]').length === 2 && root.querySelectorAll('[data-current-gates],[data-selected-gates]').length === 2 : root.querySelectorAll('[data-current-boundary]').length === 1 && currentBoundaryCopies === 1 && root.querySelectorAll('[data-current-gates]').length === 1 && !detail.querySelector('[data-selected-boundary],[data-selected-gates],h3')
    const detailSemantics = Boolean(detailState) && !detail.querySelector('.oc-confirmed') && detailGateTruth && currentDetailDedup
    const gateGroups = detail ? [...detail.querySelectorAll('.oc-groups article')] : []; const gateGroupContainer = detail?.querySelector('.oc-groups'); const singleGroupFills = gateGroups.length !== 1 || rect(gateGroups[0]).width >= rect(gateGroupContainer).width * .9; const genericGroupsClean = gateGroups.filter((group) => group.dataset.generic === 'true').every((group) => !group.querySelector('strong,small')); const adaptiveGateGroups = singleGroupFills && genericGroupsClean
    const roleCopyPolish = roles.every((row) => !row.textContent.includes('관측 오래됨 · 관측 오래됨'))
    const heroPrimaryIdentity = !root.querySelector('.oc-hero-title')?.textContent?.includes(projectId)
    const timing = root.querySelector('.oc-now-timing'); const elapsed = timing?.querySelector('.oc-time-elapsed'); const eta = timing?.querySelector('.oc-time-eta')
    const timingHonesty = Boolean(timing && elapsed && eta && (elapsed.dataset.available === 'true' ? elapsed.textContent.includes('현재 역할 연결 후 경과') && elapsed.querySelector('em')?.textContent.includes('연결 시작') : elapsed.textContent.includes('작업시간 측정 근거 없음')) && (eta.dataset.available === 'true' ? eta.textContent.includes('계획 기준 예상') : eta.textContent.includes('남은 시간 예상 근거 없음')))
    const progressSurface = root.innerText.replaceAll('프로젝트 전체 진행률이 아닙니다.', '')
    const noFabricatedProgress = !/프로젝트.{0,8}(?:100%|진행률)|(?:속도|건강도|신뢰도)\s*(?:점수|지표)/.test(progressSurface) && placementOnly && timingHonesty
    const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')]; const levels = headings.map((heading) => Number(heading.tagName.slice(1))); const sequentialHeadings = headings.length > 0 && levels[0] === 1 && levels.every((level, index) => index === 0 || level <= levels[index - 1] + 1)
    const details = root.querySelector('.oc-technical'); const technicalText = details?.textContent ?? ''
    const contentPreservation = ['.oc-hero', '.oc-now-summary', '.oc-bindings', '.oc-current-flow', '.oc-funnel-gate', '.oc-current-stage', '.oc-stage-explorer', '.oc-selected-detail', '.oc-technical'].every((selector) => Boolean(root.querySelector(selector)))
    const technicalEvidence = Boolean(/커밋 [0-9a-f]{12}/i.test(technicalText) && /트리 [0-9a-f]{12}/i.test(technicalText) && requiredGithubLabels.every((value) => technicalText.includes(value)) && root.querySelectorAll('.oc-binding-evidence>div').length === 4)
    const orderSelectors = ['.oc-topbar', '.oc-hero', '.oc-now-summary', '.oc-bindings', '.oc-funnel-phase', '.oc-funnel-scope', '.oc-funnel-stage', '.oc-funnel-gate', '.oc-current-stage', '.oc-stage-list', '.oc-selected-detail', '.oc-technical']; const orderTops = orderSelectors.map((selector) => rect(root.querySelector(selector)).top); const mobileAuthoritativeOrder = innerWidth > 600 || orderTops.every((top, index) => index === 0 || top >= orderTops[index - 1] - 1)
    const accessibleText = [...root.querySelectorAll('[aria-label],[title]')].flatMap((element) => [element.getAttribute('aria-label'), element.getAttribute('title')]).filter(Boolean).join('\n')
    const technicalTokens = ['OUTCOME', 'Cherry Note', 'GitHub', 'Cherry', 'TestFlight', 'Mac Mini', 'MacBook', 'iPhone', root.dataset.projectId, ...options.map((element) => element.dataset.stageId), ...[...root.querySelectorAll('.oc-current-stage li b,.oc-detail-grid li b')].map((element) => element.textContent.trim()), ...[...root.querySelectorAll('.oc-groups small')].map((element) => element.textContent.trim())].filter(Boolean).sort((left, right) => right.length - left.length)
    let englishSurface = `${root.textContent}\n${accessibleText}`.replace(/index-[A-Za-z0-9_-]+\.js/g, '').replace(/\b[0-9a-f]{7,64}\b/gi, '').replace(/\b[a-z0-9._-]+\/[a-z0-9._/-]+\b/gi, '').replace(/\b(?:main|origin)\b/gi, '')
    for (const token of technicalTokens) englishSurface = englishSurface.split(token).join('')
    const unexpectedEnglish = [...new Set(englishSurface.match(/[A-Za-z]+(?:\s*&\s*[A-Za-z]+)?/g) ?? [])].sort()
    const translationFallback = [...(`${root.textContent}\n${accessibleText}`.match(/[^\n]*한글화 대기[^\n]*/g) ?? [])].map((value) => value.trim())
    return { projectId, currentStageId, selectedStageId, currentSignature: `${phase?.dataset.index}/${phase?.dataset.total}|${scope?.dataset.index}/${scope?.dataset.total}|${stage?.dataset.index}/${stage?.dataset.total}|${heroGate?.dataset.currentGateSignature}|${root.querySelector('.oc-hero-orientation strong')?.textContent}`, optionCount: options.length, gateRowTop: Math.round(rect(gate).top + scrollY), documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, clippedDescendants, ellipsisTruncation, viewportEscape, siblingIntersections, undersizedText, lowContrastText, undersizedControls, unexpectedEnglish, translationFallback, pageHeading: root.querySelectorAll('h1').length === 1 && Boolean(hero?.querySelector('h1')), sequentialHeadings, heroGateContract, noDuplicateProgress, compactRoles, roleHeights: roles.map((row) => rect(row).height), liveSemantics, roleCopyPolish, heroPrimaryIdentity, activeAnimationCount: liveRows.length, activityBand, activityRatio: rect(nowBox).width / rect(activity).width, unifiedFlow, flowLeftDelta: Math.max(...flowRects.map((box) => box.left)) - Math.min(...flowRects.map((box) => box.left)), flowWidthDelta: Math.max(...flowRects.map((box) => box.width)) - Math.min(...flowRects.map((box) => box.width)), funnelCounts, funnelPurpose, placementOnly, scopeJourney, scopeOrientation: innerWidth <= 600 ? 'vertical' : 'horizontal', scopeDebug: { horizontalScope, verticalScope, active: activeScope.length, connectorChecks }, scopeConnectorGap: connectorChecks.reduce((maximum, check) => Math.max(maximum, check.gap), 0), explorerSemantics, listboxOwnership, explorerGeometry, explorerMasterWidth: rect(list).width, explorerGap: Number.parseFloat(layoutStyle.columnGap) || 0, allStagesDiscoverable: options.every(visible), explorationHonest, detailSemantics, detailGateTruth, currentDetailDedup, adaptiveGateGroups, timingHonesty, noFabricatedProgress, contentPreservation, technicalCollapsed: Boolean(details && !details.open), technicalEvidence, mobileAuthoritativeOrder }
  }, { requiredGithubLabels })
}

export function assertDashboardMeasurement(name, result) {
  const failures = []
  for (const [key, values] of [['clipped', result.clippedDescendants], ['ellipsis', result.ellipsisTruncation], ['viewportEscape', result.viewportEscape], ['intersections', result.siblingIntersections], ['undersizedControls', result.undersizedControls], ['undersizedText', result.undersizedText], ['lowContrastText', result.lowContrastText], ['unexpectedEnglish', result.unexpectedEnglish], ['translationFallback', result.translationFallback]]) if (values.length) failures.push(`${key}=${values.join(',')}`)
  if (result.documentOverflow !== 0) failures.push(`documentOverflow=${result.documentOverflow}`)
  for (const key of ['pageHeading', 'sequentialHeadings', 'heroGateContract', 'noDuplicateProgress', 'compactRoles', 'liveSemantics', 'roleCopyPolish', 'heroPrimaryIdentity', 'activityBand', 'unifiedFlow', 'funnelCounts', 'funnelPurpose', 'placementOnly', 'scopeJourney', 'explorerSemantics', 'listboxOwnership', 'explorerGeometry', 'allStagesDiscoverable', 'explorationHonest', 'detailSemantics', 'detailGateTruth', 'currentDetailDedup', 'adaptiveGateGroups', 'timingHonesty', 'noFabricatedProgress', 'contentPreservation', 'technicalCollapsed', 'technicalEvidence', 'mobileAuthoritativeOrder']) if (!result[key]) failures.push(`${key}=false${key === 'scopeJourney' ? `:${JSON.stringify(result.scopeDebug)}` : ''}`)
  if (result.activeAnimationCount > 1) failures.push(`activeAnimationCount=${result.activeAnimationCount}`)
  if (failures.length) throw new Error(`${name} failed: ${failures.join(' | ')}`)
}

async function assertReducedMotion(page, name) {
  const normal = await page.evaluate(() => { const probe = document.createElement('div'); probe.className = 'oc-live-signal'; probe.dataset.motionProbe = 'true'; probe.style.cssText = 'position:fixed;visibility:hidden'; probe.innerHTML = '<span class="oc-live-bars"><i></i><i></i><i></i></span>'; document.body.append(probe); return getComputedStyle(probe.querySelector('i')).animationName !== 'none' })
  if (!normal) throw new Error(`${name}: live motion contract failed`)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.evaluate(() => { const probe = document.querySelector('[data-motion-probe="true"]'); const result = getComputedStyle(probe.querySelector('i')).animationName === 'none'; probe.remove(); return result })
  if (!reduced) throw new Error(`${name}: reduced motion failed`)
  const repeating = await page.evaluate(() => [...document.querySelectorAll('.oc-dashboard *')].filter((element) => getComputedStyle(element).animationIterationCount === 'infinite' && getComputedStyle(element).animationName !== 'none').length)
  if (repeating !== 0) throw new Error(`${name}: reduced motion retained ${repeating} repeating animations`)
}

export async function verifyAllDashboardStates(page, viewportName) {
  await page.getByText('현재 원본 흐름', { exact: true }).waitFor()
  const projectButtons = page.locator('.oc-topbar nav button'); if (await projectButtons.count() !== 2) throw new Error(`${viewportName}: expected two projects`)
  let measuredStates = 0; let minimumFocusContrast = Infinity; let maximumActiveAnimations = 0; let maximumScopeConnectorGap = 0; let layoutReceipt = null; const failures = []; const counts = []
  for (let projectIndex = 0; projectIndex < 2; projectIndex += 1) {
    await projectButtons.nth(projectIndex).click()
    const projectId = await page.locator('.oc-dashboard').getAttribute('data-project-id'); const options = page.locator('.oc-stage-list [role="option"]'); const stageCount = await options.count(); counts.push(`${projectId}:${stageCount}`)
    if (stageCount < 1) throw new Error(`${viewportName}/${projectId}: 작업 단계가 없습니다`)
    try { minimumFocusContrast = Math.min(minimumFocusContrast, await assertKeyboardContract(page, `${viewportName}/${projectId}`)) } catch (error) { failures.push(String(error.message)) }
    let currentSignature = null
    for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
      await options.nth(stageIndex).click(); await page.locator('.oc-stage-list [role="option"][aria-selected="true"]').waitFor()
      const stageId = await options.nth(stageIndex).getAttribute('data-stage-id') ?? `index-${stageIndex}`
      const result = await measureDashboard(page); layoutReceipt ??= result; currentSignature ??= result.currentSignature; if (result.currentSignature !== currentSignature) failures.push(`${viewportName}/${projectId}/${stageId}: current truth changed during exploration`)
      if (result.optionCount !== stageCount) failures.push(`${viewportName}/${projectId}/${stageId}: option count drift ${result.optionCount}/${stageCount}`)
      maximumActiveAnimations = Math.max(maximumActiveAnimations, result.activeAnimationCount); maximumScopeConnectorGap = Math.max(maximumScopeConnectorGap, result.scopeConnectorGap)
      try { assertDashboardMeasurement(`${viewportName}/${projectId}/${stageId}`, result) } catch (error) { failures.push(String(error.message)) }
      if (stageId === 'stage-33-engineering-build-41') try { await assertStage33PackageProjection(page) } catch (error) { failures.push(String(error.message)) }
      measuredStates += 1
    }
  }
  try { await assertReducedMotion(page, viewportName) } catch (error) { failures.push(String(error.message)) }
  if (failures.length) throw new Error(`${viewportName}: measured projects=2 selectedStages=${measuredStates}; ${failures.join(' || ')}`)
  console.log(`${viewportName}: projects=2 selectedStages=${measuredStates} sourceOptions=${counts.join(',')} heroGauge=1-or-0 roles=4 roleHeights=${layoutReceipt.roleHeights.map((value) => value.toFixed(0)).join('/')} activityRatio=${layoutReceipt.activityRatio.toFixed(3)} flowDelta=${layoutReceipt.flowLeftDelta.toFixed(2)}/${layoutReceipt.flowWidthDelta.toFixed(2)}px explorer=${layoutReceipt.explorerMasterWidth.toFixed(0)}px/${layoutReceipt.explorerGap.toFixed(0)}px scope=${layoutReceipt.scopeOrientation} scopeConnectorMaxGap=${maximumScopeConnectorGap.toFixed(2)}px activeAnimation<=${maximumActiveAnimations} reducedMotionStatic=true unexpectedEnglish=0 translationFallback=0 clipped=0 ellipsis=0 intersections=0 viewportEscape=0 documentOverflow=0 controls>=44 text>=11 textContrast>=4.5 focusContrast>=${minimumFocusContrast.toFixed(2)}`)
}
