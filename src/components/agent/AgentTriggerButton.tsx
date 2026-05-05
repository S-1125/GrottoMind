import { useAgent } from './AgentContext'

export function AgentTriggerButton() {
  const { isChatOpen, setChatOpen, orbVisible } = useAgent()

  if (!orbVisible) return null

  return (
    <button
      className={`intro-ctrl-btn ${isChatOpen ? 'is-active' : ''}`}
      onClick={() => setChatOpen(!isChatOpen)}
      aria-label="唤醒问窟者"
      title="唤醒问窟者"
    >
      <svg className="ctrl-btn-outline" viewBox="0 0 50 50" aria-hidden="true">
        <rect width="48.25" height="48.25" strokeWidth="1.75" x="0.5" y="0.5" rx="16" />
      </svg>
      <span className="ctrl-btn-bg" />
      <svg className="ctrl-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
      </svg>
    </button>
  )
}
