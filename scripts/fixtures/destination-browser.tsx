import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DestinationStudio } from '../../src/components/DestinationStudio'
import '../../src/styles.css'
import { fetchPrivateWorkspace } from '../../src/lib/api'
const parameters = new URLSearchParams(location.search)
let credentialSequence = 0
if (parameters.has('storage')) await fetchPrivateWorkspace(parameters.has('refresh') ? 'expired-workspace-credential' : undefined, parameters.has('refresh') ? async () => `fresh-fixture-${++credentialSequence}` : undefined)
function Fixture() {
  const [open, setOpen] = useState(false)
  return <main><button onClick={() => setOpen(true)}>목적지 설정</button><DestinationStudio open={open} onClose={() => setOpen(false)} /></main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
