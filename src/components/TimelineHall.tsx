import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react'
import { AtmosphereEffects } from './AtmosphereEffects'
import { AtmosphereShader } from './AtmosphereShader'
import { FullscreenButton } from './FullscreenButton'
import { GrottoModelScene } from './GrottoModelScene'

const detailImage = '/assets/qixia-model/3DModel.jpg'

const stupaStops = [
  {
    id: 'intro',
    label: '章',
    nav: '章',
    title: '第一章 · 舍利塔',
    body: '镜头从远处缓慢靠近，舍利塔从云雾与暗金浮尘中显现。请轻滚鼠标，沿着塔身逐段进入它的结构、造像与纹样。',
    mode: 'intro',
    marker: { x: '51%', y: '47%' },
    lens: null,
    button: '开始观察',
  },
  {
    id: 'finial',
    label: '塔刹',
    nav: '刹',
    title: '六重塔刹',
    body: '表面装饰有莲瓣、束腰和云纹，分别象征着佛塔传统的覆钵、相轮和火珠。塔刹向上收束，使整座舍利塔获得清晰的精神指向。',
    mode: 'lens',
    marker: { x: '50.5%', y: '18%' },
    lens: { x: '35%', y: '38%', position: '48% 10%', pattern: 'lotus' },
    button: '查阅形制',
  },
  {
    id: 'eaves',
    label: '塔檐',
    nav: '檐',
    title: '五重密檐',
    body: '层层挑出的密檐具有仿木结构意味，檐角与檐下阴影共同构成石塔向上的节奏。风化让边缘变钝，却没有抹去结构的秩序。',
    mode: 'lens',
    marker: { x: '52%', y: '34%' },
    lens: { x: '34%', y: '42%', position: '54% 22%', pattern: 'joinery' },
    button: '查看结构',
  },
  {
    id: 'niche',
    label: '佛龛',
    nav: '龛',
    title: '三十二尊佛像',
    body: '塔身佛龛以层级方式分布，坐佛、龛楣与塔身转角共同形成连续的礼佛秩序。数字观看在这里不是复原结论，而是重新辨认轮廓。',
    mode: 'lens',
    marker: { x: '51%', y: '54%' },
    lens: { x: '35%', y: '50%', position: '50% 58%', pattern: 'cloud' },
    button: '查看布局',
  },
  {
    id: 'guardian',
    label: '天王',
    nav: '王',
    title: '天王造像',
    body: '第一层转角处的天王身披甲胄，形象威严。仰视镜头让造像重新获得守护者的尺度，也让铠甲线条在石面上变得清晰。',
    mode: 'lens',
    marker: { x: '45%', y: '66%' },
    lens: { x: '34%', y: '55%', position: '38% 72%', pattern: 'armor' },
    button: '阅读造像',
  },
  {
    id: 'bodhisattva',
    label: '菩萨',
    nav: '萨',
    title: '文殊与普贤',
    body: '塔身正东与正西面可见菩萨题材线索。骑狮的文殊与骑象的普贤，使舍利塔不只是建筑，也成为佛教图像的立体长卷。',
    mode: 'lens',
    marker: { x: '57%', y: '66%' },
    lens: { x: '35%', y: '56%', position: '68% 70%', pattern: 'cloud' },
    button: '查看坐骑',
  },
  {
    id: 'base',
    label: '塔基',
    nav: '基',
    title: '九山八海',
    body: '须弥座的束腰部分以海水、龙、亭台楼榭等图像组织空间，呼应佛教宇宙观中的九山八海。塔基让信仰获得可承托的世界结构。',
    mode: 'lens',
    marker: { x: '51%', y: '76%' },
    lens: { x: '35%', y: '60%', position: '52% 86%', pattern: 'wave' },
    button: '查阅象征',
  },
  {
    id: 'story',
    label: '八相',
    nav: '卷',
    title: '八相成道图',
    body: '束腰八面以连续叙事组织佛传：西北面“降兜率天”，北面“树下诞生”，东北面“逾城出家”，东面“降魔成道”，其后依次展开说法、涅槃等故事。这里不打开透镜，请直接在 3D 模型上观察这段石上长卷。',
    mode: 'scroll',
    marker: { x: '49%', y: '82%' },
    lens: null,
    button: '深度阅读',
  },
] as const

type StupaStop = (typeof stupaStops)[number]

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value))
}

function stopProgress(index: number) {
  return index / (stupaStops.length - 1)
}

/* ============================================================
   TimelineHall: 第一章 · 舍利塔全域交互
   以 3D 镜头段落、POI 热点、时空透镜和图文深读构成。
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
  const [hoveredPoi, setHoveredPoi] = useState<string | null>(null)
  const [activePreview, setActivePreview] = useState<StupaStop | null>(null)
  const [activeArticle, setActiveArticle] = useState<StupaStop | null>(null)
  const [curtainActive, setCurtainActive] = useState(false)
  const [cursorPoint, setCursorPoint] = useState({ x: 0, y: 0 })
  const [cursorMode, setCursorMode] = useState<'default' | 'hotspot' | 'lens' | 'button'>('default')
  const [detailZoom, setDetailZoom] = useState(1)
  const [detailOffset, setDetailOffset] = useState({ x: 0, y: 0 })
  const detailDragRef = useRef({ active: false, x: 0, y: 0 })
  const settingsRef = useRef<HTMLDivElement>(null)
  const currentStop = stupaStops[activeStop]
  const activeLensStop = currentStop.mode === 'lens' ? currentStop : null
  const isIntro = currentStop.mode === 'intro'
  const isStoryStop = currentStop.mode === 'scroll'

  const syncProgress = (nextProgress: number) => {
    const clamped = clampProgress(nextProgress)
    setTourProgress(clamped)
    setActiveStop(Math.min(stupaStops.length - 1, Math.round(clamped * (stupaStops.length - 1))))
  }

  const openArticle = (stop: StupaStop) => {
    setCurtainActive(true)
    window.setTimeout(() => {
      setActiveArticle(stop)
    }, 360)
    window.setTimeout(() => {
      setCurtainActive(false)
    }, 760)
  }

  const closeArticle = () => {
    setCurtainActive(true)
    window.setTimeout(() => {
      setActiveArticle(null)
    }, 360)
    window.setTimeout(() => {
      setCurtainActive(false)
    }, 760)
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
        if (activeArticle) closeArticle()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [activeArticle])

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (noDrag || activePreview || activeArticle) return
    event.preventDefault()
    setTourProgress((previousProgress) => {
      const nextProgress = clampProgress(previousProgress + event.deltaY * 0.00042)
      setActiveStop(Math.min(stupaStops.length - 1, Math.round(nextProgress * (stupaStops.length - 1))))
      return nextProgress
    })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    setCursorPoint({ x: event.clientX, y: event.clientY })
  }

  const openPreview = (stop: StupaStop) => {
    setDetailZoom(1)
    setDetailOffset({ x: 0, y: 0 })
    setActivePreview(stop)
  }

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDetailZoom((currentZoom) => Math.min(3.2, Math.max(1, currentZoom - event.deltaY * 0.0012)))
  }

  const handlePreviewPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    detailDragRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePreviewPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!detailDragRef.current.active) return

    const dx = event.clientX - detailDragRef.current.x
    const dy = event.clientY - detailDragRef.current.y
    detailDragRef.current.x = event.clientX
    detailDragRef.current.y = event.clientY
    setDetailOffset((currentOffset) => ({
      x: currentOffset.x + dx,
      y: currentOffset.y + dy,
    }))
  }

  const handlePreviewPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (detailDragRef.current.active && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    detailDragRef.current.active = false
  }

  return (
    <section
      className="timeline-hall stupa-chapter"
      aria-label="第一章：舍利塔"
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
    >
      <div
        className={`museum-cursor is-${cursorMode}`}
        style={{
          '--cursor-x': `${cursorPoint.x}px`,
          '--cursor-y': `${cursorPoint.y}px`,
        } as CSSProperties}
        aria-hidden="true"
      >
        <span className="museum-cursor-dot" />
        <span className="museum-cursor-ring" />
      </div>

      <div className="timeline-hall-mask" aria-hidden="true" />
      <div className="timeline-hall-vignette" aria-hidden="true" />
      <div className="fog-bottom-dark" aria-hidden="true" />

      <AtmosphereShader currentStep={0} />
      <AtmosphereEffects currentStep={0} />

      <GrottoModelScene progress={tourProgress} />
      <div className="intro-film-grain" aria-hidden="true" />

      <div className="intro-brand-logo exhibition-logo" aria-label="GrottoMind">
        <div className="site-logo-img" />
        <div className="site-logo-img-en" />
      </div>

      <div className={`timeline-hall-copy stupa-intro-copy ${isIntro ? 'is-visible' : ''}`}>
        <span className="timeline-hall-kicker">第一章 · 舍利塔</span>
        <h1>第一章 · 舍利塔</h1>
        <p>{stupaStops[0].body}</p>
      </div>

      <div className="stupa-poi-layer" aria-label="舍利塔局部热点">
        {stupaStops.slice(1).map((stop, index) => {
          const actualIndex = index + 1
          const isActive = activeStop === actualIndex
          const isHovered = hoveredPoi === stop.id

          return (
            <button
              className={`stupa-poi ${isActive ? 'is-active' : ''} ${isHovered ? 'is-hovered' : ''}`}
              key={stop.id}
              type="button"
              style={{
                left: stop.marker.x,
                top: stop.marker.y,
              }}
              aria-label={`前往${stop.title}`}
              onPointerEnter={() => {
                setHoveredPoi(stop.id)
                setCursorMode('hotspot')
              }}
              onPointerLeave={() => {
                setHoveredPoi(null)
                setCursorMode('default')
              }}
              onClick={() => syncProgress(stopProgress(actualIndex))}
            >
              <span />
            </button>
          )
        })}
      </div>

      {activeLensStop && (
        <div className="stupa-lens-stage" key={activeLensStop.id}>
          <button
            className={`stupa-lens stupa-lens-${activeLensStop.lens.pattern}`}
            type="button"
            style={{
              left: activeLensStop.lens.x,
              top: activeLensStop.lens.y,
              '--detail-image': `url(${detailImage})`,
              '--detail-position': activeLensStop.lens.position,
            } as CSSProperties}
            aria-label={`查看${activeLensStop.title}原貌细节`}
            onPointerEnter={() => setCursorMode('lens')}
            onPointerLeave={() => setCursorMode('default')}
            onClick={() => openPreview(activeLensStop)}
          >
            <span className="stupa-lens-ornament" aria-hidden="true" />
            <span className="stupa-lens-core" aria-hidden="true" />
            <span className="stupa-lens-hint">点击查看原貌</span>
          </button>

          <article className="stupa-info-panel">
            <span className="stupa-info-kicker">{activeLensStop.label}</span>
            <h2>{activeLensStop.title}</h2>
            <i aria-hidden="true" />
            <p>{activeLensStop.body}</p>
            <button
              type="button"
              onPointerEnter={() => setCursorMode('button')}
              onPointerLeave={() => setCursorMode('default')}
              onClick={() => openArticle(activeLensStop)}
            >
              {activeLensStop.button}
              <span aria-hidden="true">→</span>
            </button>
          </article>
        </div>
      )}

      {isStoryStop && (
        <article className="stupa-info-panel stupa-story-panel" key={currentStop.id}>
          <span className="stupa-info-kicker">{currentStop.label}</span>
          <h2>{currentStop.title}</h2>
          <i aria-hidden="true" />
          <p>{currentStop.body}</p>
          <button
            type="button"
            onPointerEnter={() => setCursorMode('button')}
            onPointerLeave={() => setCursorMode('default')}
            onClick={() => openArticle(currentStop)}
          >
            {currentStop.button}
            <span aria-hidden="true">→</span>
          </button>
        </article>
      )}

      <nav className="timeline-node-index stupa-node-index" aria-label="第一章漫游节点">
        {stupaStops.map((stop, index) => (
          <button
            className={`timeline-node ${index === activeStop ? 'is-active' : ''}`}
            key={stop.id}
            type="button"
            aria-label={`漫游节点：${stop.title}`}
            aria-pressed={index === activeStop}
            onPointerEnter={() => setCursorMode('button')}
            onPointerLeave={() => setCursorMode('default')}
            onClick={() => syncProgress(stopProgress(index))}
          >
            <span>{stop.nav}</span>
          </button>
        ))}
      </nav>

      <div className="timeline-tour-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(0.08, tourProgress)})` }} />
      </div>

      <p className="timeline-scroll-hint">轻滚鼠标，镜头沿舍利塔局部游览。</p>

      {activePreview && (
        <div className="stupa-deep-view" role="dialog" aria-modal="true" aria-label={`${activePreview.title}高清细节`}>
          <button
            className="stupa-deep-close"
            type="button"
            aria-label="关闭细节预览"
            onPointerEnter={() => setCursorMode('button')}
            onPointerLeave={() => setCursorMode('default')}
            onClick={() => setActivePreview(null)}
          >
            ×
          </button>
          <div
            className="stupa-deep-canvas"
            role="img"
            aria-label={activePreview.title}
            onWheel={handlePreviewWheel}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerUp}
            onPointerLeave={handlePreviewPointerUp}
          >
            <img
              src={detailImage}
              alt={activePreview.title}
              style={{
                transform: `translate(${detailOffset.x}px, ${detailOffset.y}px) scale(${detailZoom})`,
              }}
            />
          </div>
          <p className="stupa-deep-caption">拖拽移动，滚轮缩放。当前为风化细节占位图。</p>
        </div>
      )}

      {activeArticle && (
        <article className="stupa-article-view" aria-label={`${activeArticle.title}图文扩展页`}>
          <button
            className="stupa-article-close"
            type="button"
            aria-label="关闭图文扩展页"
            onPointerEnter={() => setCursorMode('button')}
            onPointerLeave={() => setCursorMode('default')}
            onClick={closeArticle}
          >
            ×
          </button>
          <aside>
            <img src={detailImage} alt={`${activeArticle.title}文献占位图`} />
            <span>{activeArticle.title}</span>
          </aside>
          <div className="stupa-article-scroll">
            <section>
              <span>Research Note</span>
              <h2>{activeArticle.title}</h2>
              <p>{activeArticle.body}</p>
              <p>
                后续这里将替换为该局部的历史照片、文献扫描与结构说明。当前版本先建立展馆式图文阅读框架，确保从 3D 场景到 2D 长页的过渡节奏成立。
              </p>
            </section>
            <section>
              <span>Material Reading</span>
              <h3>石面、纹样与观看边界</h3>
              <p>
                所有复彩与显影内容都应被标注为数字推演，而非历史原貌判断。图文页承担解释功能，帮助观众区分文物现状、视觉研究与 AI 想象。
              </p>
            </section>
          </div>
        </article>
      )}

      <div className={`blackout-transition ${curtainActive ? 'is-active' : ''}`} aria-hidden="true" />

      <nav className="intro-ctrl-nav exhibition-ctrl-nav" aria-label="辅助控制">
        <div className="ctrl-btn-wrapper" ref={settingsRef}>
          <button
            className={`intro-ctrl-btn ${settingsOpen ? 'is-active' : ''}`}
            aria-label="无障碍选项"
            aria-expanded={settingsOpen}
            onPointerEnter={() => setCursorMode('button')}
            onPointerLeave={() => setCursorMode('default')}
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
          onPointerEnter={() => setCursorMode('button')}
          onPointerLeave={() => setCursorMode('default')}
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
