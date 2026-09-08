import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DestinationStudio } from '../../src/components/DestinationStudio'
import '../../src/styles.css'
function Fixture() {
  const [open, setOpen] = useState(false)
  return <main><button onClick={() => setOpen(true)}>목적지 설정</button><DestinationStudio open={open} onClose={() => setOpen(false)} /></main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
