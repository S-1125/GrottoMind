import { useAgent } from './AgentContext'

export function AgentTriggerButton() {
  const { isChatOpen, setChatOpen, orbVisible } = useAgent()

  if (!orbVisible) return null

  return (
    <button
      className={`intro-ctrl-btn ${isChatOpen ? 'is-active' : ''}`}
      onClick={() => setChatOpen(!isChatOpen)}
      aria-label="唤醒问窟者"
      title="问窟者 AI 导览"
    >
      <svg className="ctrl-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
      </svg>
    </button>
  )
}
