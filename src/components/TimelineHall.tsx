import { useEffect, useRef, useState, type CSSProperties, type WheelEvent } from 'react'
import { AtmosphereEffects } from './AtmosphereEffects'
import { AtmosphereShader } from './AtmosphereShader'
import { FullscreenButton } from './FullscreenButton'
import { GrottoModelScene } from './GrottoModelScene'

const tourStops = [
  {
    id: 'overview',
    label: '塔',
    title: '舍利塔',
    body: '1400 年前，金陵栖霞山立起一座承载信仰与时间的舍利塔。它不是孤立的建筑，而是山、寺、窟之间的精神坐标。',
  },
  {
    id: 'eaves',
    label: '檐',
    title: '层檐',
    body: '层层石檐向外舒展，承接天光，也留下风化的阴影。檐口的起伏让舍利塔在静止中仍有向上的节奏。',
  },
  {
    id: 'niche',
    label: '龛',
    title: '塔身佛龛',
    body: '塔身龛像与浮雕把信仰刻入石面。人物、衣纹与龛壁在岁月中磨损，却仍保留可被重新观看的线索。',
  },
  {
    id: 'texture',
    label: '纹',
    title: '石上纹样',
    body: '裂隙、磨蚀与残留纹理不是噪点，而是时间的细节。它们提示我们：数字显影应先尊重石头本身。',
  },
]

const detailHotspots = [
  {
    id: 'eaves-detail',
    stopIndex: 1,
    label: '檐',
    title: '层檐石构',
    body: '塔檐以层层外挑形成稳定的垂直节奏，阴影在檐下聚集，使石塔的重量感与向上感同时存在。',
    x: '56%',
    y: '34%',
    image: '/assets/qixia-model/3DModel.jpg',
    previewPosition: '52% 18%',
  },
  {
    id: 'niche-detail',
    stopIndex: 2,
    label: '龛',
    title: '塔身佛龛',
    body: '龛像所在的塔身面，是舍利塔与石窟造像关系最直接的观看入口。这里的残损会成为后续复彩推演的重要依据。',
    x: '53%',
    y: '58%',
    image: '/assets/qixia-model/3DModel.jpg',
    previewPosition: '50% 58%',
  },
  {
    id: 'texture-detail',
    stopIndex: 3,
    label: '纹',
    title: '风化纹理',
    body: '石面纹样与风化裂隙共同构成“时间层”。本项目中的数字复彩不会覆盖这些痕迹，而是让颜色从痕迹之间显影。',
    x: '50%',
    y: '45%',
    image: '/assets/qixia-model/3DModel.jpg',
    previewPosition: '66% 40%',
  },
]

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value))
}

/* ============================================================
   TimelineHall: 第一章 · 塔与窟全景漫游
   使用真实 OBJ 模型建立轻量 3D 观看体验。
============================================================ */
export function TimelineHall() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [noDrag, setNoDrag] = useState(false)
  const [tourProgress, setTourProgress] = useState(0)
  const [activeStop, setActiveStop] = useState(0)
  const [activePreview, setActivePreview] = useState<(typeof detailHotspots)[number] | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const currentStop = tourStops[activeStop]

  const syncProgress = (nextProgress: number) => {
    const clamped = clampProgress(nextProgress)
    setTourProgress(clamped)
    setActiveStop(Math.min(tourStops.length - 1, Math.round(clamped * (tourStops.length - 1))))
  }

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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePreview(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (noDrag) return
    event.preventDefault()
    setTourProgress((previousProgress) => {
      const nextProgress = clampProgress(previousProgress + event.deltaY * 0.00078)
      setActiveStop(Math.min(tourStops.length - 1, Math.round(nextProgress * (tourStops.length - 1))))
      return nextProgress
    })
  }

  return (
    <section className="timeline-hall" aria-label="第一章：舍利塔" onWheel={handleWheel}>
      {/* 层级顺序：遮罩(z:2-4) → 模型(z:5) → 文字/UI(z:8+) */}
      <div className="timeline-hall-mask" aria-hidden="true" />
      <div className="timeline-hall-vignette" aria-hidden="true" />
      <div className="fog-bottom-dark" aria-hidden="true" />

      <AtmosphereShader currentStep={0} />
      <AtmosphereEffects currentStep={0} />

      {/* 模型在遮罩之上，不被暗角压暗 */}
      <GrottoModelScene progress={tourProgress} />
      <div className="intro-film-grain" aria-hidden="true" />

      <div className="intro-brand-logo exhibition-logo" aria-label="GrottoMind">
        <div className="site-logo-img" />
        <div className="site-logo-img-en" />
      </div>

      <div className="timeline-hall-copy" key={currentStop.id}>
        <span className="timeline-hall-kicker">第一章 · 舍利塔</span>
        <h1>{currentStop.title}</h1>
        <p>{currentStop.body}</p>
      </div>

      <div className="timeline-hotspot-layer" aria-label="舍利塔局部细节">
        {detailHotspots.map((hotspot) => {
          const isVisible = activeStop === hotspot.stopIndex

          return (
            <button
              className={`timeline-magnifier ${isVisible ? 'is-visible' : ''}`}
              key={hotspot.id}
              type="button"
              style={{
                left: hotspot.x,
                top: hotspot.y,
                '--detail-image': `url(${hotspot.image})`,
                '--detail-position': hotspot.previewPosition,
              } as CSSProperties}
              aria-label={`查看${hotspot.title}细节`}
              aria-hidden={!isVisible}
              tabIndex={isVisible ? 0 : -1}
              onClick={() => setActivePreview(hotspot)}
            >
              <span className="timeline-magnifier-ring" aria-hidden="true" />
              <span className="timeline-magnifier-lens" aria-hidden="true" />
              <span className="timeline-magnifier-label">{hotspot.label}</span>
            </button>
          )
        })}
      </div>

      <nav className="timeline-node-index" aria-label="第一章漫游节点">
        {tourStops.map((stop, index) => (
          <button
            className={`timeline-node ${index === activeStop ? 'is-active' : ''}`}
            key={stop.id}
            type="button"
            aria-label={`漫游节点：${stop.title}`}
            aria-pressed={index === activeStop}
            onClick={() => syncProgress(index / (tourStops.length - 1))}
          >
            <span>{stop.label}</span>
          </button>
        ))}
      </nav>

      <div className="timeline-tour-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(0.08, tourProgress)})` }} />
      </div>

      <p className="timeline-scroll-hint">轻滚鼠标，推近舍利塔的局部细节。</p>

      {activePreview && (
        <div className="timeline-detail-preview" role="dialog" aria-modal="true" aria-label={`${activePreview.title}全屏细节`}>
          <button
            className="timeline-detail-backdrop"
            type="button"
            aria-label="关闭细节预览"
            onClick={() => setActivePreview(null)}
          />
          <figure className="timeline-detail-panel">
            <div className="timeline-detail-image-wrap">
              <img src={activePreview.image} alt={activePreview.title} />
            </div>
            <figcaption className="timeline-detail-copy">
              <span>局部细节</span>
              <h2>{activePreview.title}</h2>
              <p>{activePreview.body}</p>
              <button type="button" onClick={() => setActivePreview(null)}>
                返回舍利塔
              </button>
            </figcaption>
          </figure>
        </div>
      )}

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
        <FullscreenButton />
      </nav>
    </section>
  )
}
