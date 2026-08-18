import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import gsap from 'gsap'
import { AtmosphereEffects } from './AtmosphereEffects'
import { AtmosphereShader } from './AtmosphereShader'
import { GrottoModelScene, type GrottoModelSceneHandle } from './GrottoModelScene'
import { soundEngine } from '../utils/soundEngine'

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
    body: '表面装饰有莲瓣、束腰和云纹，分别象征着佛塔传统的覆钵、相轮和火珠。塔刹向上收束，使整座舍利塔获得清晰的精神指向。注：现存塔刹为民国时期（1930年）重修。',
    mode: 'lens' as const,
    // 放大镜的屏幕坐标 (相对于窗口左上角)
    // 根据您截图里塔的位置，大概在屏幕偏左上三分之一处
    marker: { x: '32%', y: '22%' },
    lensImage: '/章节1图片素材/塔刹.webp',
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
    marker: { x: '40%', y: '45%' },
    lensImage: '/章节1图片素材/塔檐.webp',
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
    marker: { x: '35%', y: '46%' },
    lensImage: '/章节1图片素材/佛龛.webp',
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
    lensImage: '/章节1图片素材/天王-1.webp',
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
    marker: { x: '38%', y: '66%' },
    lensImage: '/章节1图片素材/普贤菩萨.webp',
    lensPosition: '68% 70%',
    icon: '/icon1/图层 1.png',
  },
  {
    id: 'base',
    label: '塔基',
    nav: '基',
    title: '九山八海',
    subtitle: '塔基 · Base',
    body: '须弥座的束腰部分以海水、瑞龙与托塔力士、亭台楼榭等图像组织空间，呼应佛教宇宙观中的九山八海。塔基让信仰获得可承托的世界结构。',
    mode: 'lens' as const,
    marker: { x: '42%', y: '66%' },
    lensImage: '/章节1图片素材/塔基与须弥座.webp',
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
    marker: { x: '30%', y: '80%' },
    lensImage: '/章节1图片素材/八相成道图-1.webp',
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
  onDeepRead?: (nodeId: string) => void
  onNextChapter?: () => void
  onGoToAI?: () => void
  isPaused?: boolean
}

export function TimelineHall({ onDeepRead, onNextChapter, onGoToAI, isPaused }: TimelineHallProps) {
  // ---- 核心状态 ----
  const [currentStop, setCurrentStop] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [displayedImage, setDisplayedImage] = useState<string | null>(null)

  // ---- Refs ----
  const modelRef = useRef<GrottoModelSceneHandle>(null)
  const cameraProgressRef = useRef(0)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const fadeGroupRef = useRef<HTMLDivElement>(null)
  const introTextRef = useRef<HTMLDivElement>(null)
  const introVeilRef = useRef<HTMLDivElement>(null)
  const [introFadedOut, setIntroFadedOut] = useState(false)

  const stop = stupaStops[currentStop]
  const isLens = stop.mode === 'lens'
  const isStory = stop.mode === 'scroll'

  const openImageViewer = useCallback((image: string) => {
    setDisplayedImage(image)
    setActiveImage(image)
  }, [])

  const closeImageViewer = useCallback(() => {
    setActiveImage(null)
  }, [])



  // ---- 初始淡入：整页淡入 + 序章标题淡入后自动淡出 + UI 错峰入场 ----
  useEffect(() => {
    const introEl = introTextRef.current
    const veilEl = introVeilRef.current
    const fadeGroup = fadeGroupRef.current

    if (introEl && veilEl) {
      const kicker = introEl.querySelector('.timeline-hall-kicker')
      const title = introEl.querySelector('h1')
      const titleIcon = introEl.querySelector('.stupa-intro-title-icon')
      const p = introEl.querySelector('p')

      const explorationUi = '.curve-nav-index, .timeline-tour-progress, .timeline-scroll-hint'

      // 预设状态：所有引线标签、右侧导航栏和底部操作提示初始完全透明
      gsap.set('.viz-node', { opacity: 0, y: 15 })
      gsap.set(explorationUi, { opacity: 0, y: 12 })

      const introTl = gsap.timeline()

      // 第一幕：氛围拉满
      // 遮罩层默认显示（提亮 15%，从 0.85 降至 0.70）
      gsap.set(veilEl, { opacity: 0.70 })
      gsap.set(introEl, { opacity: 1 })

      // 触发 3D 相机平滑推进
      if (modelRef.current) {
        modelRef.current.playIntroDolly(2.5)
      }

      introTl
        // 1. Kicker 出现 (微光)
        .fromTo(kicker,
          { opacity: 0, y: 15, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out' }
        )
        // 2. 主标题出现 (从大到小，模糊变清晰)
        .fromTo(title,
          { opacity: 0, scale: 1.15, filter: 'blur(12px)', letterSpacing: '0.15em' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0.04em', duration: 1.8, ease: 'power3.out' },
          '-=0.6'
        )
        // 3. Kicker 背后的 icon 浮现
        .fromTo(titleIcon,
          { opacity: 0, scale: 0.9, filter: 'blur(8px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, ease: 'power2.out' },
          '-=1.4'
        )
        // 4. 正文段落浮现
        .fromTo(p,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' },
          '-=1.0'
        )
        // 第二幕：信息消退（停留展示 3.5s 后，巨幕标题淡出）
        .to({}, { duration: 3.5 })
        .to([introEl, veilEl], {
          opacity: 0,
          y: -15, // 仅影响文字
          duration: 0.8,
          ease: 'power2.inOut',
          onComplete: () => setIntroFadedOut(true),
        })
        // 第三幕：探索开启
        // 主标题消失后，右侧导航与模型周围的 HUD 标签如星空般依次浮现
        .to(explorationUi, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, '-=0.2')
        .to('.viz-node', {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          stagger: 0.15
        }, '<')
        // fadeGroup 淡入（包含透镜面板，但初始在章页面默认隐藏）
        .fromTo(fadeGroup,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' },
          '<'
        )
    }
  }, [])


  // ---- 核心过渡函数 ----
  const transitionTo = useCallback((targetIndex: number) => {
    if (isAnimating) return
    if (targetIndex < 0 || targetIndex >= stupaStops.length) return
    if (targetIndex === currentStop) return

    // 播放纯净金石定焦轻音
    soundEngine.playHotspotLock()

    // 强制顺序浏览：只能点击前后相邻的节点，禁止跨步飞转
    if (Math.abs(targetIndex - currentStop) > 1) return

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

    // 阶段 A 补充：强制隐藏概览信息标签（塔刹/密檐/塔基等标注面板）
    // 因为开场动画给 .viz-node 设置了内联 opacity，CSS 的 visibility 无法覆盖它
    tl.to('.stupa-data-viz', { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
    tl.to('.viz-node', { opacity: 0, y: 10, duration: 0.3, ease: 'power2.in' }, 0)

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
      // 切回概览页时，恢复被 GSAP 内联样式压住的概览信息标签
      if (targetIndex === 0) {
        gsap.to('.stupa-data-viz', { opacity: 1, duration: 0.6, ease: 'power2.out' })
        gsap.to('.viz-node', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 })
      }

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
  // 使用 ref 保存最新值，避免 addEventListener 闭包过时
  const wheelStateRef = useRef({ isAnimating, currentStop, transitionTo })
  useEffect(() => {
    wheelStateRef.current = { isAnimating, currentStop, transitionTo }
  }, [isAnimating, currentStop, transitionTo])

  // ---- 键盘导航 ----
  const isPausedRef = useRef(isPaused)
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isPausedRef.current) return
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

  // ---- 滚轮监听：必须用 { passive: false } 才能 preventDefault ----
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const handler = (e: globalThis.WheelEvent) => {
      if (isPausedRef.current) return
      e.preventDefault()
      const { isAnimating: anim, currentStop: stop, transitionTo: go } = wheelStateRef.current
      if (anim) return
      const direction = e.deltaY > 0 ? 1 : -1
      go(stop + direction)
    }
    el.addEventListener('wheel', handler, { passive: false })

    // 触屏设备：通过触摸滑动方向切换节点
    let touchStartY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (isPausedRef.current) return
      const deltaY = touchStartY - e.changedTouches[0].clientY
      // 滑动距离超过 50px 才触发
      if (Math.abs(deltaY) < 50) return
      const { isAnimating: anim, currentStop: stop, transitionTo: go } = wheelStateRef.current
      if (anim) return
      const direction = deltaY > 0 ? 1 : -1
      go(stop + direction)
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('wheel', handler)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // ---- 渲染 ----
  return (
    <section
      ref={sectionRef}
      className={`timeline-hall stupa-chapter ${introFadedOut ? '' : 'is-intro-playing'}`}
      aria-label="第一章：舍利塔"
    >
      {/* 暗角遮罩与氛围层 */}
      <div className="timeline-hall-mask" aria-hidden="true" />
      <div className="timeline-hall-vignette" aria-hidden="true" />
      <div className="fog-bottom-dark" aria-hidden="true" />
      <AtmosphereShader currentStep={0} />
      <AtmosphereEffects currentStep={0} />

      {/* 3D 模型场景 */}
      <GrottoModelScene
        ref={modelRef}
        className={currentStop === 0 ? 'is-overview' : ''}
      />
      <div className="intro-film-grain" aria-hidden="true" />

      {/* Logo */}
      <div className="intro-brand-logo exhibition-logo" aria-label="GrottoMind">
        <img src="/assets/logo.png" alt="问窟" className="site-logo-img" />
        <img src="/assets/logo-en.png" alt="GrottoMind" className="site-logo-img-en" />
      </div>

      {/* 顶部导航岛（问窟 AI + 进入下一章，高奢东方暗金琉璃一体化设计） */}
      <nav className="timeline-nav-island" aria-label="快捷导览">
        <button 
          className="nav-island-btn nav-island-ai interactive" 
          onClick={(e) => { e.preventDefault(); onGoToAI?.(); }}
          aria-label="唤起问窟者 AI 智能导览"
        >
          <span className="nav-ai-sparkle" aria-hidden="true">✦</span>
          <span className="nav-ai-text">问窟 AI</span>
        </button>
        
        <div className="nav-island-divider" aria-hidden="true" />

        <button
          className="nav-island-btn nav-island-next interactive"
          onClick={() => onNextChapter?.()}
          aria-label="进入第二章：石窟壁画复彩"
        >
          <span className="nav-next-text">进入下一章</span>
          <span className="nav-next-arrow" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 13H3M13 13V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </nav>

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


            {/* 透镜 */}
            <button
              className="stupa-lens interactive"
              type="button"
              onClick={() => openImageViewer(stop.lensImage)}
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
                className="stupa-action-btn stupa-deep-read-btn interactive"
                onClick={() => onDeepRead?.(stop.id)}
                aria-label={`深度阅读${stop.title}考据文献`}
              >
                <span>深度阅读</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>
            </article>
          </div>
        )}

        {/* ---- 故事模式面板 ---- */}
        {isStory && (
          <div className="stupa-lens-stage">


            {/* 透镜 */}
            <button
              className="stupa-lens interactive"
              type="button"
              onClick={() => openImageViewer(stop.lensImage)}
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
              <div className="stupa-story-actions">
                <button
                  className="stupa-action-btn stupa-deep-read-btn interactive"
                  onClick={() => onDeepRead?.(stop.id)}
                  aria-label="阅读八相成道图全卷文献"
                >
                  <span>阅读全卷</span>
                  <span className="btn-arrow" aria-hidden="true">→</span>
                </button>

                <button
                  className="stupa-action-btn stupa-next-chapter-btn interactive"
                  onClick={() => onNextChapter?.()}
                  aria-label="进入第二章：石窟壁画复彩"
                >
                  <span>进入下一章</span>
                  <span className="btn-icon-box" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1L13 13M13 13H3M13 13V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
              </div>
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

      {/* ---- 右侧导航索引 - 东方星盘经纬轴线指示器 ---- */}
      <nav className="curve-nav-index" aria-label="第一章漫游节点">
        <div className="curve-nav-axis-line" aria-hidden="true" />
        {stupaStops.slice(1).map((s, idx) => {
          const actualIdx = idx + 1
          const isActive = actualIdx === currentStop
          const isLocked = Math.abs(actualIdx - currentStop) > 1
          const isDisabled = isAnimating || isLocked
          return (
            <button
              className={`curve-nav-dot ${isActive ? 'is-active' : ''} ${isLocked ? 'is-locked' : ''}`}
              key={s.id}
              type="button"
              aria-label={`漫游节点：${s.title}`}
              aria-pressed={isActive}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              title={isLocked ? '请按顺序浏览相邻节点' : s.title}
              onClick={() => transitionTo(actualIdx)}
            >
              {/* 纯净几何菱形光晶指示器 */}
              <div className="diamond-crystal-node" aria-hidden="true">
                <span className="diamond-outer" />
                <span className="diamond-core" />
              </div>
              {/* 悬停提示 */}
              <span className="curve-nav-tooltip">
                <span className="tooltip-idx">0{actualIdx}</span>
                <span className="tooltip-title">{s.title}</span>
              </span>
            </button>
          )
        })}
      </nav>

      {/* ---- 左下角：沉浸式漫游导览指示器 ---- */}
      <div className="timeline-scroll-indicator" aria-label="漫游操作提示">
        <div className="scroll-indicator-body">
          <div className="scroll-mouse-track" aria-hidden="true">
            <span className="scroll-mouse-dot" />
          </div>
          <div className="scroll-text-group">
            <span className="scroll-kicker">SCROLL TO EXPLORE</span>
            <span className="scroll-hint-title">轻滚鼠标 · 探索舍利塔层级</span>
          </div>
        </div>
        <div className="timeline-tour-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.max(0.08, stopProgress(currentStop))})` }} />
        </div>
      </div>

      {/* ---- 全屏大图预览容器 ---- */}
      <div
        className={`fullscreen-image-viewer ${activeImage ? 'is-active' : ''}`}
        aria-hidden={!activeImage}
        onClick={closeImageViewer}
      >
        <button
          className="close-viewer-btn interactive"
          onClick={(e) => { e.stopPropagation(); closeImageViewer() }}
        >
          ✕
        </button>
        {displayedImage && (
          <img
            src={displayedImage}
            alt="全屏原貌图"
            className="viewer-image"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </section>
  )
}
