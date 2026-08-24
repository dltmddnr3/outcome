const requiredGithubLabels = ['로컬 후보', 'GitHub 게시', '자동 검사', '출시', '완료 판정 권한 없음']
const stage33Expected = [['Y', '링크 미리보기'], ['L', '아이보리 표면·머티리얼'], ['B', '브랜드 아이덴티티'], ['M', '더보기 화면'], ['N', '새 폴더'], ['E', '새 일정 입력'], ['A', '폴더 보관'], ['D', '폴더 하위 트리 복구 삭제'], ['G', '엔지니어링 완료 증거']]

async function assertKeyboardFocus(page, name) {
  const first = page.locator('.oc-stage-list button').first()
  await first.focus(); await page.keyboard.press('Tab')
  const result = await page.evaluate(() => {
    const element = document.activeElement; const style = element instanceof HTMLElement ? getComputedStyle(element) : null
    const rgb = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null
    const luminance = (channels) => channels.reduce((sum, channel, index) => { const value = channel / 255; const linear = value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; return sum + linear * [.2126, .7152, .0722][index] }, 0)
    const foreground = rgb(style?.outlineColor ?? ''); const background = rgb(style?.backgroundColor ?? '')
    const contrast = foreground && background ? (Math.max(luminance(foreground), luminance(background)) + .05) / (Math.min(luminance(foreground), luminance(background)) + .05) : 0
    return { stage: element?.matches('.oc-stage-list button') ?? false, width: Number.parseFloat(style?.outlineWidth ?? '0'), outline: style?.outlineStyle ?? 'none', contrast }
  })
  if (!result.stage || result.width < 3 || result.outline === 'none' || result.contrast < 3) throw new Error(`${name} focus failed: ${JSON.stringify(result)}`)
  return result.contrast
}

async function assertStage33PackageProjection(page) {
  const groups = await page.evaluate(() => [...document.querySelectorAll('.oc-groups article')].map((group) => ({ label: group.querySelector('strong')?.textContent?.trim(), code: group.querySelector('small')?.textContent?.replace('코드 ', '').trim(), total: Number(group.querySelector('b')?.textContent?.split('/')[1]) })))
  if (groups.length !== 9 || groups.reduce((sum, group) => sum + group.total, 0) !== 57 || stage33Expected.some(([code, label], index) => groups[index]?.code !== code || groups[index]?.label !== label)) throw new Error(`Stage33 Package labels failed: ${JSON.stringify(groups)}`)
}

export async function measureDashboard(page) {
  const result = await page.evaluate(({ requiredGithubLabels }) => {
    const root = document.querySelector('.oc-dashboard')
    const intentionallyHidden = (element) => Boolean(element.closest('.oc-visually-hidden'))
    const visible = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return !intentionallyHidden(element) && box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' }
    const elements = [root, ...root.querySelectorAll('*')].filter((element) => element && visible(element))
    const rect = (element) => element.getBoundingClientRect()
    const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
    const siblingIntersections = []
    for (const parent of elements) {
      const children = [...parent.children].filter((child) => child instanceof HTMLElement && visible(child) && !child.matches('[aria-hidden="true"],.oc-hero-fill'))
      for (let left = 0; left < children.length; left += 1) for (let right = left + 1; right < children.length; right += 1) if (intersects(rect(children[left]), rect(children[right]))) siblingIntersections.push(`${parent.tagName.toLowerCase()}.${parent.className || 'no-class'}:${left}-${right}`)
    }
    const clippedDescendants = elements.flatMap((element) => { const style = getComputedStyle(element); const horizontal = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1; const vertical = ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1; return horizontal || vertical ? [`${element.tagName.toLowerCase()}.${element.className || 'no-class'}:${element.clientWidth}x${element.clientHeight}->${element.scrollWidth}x${element.scrollHeight}`] : [] })
    const axisClips = [...document.querySelectorAll('.oc-axis strong')].filter(visible).flatMap((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1 ? [element.textContent.trim()] : [])
    const viewportEscape = elements.flatMap((element) => { const box = rect(element); return box.left < -1 || box.right > document.documentElement.clientWidth + 1 ? [`${element.tagName.toLowerCase()}.${element.className || 'no-class'}:${Math.round(box.left)}-${Math.round(box.right)}`] : [] })
    const textElements = elements.filter((element) => !['SCRIPT', 'STYLE'].includes(element.tagName) && [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()))
    const ellipsisTruncation = textElements.filter((element) => { const style = getComputedStyle(element); return style.textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth + 1 }).map((element) => element.textContent.trim().replace(/\s+/g, ' ').slice(0, 70))
    const parseRgb = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null
    const luminance = (rgb) => { const channels = rgb.map((channel) => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] }
    const contrast = (first, second) => { const a = parseRgb(first); const b = parseRgb(second); if (!a || !b) return 0; const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05) }
    const effectiveBackground = (element) => { for (let current = element; current; current = current.parentElement) { const value = getComputedStyle(current).backgroundColor; const channels = value.match(/[\d.]+/g)?.map(Number) ?? []; if (channels.length >= 3 && (channels.length < 4 || channels[3] > 0)) return value } return 'rgb(9,13,10)' }
    const label = (element) => `${element.tagName}:${element.textContent.trim().replace(/\s+/g, ' ').slice(0, 70)}`
    const undersizedText = textElements.filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 11).map((element) => `${label(element)}:${getComputedStyle(element).fontSize}`)
    const lowContrastText = textElements.filter((element) => contrast(getComputedStyle(element).color, effectiveBackground(element)) < 4.5).map((element) => `${label(element)}:${contrast(getComputedStyle(element).color, effectiveBackground(element)).toFixed(2)}`)
    const undersizedControls = elements.filter((element) => ['BUTTON', 'SUMMARY'].includes(element.tagName) && rect(element).height < 43.5).map((element) => `${label(element)}:${Math.round(rect(element).height)}`)
    const readable = (selector) => [...document.querySelectorAll(selector)].filter(visible).every((element) => { const style = getComputedStyle(element); return style.whiteSpace !== 'nowrap' && element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1 })
    const projectId = root.dataset.projectId; const currentStageId = root.dataset.currentStageId; const selectedStageId = root.dataset.selectedStageId
    const detail = document.querySelector('.oc-selected-detail'); const detailState = detail?.dataset.stageState ?? null; const detailText = detail?.innerText ?? ''; const completionBar = Boolean(detail?.querySelector('.oc-confirmed'))
    const detailSemantics = Boolean(detailState) && (detailState === 'complete' ? completionBar && detailText.includes('증거 확정 / 전체') && detailText.includes('증거가 모두 확정') : !completionBar && !detailText.includes('증거가 모두 확정') && detailText.includes('체크됨 / 전체'))
    const exploring = selectedStageId !== currentStageId; const explorationHonest = detail?.dataset.exploring === String(exploring) && (!exploring || Boolean(detail.querySelector('.oc-exploration-badge')))
    const localizedBottomShell = [...document.querySelectorAll('.oc-stage-list > button')].find((button) => button.dataset.stageId === 'stage-33-bottom-shell-seam-correction'); const localizedBottomState = localizedBottomShell?.dataset.stageState; const localizedBottomLabel = localizedBottomShell?.querySelector('em')?.textContent.trim()
    const bottomShellState = projectId !== 'cherry-note' || (localizedBottomState === 'complete' ? localizedBottomLabel === '완료 조건 충족' : localizedBottomState === 'gates_closed_evidence_pending' ? localizedBottomLabel === '체크 항목 닫힘 · 증거 대기' : Boolean(localizedBottomState && localizedBottomLabel))
    const accessibleText = [...document.querySelectorAll('[aria-label],[title]')].flatMap((element) => [element.getAttribute('aria-label'), element.getAttribute('title')]).filter(Boolean).join('\n')
    const technicalTokens = ['OUTCOME', 'Cherry Note', 'GitHub', 'Cherry', 'TestFlight', 'Mac Mini', 'MacBook', 'iPhone', root.dataset.projectId, ...[...document.querySelectorAll('[data-stage-id]')].map((element) => element.dataset.stageId), ...[...document.querySelectorAll('.oc-detail-grid li b,.oc-funnel-gate li b')].map((element) => element.textContent.trim()), ...[...document.querySelectorAll('.oc-groups small')].map((element) => element.textContent.trim())].filter(Boolean).sort((left, right) => right.length - left.length)
    let englishSurface = `${root.textContent}\n${accessibleText}`.replace(/index-[A-Za-z0-9_-]+\.js/g, '').replace(/\b[0-9a-f]{7,64}\b/gi, '').replace(/\b[a-z0-9._-]+\/[a-z0-9._/-]+\b/gi, '').replace(/\b(?:main|origin)\b/gi, '')
    for (const token of technicalTokens) englishSurface = englishSurface.split(token).join('')
    const unexpectedEnglish = [...new Set(englishSurface.match(/[A-Za-z]+(?:\s*&\s*[A-Za-z]+)?/g) ?? [])].sort()
    const translationFallback = [...(`${root.textContent}\n${accessibleText}`.match(/[^\n]*한글화 대기[^\n]*/g) ?? [])].map((value) => value.trim())
    const details = document.querySelector('.oc-technical'); const technicalText = details?.textContent ?? ''
    const phase = document.querySelector('.oc-funnel-phase'); const scope = document.querySelector('.oc-funnel-scope'); const stage = document.querySelector('.oc-funnel-stage'); const gate = document.querySelector('.oc-funnel-gate')
    const funnelCounts = [phase, scope, stage].every((row) => Number(row?.dataset.index) > 0 && Number(row?.dataset.total) >= Number(row?.dataset.index)) && Number(gate?.dataset.total) >= Number(gate?.dataset.closed)
    const funnelPurpose = [phase, scope, stage, gate].every((row) => (row?.querySelector(':scope > p')?.textContent?.trim().length ?? 0) > 5)
    const funnelWidths = [phase, scope, stage, gate].map((row) => rect(row).width); const funnelShape = innerWidth <= 600 ? funnelWidths.every((width) => Math.abs(width - funnelWidths[0]) < 2) : funnelWidths.every((width, index) => index === 0 || width < funnelWidths[index - 1])
    const railSemantics = [...document.querySelectorAll('.oc-rail article')].every((item) => item.dataset.railState && item.querySelector('svg') && ['완료', '진행 중', '대기', '근거 없음'].includes(item.querySelector('small')?.textContent?.trim()))
    const heroGate = document.querySelector('.oc-hero-gate'); const heroFillSemantics = heroGate?.dataset.gateFill === 'available' ? document.querySelectorAll('.oc-hero-fill').length === 1 && heroGate.textContent.includes('프로젝트 전체 진행률이 아닙니다') : document.querySelectorAll('.oc-hero-fill').length === 0 && heroGate?.textContent.includes('완료 조건 근거 없음')
    const liveCards = [...document.querySelectorAll('.oc-bindings [data-live="true"]')]; const activeAnimationCount = liveCards.length; const liveSemantics = activeAnimationCount <= 1 && liveCards.every((card) => card.classList.contains('active') && card.classList.contains('is-live') && card.textContent.includes('최근 관측') && card.querySelector('.oc-live-bars'))
    const now = document.querySelector('.oc-now-summary'); const nowStaleHonesty = Boolean(now?.dataset.nowStatus) && (now.dataset.nowStatus !== 'stale' || now.dataset.hasActivity !== 'true' || (now.querySelector('strong')?.textContent.includes('관측 오래됨') && now.querySelector('span')?.textContent.includes('관측 오래됨') && now.textContent.includes('세션 활동은 진행률이 아닙니다')))
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]; const headingLevels = headings.map((heading) => Number(heading.tagName.slice(1))); const sequentialHeadings = headings.length > 0 && headingLevels[0] === 1 && headingLevels.every((level, index) => index === 0 || level <= headingLevels[index - 1] + 1); const heroHeading = document.querySelector('.oc-hero-title h1'); const pageHeading = document.querySelectorAll('.oc-dashboard h1').length === 1 && Boolean(heroHeading)
    const columnCount = (element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
    const mobileTwoColumns = innerWidth > 600 || (columnCount(document.querySelector('.oc-bindings')) === 2 && [...document.querySelectorAll('.oc-rail')].every((rail) => columnCount(rail) === 2))
    const orderSelectors = ['.oc-topbar', '.oc-hero', '.oc-now-summary', '.oc-bindings', '.oc-funnel-phase', '.oc-funnel-scope', '.oc-funnel-stage', '.oc-funnel-gate', '.oc-current-stage', '.oc-selected-detail', '.oc-technical']; const orderTops = orderSelectors.map((selector) => rect(document.querySelector(selector)).top); const mobileAuthoritativeOrder = innerWidth > 600 || orderTops.every((top, index) => index === 0 || top >= orderTops[index - 1])
    const buildCommit = technicalText.match(/커밋 ([0-9a-f]{12})/i)?.[1] ?? null; const buildTree = technicalText.match(/트리 ([0-9a-f]{12})/i)?.[1] ?? null
    return { projectId, currentStageId, selectedStageId, currentSignature: `${phase?.dataset.index}/${phase?.dataset.total}|${scope?.dataset.index}/${scope?.dataset.total}|${stage?.dataset.index}/${stage?.dataset.total}|${gate?.dataset.closed}/${gate?.dataset.total}`, gateRowTop: Math.round(rect(gate).top), documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, clippedDescendants, axisClips, ellipsisTruncation, viewportEscape, siblingIntersections, undersizedText, lowContrastText, undersizedControls, currentNextReadable: readable('.oc-hero-orientation strong') && document.querySelectorAll('.oc-hero-orientation strong').length === 2, allStagesDiscoverable: [...document.querySelectorAll('.oc-stage-list > button')].every(visible), selectedStageExposed: document.querySelectorAll('.oc-stage-list button[aria-pressed="true"]').length === 1, sourceStatusText: [...document.querySelectorAll('.oc-topbar nav button')].every((element) => element.getAttribute('aria-label')?.includes('원본 묶음')), hero: Boolean(heroHeading && document.querySelector('.oc-hero-orientation') && document.querySelector('.oc-hero-meta .cn-refresh')), pageHeading, sequentialHeadings, mobileTwoColumns, nowStaleHonesty, standaloneHeadingAbsent: !document.querySelector('.cn-standalone-heading'), funnelCounts, funnelPurpose, funnelShape, railSemantics, heroFillSemantics, liveSemantics, activeAnimationCount, exploring, explorationHonest, technicalCollapsed: Boolean(details && !details.open), technicalEvidence: Boolean(buildCommit && buildTree && requiredGithubLabels.every((value) => technicalText.includes(value))), mobileAuthoritativeOrder, bottomShellState, detailState, detailSemantics, unexpectedEnglish, translationFallback }
  }, { requiredGithubLabels })
  const scrollY = await page.evaluate(() => window.scrollY)
  return { ...result, gateRowTop: result.gateRowTop + Math.round(scrollY) }
}

export function assertDashboardMeasurement(name, result) {
  const failures = []
  if (result.documentOverflow !== 0) failures.push(`documentOverflow=${result.documentOverflow}`)
  if (result.clippedDescendants.length) failures.push(`clipped=${result.clippedDescendants.join(',')}`)
  if (result.ellipsisTruncation.length) failures.push(`ellipsis=${result.ellipsisTruncation.join(',')}`)
  if (name.startsWith('mobile/') && result.gateRowTop > 1688) failures.push(`gateRowTop=${result.gateRowTop}`)
  if (result.viewportEscape.length) failures.push(`viewportEscape=${result.viewportEscape.join(',')}`)
  if (result.siblingIntersections.length) failures.push(`intersections=${result.siblingIntersections.join(',')}`)
  if (result.undersizedControls.length) failures.push(`undersizedControls=${result.undersizedControls.join(',')}`)
  if (result.undersizedText.length) failures.push(`undersizedText=${result.undersizedText.join(',')}`)
  if (result.lowContrastText.length) failures.push(`lowContrastText=${result.lowContrastText.join(',')}`)
  if (result.unexpectedEnglish.length) failures.push(`unexpectedEnglish=${result.unexpectedEnglish.join(',')}`)
  if (result.translationFallback.length) failures.push(`translationFallback=${result.translationFallback.join(',')}`)
  for (const key of ['currentNextReadable', 'allStagesDiscoverable', 'selectedStageExposed', 'sourceStatusText', 'hero', 'pageHeading', 'sequentialHeadings', 'mobileTwoColumns', 'nowStaleHonesty', 'standaloneHeadingAbsent', 'funnelCounts', 'funnelPurpose', 'funnelShape', 'railSemantics', 'heroFillSemantics', 'liveSemantics', 'explorationHonest', 'technicalCollapsed', 'technicalEvidence', 'mobileAuthoritativeOrder', 'bottomShellState', 'detailSemantics']) if (!result[key]) failures.push(`${key}=false`)
  if (result.activeAnimationCount > 1) failures.push(`activeAnimationCount=${result.activeAnimationCount}`)
  if (failures.length) throw new Error(`${name} failed: ${failures.join(' | ')}`)
}

async function assertReducedMotion(page, name) {
  const normal = await page.evaluate(() => {
    const probe = document.createElement('section'); probe.dataset.motionProbe = 'true'; probe.className = 'oc-bindings'; probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden'; probe.innerHTML = '<article class="active is-live"><span class="oc-live-bars"><i></i><i></i><i></i></span></article>'; document.body.append(probe)
    const card = probe.querySelector('article'); const bar = probe.querySelector('i')
    return { card: getComputedStyle(card, '::before').animationName !== 'none', bars: getComputedStyle(bar).animationName !== 'none' }
  })
  if (!normal.card || !normal.bars) throw new Error(`${name}: live motion contract failed ${JSON.stringify(normal)}`)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const result = await page.evaluate(() => { const probe = document.querySelector('[data-motion-probe="true"]'); const card = probe.querySelector('article'); const bar = probe.querySelector('i'); const value = { card: getComputedStyle(card, '::before').animationName === 'none', bars: getComputedStyle(bar).animationName === 'none' }; probe.remove(); return value })
  if (!result.card || !result.bars) throw new Error(`${name}: reduced motion failed ${JSON.stringify(result)}`)
}

export async function verifyAllDashboardStates(page, viewportName) {
  await page.getByText('큰 단계에서 완료 조건까지', { exact: true }).waitFor()
  const projectButtons = page.locator('.oc-topbar nav button'); if (await projectButtons.count() !== 2) throw new Error(`${viewportName}: expected two projects`)
  let measuredStates = 0; let minimumFocusContrast = Infinity; let maximumActiveAnimations = 0; const failures = []; const axisClipStages = new Set(); let axisClipCount = 0; const gateRowTops = []
  for (let projectIndex = 0; projectIndex < 2; projectIndex += 1) {
    await projectButtons.nth(projectIndex).click()
    const projectId = await page.locator('.oc-dashboard').getAttribute('data-project-id'); const stageButtons = page.locator('.oc-stage-list > button'); const stageCount = await stageButtons.count(); if (stageCount < 1) throw new Error(`${viewportName}/${projectId}: 작업 단계가 없습니다`)
    try { minimumFocusContrast = Math.min(minimumFocusContrast, await assertKeyboardFocus(page, `${viewportName}/${projectId}`)) } catch (error) { failures.push(String(error.message)) }
    let currentSignature = null
    for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
      await stageButtons.nth(stageIndex).click(); await page.locator('.oc-stage-list > button[aria-pressed="true"]').waitFor()
      const stageId = (await page.locator('.oc-selected-detail > header small').first().textContent())?.replace(/^작업 단계 상세 ·\s*/, '').trim() || `index-${stageIndex}`
      const result = await measureDashboard(page); currentSignature ??= result.currentSignature; if (stageIndex === 0) gateRowTops.push(`${projectId}:${result.gateRowTop}`); if (result.currentSignature !== currentSignature) failures.push(`${viewportName}/${projectId}/${stageId}: current funnel changed during exploration`)
      maximumActiveAnimations = Math.max(maximumActiveAnimations, result.activeAnimationCount)
      if (result.axisClips.length) { axisClipStages.add(`${projectId}/${stageId}`); axisClipCount += result.axisClips.length }
      try { assertDashboardMeasurement(`${viewportName}/${projectId}/${stageId}`, result) } catch (error) { failures.push(String(error.message)) }
      if (stageId === 'stage-33-engineering-build-41') try { await assertStage33PackageProjection(page) } catch (error) { failures.push(String(error.message)) }
      measuredStates += 1
    }
  }
  try { await assertReducedMotion(page, viewportName) } catch (error) { failures.push(String(error.message)) }
  if (failures.length) throw new Error(`${viewportName}: measured projects=2 selectedStages=${measuredStates}; axisClips=${axisClipCount} across ${axisClipStages.size} selectedStages; ${failures.join(' || ')}`)
  console.log(`${viewportName}: projects=2 selectedStages=${measuredStates} gateRowTops=${gateRowTops.join(',')} funnelCounts=true technicalCollapsed=true activeAnimation<=${maximumActiveAnimations} reducedMotionStatic=true unexpectedEnglish=0 translationFallback=0 clipped=0 ellipsis=0 intersections=0 viewportEscape=0 documentOverflow=0 controls>=44 text>=11 textContrast>=4.5 mobileOrder=true focusContrast>=${minimumFocusContrast.toFixed(2)}`)
}
