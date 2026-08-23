const requiredPurposeLabels = ['큰 단계 목적', '범위 목적', '작업 단계 목적', '완료 조건 목적']
const requiredGithubLabels = ['로컬 후보', 'GitHub 게시', '자동 검사', '출시', '완료 판정 권한 없음']

const stage33Expected = [['Y', '링크 미리보기'], ['L', '아이보리 표면·머티리얼'], ['B', '브랜드 아이덴티티'], ['M', '더보기 화면'], ['N', '새 폴더'], ['E', '새 일정 입력'], ['A', '폴더 보관'], ['D', '폴더 하위 트리 복구 삭제'], ['G', '엔지니어링 완료 증거']]

async function assertKeyboardFocus(page, name) {
  const first = page.locator('.oc-stage-list button').first()
  await first.focus()
  await page.keyboard.press('Tab')
  const result = await page.evaluate(() => {
    const element = document.activeElement
    const style = element instanceof HTMLElement ? getComputedStyle(element) : null
    const rgb = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null
    const luminance = (channels) => channels.reduce((sum, channel, index) => { const value = channel / 255; const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; return sum + linear * [0.2126, 0.7152, 0.0722][index] }, 0)
    const foreground = rgb(style?.outlineColor ?? ''); const background = rgb(style?.backgroundColor ?? '')
    const contrast = foreground && background ? ((Math.max(luminance(foreground), luminance(background)) + 0.05) / (Math.min(luminance(foreground), luminance(background)) + 0.05)) : 0
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
  return page.evaluate(({ requiredPurposeLabels, requiredGithubLabels }) => {
    const root = document.querySelector('.oc-dashboard')
    const intentionallyHidden = (element) => Boolean(element.closest('.oc-visually-hidden'))
    const visible = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return !intentionallyHidden(element) && box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' }
    const elements = [root, ...root.querySelectorAll('*')].filter((element) => element && visible(element))
    const rect = (element) => element.getBoundingClientRect()
    const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
    const siblingIntersections = []
    for (const parent of elements) {
      const children = [...parent.children].filter((child) => child instanceof HTMLElement && visible(child))
      for (let left = 0; left < children.length; left += 1) for (let right = left + 1; right < children.length; right += 1) if (intersects(rect(children[left]), rect(children[right]))) siblingIntersections.push(`${parent.tagName.toLowerCase()}.${parent.className || 'no-class'}:${left}-${right}`)
    }
    const clippedDescendants = elements.flatMap((element) => {
      const style = getComputedStyle(element)
      const horizontal = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1
      const vertical = ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1
      return horizontal || vertical ? [`${element.tagName.toLowerCase()}.${element.className || 'no-class'}:${element.clientWidth}x${element.clientHeight}->${element.scrollWidth}x${element.scrollHeight}`] : []
    })
    const axisClips = [...document.querySelectorAll('.oc-axis strong')].flatMap((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1 ? [element.textContent.trim()] : [])
    const viewportEscape = elements.flatMap((element) => { const box = rect(element); return box.left < -1 || box.right > document.documentElement.clientWidth + 1 ? [`${element.tagName.toLowerCase()}.${element.className || 'no-class'}:${Math.round(box.left)}-${Math.round(box.right)}`] : [] })
    const textElements = elements.filter((element) => !['SCRIPT', 'STYLE'].includes(element.tagName) && [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()))
    const parseRgb = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null
    const luminance = (rgb) => { const channels = rgb.map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4 }); return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] }
    const contrast = (first, second) => { const a = parseRgb(first); const b = parseRgb(second); if (!a || !b) return 0; const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + 0.05) / (values[1] + 0.05) }
    const effectiveBackground = (element) => { for (let current = element; current; current = current.parentElement) { const value = getComputedStyle(current).backgroundColor; const channels = value.match(/[\d.]+/g)?.map(Number) ?? []; if (channels.length >= 3 && (channels.length < 4 || channels[3] > 0)) return value } return 'rgb(9, 13, 10)' }
    const label = (element) => `${element.tagName}:${element.textContent.trim().replace(/\s+/g, ' ').slice(0, 70)}`
    const undersizedText = textElements.filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 11).map((element) => `${label(element)}:${getComputedStyle(element).fontSize}`)
    const lowContrastText = textElements.filter((element) => contrast(getComputedStyle(element).color, effectiveBackground(element)) < 4.5).map((element) => `${label(element)}:${contrast(getComputedStyle(element).color, effectiveBackground(element)).toFixed(2)}`)
    const undersizedControls = elements.filter((element) => element.tagName === 'BUTTON' && rect(element).height < 43.5).map((element) => `${label(element)}:${Math.round(rect(element).height)}`)
    const readable = (selector) => [...document.querySelectorAll(selector)].filter(visible).every((element) => { const style = getComputedStyle(element); return style.whiteSpace !== 'nowrap' && element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1 })
    const stageList = document.querySelector('.oc-stage-list')
    const buildCommit = document.body.innerText.match(/커밋 ([0-9a-f]{12})/i)?.[1] ?? null
    const buildTree = document.body.innerText.match(/트리 ([0-9a-f]{12})/i)?.[1] ?? null
    const now = document.querySelector('.oc-now')?.getBoundingClientRect(); const axes = document.querySelector('.oc-axes')?.getBoundingClientRect(); const github = document.querySelector('.oc-github')?.getBoundingClientRect()
    const projectId = root.dataset.projectId
    const selectedStageId = document.querySelector('.oc-stage-list button[aria-pressed="true"]')?.dataset.stageId ?? null
    const detail = document.querySelector('.oc-detail'); const detailState = detail?.dataset.stageState ?? null; const detailText = detail?.innerText ?? ''; const completionBar = Boolean(detail?.querySelector('.oc-confirmed'))
    const detailSemantics = Boolean(detailState) && (detailState === 'complete'
      ? completionBar && detailText.includes('증거 확정 / 전체') && detailText.includes('증거가 모두 확정')
      : !completionBar && !detailText.includes('증거가 모두 확정') && detailText.includes('체크됨 / 전체') && !/남은\s*0|미충족\s*0/.test(document.querySelector('.oc-next-condition')?.textContent ?? ''))
    const localizedBottomShell = [...document.querySelectorAll('.oc-stage-list > button')].find((button) => button.dataset.stageId === 'stage-33-bottom-shell-seam-correction'); const localizedBottomState = localizedBottomShell?.dataset.stageState; const localizedBottomLabel = localizedBottomShell?.querySelector('em')?.textContent.trim()
    const bottomShellState = projectId !== 'cherry-note' || (localizedBottomState === 'complete' ? localizedBottomLabel === '완료 조건 충족' : localizedBottomState === 'gates_closed_evidence_pending' ? localizedBottomLabel === '체크 항목 닫힘 · 증거 대기' : Boolean(localizedBottomState && localizedBottomLabel))
    const accessibleText = [...document.querySelectorAll('[aria-label],[title]')].flatMap((element) => [element.getAttribute('aria-label'), element.getAttribute('title')]).filter(Boolean).join('\n')
    const technicalTokens = ['OUTCOME', 'Cherry Note', 'GitHub', 'Cherry', 'TestFlight', 'Mac Mini', 'MacBook', 'iPhone', root.dataset.projectId,
      ...[...document.querySelectorAll('[data-stage-id]')].map((element) => element.dataset.stageId),
      ...[...document.querySelectorAll('.oc-detail-grid li b')].map((element) => element.textContent.trim()),
      ...[...document.querySelectorAll('.oc-groups small')].map((element) => element.textContent.trim()),
    ].filter(Boolean).sort((left, right) => right.length - left.length)
    let englishSurface = `${document.body.innerText}\n${accessibleText}`
    englishSurface = englishSurface
      .replace(/index-[A-Za-z0-9_-]+\.js/g, '')
      .replace(/\b[0-9a-f]{7,64}\b/gi, '')
      .replace(/\b[a-z0-9._-]+\/[a-z0-9._/-]+\b/gi, '')
      .replace(/\b(?:main|origin)\b/gi, '')
    for (const token of technicalTokens) englishSurface = englishSurface.split(token).join('')
    const unexpectedEnglish = [...new Set(englishSurface.match(/[A-Za-z]+(?:\s*&\s*[A-Za-z]+)?/g) ?? [])].sort()
    const translationFallback = [...(`${document.body.innerText}\n${accessibleText}`.match(/[^\n]*한글화 대기[^\n]*/g) ?? [])].map((value) => value.trim())
    return {
      projectId, selectedStageId,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clippedDescendants, axisClips, viewportEscape, siblingIntersections, undersizedText, lowContrastText, undersizedControls,
      currentNextReadable: readable('.oc-orientation strong') && document.querySelectorAll('.oc-orientation strong').length === 2,
      githubReadable: readable('.oc-github strong') && document.querySelectorAll('.oc-github strong').length >= 5,
      allStagesDiscoverable: Boolean(stageList) && !['auto', 'scroll', 'hidden'].includes(getComputedStyle(stageList).overflowY) && [...stageList.querySelectorAll(':scope > button')].every(visible),
      selectedStageExposed: document.querySelectorAll('.oc-stage-list button[aria-pressed="true"]').length === 1,
      sourceStatusText: [...document.querySelectorAll('.oc-topbar nav button')].every((element) => element.getAttribute('aria-label')?.includes('원본 묶음')),
      purpose: requiredPurposeLabels.every((value) => document.body.innerText.includes(value)), githubEvidence: requiredGithubLabels.every((value) => document.body.innerText.includes(value)),
      current: document.body.innerText.includes('현재 위치'), next: document.body.innerText.includes('다음 작업 단계'), inline: getComputedStyle(document.querySelector('.oc-detail')).position === 'relative',
      mobileAuthoritativeOrder: innerWidth > 600 || (now && axes && github && now.top < axes.top && axes.top < github.top),
      axisUsesGateVocabulary: [...document.querySelectorAll('.oc-axis strong')].some((element) => element.textContent.trim() === '완료 조건 충족'),
      bottomShellState,
      detailState, detailSemantics,
      unexpectedEnglish, translationFallback,
      build: Boolean(buildCommit && buildTree && document.body.innerText.includes('실시간 현재 작업은 빌드에 고정되지 않음')), buildCommit, buildTree,
    }
  }, { requiredPurposeLabels, requiredGithubLabels })
}

export function assertDashboardMeasurement(name, result) {
  const failures = []
  if (result.documentOverflow !== 0) failures.push(`documentOverflow=${result.documentOverflow}`)
  if (result.clippedDescendants.length) failures.push(`clipped=${result.clippedDescendants.join(',')}`)
  if (result.viewportEscape.length) failures.push(`viewportEscape=${result.viewportEscape.join(',')}`)
  if (result.siblingIntersections.length) failures.push(`intersections=${result.siblingIntersections.join(',')}`)
  if (result.undersizedControls.length) failures.push(`undersizedControls=${result.undersizedControls.join(',')}`)
  if (result.undersizedText.length) failures.push(`undersizedText=${result.undersizedText.join(',')}`)
  if (result.lowContrastText.length) failures.push(`lowContrastText=${result.lowContrastText.join(',')}`)
  if (result.unexpectedEnglish.length) failures.push(`unexpectedEnglish=${result.unexpectedEnglish.join(',')}`)
  if (result.translationFallback.length) failures.push(`translationFallback=${result.translationFallback.join(',')}`)
  for (const key of ['currentNextReadable', 'githubReadable', 'allStagesDiscoverable', 'selectedStageExposed', 'sourceStatusText', 'purpose', 'githubEvidence', 'current', 'next', 'inline', 'mobileAuthoritativeOrder', 'bottomShellState', 'detailSemantics', 'build']) if (!result[key]) failures.push(`${key}=false`)
  if (result.axisUsesGateVocabulary) failures.push('axisUsesGateVocabulary=true')
  if (failures.length) throw new Error(`${name} failed: ${failures.join(' | ')}`)
}

export async function verifyAllDashboardStates(page, viewportName) {
  await page.getByText('목적과 다음 경계', { exact: false }).waitFor()
  const projectButtons = page.locator('.oc-topbar nav button')
  if (await projectButtons.count() !== 2) throw new Error(`${viewportName}: expected two projects`)
  let measuredStates = 0
  let minimumFocusContrast = Infinity
  const failures = []
  const axisClipStages = new Set()
  let axisClipCount = 0
  for (let projectIndex = 0; projectIndex < 2; projectIndex += 1) {
    await projectButtons.nth(projectIndex).click()
    const projectId = await page.locator('.oc-dashboard').getAttribute('data-project-id')
    const stageButtons = page.locator('.oc-stage-list > button')
    const stageCount = await stageButtons.count()
    if (stageCount < 1) throw new Error(`${viewportName}/${projectId}: 작업 단계가 없습니다`)
    try { minimumFocusContrast = Math.min(minimumFocusContrast, await assertKeyboardFocus(page, `${viewportName}/${projectId}`)) } catch (error) { failures.push(String(error.message)) }
    for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
      const stageButton = page.locator('.oc-stage-list > button').nth(stageIndex)
      await stageButton.click()
      await page.locator('.oc-stage-list > button[aria-pressed="true"]').waitFor()
      const detailLabel = await page.locator('.oc-detail > header small').first().textContent()
      const stageId = detailLabel?.replace(/^작업 단계 상세 ·\s*/, '').trim() || `index-${stageIndex}`
      const result = await measureDashboard(page)
      if (result.axisClips.length) { axisClipStages.add(`${projectId}/${stageId}`); axisClipCount += result.axisClips.length }
      try { assertDashboardMeasurement(`${viewportName}/${projectId}/${stageId}`, result) } catch (error) { failures.push(String(error.message)) }
      if (stageId === 'stage-33-engineering-build-41') try { await assertStage33PackageProjection(page) } catch (error) { failures.push(String(error.message)) }
      measuredStates += 1
    }
  }
  if (failures.length) throw new Error(`${viewportName}: measured projects=2 selectedStages=${measuredStates}; axisClips=${axisClipCount} across ${axisClipStages.size} selectedStages; ${failures.join(' || ')}`)
  console.log(`${viewportName}: projects=2 selectedStages=${measuredStates} unexpectedEnglish=0 translationFallback=0 clipped=0 intersections=0 viewportEscape=0 documentOverflow=0 controls>=44 text>=11 textContrast>=4.5 mobileOrder=true focusContrast>=${minimumFocusContrast.toFixed(2)}`)
}
