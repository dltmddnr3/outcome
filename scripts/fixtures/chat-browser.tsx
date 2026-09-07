import React from 'react'
import { createRoot } from 'react-dom/client'
import { PlannerConversation, PlannerConversationSession } from '../../src/components/PlannerConversation'
import '../../src/styles.css'

let expired = false
const session = { getSessionCredential: async () => expired ? null : 'synthetic-browser-owner' }
createRoot(document.getElementById('root')!).render(<main>
  <h1>로컬 채팅 동작 검증 · 합성 데이터</h1>
  <p>실제 계정·Planner·배포와 연결되지 않은 테스트 화면입니다.</p>
  <button onClick={() => { expired = true }}>합성 인증 만료</button>
  <PlannerConversationSession.Provider value={session}><PlannerConversation events={[]} /></PlannerConversationSession.Provider>
</main>)
