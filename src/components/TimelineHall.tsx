import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type WheelEvent,
} from 'react'
import gsap from 'gsap'
import { AtmosphereEffects } from './AtmosphereEffects'
import { AtmosphereShader } from './AtmosphereShader'
import { FullscreenButton } from './FullscreenButton'
import { GrottoModelScene, type GrottoModelSceneHandle } from './GrottoModelScene'

/* ============================================================
   停靠点数据：每个停靠点定义了相机位置、UI 内容和透镜参数
============================================================ */
const stupaStops = [
  {
    id: 'intro',
    label: '章',
    nav: '章',
    title: '舍利塔',
    subtitle: '第一章 · 舍利塔',
    body: '1400 年前，金陵栖霞山立起一座承载信仰与时间的舍利塔。\n它不是孤立的建筑，而是山、寺、窟之间的精神坐标。',
    mode: 'intro' as const,
    marker: { x: '51%', y: '47%' },
    lensImage: '',
    lensPosition: '',
    icon: '',
  },
  {
    id: 'finial',
    label: '塔刹',
    nav: '刹',
    title: '六重塔刹',
    subtitle: '塔刹 · Finial',
    body: '表面装饰有莲瓣、束腰和云纹，分别象征着佛塔传统的覆钵、相轮和火珠。塔刹向上收束，使整座舍利塔获得清晰的精神指向。',
    mode: 'lens' as const,
    marker: { x: '50.5%', y: '18%' },
    lensImage: '/1.jpg',
    lensPosition: '50% 50%',
    icon: '/icon1/图层 9.png',
  },
  {
    id: 'eaves',
    label: '塔檐',
    nav: '檐',
    title: '五重密檐',
    subtitle: '塔檐 · Eaves',
    body: '层层挑出的密檐具有仿木结构意味，檐角与檐下阴影共同构成石塔向上的节奏。风化让边缘变钝，却没有抹去结构的秩序。',
    mode: 'lens' as const,
    marker: { x: '52%', y: '34%' },
    lensImage: '/2.jpg',
    lensPosition: '50% 50%',
    icon: '/icon1/图层 11.png',
  },
  {
    id: 'niche',
    label: '佛龛',
    nav: '龛',
    title: '三十二尊佛像',
    subtitle: '佛龛 · Niche',
    body: '塔身佛龛以层级方式分布，坐佛、龛楣与塔身转角共同形成连续的礼佛秩序。数字观看在这里不是复原结论，而是重新辨认轮廓。',
    mode: 'lens' as const,
    marker: { x: '51%', y: '54%' },
    lensImage: '/3.jpg',
    lensPosition: '50% 50%',
    icon: '/icon1/图层 12.png',
  },
  {
    id: 'guardian',
    label: '天王',
    nav: '王',
    title: '天王造像',
    subtitle: '天王 · Guardian',
    body: '第一层转角处的天王身披甲胄，形象威严。仰视镜头让造像重新获得守护者的尺度，也让铠甲线条在石面上变得清晰。',
    mode: 'lens' as const,
    marker: { x: '45%', y: '66%' },
    lensImage: '/章节1图片素材/天王-1.jpg',
    lensPosition: '38% 72%',
    icon: '/icon1/图层 10.png',
  },
  {
    id: 'bodhisattva',
    label: '菩萨',
    nav: '萨',
    title: '文殊与普贤',
    subtitle: '菩萨 · Bodhisattva',
    body: '塔身正东与正西面可见菩萨题材线索。骑狮的文殊与骑象的普贤，使舍利塔不只是建筑，也成为佛教图像的立体长卷。',
    mode: 'lens' as const,
    marker: { x: '57%', y: '66%' },
    lensImage: '/章节1图片素材/普贤菩萨.jpg',
    lensPosition: '68% 70%',
    icon: '/icon1/图层 1.png',
  },
  {
    id: 'base',
    label: '塔基',
    nav: '基',
    title: '九山八海',
    subtitle: '塔基 · Base',
    body: '须弥座的束腰部分以海水、龙、亭台楼榭等图像组织空间，呼应佛教宇宙观中的九山八海。塔基让信仰获得可承托的世界结构。',
    mode: 'lens' as const,
    marker: { x: '51%', y: '76%' },
    lensImage: '/章节1图片素材/塔基与须弥座.jpg',
    lensPosition: '52% 86%',
    icon: '/icon1/图层 13.png',
  },
  {
    id: 'story',
    label: '八相',
    nav: '卷',
    title: '八相成道图',
    subtitle: '八相成道 · Story',
    body: '束腰八面以连续叙事组织佛传：西北面"降兜率天"，北面"树下诞生"，东北面"逾城出家"，东面"降魔成道"，其后依次展开说法、涅槃等故事。',
    mode: 'scroll' as const,
    marker: { x: '49%', y: '82%' },
    lensImage: '/章节1图片素材/八相成道图-1.jpg',
    lensPosition: '50% 50%',
    icon: '/icon1/图层 14.png',
  },
]


function stopProgress(index: number) {
  return index / (stupaStops.length - 1)
}

/* ============================================================
   TimelineHall: 第一章 · 舍利塔全域交互
   GSAP 驱动的状态机管理所有 UI 过渡与相机运动。
============================================================ */
interface TimelineHallProps {
  onDeepRead?: () => void;
}

export function TimelineHall({ onDeepRead }: TimelineHallProps) {
  // ---- 核心状态 ----
  const [currentStop, setCurrentStop] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [displayedImage, setDisplayedImage] = useState<string | null>(null)

  // 当 activeImage 改变时，如果有值，就同步给 displayedImage（用于维持退出动画期间的 src）
  useEffect(() => {
    if (activeImage) {
      setDisplayedImage(activeImage)
    }
  }, [activeImage])

  // ---- 辅助 UI 状态 ----
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [largeText, setLargeText] = useState(false)

  // ---- Refs ----
  const modelRef = useRef<GrottoModelSceneHandle>(null)
  const cameraProgressRef = useRef(0)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const fadeGroupRef = useRef<HTMLDivElement>(null)
  const introTextRef = useRef<HTMLDivElement>(null)
  const introVeilRef = useRef<HTMLDivElement>(null)
  const [introFadedOut, setIntroFadedOut] = useState(false)

  const stop = stupaStops[currentStop]
  const isLens = stop.mode === 'lens'
  const isStory = stop.mode === 'scroll'

  // ---- 无障碍 ----
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    document.documentElement.classList.toggle('high-contrast', highContrast)
    document.documentElement.classList.toggle('large-text', largeText)
  }, [reduceMotion, highContrast, largeText])

  // ---- 初始淡入：整页淡入 + 序章标题淡入后自动淡出 ----
  useEffect(() => {
    const introEl = introTextRef.current
    const veilEl = introVeilRef.current

    if (introEl && veilEl) {
      const kicker = introEl.querySelector('.timeline-hall-kicker')
      const title = introEl.querySelector('h1')
      const titleIcon = introEl.querySelector('.stupa-intro-title-icon')
      const p = introEl.querySelector('p')
      
      const introTl = gsap.timeline()
      
      // 遮罩层默认显示（提亮 15%，从 0.85 降至 0.70）
      gsap.set(veilEl, { opacity: 0.70 })
      gsap.set(introEl, { opacity: 1 })
      
      introTl
        // 1. Kicker 出现 (微光)
        .fromTo(kicker,
          { opacity: 0, y: 15, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out' },
          '-=0.8'
        )
        // 2. 主标题出现 (从大到小，模糊变清晰，字间距略微收缩)
        .fromTo(title,
          { opacity: 0, scale: 1.15, filter: 'blur(12px)', letterSpacing: '0.15em' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0.04em', duration: 1.8, ease: 'power3.out' },
          '-=0.6'
        )
        // 2.5 Kicker 背后的 icon 浮现 (100%透明度)
        .fromTo(titleIcon,
          { opacity: 0, scale: 0.9, filter: 'blur(8px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, ease: 'power2.out' },
          '-=1.4'
        )
        // 3. 正文段落浮现
        .fromTo(p,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' },
          '-=1.0'
        )
        // 停留展示 (缩短0.5s，变为2.3s)
        .to({}, { duration: 2.3 })
        // 淡出序章文字和遮罩层
        .to([introEl, veilEl], {
          opacity: 0,
          y: -15, // 仅影响文字，遮罩的 y 不明显
          duration: 1.6,
          ease: 'power2.inOut',
          stagger: 0.1,
          onComplete: () => setIntroFadedOut(true),
        })
    }

    // fadeGroup 也需要淡入（非序章内容在之后的过渡中控制）
    if (fadeGroupRef.current) {
      gsap.fromTo(fadeGroupRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out', delay: 0.3 }
      )
    }
  }, [])

  // ---- 点击外部关闭设置 ----
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ---- 核心过渡函数 ----
  const transitionTo = useCallback((targetIndex: number) => {
    if (isAnimating) return
    if (targetIndex < 0 || targetIndex >= stupaStops.length) return
    if (targetIndex === currentStop) return

    setIsAnimating(true)
    timelineRef.current?.kill()

    const tl = gsap.timeline()
    timelineRef.current = tl
    const targetProgress = stopProgress(targetIndex)

    // 阶段 A：当前 UI 淡出
    if (fadeGroupRef.current) {
      const group = fadeGroupRef.current
      const els = group.querySelectorAll('h2, i, p, .stupa-deep-read-btn, .stupa-info-kicker, .stupa-info-icon')
      const lens = group.querySelector('.stupa-lens')
      
      tl.to(els, {
        opacity: 0,
        y: 10,
        duration: 0.4,
        ease: 'power2.in',
        stagger: 0.05
      }, 0)
      
      if (lens) {
        tl.to(lens, {
          clipPath: 'circle(0% at center)',
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in'
        }, 0)
      }
    }

    // 阶段 B：相机飞行（GSAP 驱动 power3.inOut 缓动）
    tl.to(cameraProgressRef, {
      current: targetProgress,
      duration: 2.0,
      ease: 'power3.inOut',
      onUpdate: () => {
        modelRef.current?.setCameraProgress(cameraProgressRef.current)
      },
    })

    // 切换停靠点（此时 UI 不可见，所以 React 重渲染不会闪烁）
    tl.call(() => {
      setCurrentStop(targetIndex)
      
      // 判断是否进入“八相成道”轨道模式
      const isTargetStory = stupaStops[targetIndex].mode === 'scroll'
      modelRef.current?.setOrbitMode?.(isTargetStory)
    })

    // 短暂等待 React 渲染
    tl.to({}, { duration: 0.08 })

    // 阶段 C：新 UI 淡入
    tl.call(() => {
      if (!fadeGroupRef.current) {
        setIsAnimating(false)
        return
      }
      
      const group = fadeGroupRef.current
      // 重置整体透明度和位置（因为前面阶段 A 改的是子元素）
      gsap.set(group, { opacity: 1, y: 0 })
      
      const title = group.querySelector('h2')
      const line = group.querySelector('i')
      const body = group.querySelector('p')
      const btn = group.querySelector('.stupa-deep-read-btn')
      const lens = group.querySelector('.stupa-lens')
      const kicker = group.querySelector('.stupa-info-kicker')
      const icon = group.querySelector('.stupa-info-icon')

      const enterTl = gsap.timeline({ onComplete: () => setIsAnimating(false) })
      
      // 0ms: 标题自下而上滑入
      if (title) {
        enterTl.fromTo(title, 
          { opacity: 0, y: 15 }, 
          { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
          0
        )
      }
      
      if (kicker) {
         enterTl.fromTo(kicker, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0)
      }
      if (icon) {
         enterTl.fromTo(icon, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0)
      }
      
      // 透镜圆润撑开
      if (lens) {
         enterTl.fromTo(lens,
            { clipPath: 'circle(0% at center)', opacity: 0 },
            { clipPath: 'circle(50% at center)', opacity: 1, duration: 0.8, ease: 'power2.out' },
            0
         )
         const ornament = lens.querySelector('.stupa-lens-ornament')
         if (ornament) {
            enterTl.fromTo(ornament,
               { rotation: -45 },
               { rotation: 0, duration: 0.8, ease: 'power2.out' },
               0
            )
         }
      }

      // 100ms: 装饰线展开
      if (line) {
        enterTl.fromTo(line,
          { width: 0, opacity: 0 },
          { width: '100%', opacity: 1, duration: 0.8, ease: 'power2.out' },
          0.1
        )
      }

      // 200ms: 正文段落淡入并轻微上浮
      if (body) {
        enterTl.fromTo(body,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
          0.2
        )
      }

      // 300ms: 深度阅读按钮
      if (btn) {
        enterTl.fromTo(btn,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
          0.3
        )
      }
    })
  }, [currentStop, isAnimating])

  // ---- 滚动防抖：每次仅前进/后退一个停靠点 ----
  const handleWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    event.preventDefault()
    if (isAnimating) return

    // 将 deltaY 转化为方向性离散信号
    const direction = event.deltaY > 0 ? 1 : -1
    transitionTo(currentStop + direction)
  }, [isAnimating, currentStop, transitionTo])

  // ---- 键盘导航 ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        transitionTo(currentStop + 1)
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        transitionTo(currentStop - 1)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [currentStop, transitionTo])

  // ---- 渲染 ----
  return (
    <section
      className="timeline-hall stupa-chapter"
      aria-label="第一章：舍利塔"
      onWheel={handleWheel}
    >
      {/* 暗角遮罩与氛围层 */}
      <div className="timeline-hall-mask" aria-hidden="true" />
      <div className="timeline-hall-vignette" aria-hidden="true" />
      <div className="fog-bottom-dark" aria-hidden="true" />
      <AtmosphereShader currentStep={0} />
      <AtmosphereEffects currentStep={0} />

      {/* 3D 模型场景 */}
      <GrottoModelScene ref={modelRef} />
      <div className="intro-film-grain" aria-hidden="true" />

      {/* Logo */}
      <div className="intro-brand-logo exhibition-logo" aria-label="GrottoMind">
        <div className="site-logo-img" />
        <div className="site-logo-img-en" />
      </div>

      {/* ============================================================
          序章全屏居中标题 — 独立于 fadeGroup，GSAP 控制淡入→停留→淡出
      ============================================================ */}
      {!introFadedOut && (
        <>
          {/* 背景压暗遮罩 */}
          <div ref={introVeilRef} className="stupa-intro-veil" aria-hidden="true" />
          
          <div
            ref={introTextRef}
            className="timeline-hall-copy stupa-intro-copy"
          >
            <div className="stupa-kicker-wrap">
              <div className="stupa-intro-title-icon" aria-hidden="true" />
              <span className="timeline-hall-kicker">第一章</span>
            </div>
            <h1>舍利塔</h1>
            <p>
              1400 年前，金陵栖霞山立起一座承载信仰与时间的舍利塔。
              <br />
              它不是孤立的建筑，而是山、寺、窟之间的精神坐标。
            </p>
          </div>
        </>
      )}

      {/* ============================================================
          可淡入淡出的 UI 组 — 所有内容放在一个容器内
          GSAP 通过 fadeGroupRef 统一控制 opacity
      ============================================================ */}
      <div className="stupa-fade-group" ref={fadeGroupRef}>

        {/* ---- 透镜 + 信息面板 + 引线 ---- */}
        {isLens && (
          <div className="stupa-lens-stage">
            {/* SVG 引导线 */}
            <svg className="stupa-guide-svg" aria-hidden="true">
              <line
                className="stupa-guide-line"
                x1={stop.marker.x}
                y1={stop.marker.y}
                x2="68%"
                y2="50%"
              />
            </svg>

            {/* 透镜 */}
            <button
              className="stupa-lens interactive"
              type="button"
              onClick={() => setActiveImage(stop.lensImage)}
              style={{
                left: stop.marker.x,
                top: stop.marker.y,
                '--detail-image': `url("${stop.lensImage}")`,
                '--detail-position': stop.lensPosition,
              } as CSSProperties}
              aria-label={`查看${stop.title}原貌细节`}
            >
              <span className="stupa-lens-ornament" aria-hidden="true" />
              <span className="stupa-lens-core" aria-hidden="true" />
            </button>

            {/* 信息面板 */}
            <article className="stupa-info-panel">
              {stop.icon && (
                <img
                  className="stupa-info-icon"
                  src={stop.icon}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <span className="stupa-info-kicker">{stop.subtitle}</span>
              <h2>{stop.title}</h2>
              <i aria-hidden="true" />
              <p>{stop.body}</p>
              <button 
                className="stupa-deep-read-btn interactive" 
                onClick={onDeepRead}
              >
                深度阅读
                <span className="arrow" aria-hidden="true">→</span>
              </button>
            </article>
          </div>
        )}

        {/* ---- 故事模式面板 ---- */}
        {isStory && (
          <div className="stupa-lens-stage">
            <article className="stupa-info-panel stupa-story-panel">
              {stop.icon && (
                <img
                  className="stupa-info-icon"
                  src={stop.icon}
                  alt=""
                  aria-hidden="true"
                />
              )}
              <span className="stupa-info-kicker">{stop.subtitle}</span>
              <h2>{stop.title}</h2>
              <i aria-hidden="true" />
              <p>{stop.body}</p>
              <button 
                className="stupa-deep-read-btn interactive"
                onClick={onDeepRead}
              >
                阅读全卷
                <span className="arrow" aria-hidden="true">→</span>
              </button>
            </article>
          </div>
        )}
      </div>





      {/* ---- 右侧结构数据可视化（仅在章页面显示） ---- */}
      <div className={`stupa-data-viz ${currentStop === 0 ? 'is-visible' : ''}`} aria-hidden={currentStop !== 0}>

        <div className="viz-diagram">
          {/* 1. 塔刹 - 右侧 */}
          <div className="viz-node node-right node-finial">
            <div className="node-line"></div>
            <div className="node-content">
              <h4>塔刹 <span>/ FINIAL</span></h4>
              <p>六重覆钵相轮</p>
              <div className="node-stats">
                <span>最高点坐标</span>
                <span>+18.04m</span>
              </div>
            </div>
          </div>
          
          {/* 2. 密檐 - 右侧 */}
          <div className="viz-node node-right node-eaves">
            <div className="node-line"></div>
            <div className="node-content">
              <h4>密檐 <span>/ EAVES</span></h4>
              <p>全石造八角五层密檐</p>
              <div className="node-stats">
                <span>建筑特征</span>
                <span>叠涩出檐</span>
              </div>
            </div>
          </div>

          {/* 3. 佛龛 - 左侧 */}
          <div className="viz-node node-left node-niche">
            <div className="node-line"></div>
            <div className="node-content">
              <h4>佛龛 <span>/ NICHE</span></h4>
              <p>四方开龛雕刻佛尊</p>
              <div className="node-stats">
                <span>艺术特征</span>
                <span>南朝造像风格</span>
              </div>
            </div>
          </div>

          {/* 4. 塔身 - 左侧 */}
          <div className="viz-node node-left node-body">
            <div className="node-line"></div>
            <div className="node-content">
              <h4>塔身 <span>/ BODY</span></h4>
              <p>天王、力士与菩萨高浮雕</p>
              <div className="node-stats">
                <span>主材质</span>
                <span>碳酸钙石</span>
              </div>
              <div className="node-stats">
                <span>最大单石</span>
                <span>约 1,000 kg</span>
              </div>
            </div>
          </div>
          
          {/* 5. 塔基 - 右侧 */}
          <div className="viz-node node-right node-base">
            <div className="node-line"></div>
            <div className="node-content">
              <h4>塔基 <span>/ BASE</span></h4>
              <p>九山八海须弥座</p>
              <div className="node-stats">
                <span>始建年代</span>
                <span>隋代 (601)</span>
              </div>
              <div className="node-stats">
                <span>重建年代</span>
                <span>南唐 (945-965)</span>
              </div>
            </div>
          </div>

          {/* 6. 浮雕 (八相成道) - 左侧最底部 */}
          <div className="viz-node node-left node-reliefs">
            <div className="node-line"></div>
            <div className="node-content">
              <h4>浮雕 <span>/ RELIEFS</span></h4>
              <p>基座八相成道图</p>
              <div className="node-stats">
                <span>叙事题材</span>
                <span>释迦本行传记</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- 右侧导航索引（跳过第一个"章"按钮） ---- */}
      <nav className="timeline-node-index stupa-node-index" aria-label="第一章漫游节点">
        {stupaStops.slice(1).map((s, idx) => {
          const actualIdx = idx + 1
          return (
            <button
              className={`timeline-node ${actualIdx === currentStop ? 'is-active' : ''}`}
              key={s.id}
              type="button"
              aria-label={`漫游节点：${s.title}`}
              aria-pressed={actualIdx === currentStop}
              onClick={() => transitionTo(actualIdx)}
            >
              <span>{s.nav}</span>
            </button>
          )
        })}
      </nav>

      {/* ---- 底部进度条 ---- */}
      <div className="timeline-tour-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(0.08, stopProgress(currentStop))})` }} />
      </div>

      {/* ---- 底部提示 ---- */}
      <p className="timeline-scroll-hint">轻滚鼠标，镜头沿舍利塔局部游览。</p>

      {/* ---- 右下角控制栏 ---- */}
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
                <button className={`settings-toggle ${reduceMotion ? 'is-on' : ''}`} onClick={() => setReduceMotion(!reduceMotion)}>
                  <span className="settings-label">减少运动</span>
                  <span className="settings-status">{reduceMotion ? 'on' : 'off'}</span>
                </button>
                <button className={`settings-toggle ${highContrast ? 'is-on' : ''}`} onClick={() => setHighContrast(!highContrast)}>
                  <span className="settings-label">高对比度</span>
                  <span className="settings-status">{highContrast ? 'on' : 'off'}</span>
                </button>
                <button className={`settings-toggle ${largeText ? 'is-on' : ''}`} onClick={() => setLargeText(!largeText)}>
                  <span className="settings-label">较大文字</span>
                  <span className="settings-status">{largeText ? 'on' : 'off'}</span>
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

      {/* ---- 全屏大图预览容器 ---- */}
      <div 
        className={`fullscreen-image-viewer ${activeImage ? 'is-active' : ''}`}
        aria-hidden={!activeImage}
        onClick={() => setActiveImage(null)}
      >
        <button 
          className="close-viewer-btn interactive" 
          onClick={(e) => { e.stopPropagation(); setActiveImage(null) }}
        >
          ✕
        </button>
        <img 
          src={displayedImage || ''} 
          alt="全屏原貌图" 
          className="viewer-image"
          onClick={(e) => e.stopPropagation()} 
        />
      </div>
    </section>
  )
}
