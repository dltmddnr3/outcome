const requiredPurposeLabels = ['PHASE 목적', 'SCOPE 목적', 'STAGE 목적', 'GATE 목적']
const requiredGithubLabels = ['LOCAL CANDIDATE', 'GITHUB PUBLISHED', 'CHECKS', 'RELEASE', 'completion_authority=false']

export async function exerciseDashboard(page) {
  await page.getByText('목적과 다음 경계', { exact: false }).waitFor()
  await page.getByRole('button', { name: /Cherry Note/ }).click()
  await page.locator('[data-project-id="cherry-note"]').waitFor()
  await page.getByRole('button', { name: /Stage 33 Engineering and Build 41 Evidence/ }).click()
  await page.getByText('57/57', { exact: true }).first().waitFor()
  await page.getByText('링크 미리보기', { exact: true }).waitFor()
  const stage33Groups = await page.evaluate(() => [...document.querySelectorAll('.oc-groups article')].map((group) => ({ label: group.querySelector('strong')?.textContent?.trim(), code: group.querySelector('small')?.textContent?.replace('코드 ', '').trim(), total: Number(group.querySelector('b')?.textContent?.split('/')[1]) })))
  const expectedStage33Groups = [['Y', '링크 미리보기'], ['L', '아이보리 표면·머티리얼'], ['B', '브랜드 아이덴티티'], ['M', '더보기 화면'], ['N', '새 폴더'], ['E', '새 일정 입력'], ['A', '폴더 보관'], ['D', '폴더 하위 트리 복구 삭제'], ['G', '엔지니어링 완료 증거']]
  if (stage33Groups.length !== 9 || stage33Groups.reduce((sum, group) => sum + group.total, 0) !== 57 || expectedStage33Groups.some(([code, label], index) => stage33Groups[index]?.code !== code || stage33Groups[index]?.label !== label)) throw new Error(`Stage33 Package labels failed: ${JSON.stringify(stage33Groups)}`)
  console.log('Stage33 UI: koreanPrimary=9 codeSecondary=9 sourceChecks=57')
  await page.getByText('dltmddnr3/dock', { exact: false }).waitFor()
  await page.getByText('15 ahead', { exact: false }).waitFor()
  await page.getByRole('button', { name: /OUTCOME/ }).click()
  await page.locator('[data-project-id="outcome"]').waitFor()
  await page.getByText('Generic source model', { exact: false }).first().waitFor()
  await page.getByText('dltmddnr3/outcome', { exact: false }).first().waitFor()
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.keyboard.press('Tab')
    if (await page.locator('.oc-stage-list button:focus-visible').count()) break
  }
}

export async function measureDashboard(page) {
  return page.evaluate(({ requiredPurposeLabels, requiredGithubLabels }) => {
    const visible = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' }
    const rect = (element) => element.getBoundingClientRect()
    const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
    const pairwiseIntersections = []
    for (const selector of ['.oc-orientation > div', '.oc-github > div > article', '.oc-purpose-flow > article', '.oc-stage-list > button', '.oc-axes > .oc-axis', '.oc-main > *']) {
      const elements = [...document.querySelectorAll(selector)].filter(visible)
      for (let left = 0; left < elements.length; left += 1) for (let right = left + 1; right < elements.length; right += 1) if (intersects(rect(elements[left]), rect(elements[right]))) pairwiseIntersections.push(`${selector}:${left}-${right}`)
    }
    const clippedDescendants = [...document.querySelectorAll('.oc-dashboard *:not(.oc-visually-hidden)')].filter(visible).flatMap((element) => {
      const style = getComputedStyle(element)
      const horizontal = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1
      const vertical = ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1
      return horizontal || vertical ? [`${element.tagName.toLowerCase()}.${element.className || 'no-class'}:${element.clientWidth}x${element.clientHeight}->${element.scrollWidth}x${element.scrollHeight}`] : []
    })
    const viewportEscape = [...document.querySelectorAll('.oc-dashboard *:not(.oc-visually-hidden)')].filter(visible).flatMap((element) => { const box = rect(element); return box.left < -1 || box.right > document.documentElement.clientWidth + 1 ? [`${element.tagName.toLowerCase()}.${element.className || 'no-class'}:${Math.round(box.left)}-${Math.round(box.right)}`] : [] })
    const readable = (selector) => [...document.querySelectorAll(selector)].filter(visible).every((element) => { const style = getComputedStyle(element); return style.whiteSpace !== 'nowrap' && element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1 })
    const controls = [...document.querySelectorAll('.oc-topbar button, .oc-stage-list button')].filter(visible)
    const undersizedControls = controls.filter((element) => rect(element).height < 43.5).map((element) => `${element.tagName}:${Math.round(rect(element).height)}`)
    const honestyText = [...document.querySelectorAll('.oc-source small, .oc-github small, .oc-github span, .oc-now small, .oc-now span, .oc-bindings small, .oc-bindings span, .oc-stage-list small, .oc-stage-list em, .oc-build small, .oc-build span')].filter(visible)
    const undersizedText = honestyText.filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 11).map((element) => `${element.tagName}:${getComputedStyle(element).fontSize}`)
    const focused = document.activeElement
    const focusStyle = focused instanceof HTMLElement ? getComputedStyle(focused) : null
    const parseRgb = (value) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null
    const luminance = (rgb) => { const channels = rgb.map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4 }); return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] }
    const contrast = (first, second) => { const a = parseRgb(first); const b = parseRgb(second); if (!a || !b) return 0; const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + 0.05) / (values[1] + 0.05) }
    const effectiveBackground = (element) => { for (let current = element; current; current = current.parentElement) { const value = getComputedStyle(current).backgroundColor; const channels = value.match(/[\d.]+/g)?.map(Number) ?? []; if (channels.length >= 3 && (channels.length < 4 || channels[3] > 0)) return value } return 'rgb(9, 13, 10)' }
    const lowContrastText = honestyText.filter((element) => contrast(getComputedStyle(element).color, effectiveBackground(element)) < 4.5).map((element) => `${element.tagName}:${contrast(getComputedStyle(element).color, effectiveBackground(element)).toFixed(2)}`)
    const stageList = document.querySelector('.oc-stage-list')
    const buildCommit = document.body.innerText.match(/commit ([0-9a-f]{12})/i)?.[1] ?? null
    const buildTree = document.body.innerText.match(/tree ([0-9a-f]{12})/i)?.[1] ?? null
    return {
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clippedDescendants, viewportEscape, pairwiseIntersections,
      currentNextReadable: readable('.oc-orientation strong') && document.querySelectorAll('.oc-orientation strong').length === 2,
      githubReadable: readable('.oc-github strong') && document.querySelectorAll('.oc-github strong').length >= 5,
      allStagesDiscoverable: Boolean(stageList) && !['auto', 'scroll', 'hidden'].includes(getComputedStyle(stageList).overflowY) && document.querySelectorAll('.oc-stage-list > button').length >= 8,
      undersizedControls, undersizedText, lowContrastText,
      focus: { width: Number.parseFloat(focusStyle?.outlineWidth ?? '0'), style: focusStyle?.outlineStyle ?? 'none', contrast: contrast(focusStyle?.outlineColor ?? '', focusStyle?.backgroundColor ?? '') },
      selectedStageExposed: document.querySelectorAll('.oc-stage-list button[aria-pressed="true"]').length === 1,
      sourceStatusText: [...document.querySelectorAll('.oc-topbar nav button')].every((element) => element.getAttribute('aria-label')?.includes('PACKAGE SOURCE')),
      purpose: requiredPurposeLabels.every((label) => document.body.innerText.includes(label)), github: requiredGithubLabels.every((label) => document.body.innerText.includes(label)),
      current: document.body.innerText.includes('현재 위치'), next: document.body.innerText.includes('다음 Stage'), inline: getComputedStyle(document.querySelector('.oc-detail')).position === 'relative',
      build: Boolean(buildCommit && buildTree && document.body.innerText.includes('runtime NOW is live/unpinned')), buildCommit, buildTree,
    }
  }, { requiredPurposeLabels, requiredGithubLabels })
}

export function assertDashboardMeasurement(name, result) {
  const failures = []
  if (result.documentOverflow !== 0) failures.push(`documentOverflow=${result.documentOverflow}`)
  if (result.clippedDescendants.length) failures.push(`clipped=${result.clippedDescendants.join(',')}`)
  if (result.viewportEscape.length) failures.push(`viewportEscape=${result.viewportEscape.join(',')}`)
  if (result.pairwiseIntersections.length) failures.push(`intersections=${result.pairwiseIntersections.join(',')}`)
  for (const key of ['currentNextReadable', 'githubReadable', 'allStagesDiscoverable', 'selectedStageExposed', 'sourceStatusText', 'purpose', 'github', 'current', 'next', 'inline', 'build']) if (!result[key]) failures.push(`${key}=false`)
  if (result.undersizedControls.length) failures.push(`undersizedControls=${result.undersizedControls.join(',')}`)
  if (result.undersizedText.length) failures.push(`undersizedText=${result.undersizedText.join(',')}`)
  if (result.lowContrastText.length) failures.push(`lowContrastText=${result.lowContrastText.join(',')}`)
  if (result.focus.width < 3 || result.focus.style === 'none' || result.focus.contrast < 3) failures.push(`focus=${JSON.stringify(result.focus)}`)
  if (failures.length) throw new Error(`${name} failed: ${failures.join(' | ')}`)
  console.log(`${name}: clipped=0 intersections=0 viewportEscape=0 currentNext=readable github=readable stages=discoverable controls>=44 text>=11 textContrast>=4.5 focusContrast=${result.focus.contrast.toFixed(2)} build=${result.buildCommit}/${result.buildTree}`)
}
