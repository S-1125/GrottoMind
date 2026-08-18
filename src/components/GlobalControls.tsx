import { useState, useEffect, useRef } from 'react'
import { useAgent } from './agent/AgentContext'
import { AgentTriggerButton } from './agent/AgentTriggerButton'
import { FullscreenButton } from './FullscreenButton'
import { soundEngine } from '../utils/soundEngine'

export function GlobalControls() {
  const { currentChapter } = useAgent()
  
  // ---- 全局状态 ----
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(() => !soundEngine.getMuted())
  const [ambientOn, setAmbientOn] = useState(() => soundEngine.getAmbientEnabled())
  const [sfxOn, setSfxOn] = useState(() => soundEngine.getSfxEnabled())
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

  // ---- 切换声音总控 ----
  const handleToggleSound = () => {
    const nextState = !soundOn
    setSoundOn(nextState)
    soundEngine.setMuted(!nextState)
  }

  // 如果在问窟 AI（第三章），完全隐藏该控件组
  if (currentChapter === 'ch3') return null

  return (
    <nav className="intro-ctrl-nav" data-chapter={currentChapter} aria-label="辅助控制" style={{ zIndex: 1000 }}>
      {/* 1. 问窟 AI 唤醒按钮 */}
      <AgentTriggerButton />
      
      {/* 2. 音效总开关 */}
      <button
        className={`intro-ctrl-btn ${soundOn ? 'is-active' : ''}`}
        aria-label={soundOn ? '静音' : '开启音效'}
        onClick={handleToggleSound}
        title={soundOn ? '静音 (Mute)' : '开启石窟音效 (Sound On)'}
      >
        <svg className="ctrl-icon sound-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
          aria-label="无障碍与声学选项"
          aria-expanded={settingsOpen}
          onClick={() => {
            soundEngine.playChime(740, 0.25)
            setSettingsOpen(!settingsOpen)
          }}
          title="系统与声学设置"
        >
          <svg className="ctrl-icon settings-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {settingsOpen && (
          <div className="settings-panel" role="dialog" aria-label="无障碍与声学设置">
            <div className="settings-panel__header">
              <span className="settings-panel__title">声学与视觉交互体验</span>
              <span className="settings-panel__sub">ACOUSTIC & ACCESSIBILITY</span>
            </div>
            
            <div className="settings-group">
              {/* 声学分流控制 */}
              <label className="settings-item">
                <span>石窟空灵背景音 (Ambient)</span>
                <input
                  type="checkbox"
                  checked={ambientOn}
                  onChange={e => {
                    const next = e.target.checked
                    setAmbientOn(next)
                    soundEngine.setAmbientEnabled(next)
                  }}
                />
              </label>

              <label className="settings-item">
                <span>金石交互音效 (SFX)</span>
                <input
                  type="checkbox"
                  checked={sfxOn}
                  onChange={e => {
                    const next = e.target.checked
                    setSfxOn(next)
                    soundEngine.setSfxEnabled(next)
                    if (next) soundEngine.playChime(640, 0.2)
                  }}
                />
              </label>

              <div className="settings-divider" style={{ height: '1px', background: 'rgba(212, 169, 106, 0.15)', margin: '4px 0' }} />

              {/* 视觉与无障碍 */}
              <label className="settings-item">
                <span>减少动效 (Reduce Motion)</span>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={e => {
                    soundEngine.playChime(600, 0.2)
                    setReduceMotion(e.target.checked)
                  }}
                />
              </label>
              
              <label className="settings-item">
                <span>高对比度 (High Contrast)</span>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={e => {
                    soundEngine.playChime(600, 0.2)
                    setHighContrast(e.target.checked)
                  }}
                />
              </label>
              
              <label className="settings-item">
                <span>大号文本 (Large Text)</span>
                <input
                  type="checkbox"
                  checked={largeText}
                  onChange={e => {
                    soundEngine.playChime(600, 0.2)
                    setLargeText(e.target.checked)
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
