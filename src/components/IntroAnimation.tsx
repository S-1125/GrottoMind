import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AtmosphereEffects } from './AtmosphereEffects'
import { AtmosphereShader } from './AtmosphereShader'
import { GlowText } from './GlowText'

gsap.registerPlugin(ScrollTrigger)

const storyTexts = [
  '1400年前，金陵栖霞山屹立起一座承载信仰与时间的舍利塔。',
  '山岩之间，千佛静默，色彩隐入岁月。',
  '如今，我们再次向石窟发问。',
  'GrottoMind',
]

/* ============================================================
   ProgressRing: 动态进度圆弧
============================================================ */
function ProgressRing({ progress }: { progress: number }) {
  // 进度圆弧
  const arcR = 75
  const arcLen = 2 * Math.PI * arcR
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
        cx="100"
        cy="100"
        r={arcR}
        fill="none"
        stroke="rgba(212,169,106,0.12)"
        strokeWidth="0.4"
      />
      {/* 进度弧填充 */}
      <circle
        cx="100"
        cy="100"
        r={arcR}
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

interface IntroAnimationProps {
  onEnter?: () => void
}

/* ============================================================
   IntroAnimation: 单页视频滚动叙事
============================================================ */
export function IntroAnimation({ onEnter }: IntroAnimationProps) {
  const pageRef = useRef<HTMLElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoFilterRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const enterRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const scrollProgressRef = useRef<HTMLDivElement>(null)
  const progressVal = useRef({ val: 0 })
  const onEnterRef = useRef(onEnter)
  const [currentStep, setCurrentStep] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [noDrag, setNoDrag] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onEnterRef.current = onEnter
  }, [onEnter])

  useEffect(() => {
    // 应用无障碍设置
    if (reduceMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
    if (highContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
    if (largeText) {
      document.documentElement.classList.add('large-text')
    } else {
      document.documentElement.classList.remove('large-text')
    }
  }, [reduceMotion, highContrast, largeText])

  useEffect(() => {
    // 点击外部关闭设置面板
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const page = pageRef.current
    const visual = visualRef.current
    const video = videoRef.current
    const loader = loaderRef.current
    const mask = maskRef.current
    const text = textRef.current
    const guide = guideRef.current
    const numEl = progressRef.current
    const lines = gsap.utils.toArray<HTMLElement>('.intro-copy-line')

    if (!page || !visual || !video || !loader || !mask || !text || !guide || !numEl) return

    let lenis: Lenis | null = null
    let rafHandler: ((time: number) => void) | null = null
    let storyStarted = false
    let loaderDone = false
    let videoDuration = 0
    let activeStep = 0
    let stepLocked = false
    let stepUnlockTimer: number | null = null
    let wheelHandler: ((event: WheelEvent) => void) | null = null
    let keyHandler: ((event: KeyboardEvent) => void) | null = null

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    // 加载阶段锁住页面，避免用户在视频还没接管前滚到中段。
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    window.scrollTo(0, 0)

    gsap.set(video, { opacity: 0 })
    gsap.set(text, { opacity: 0, y: 20 })
    gsap.set(guide, { opacity: 0 })
    gsap.set(lines, { autoAlpha: 0, y: 20 })
    gsap.set(lines[0], { autoAlpha: 1, y: 0 })

    const setupStory = () => {
      if (storyStarted || !loaderDone || videoDuration <= 0) return
      storyStarted = true

      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      window.scrollTo(0, 0)
      video.pause()
      video.currentTime = 0

      lenis = new Lenis({
        lerp: 0.08,
        smoothWheel: false,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
      })

      lenis.on('scroll', ScrollTrigger.update)
      rafHandler = (time: number) => {
        lenis?.raf(time * 1000)
      }
      gsap.ticker.add(rafHandler)
      gsap.ticker.lagSmoothing(0)

      gsap.to(video, {
        currentTime: Math.max(videoDuration - 0.04, 0),
        ease: 'none',
        scrollTrigger: {
          trigger: page,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          onUpdate(self) {
            // 更新激光进度条
            if (scrollProgressRef.current) {
              scrollProgressRef.current.style.height = `${self.progress * 100}%`
            }
          },
        },
      })

      const showStepText = (nextStep: number) => {
        if (nextStep === activeStep) return

        const currentLine = lines[activeStep]
        const nextLine = lines[nextStep]
        if (!currentLine || !nextLine) return

        // 控制 logo 显示/隐藏：只在第一步显示
        if (logoRef.current) {
          if (nextStep === 0) {
            logoRef.current.classList.remove('is-hidden')
            logoRef.current.classList.add('is-visible')
          } else {
            logoRef.current.classList.remove('is-visible')
            logoRef.current.classList.add('is-hidden')
          }
        }

        gsap.killTweensOf([currentLine, nextLine])
        const textTl = gsap.timeline()
        textTl
          .to(currentLine, {
            autoAlpha: 0,
            y: -12,
            duration: 0.34,
            ease: 'power2.out',
          })
          // 明确留白：上一句彻底消失后，下一句才允许出现。
          .to({}, { duration: 0.22 })
          .set(currentLine, { autoAlpha: 0 })
          .fromTo(
            nextLine,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.62,
              ease: 'power3.out',
            },
          )

        activeStep = nextStep
        setCurrentStep(nextStep)
      }

      const scrollToStep = (nextStep: number) => {
        const maxStep = lines.length - 1
        const targetStep = Math.max(0, Math.min(maxStep, nextStep))
        if (targetStep === activeStep || stepLocked) return

        stepLocked = true
        const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
        const targetScroll = maxScroll * (targetStep / maxStep)

        showStepText(targetStep)
        lenis?.scrollTo(targetScroll, {
          duration: 1.25,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          force: true,
        })

        if (stepUnlockTimer) window.clearTimeout(stepUnlockTimer)
        stepUnlockTimer = window.setTimeout(() => {
          stepLocked = false
        }, 950)
      }

      wheelHandler = (event: WheelEvent) => {
        if (!storyStarted || Math.abs(event.deltaY) < 3) return

        event.preventDefault()
        event.stopPropagation()

        if (stepLocked) return
        const direction = event.deltaY > 0 ? 1 : -1
        scrollToStep(activeStep + direction)
      }

      window.addEventListener('wheel', wheelHandler, { passive: false, capture: true })

      keyHandler = (event: KeyboardEvent) => {
        if (event.key === 'Enter' && activeStep === lines.length - 1) {
          event.preventDefault()
          onEnterRef.current?.()
          return
        }

        if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
          event.preventDefault()
          scrollToStep(activeStep + 1)
        }
        if (event.key === 'ArrowUp' || event.key === 'PageUp') {
          event.preventDefault()
          scrollToStep(activeStep - 1)
        }
      }

      window.addEventListener('keydown', keyHandler)

      ScrollTrigger.refresh()
    }

    const onLoadedMetadata = () => {
      videoDuration = video.duration || 0
      setupStory()
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    if (video.readyState >= 1) onLoadedMetadata()

    const loadTl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })

    loadTl
      .to(progressVal.current, {
        val: 100,
        duration: 2.8,
        ease: 'power1.inOut',
        onUpdate() {
          numEl.textContent = String(Math.round(progressVal.current.val))
          // 直接更新 SVG 圆弧，避免为了进度数字频繁触发 React 渲染。
          const arcR = 75
          const arcLen = 2 * Math.PI * arcR
          const arcDash = arcLen * (progressVal.current.val / 100)
          const fillCircle = loader.querySelector('.progress-ring-svg circle:nth-child(2)') as SVGCircleElement
          if (fillCircle) {
            fillCircle.style.strokeDasharray = `${arcDash} ${arcLen}`
          }
        },
      })
      .to(loader, { opacity: 0, duration: 0.8, ease: 'power2.out', delay: 0.5 })
      .to(mask, { opacity: 0.18, duration: 1.8, ease: 'power3.out' }, '-=0.3')
      .to(video, { opacity: 1, duration: 2.2, ease: 'power2.out' }, '<')
      .to(text, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out' }, '-=1.2')
      .to(guide, {
        opacity: 1,
        duration: 1,
        ease: 'power2.out',
        onComplete() {
          loaderDone = true
          setupStory()
        },
      }, '-=0.4')

    return () => {
      loadTl.kill()
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      if (wheelHandler) {
        window.removeEventListener('wheel', wheelHandler, { capture: true })
      }
      if (keyHandler) {
        window.removeEventListener('keydown', keyHandler)
      }
      if (stepUnlockTimer) window.clearTimeout(stepUnlockTimer)
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
      if (rafHandler) gsap.ticker.remove(rafHandler)
      lenis?.destroy()
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  // 监听 currentStep，使暗角遮罩在每个阶段递减，最后一步彻底消失（过渡更自然）
  // 同时同步恢复背景视频的亮度和对比度
  useEffect(() => {
    if (!maskRef.current || !videoRef.current) return
    const maxStep = storyTexts.length - 1
    const progress = currentStep / maxStep // 0 到 1

    // 暗角透明度：根据阶段调整
    let targetOpacity = 1 - progress
    if (currentStep === storyTexts.length - 1) {
      targetOpacity = 0.3 // 最后一页保留30%暗角，与新暗角叠加更自然
    }
    gsap.to(maskRef.current, {
      autoAlpha: targetOpacity,
      duration: 2.5,
      ease: 'power2.inOut',
    })

    // 最后一页添加胶片滤镜效果 - 使用 GSAP 平滑过渡
    const isLastStep = currentStep === storyTexts.length - 1
    const targetSepia = isLastStep ? 0.25 : 0
    const targetSaturate = isLastStep ? 0.85 : 1
    const targetHueRotate = isLastStep ? -10 : 0
    const targetFilmContrast = isLastStep ? 1.15 : 1.35
    const targetFilmBrightness = isLastStep ? 1.05 : 0.97

    gsap.to(videoFilterRef.current, {
      '--v-contrast': targetFilmContrast,
      '--v-brightness': targetFilmBrightness,
      '--v-sepia': targetSepia,
      '--v-saturate': targetSaturate,
      '--v-hue-rotate': targetHueRotate,
      duration: 2.5,
      ease: 'power2.inOut',
    })
  }, [currentStep])

  // 监听 currentStep，控制底部引导区域的显隐和切换
  useEffect(() => {
    const guide = guideRef.current
    const enter = enterRef.current
    if (!guide || !enter) return

    const isFirst = currentStep === 0
    const isLast = currentStep === storyTexts.length - 1
    const isMid = !isFirst && !isLast

    if (isFirst) {
      // 第一阶段：显示“滑动继续”引导
      gsap.to(guide, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' })
      gsap.to(enter, { autoAlpha: 0, duration: 0.3, ease: 'power2.out' })
    } else if (isMid) {
      // 中间阶段：两者都隐藏
      gsap.to(guide, { autoAlpha: 0, duration: 0.3, ease: 'power2.out' })
      gsap.to(enter, { autoAlpha: 0, duration: 0.3, ease: 'power2.out' })
    } else {
      // 最后阶段：显示“进入”按钮
      gsap.to(guide, { autoAlpha: 0, duration: 0.3, ease: 'power2.out' })
      gsap.to(enter, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.3, ease: 'power2.out' })
    }
  }, [currentStep])

  return (
    <section ref={pageRef} className="intro-page" aria-label="视频滚动叙事">
      <div ref={visualRef} className="intro-animation">
        {/* 视频滤镜层 - 避免直接修改 video 元素导致 GSAP 冲突 */}
        <div ref={videoFilterRef} className="intro-video-filter">
          {/* 背景视频由滚动进度控制播放帧，不自动播放。 */}
          <video
            ref={videoRef}
            className="intro-bg-video"
            muted
            playsInline
            preload="auto"
          >
            <source src="/assets/qixia-scrub-1080p.mp4" type="video/mp4" />
          </video>
        </div>

        {/* 极弱暗色遮罩，保证亮色视频上文字仍清晰。 */}
        <div ref={maskRef} className="intro-dark-mask" />

        {/* 胶片噪点效果 */}
        <div className="intro-film-grain" aria-hidden="true" />

        {/* 暖色叠加层 - 最后一页激活 */}
        <div className={`intro-warm-overlay ${currentStep === storyTexts.length - 1 ? 'is-active' : ''}`} aria-hidden="true" />

        {/* 增强暗角 - 最后一页激活 */}
        <div className={`intro-vignette ${currentStep === storyTexts.length - 1 ? 'is-active' : ''}`} aria-hidden="true" />

        {/* ——— 底部对比度渐变 ——— */}
        <div className="fog-bottom-dark" />

        {/* Three.js Shader 体积雾 */}
        <AtmosphereShader currentStep={currentStep} />

        {/* Canvas 浮尘粒子 */}
        <AtmosphereEffects currentStep={currentStep} />

        {/* Loading 环 + 数字 */}
        <div ref={loaderRef} className="intro-loader-wrap">
          <div className="intro-loader-inner">
            <div className="mandala-img" aria-hidden="true" />
            <ProgressRing progress={0} />
            <span ref={progressRef} className="intro-progress-num">0</span>
          </div>
        </div>

        {/* 中央文案 */}
        <div ref={textRef} className="intro-text-layer" aria-live="polite">
          {/* 中文 Logo + Agent - 只在第一步显示 */}
          <div ref={logoRef} className="intro-chinese-logo is-visible">
            <img src="/logo/图层 1.png" alt="问窟" />
            <span className="intro-agent-text">AI Agent</span>
          </div>
          {storyTexts.map((text, index) => (
            <p
              className={`intro-copy-line ${index === storyTexts.length - 1 ? 'is-title' : ''}`}
              key={text}
            >
              {index === storyTexts.length - 1 ? (
                <>
                  <GlowText text={text} isActive={currentStep === storyTexts.length - 1} />
                  <span className="intro-title-superscript">问窟</span>
                </>
              ) : (
                text
              )}
            </p>
          ))}
        </div>

        {/* 底部引导 */}
        <div ref={guideRef} className="intro-guide">
          <div className="intro-arrow-wrap" aria-hidden="true">
            {/* 水波纹圈1 */}
            <div className="intro-arrow-circle-outer" />
            {/* 水波纹圈2 */}
            <div className="intro-arrow-circle-outer intro-arrow-circle-outer-delay" />
            {/* 主圈 */}
            <div className="intro-arrow-circle" />
            <svg className="intro-arrow-icon" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="intro-guide-label">滑动继续</span>
        </div>

        {/* 底部引导：进入按钮（最后阶段显示） */}
        <div ref={enterRef} className="intro-enter-wrap" style={{ opacity: 0, visibility: 'hidden' }}>
          <div className="intro-enter-btn-wrap">
            {/* 水波纹圈1 */}
            <div className="intro-arrow-circle-outer" />
            {/* 水波纹圈2 */}
            <div className="intro-arrow-circle-outer intro-arrow-circle-outer-delay" />
            {/* 主圈 + hover 填充 */}
            <button className="intro-enter-btn" aria-label="进入展览" onClick={() => onEnterRef.current?.()}>
              <span className="intro-enter-text">进入</span>
            </button>
          </div>
          <span className="intro-enter-hint">单击Enter键继续</span>
        </div>

        {/* 左上角 Logo 组合 */}
        <div className="intro-brand-logo" aria-label="GrottoMind">
          <div className="site-logo-img" />
          <div className="site-logo-img-en" />
        </div>

        {/* 右下角控制按钮 - 参考 persepolis.getty.edu */}
        <nav className="intro-ctrl-nav" aria-label="辅助控制">
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
            {/* 设置面板 */}
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

        {/* 激光进度条 */}
        <div className="laser-progress-track">
          <div ref={scrollProgressRef} className="laser-progress-bar" />
        </div>
      </div>
    </section>
  )
}
