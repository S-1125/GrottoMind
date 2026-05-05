import { useState, useEffect, useRef } from 'react'
import { useAgent } from './agent/AgentContext'
import { AgentTriggerButton } from './agent/AgentTriggerButton'
import { FullscreenButton } from './FullscreenButton'

export function GlobalControls() {
  const { currentChapter } = useAgent()
  
  // ---- 全局状态 ----
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  // ---- 无障碍设置同步至根节点 ----
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    document.documentElement.classList.toggle('high-contrast', highContrast)
    document.documentElement.classList.toggle('large-text', largeText)
  }, [reduceMotion, highContrast, largeText])

  // ---- 点击外部关闭设置面板 ----
  useEffect(() => {
    if (!settingsOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [settingsOpen])

  // 如果在问窟 AI（第三章），完全隐藏该控件组
  if (currentChapter === 'ch3') return null

  return (
    <nav className="intro-ctrl-nav" aria-label="辅助控制" style={{ zIndex: 1000 }}>
      {/* 1. 问窟 AI 唤醒按钮 */}
      <AgentTriggerButton />
      
      {/* 2. 音效开关 */}
      <button
        className="intro-ctrl-btn"
        aria-label={soundOn ? '静音' : '开启音效'}
        onClick={() => setSoundOn(!soundOn)}
        title={soundOn ? '静音' : '开启音效'}
      >
        <svg className="ctrl-btn-outline" viewBox="0 0 50 50" aria-hidden="true">
          <rect width="48.25" height="48.25" strokeWidth="1.75" x="0.5" y="0.5" rx="16" />
        </svg>
        <span className="ctrl-btn-bg" />
        <svg className="ctrl-icon sound-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {soundOn ? (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </>
          ) : (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          )}
        </svg>
      </button>

      {/* 3. 全屏切换 */}
      <FullscreenButton />

      {/* 4. 设置面板 */}
      <div className="ctrl-btn-wrapper" ref={settingsRef}>
        <button
          className={`intro-ctrl-btn ${settingsOpen ? 'is-active' : ''}`}
          aria-label="无障碍选项"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
          title="设置"
        >
          <svg className="ctrl-btn-outline" viewBox="0 0 50 50" aria-hidden="true">
            <rect width="48.25" height="48.25" strokeWidth="1.75" x="0.5" y="0.5" rx="16" />
          </svg>
          <span className="ctrl-btn-bg" />
          <svg className="ctrl-icon settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {settingsOpen && (
          <div className="settings-panel">
            <h3 className="settings-title">无障碍选项</h3>
            <div className="settings-list">
              <button
                className={`settings-toggle ${reduceMotion ? 'is-on' : ''}`}
                onClick={() => setReduceMotion(!reduceMotion)}
              >
                <span className="settings-label">减少运动</span>
                <span className="settings-status">{reduceMotion ? 'on' : 'off'}</span>
              </button>
              <button
                className={`settings-toggle ${highContrast ? 'is-on' : ''}`}
                onClick={() => setHighContrast(!highContrast)}
              >
                <span className="settings-label">高对比度</span>
                <span className="settings-status">{highContrast ? 'on' : 'off'}</span>
              </button>
              <button
                className={`settings-toggle ${largeText ? 'is-on' : ''}`}
                onClick={() => setLargeText(!largeText)}
              >
                <span className="settings-label">较大文字</span>
                <span className="settings-status">{largeText ? 'on' : 'off'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
