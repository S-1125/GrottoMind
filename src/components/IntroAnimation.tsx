import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/* ============================================================
   ProgressRing: 动态进度圆弧
============================================================ */
function ProgressRing({ progress }: { progress: number }) {
  // 进度圆弧
  const arcR    = 75 // 半径调整到75
  const arcLen  = 2 * Math.PI * arcR
  const arcDash = arcLen * (progress / 100)

  return (
    <svg
      className="progress-ring-svg"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 进度弧背景 */}
      <circle
        cx="100" cy="100" r={arcR}
        fill="none"
        stroke="rgba(212,169,106,0.12)"
        strokeWidth="0.4"
      />
      {/* 进度弧填充 */}
      <circle
        cx="100" cy="100" r={arcR}
        fill="none"
        stroke="#d4a96a"
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeDasharray={`${arcDash} ${arcLen}`}
        transform="rotate(-90 100 100)"
        style={{ transition: 'stroke-dasharray 0.1s linear' }}
      />
    </svg>
  )
}

/* ============================================================
   LandscapeSVG: 内联暗调风景（占位，也可替换为 <img> 背景）
============================================================ */
function LandscapeSVG() {
  return (
    <svg
      id="landscape-svg"
      viewBox="0 0 1920 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="fogGrad" cx="50%" cy="100%" r="60%">
          <stop offset="0%"   stopColor="#2a3855" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0e0f11" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#111521" />
          <stop offset="50%"  stopColor="#1e2940" />
          <stop offset="100%" stopColor="#141820" />
        </linearGradient>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="50%"  stopColor="transparent" />
          <stop offset="100%" stopColor="#080a0e" stopOpacity="0.85" />
        </radialGradient>
      </defs>

      {/* 天空 */}
      <rect width="1920" height="900" fill="url(#skyGrad)" />

      {/* 远山 */}
      <path
        d="M0,640 Q200,520 400,560 Q550,510 700,550 Q850,480 1000,530
           Q1150,470 1300,520 Q1500,450 1700,510 Q1850,490 1920,530 L1920,900 L0,900Z"
        fill="#141d2c" opacity="0.9"
      />
      {/* 近山 */}
      <path
        d="M0,720 Q150,660 300,690 Q500,640 700,680 Q900,640 1100,670
           Q1300,640 1500,670 Q1700,650 1920,680 L1920,900 L0,900Z"
        fill="#0f151e" opacity="0.95"
      />

      {/* 左侧枯树 */}
      <g opacity="0.75" fill="#080c12">
        <path d="M220,470 Q200,440 180,420 Q170,410 150,395 Q140,388 125,375 Q150,380 168,392 Q185,405 195,418 Q205,432 218,448Z" />
        <path d="M222,500 Q240,475 260,458 Q275,445 295,432 Q310,424 330,415 Q305,428 282,442 Q265,455 248,470 Q232,485 224,502Z" />
        <path d="M218,535 Q198,512 178,498 Q162,487 142,475 Q128,467 108,458 Q132,466 150,477 Q170,490 186,504 Q202,518 216,536Z" />
        <path d="M220,560 Q238,538 255,524 Q268,514 285,503 Q298,495 318,487 Q294,498 275,510 Q258,522 242,538 Q228,552 222,562Z" />
        <path d="M215,580 Q190,565 165,555 Q145,547 118,540 Q100,535 80,528 Q108,533 132,542 Q158,552 178,562 Q200,574 218,582Z" />
        <path d="M150,395 Q135,378 118,362 Q108,350 95,340" stroke="#080c12" strokeWidth="2" fill="none" opacity="0.8" />
        <path d="M330,415 Q348,398 368,384 Q385,372 405,360" stroke="#080c12" strokeWidth="2" fill="none" opacity="0.7" />
      </g>

      {/* 地面草丛 */}
      <path
        d="M0,820 Q80,798 160,812 Q240,796 320,818 Q400,800 480,820
           Q560,802 640,820 L640,900 L0,900Z"
        fill="#0a0e16" opacity="0.85"
      />
      <path
        d="M1300,830 Q1450,812 1600,825 Q1750,810 1920,822 L1920,900 L1300,900Z"
        fill="#0a0e16" opacity="0.85"
      />

      {/* 雾气 */}
      <rect width="1920" height="900" fill="url(#fogGrad)" opacity="0.7" />
      <ellipse cx="960" cy="660" rx="900" ry="80" fill="#2a3855" opacity="0.18" />
      <ellipse cx="960" cy="720" rx="1100" ry="60" fill="#1e2e45" opacity="0.22" />

      {/* 暗角 */}
      <rect width="1920" height="900" fill="url(#vignette)" />
    </svg>
  )
}

/* ============================================================
   IntroAnimation: 主入场动画组件
============================================================ */
export function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const loaderRef     = useRef<HTMLDivElement>(null)
  const maskRef       = useRef<HTMLDivElement>(null)
  const bgRef         = useRef<HTMLDivElement>(null)
  const svgBgRef      = useRef<SVGSVGElement>(null)
  const textRef       = useRef<HTMLDivElement>(null)
  const guideRef      = useRef<HTMLDivElement>(null)
  const arrowRef      = useRef<HTMLDivElement>(null)
  const progressRef   = useRef<HTMLSpanElement>(null)
  const progressVal   = useRef({ val: 0 })
  const canEnterRef   = useRef(false)
  const enteringRef   = useRef(false)
  const touchStartYRef = useRef<number | null>(null)

  useEffect(() => {
    const loader    = loaderRef.current!
    const mask      = maskRef.current!
    const bg        = bgRef.current!
    const svgBg     = svgBgRef.current!
    const text      = textRef.current!
    const guide     = guideRef.current!
    const arrow     = arrowRef.current!
    const numEl     = progressRef.current!

    // 初始状态
    gsap.set(text,  { opacity: 0, y: 10 })
    gsap.set(guide, { opacity: 0 })
    gsap.set(svgBg, { opacity: 0 })
    gsap.set(bg,    { filter: 'brightness(0.05)' })

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })

    /* 阶段 1: 数字 0→100 */
    tl.to(progressVal.current, {
      val: 100,
      duration: 2.8,
      ease: 'power1.inOut',
      onUpdate() {
        numEl.textContent = String(Math.round(progressVal.current.val))
        // 这里直接更新 SVG 圆弧，避免为了进度数字频繁触发 React 渲染。
        const arcR = 75
        const arcLen = 2 * Math.PI * arcR
        const arcDash = arcLen * (progressVal.current.val / 100)
        const fillCircle = loader.querySelector('.progress-ring-svg circle:nth-child(2)') as SVGCircleElement
        if (fillCircle) {
          fillCircle.style.strokeDasharray = `${arcDash} ${arcLen}`
        }
      },
    })

    /* 阶段 2: 停顿 + loader 淡出 */
    .to(loader, { opacity: 0, duration: 0.8, ease: 'power2.out', delay: 0.5 })

    /* 阶段 3: 遮罩消失 + 背景浮现 */
    .to(mask,  { opacity: 0, duration: 1.8, ease: 'power3.out' }, '-=0.3')
    .to(bg,    { filter: 'brightness(1)', duration: 2.2, ease: 'power2.out' }, '<')
    .to(svgBg, { opacity: 1, duration: 2.2, ease: 'power2.out' }, '<')

    /* 阶段 4: 文案从下往上淡入 */
    .to(text, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out' }, '-=1.2')

    /* 阶段 5: 引导层淡入 + 无限浮动 */
    .to(guide, {
      opacity: 1,
      duration: 1,
      ease: 'power2.out',
      onComplete() {
        canEnterRef.current = true
        gsap.to(arrow, {
          y: -8,
          duration: 1.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      },
    }, '-=0.4')

    return () => { tl.kill() }
  }, [])

  // 进入主场景：支持点击、键盘、滚轮和手机上滑。
  const handleEnter = () => {
    if (!canEnterRef.current || enteringRef.current) return
    enteringRef.current = true

    gsap.to(containerRef.current, {
      opacity: 0,
      duration: 0.9,
      ease: 'power2.out',
      onComplete,
    })
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaY > 10) handleEnter()
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current
    const currentY = event.touches[0]?.clientY
    if (startY === null || currentY === undefined) return
    if (startY - currentY > 32) handleEnter()
  }

  return (
    <div
      ref={containerRef}
      className="intro-animation"
      aria-label="入场动画"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >

      {/* SVG 风景背景 */}
      <div ref={bgRef} className="intro-bg-layer">
        <LandscapeSVG />
      </div>
      <svg
        ref={svgBgRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0, zIndex: 1, pointerEvents: 'none' }}
        viewBox="0 0 1920 900"
        preserveAspectRatio="xMidYMid slice"
      />

      {/* 深色遮罩层 */}
      <div ref={maskRef} className="intro-dark-mask" />

      {/* Loading 环 + 数字 */}
      <div ref={loaderRef} className="intro-loader-wrap">
        <div className="intro-loader-inner">
          <div className="mandala-img" aria-hidden="true" />
          <ProgressRing progress={0} />
          <span ref={progressRef} className="intro-progress-num">0</span>
        </div>
      </div>

      {/* 中央文案 */}
      <div ref={textRef} className="intro-text-layer">
        <p>千年以前，山寺岩壁之间<br />有一束光沉入了石头。</p>
      </div>

      {/* 底部引导 */}
      <div ref={guideRef} className="intro-guide">
        <div
          ref={arrowRef}
          className="intro-arrow-wrap"
          onClick={handleEnter}
          role="button"
          tabIndex={0}
          aria-label="进入"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
              handleEnter()
            }
          }}
        >
          <div className="intro-arrow-circle" />
          <svg className="intro-arrow-icon" viewBox="0 0 14 14" fill="none">
            <polyline points="2,4 7,10 12,4" stroke="#d4a96a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="intro-guide-label">滑动继续</span>
      </div>

      {/* 左上角 Logo 组合 */}
      <div className="intro-brand-logo" aria-label="GrottoMind">
        <div className="site-logo-img" />
        <div className="site-logo-img-en" />
      </div>

      {/* 右下角控制按钮 */}
      <nav className="intro-ctrl-nav" aria-label="辅助控制">
        <button className="intro-ctrl-btn" aria-label="设置">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button className="intro-ctrl-btn" aria-label="声音">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>
      </nav>
    </div>
  )
}
