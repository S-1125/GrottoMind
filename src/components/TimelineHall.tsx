import { useEffect, useRef, useState } from 'react'
import { AtmosphereEffects } from './AtmosphereEffects'
import { AtmosphereShader } from './AtmosphereShader'

const timelineNodes = ['山', '寺', '窟', '像', '损', '复']

/* ============================================================
   TimelineHall: 第一章 · 山与窟入口场景
   只建立展厅气质与章节索引，不展开完整内容。
============================================================ */
export function TimelineHall() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [noDrag, setNoDrag] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 展厅阶段继续沿用序章的无障碍全局开关，保证右下角设置按钮真实可用。
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    document.documentElement.classList.toggle('high-contrast', highContrast)
    document.documentElement.classList.toggle('large-text', largeText)
  }, [reduceMotion, highContrast, largeText])

  useEffect(() => {
    // 点击面板外部时关闭设置浮层。
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <section className="timeline-hall" aria-label="第一章：山与窟">
      <video
        className="timeline-hall-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/assets/grotto-flight.mp4" type="video/mp4" />
      </video>

      <div className="timeline-hall-mask" aria-hidden="true" />
      <div className="intro-film-grain" aria-hidden="true" />
      <div className="timeline-hall-vignette" aria-hidden="true" />
      <div className="fog-bottom-dark" aria-hidden="true" />

      <AtmosphereShader currentStep={0} />
      <AtmosphereEffects currentStep={0} />

      <div className="intro-brand-logo exhibition-logo" aria-label="GrottoMind">
        <div className="site-logo-img" />
        <div className="site-logo-img-en" />
      </div>

      <div className="timeline-hall-copy">
        <span className="timeline-hall-kicker">第一章 · 山与窟</span>
        <h1>推开时间的门，山与窟在暗处显影。</h1>
      </div>

      <nav className="timeline-node-index" aria-label="第一章叙事节点">
        {timelineNodes.map((node, index) => (
          <button
            className={`timeline-node ${index === 0 ? 'is-active' : ''}`}
            key={node}
            type="button"
            aria-label={`叙事节点：${node}`}
          >
            <span>{node}</span>
          </button>
        ))}
      </nav>

      <nav className="intro-ctrl-nav exhibition-ctrl-nav" aria-label="辅助控制">
        <div className="ctrl-btn-wrapper" ref={settingsRef}>
          <button
            className={`intro-ctrl-btn ${settingsOpen ? 'is-active' : ''}`}
            aria-label="无障碍选项"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(!settingsOpen)}
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
                <button
                  className={`settings-toggle ${noDrag ? 'is-on' : ''}`}
                  onClick={() => setNoDrag(!noDrag)}
                >
                  <span className="settings-label">无拖动式交互</span>
                  <span className="settings-status">{noDrag ? 'on' : 'off'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className="intro-ctrl-btn"
          aria-label={soundOn ? '静音' : '开启声音'}
          onClick={() => setSoundOn(!soundOn)}
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
      </nav>
    </section>
  )
}
