import { useEffect, useRef, useState, useCallback } from 'react'
import { InkReveal } from './InkReveal'
import './FadingHall.css'

/* ============================================================
   FadingHall：第二章
   从 Lumen Artspace 模板 1:1 转换为 React 组件，
   保留所有内容、样式、交互逻辑。
============================================================ */

interface FadingHallProps {
  onBack?: () => void
}

export function FadingHall({ onBack }: FadingHallProps) {
  /* ---- 状态 ---- */
  const [progress, setProgress] = useState(0)
  const [loaderFading, setLoaderFading] = useState(false)  // 控制 opacity 淡出
  const [loaderHidden, setLoaderHidden] = useState(false)  // 控制 DOM 卸载
  const [ctaVisible, setCtaVisible] = useState(false)
  const [curtainActive, setCurtainActive] = useState(false)
  const [curtainOpen, setCurtainOpen] = useState(false)

  const [mainVisible, setMainVisible] = useState(false)
  const [navVisible, setNavVisible] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [heroVisible, setHeroVisible] = useState(false)
  const [isColorRevealed, setIsColorRevealed] = useState(false)
  
  /* ---- 复彩推演过程状态 ---- */
  const [recolorPhase, setRecolorPhase] = useState(0)
  const phaseRefs = useRef<(HTMLDivElement | null)[]>([])
  // 卡片槽位系统：索引 = 卡片ID，值 = 槽位（0=left, 1=center, 2=right）
  const [cardSlots, setCardSlots] = useState<number[]>([0, 1, 2])
  const slotNames = ['left', 'center', 'right'] as const

  // 点击侧边卡片时，与中央卡片交换位置
  const handleCardClick = useCallback((cardIndex: number) => {
    if (recolorPhase !== 3) return
    const currentSlot = cardSlots[cardIndex]
    if (currentSlot === 1) return // 已在中央，不动
    // 找到当前在中央的卡片
    const centerCard = cardSlots.indexOf(1)
    setCardSlots(prev => {
      const next = [...prev]
      next[cardIndex] = 1           // 被点击的卡片去中央
      next[centerCard] = currentSlot // 原中央卡片去被点击卡片原来的位置
      return next
    })
  }, [recolorPhase, cardSlots])

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  /* ---- 3D 倾斜 hover 效果（展开态卡片专用） ---- */
  const tiltState = useRef<Map<HTMLDivElement, { 
    currentX: number; currentY: number; 
    targetX: number; targetY: number;
    raf: number | null 
  }>>(new Map())

  const animateTilt = useCallback((card: HTMLDivElement) => {
    const state = tiltState.current.get(card)
    if (!state) return
    
    const lerp = 0.08
    state.currentX += (state.targetX - state.currentX) * lerp
    state.currentY += (state.targetY - state.currentY) * lerp
    
    card.style.setProperty('--tilt-x', `${state.currentX}deg`)
    card.style.setProperty('--tilt-y', `${state.currentY}deg`)

    if (Math.abs(state.targetX - state.currentX) > 0.01 || Math.abs(state.targetY - state.currentY) > 0.01) {
      state.raf = requestAnimationFrame(() => animateTilt(card))
    } else {
      state.raf = null
    }
  }, [])

  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (recolorPhase !== 3) return
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const tiltY = ((x - centerX) / centerX) * 18
    const tiltX = ((centerY - y) / centerY) * 12
    
    let state = tiltState.current.get(card)
    if (!state) {
      state = { currentX: 0, currentY: 0, targetX: 0, targetY: 0, raf: null }
      tiltState.current.set(card, state)
    }
    state.targetX = tiltX
    state.targetY = tiltY
    
    if (!state.raf) {
      state.raf = requestAnimationFrame(() => animateTilt(card))
    }
  }, [recolorPhase, animateTilt])

  const handleCardMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const state = tiltState.current.get(card)
    if (state) {
      state.targetX = 0
      state.targetY = 0
      if (!state.raf) {
        state.raf = requestAnimationFrame(() => animateTilt(card))
      }
    }
  }, [animateTilt])

  /* 图片预览（鼠标跟随） */
  const [previewSrc, setPreviewSrc] = useState('')
  const [previewVisible, setPreviewVisible] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const mousePos = useRef({ x: 0, y: 0 })
  const currentPos = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)

  /* 容器 ref（用于 IntersectionObserver） */
  const mainRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  /* ---- 加载进度动画（RAF 丝滑缓动） ---- */
  useEffect(() => {
    const duration = 3000 // 3秒完成
    let startTime: number | null = null
    let frameId: number

    // easeInOutCubic 缓动函数
    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const t = Math.min(elapsed / duration, 1)
      const value = Math.round(ease(t) * 100)

      setProgress(value)

      if (t < 1) {
        frameId = requestAnimationFrame(animate)
      } else {
        setTimeout(() => setCtaVisible(true), 300)
      }
    }

    // 延迟 300ms 后开始
    const delayTimer = setTimeout(() => {
      frameId = requestAnimationFrame(animate)
    }, 300)

    return () => {
      clearTimeout(delayTimer)
      cancelAnimationFrame(frameId)
    }
  }, [])

  /* ---- 点击"进入"：幕布过渡 ---- */
  const handleEnter = useCallback(() => {
    setCtaVisible(false)
    setTimeout(() => setLoaderFading(true), 200)
    setTimeout(() => setCurtainActive(true), 400)
    setTimeout(() => setCurtainOpen(true), 900)
    setTimeout(() => {
      setMainVisible(true)
      setNavVisible(true)
      setHeroVisible(true)

    }, 1000)
    setTimeout(() => setLoaderHidden(true), 2000)
  }, [])

  /* ---- 导航栏滚动效果 ---- */
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const onScroll = () => {
      const top = container.scrollTop
      setNavScrolled(top > 50)

      // 滚动监听联动导航栏 active 状态
      const sections = ['hero', 'pigment-archaeology', 'digital-resurrection']
      let current = 'hero'
      for (const id of sections) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= top + window.innerHeight / 3) {
          current = id
        }
      }
      setActiveSection(current)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [mainVisible])

  /* ---- IntersectionObserver：fade-in ---- */
  useEffect(() => {
    if (!mainVisible) return
    const container = scrollContainerRef.current
    if (!container) return

    // 等一帧让 DOM 就绪
    requestAnimationFrame(() => {
      const fadeEls = container.querySelectorAll('.fh-fade-in')
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('fh-fade-in--visible')
              obs.unobserve(e.target)
            }
          })
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px', root: container }
      )
      fadeEls.forEach((el) => obs.observe(el))

      // stagger
      const staggerEls = container.querySelectorAll('.fh-stagger-children')
      const staggerObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('fh-stagger-children--visible')
              staggerObs.unobserve(e.target)
            }
          })
        },
        { threshold: 0.1, rootMargin: '0px 0px -100px 0px', root: container }
      )
      staggerEls.forEach((el) => staggerObs.observe(el))

      // gallery header
      const galleryHeader = container.querySelector('.fh-gallery-preview__header')
      if (galleryHeader) {
        const headerObs = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('fh-gallery-preview__header--visible')
                headerObs.unobserve(e.target)
              }
            })
          },
          { threshold: 0.1, root: container }
        )
        headerObs.observe(galleryHeader)
      }
    })
  }, [mainVisible])

  /* ---- 图片预览跟随鼠标 ---- */
  const startPreview = useCallback((src: string) => {
    setPreviewSrc(src)
    setPreviewVisible(true)
    const animate = () => {
      currentPos.current.x += (mousePos.current.x - currentPos.current.x) * 0.1
      currentPos.current.y += (mousePos.current.y - currentPos.current.y) * 0.1
      if (previewRef.current) {
        previewRef.current.style.left = currentPos.current.x + 'px'
        previewRef.current.style.top = currentPos.current.y + 'px'
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    animate()
  }, [])

  const stopPreview = useCallback(() => {
    setPreviewVisible(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  const handlePreviewMove = useCallback((e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX + 20, y: e.clientY }
  }, [])

  /* ---- 清理 ---- */
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  /* ---- 复彩推演过程滚动监听 ---- */
  useEffect(() => {
    if (!mainVisible) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLDivElement
          const index = phaseRefs.current.indexOf(target)
          if (index !== -1) {
            setRecolorPhase(prev => {
              // 离开展开态时重置卡片槽位
              if (prev === 3 && index !== 3) {
                setCardSlots([0, 1, 2])
              }
              return index
            })
          }
        }
      })
    }, {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    })

    const currentRefs = phaseRefs.current
    currentRefs.forEach(ref => {
      if (ref) observer.observe(ref)
    })

    return () => {
      currentRefs.forEach(ref => {
        if (ref) observer.unobserve(ref)
      })
    }
  }, [mainVisible])

  /* ---- 画廊入场动画 (IntersectionObserver + CSS) ---- */
  useEffect(() => {
    if (!mainVisible) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fh-gallery-visible')
          observer.unobserve(entry.target) // 只触发一次
        }
      })
    }, { threshold: 0.1 })

    // 观察每个倒三角组
    document.querySelectorAll('.fh-gallery-group').forEach(el => observer.observe(el))
    // 观察矿物版块
    const mineralSection = document.querySelector('.fh-mineral-section')
    if (mineralSection) observer.observe(mineralSection)

    return () => observer.disconnect()
  }, [mainVisible])

  return (
    <div className="fading-hall" ref={mainRef}>

      {/* ============================================
           LOADING SCREEN
      ============================================ */}
      {!loaderHidden && (
        <div className={`fh-loader ${loaderFading ? 'fh-loader--fading' : ''}`}>
          <div className="fh-loader__clouds" />
          <InkReveal
            grayImageUrl="/章节2素材/飞天干净线稿石刻感.png"
            colorImageUrl="/章节2素材/飞天干净线稿石刻感-上色.png"
            className="fh-loader__reveal"
          />
          <div className="fh-loader__content">
            <p className="fh-loader__brand">第二章 · 显影</p>
            <h1 className="fh-loader__title">REVELATION</h1>
          </div>
          {/* 进入按钮组（进度环始终可见，水波纹+按钮加载完后出现） */}
          <div className="fh-enter-wrap">
            <div className="fh-enter-btn-wrap">
              {/* 水波纹圈（加载完后才显示） */}
              <div className={`fh-ripple-circle ${ctaVisible ? 'fh-ripple-circle--active' : ''}`} />
              <div className={`fh-ripple-circle fh-ripple-circle--delay ${ctaVisible ? 'fh-ripple-circle--active' : ''}`} />
              {/* 进度环 SVG（始终可见） */}
              <svg className="fh-progress-ring" viewBox="0 0 200 200" aria-hidden="true">
                <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(246,206,160,0.12)" strokeWidth="0.4" />
                <circle
                  className="fh-progress-ring__fill"
                  cx="100" cy="100" r="75"
                  fill="none" stroke="#f6cea0" strokeWidth="0.6"
                  strokeLinecap="round"
                  strokeDasharray={`${(2 * Math.PI * 75) * (progress / 100)} ${2 * Math.PI * 75}`}
                  transform="rotate(-90 100 100)"
                />
              </svg>
              {/* 主圈按钮（加载完后边框和文字淡入） */}
              <button
                className={`fh-enter-btn ${ctaVisible ? 'fh-enter-btn--ready' : ''}`}
                onClick={handleEnter}
                aria-label="进入第二章"
                disabled={!ctaVisible}
              >
                <span className={`fh-enter-text ${ctaVisible ? 'fh-enter-text--visible' : ''}`}>进入</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
           CURTAIN TRANSITION
      ============================================ */}
      <div className={`fh-curtain ${curtainActive ? 'fh-curtain--active' : ''} ${curtainOpen ? 'fh-curtain--open' : ''}`}
        style={curtainOpen && loaderHidden ? { display: 'none' } : undefined}
      >
        <div className="fh-curtain__left" />
        <div className="fh-curtain__line" />
        <div className="fh-curtain__right" />
      </div>

      {/* ============================================
           MAIN CONTENT
      ============================================ */}
      <div
        className={`fh-main-content ${mainVisible ? 'fh-main-content--visible' : ''}`}
        ref={scrollContainerRef}
      >
        {/* Navigation */}
        <nav className={`fh-nav ${navVisible ? 'fh-nav--visible' : ''} ${navScrolled ? 'fh-nav--scrolled' : ''}`}>
          <div className="fh-nav__inner">
            <div className="fh-nav__links">
              <button className="fh-nav__back" onClick={onBack} aria-label="返回上一章">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>返回上一章</span>
              </button>
              <a 
                href="#hero" 
                className={`fh-nav__link ${activeSection === 'hero' ? 'fh-nav__link--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#hero')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                复彩实验
              </a>
              <a 
                href="#pigment-archaeology" 
                className={`fh-nav__link ${activeSection === 'pigment-archaeology' ? 'fh-nav__link--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#pigment-archaeology')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                颜料考古
              </a>
              <a 
                href="#digital-resurrection" 
                className={`fh-nav__link ${activeSection === 'digital-resurrection' ? 'fh-nav__link--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#digital-resurrection')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                观影
              </a>
            </div>
            <div className="fh-nav__logo">
              <img src="/assets/wenku-logo-final.png" alt="Wenku" className="fh-nav__logo-mark" />
              <img src="/assets/logo.png" alt="Logo" className="fh-nav__year" />
            </div>
            <a href="#" className="fh-nav__contact">Contact</a>
            <button
              className="fh-nav__toggle"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span /><span />
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className={`fh-mobile-menu ${mobileMenuOpen ? 'fh-mobile-menu--open' : ''}`}>
          <div className="fh-mobile-menu__inner">
            <a href="#" className="fh-mobile-menu__link">Home</a>
            <a href="#" className="fh-mobile-menu__link">About</a>
            <a href="#" className="fh-mobile-menu__link">Gallery</a>
            <a href="#" className="fh-mobile-menu__link">Contact</a>
          </div>
        </div>

        {/* Hero Landing（参考图版式：大图居中 + 散布小图 + 底部大标题） */}
        <section id="hero" className="fh-hero">
          {/* 背景纹理 */}
          <div className="fh-hero__bg">
            <img
              src="/章节2素材/石窟壁面抽象背景16比9.jpg"
              alt=""
              className="fh-hero__texture"
              aria-hidden="true"
            />
          </div>
          <div className={`fh-hero__inner ${heroVisible ? 'fh-hero__inner--visible' : ''}`}>

            {/* 中间主图（InkReveal 流体显影，硬边缘） */}
            <div className="fh-hero__featured">
              <InkReveal
                grayImageUrl="/章节2素材/缺损.png"
                colorImageUrl="/章节2素材/上色.png"
                className="fh-hero__featured-img"
                hardEdge={true}
                radius={0.25}
                dissipation={0.95}
              />
              {/* 全彩覆盖层，点击按钮后淡入 */}
              <img 
                src="/章节2素材/上色.png" 
                alt="Full Color Overlay" 
                className={`fh-hero__featured-overlay ${isColorRevealed ? 'fh-hero__featured-overlay--visible' : ''}`}
                aria-hidden="true"
              />
            </div>

            {/* 底部大标题 */}
            <h1 className="fh-hero__title">
              Awaken <span className="fh-hero__title-word--italic">The</span> Color
            </h1>

            {/* 左侧文案区 */}
            <div className="fh-hero__desc">
              <p className="fh-hero__desc-text">
                滑动鼠标探索中央的石窟造像。<br />
                跟随数字流体交互的轨迹，<br />
                亲手唤醒被岁月侵蚀的原始色彩。
              </p>
              <button 
                className="fh-hero__cta"
                onClick={() => setIsColorRevealed(!isColorRevealed)}
              >
                <span className="fh-hero__cta-icon">
                  {isColorRevealed ? (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 12L12 4M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 13L13 3M13 3H5M13 3V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </span>
                <span>{isColorRevealed ? '关闭复彩' : '唤醒颜色'}</span>
              </button>
            </div>

            {/* 左侧小图 */}
            <div className="fh-hero__thumb fh-hero__thumb--left">
              <img src="/章节2素材/菩萨细节图/extreme-close-up-detail-shot-of-manjusri-bodhisatt (1).png" alt="Detail 1" />
            </div>

            {/* 右上小图 */}
            <div className="fh-hero__thumb fh-hero__thumb--rt">
              <img src="/章节2素材/菩萨细节图/extreme-close-up-detail-shot-of-the-crown-and-hair.png" alt="Detail 2" />
            </div>

            {/* 右下小图 */}
            <div className="fh-hero__thumb fh-hero__thumb--rb">
              <img src="/章节2素材/菩萨细节图/extreme-close-up-detail-shot-of-the-lotus-throne-p.png" alt="Detail 3" />
            </div>

            {/* Scroll 提示 */}
            <div className="fh-hero__scroll">
              <span>向下滑动</span>
              <span className="fh-hero__scroll-arrow">↓</span>
            </div>
          </div>


        </section>

        {/* ============================================
             RECOLOR PROCESS (视差吸顶渐变 + 3D展开)
        ============================================ */}
        <section className={`fh-recolor-process ${recolorPhase === 3 ? 'fh-recolor-process--spread' : ''}`}>
          {/* 左侧：吸顶图片 + 进度指示 */}
          <div className="fh-recolor-process__sticky">
            {/* 进度线（展开时隐藏） */}
            <div className={`fh-recolor-process__progress ${recolorPhase === 3 ? 'fh-recolor-process__progress--hidden' : ''}`}>
              {[0, 1, 2].map(i => (
                <div key={i} className={`fh-recolor-process__dot ${recolorPhase >= i ? 'fh-recolor-process__dot--active' : ''}`}>
                  <span className="fh-recolor-process__dot-label">
                    {['线稿', '石刻', '复彩'][i]}
                  </span>
                </div>
              ))}
            </div>
            {/* 图片容器：3D 空间 */}
            <div className="fh-recolor-process__img-wrap">
              {/* 卡片 0：线稿 */}
              <div 
                className={`fh-recolor-process__card fh-recolor-process__card--0 fh-recolor-process__slot--${slotNames[cardSlots[0]]} ${recolorPhase >= 0 ? 'fh-recolor-process__card--active' : ''}`}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                onClick={() => handleCardClick(0)}
              >
                <img src="/章节2素材/文殊造像复原/文殊线稿_cropped.png" alt="线稿提取" className="fh-recolor-process__img" />
                <div className="fh-recolor-process__card-label">线稿提取</div>
              </div>
              {/* 卡片 1：石刻 */}
              <div 
                className={`fh-recolor-process__card fh-recolor-process__card--1 fh-recolor-process__slot--${slotNames[cardSlots[1]]} ${recolorPhase >= 1 ? 'fh-recolor-process__card--active' : ''}`}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                onClick={() => handleCardClick(1)}
              >
                <img src="/章节2素材/文殊造像复原/无色彩石刻复原.jpg" alt="石刻复原" className="fh-recolor-process__img" />
                <div className="fh-recolor-process__card-label">肌理重塑</div>
              </div>
              {/* 卡片 2：复彩 */}
              <div 
                className={`fh-recolor-process__card fh-recolor-process__card--2 fh-recolor-process__slot--${slotNames[cardSlots[2]]} ${recolorPhase >= 2 ? 'fh-recolor-process__card--active' : ''}`}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                onClick={() => handleCardClick(2)}
              >
                <img src="/章节2素材/文殊造像复原/复彩后.jpg" alt="数字复彩" className="fh-recolor-process__img" />
                <div className="fh-recolor-process__card-label">数字复彩</div>
              </div>
            </div>
          </div>
          
          {/* 右侧：滚动文案 */}
          <div className={`fh-recolor-process__content ${recolorPhase === 3 ? 'fh-recolor-process__content--hidden' : ''}`}>
            {/* Phase 0 */}
            <div className="fh-recolor-process__phase" ref={el => { phaseRefs.current[0] = el }}>
              <div className="fh-recolor-process__text-card">
                <div className="fh-recolor-process__step">01</div>
                <h3 className="fh-recolor-process__title">线稿生成</h3>
                <p className="fh-recolor-process__subtitle">Wireframe Synthesis</p>
                <p className="fh-recolor-process__desc">
                  前期搜集了大量文殊菩萨造像的图像资料，将其全部转化为标准化线稿数据集。通过 AI 模型对线稿特征进行学习与分析，最终生成出高精度的造像轮廓线稿。
                </p>
              </div>
            </div>
            {/* Phase 1 */}
            <div className="fh-recolor-process__phase" ref={el => { phaseRefs.current[1] = el }}>
              <div className="fh-recolor-process__text-card">
                <div className="fh-recolor-process__step">02</div>
                <h3 className="fh-recolor-process__title">石刻复原</h3>
                <p className="fh-recolor-process__subtitle">Stone Carving Reconstruction</p>
                <p className="fh-recolor-process__desc">
                  以生成的线稿为基底，使用 AI 图像生成模型还原石刻造像的三维体量与岩面肌理，在数字空间中重现造像未经风化侵蚀前的石质原貌。
                </p>
              </div>
            </div>
            {/* Phase 2 */}
            <div className="fh-recolor-process__phase" ref={el => { phaseRefs.current[2] = el }}>
              <div className="fh-recolor-process__text-card">
                <div className="fh-recolor-process__step">03</div>
                <h3 className="fh-recolor-process__title">数字复彩</h3>
                <p className="fh-recolor-process__subtitle">AI-Driven Recoloring</p>
                <p className="fh-recolor-process__desc">
                  搭建 RAG 知识库对历史文献与矿物颜料数据进行精准检索分析，提取色彩参数后构建提示词，驱动生图模型在石刻表面完成最终的数字复彩推演。
                </p>
              </div>
            </div>
            {/* Phase 3：触发 3D 展开的空白缓冲区域 */}
            <div className="fh-recolor-process__phase fh-recolor-process__phase--end" ref={el => { phaseRefs.current[3] = el }}>
              {/* 此区域留白，高度用于触发最后的三图展开状态 */}
            </div>
          </div>
        </section>

        {/* ============================================
             PIGMENT TRANSITION QUOTE
        ============================================ */}
        <section id="pigment-archaeology" className="fh-transition-quote">
          <div className="fh-transition-quote__bg"></div>
          <div className="fh-transition-quote__container">
            <h2 className="fh-transition-quote__title">
              <span className="fh-transition-quote__line">剥离时间的表层，</span>
              <span className="fh-transition-quote__line">每一抹色彩，皆是大地的结晶。</span>
            </h2>
            <p className="fh-transition-quote__desc">
              Beneath the surface of time, color is not merely a visual illusion, but a geological testament. 
              Through algorithmic spectral analysis, we fracture the imagery to unearth the raw minerals 
              that have breathed life into the stone for centuries.
            </p>
          </div>
        </section>

        {/* ============================================
             PIGMENT ARCHAEOLOGY GALLERY
             参考 Lumen Artspace 错落画廊排版
        ============================================ */}
        <section className="fh-pigment-gallery">
          {/* 暗色纹理背景 */}
          <div className="fh-pigment-gallery__bg"></div>

          {/* ============================================
               PIGMENT GROUPS - TRIANGLE LAYOUT
          ============================================ */}

          {/* ---- 第一组：朱砂 Cinnabar ---- */}
          <div className="fh-gallery-group">
            <div className="fh-gallery-item fh-gallery-item--tl">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/栖霞山千佛岩.jpg" alt="千佛岩朱砂残留" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">千佛岩</h3>
                <p className="fh-pigment-gallery__info">朱砂涂层 · 佛龛背壁<br/>南齐永明二年 (484)</p>
              </div>
            </div>

            <div className="fh-gallery-item fh-gallery-item--tr">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/小龛.jpg" alt="小龛朱砂" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">朱砂佛龛</h3>
                <p className="fh-pigment-gallery__info">朱砂涂层 · 龛壁拱顶<br/>南朝至隋代</p>
              </div>
            </div>

            <div className="fh-gallery-item fh-gallery-item--bc">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/飞天壁画.png" alt="飞天壁画朱砂底" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">飞天壁画</h3>
                <p className="fh-pigment-gallery__info">朱砂底彩 · 中国最东飞天<br/>隋末唐初</p>
              </div>
            </div>
          </div>

          {/* ---- 第二组：石绿 Malachite ---- */}
          <div className="fh-gallery-group">
            <div className="fh-gallery-item fh-gallery-item--tl">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/空心佛.jpg" alt="空心佛铜绿" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">空心佛</h3>
                <p className="fh-pigment-gallery__info">铜绿残留 · 佛身衣褶<br/>南朝梁代</p>
              </div>
            </div>

            <div className="fh-gallery-item fh-gallery-item--tr">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/栖霞飞天，南京栖霞山唯一完整的隋末壁画_2_Keep walking_来自小红书网页版.jpg" alt="飞天龛边石绿" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">佛龛</h3>
                <p className="fh-pigment-gallery__info">石绿残留 · 龛沿边缘<br/>隋末完整壁画</p>
              </div>
            </div>

            <div className="fh-gallery-item fh-gallery-item--bc">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/中国最东边的飞天（南京栖霞山）_1_觉习猷成型君_来自小红书网页版.jpg" alt="飞天细节" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">飞天细节</h3>
                <p className="fh-pigment-gallery__info">石绿与朱砂交叠 · 天衣飘带<br/>中国最东端飞天</p>
              </div>
            </div>
          </div>

          {/* ---- 第三组：赭黄 Ochre ---- */}
          <div className="fh-gallery-group">
            <div className="fh-gallery-item fh-gallery-item--tl">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/栖霞飞天壁画.jpg" alt="飞天壁画赭黄" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">飞天线描</h3>
                <p className="fh-pigment-gallery__info">赭石底层 · 线描残影<br/>隋末唐初</p>
              </div>
            </div>

            <div className="fh-gallery-item fh-gallery-item--tr">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/石刻.png" alt="民国石刻题记" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">摩崖题刻</h3>
                <p className="fh-pigment-gallery__info">赭红石质 · 政府保护题记<br/>民国十七年 (1928)</p>
              </div>
            </div>

            <div className="fh-gallery-item fh-gallery-item--bc">
              <div className="fh-pigment-gallery__img-wrap">
                <img src="/章节2素材/色彩/栖霞山摩崖石刻1.jpg" alt="独立佛龛" />
              </div>
              <div className="fh-pigment-gallery__meta">
                <h3 className="fh-pigment-gallery__title">摩崖石刻</h3>
                <p className="fh-pigment-gallery__info">赭黄基底 · 天然岩壁肌理<br/>千佛崖造像区</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
             MINERAL ANALYSIS SECTION
             单独平铺的矿物色彩分析卡片
        ============================================ */}
        <section className="fh-mineral-section">
          <div className="fh-container">
            <h2 className="fh-mineral-section__title">光谱溯源 Spectral Analysis</h2>
            <div className="fh-mineral-grid">
              
              <div className="fh-pigment-gallery__mineral-card fh-pigment-gallery__mineral-card--red">
                <div className="fh-pigment-gallery__mineral-header">
                  <span className="fh-pigment-gallery__mineral-formula">HgS</span>
                  <span className="fh-pigment-gallery__mineral-name">硫化汞</span>
                </div>
                <p className="fh-pigment-gallery__mineral-desc">
                  朱砂是中国最古老的红色颜料，因其鲜艳持久的特性被广泛用于佛教造像的龛壁涂装。千佛崖的朱砂层历经 1500 余年风化，仍保留了可辨识的鲜红色调。
                </p>
                <div className="fh-pigment-gallery__spectrum" style={{ background: 'linear-gradient(90deg, #1a0000, #8b0000, #c0392b, #e74c3c, #f1948a, #fadbd8)' }}></div>
                <span className="fh-pigment-gallery__spectrum-label">可见光吸收带 580-620nm</span>
              </div>

              <div className="fh-pigment-gallery__mineral-card fh-pigment-gallery__mineral-card--green">
                <div className="fh-pigment-gallery__mineral-header">
                  <span className="fh-pigment-gallery__mineral-formula">Cu₂(CO₃)(OH)₂</span>
                  <span className="fh-pigment-gallery__mineral-name">碱式碳酸铜</span>
                </div>
                <p className="fh-pigment-gallery__mineral-desc">
                  石绿（孔雀石）是古代最常用的绿色矿物，需研磨极细后以胶调和。栖霞山石窟中的石绿多见于衣褶，历经风化后与铜锈融合，呈现独特的青铜绿色调。
                </p>
                <div className="fh-pigment-gallery__spectrum" style={{ background: 'linear-gradient(90deg, #0a2e26, #0e6655, #1abc9c, #48c9b0, #a3e4d7, #d5f5e3)' }}></div>
                <span className="fh-pigment-gallery__spectrum-label">可见光吸收带 470-520nm</span>
              </div>

              <div className="fh-pigment-gallery__mineral-card fh-pigment-gallery__mineral-card--yellow">
                <div className="fh-pigment-gallery__mineral-header">
                  <span className="fh-pigment-gallery__mineral-formula">Fe₂O₃</span>
                  <span className="fh-pigment-gallery__mineral-name">三氧化二铁</span>
                </div>
                <p className="fh-pigment-gallery__mineral-desc">
                  赭石是最丰富的颜料矿物之一，由土壤沉积形成。在栖霞山石窟中，赭黄色既来自人工涂装，也来自岩体自身的铁质风化，形成了天然交融的肌理。
                </p>
                <div className="fh-pigment-gallery__spectrum" style={{ background: 'linear-gradient(90deg, #1a1200, #7d6608, #d4a017, #f0c040, #f9e79f, #fef9e7)' }}></div>
                <span className="fh-pigment-gallery__spectrum-label">可见光吸收带 550-590nm</span>
              </div>

              {/* ---- 褪去颜料：铅白 ---- */}
              <div className="fh-pigment-gallery__mineral-card fh-pigment-gallery__mineral-card--faded">
                <div className="fh-pigment-gallery__mineral-header">
                  <span className="fh-pigment-gallery__mineral-formula">2PbCO₃·Pb(OH)₂</span>
                  <span className="fh-pigment-gallery__mineral-name">碱式碳酸铅 (铅白) <span className="fh-mineral-tag fh-mineral-tag--corrupted">DATA CORRUPTED</span></span>
                </div>
                <p className="fh-pigment-gallery__mineral-desc">
                  曾大面积涂抹于佛像面部与身体以迎合魏晋“敷粉”审美。因江南潮湿及微量硫化物反应，现已发生严重的不可逆“返铅”硫化变黑，原始白彩肉眼已不可见。
                </p>
                <div className="fh-pigment-gallery__spectrum fh-pigment-gallery__spectrum--faded"></div>
                <span className="fh-pigment-gallery__spectrum-label">返铅变异光谱 (推断原色带 400-700nm)</span>
              </div>

              {/* ---- 褪去颜料：石青 ---- */}
              <div className="fh-pigment-gallery__mineral-card fh-pigment-gallery__mineral-card--faded">
                <div className="fh-pigment-gallery__mineral-header">
                  <span className="fh-pigment-gallery__mineral-formula">Cu₃(CO₃)₂(OH)₂</span>
                  <span className="fh-pigment-gallery__mineral-name">碱式碳酸铜 (石青) <span className="fh-mineral-tag fh-mineral-tag--reconstructed">RECONSTRUCTED</span></span>
                </div>
                <p className="fh-pigment-gallery__mineral-desc">
                  曾大量施用于佛龛内部背光与华盖装饰。但在漫长的高湿与高二氧化碳环境下发生水化，逐渐向孔雀石（石绿）转化或直接发黑，深邃蓝彩已荡然无存。
                </p>
                <div className="fh-pigment-gallery__spectrum fh-pigment-gallery__spectrum--faded"></div>
                <span className="fh-pigment-gallery__spectrum-label">高光谱模拟溯源吸收带 450-480nm</span>
              </div>

            </div>
          </div>
        </section>

        {/* Introduction Section */}
        <section id="digital-resurrection" className="fh-intro">
          <div className="fh-container">
            <div className="fh-intro__grid">
              <div className="fh-intro__content fh-fade-in">
                <h2 className="fh-intro__title">
                  数字<span className="fh-script-text">焕颜</span><br />
                  Digital <span className="fh-script-text">Resurrection</span>
                </h2>
                <p className="fh-intro__text">
                  借助前沿的光谱扫描与AI图生图算法，我们将栖霞山石窟中风化剥落的造像细节进行像素级重建。从宝冠纹理到青狮鬃毛，每一处修复都经过了严谨的历史考证与算法推演，让沉睡千年的石刻重焕生机。
                </p>
                <a href="#" className="fh-intro__link">探索算法溯源</a>
              </div>
              <div className="fh-intro__images">
                <img src="/章节2素材/TD粒子截图/截屏2026-04-17 22.30.49.png" alt="TD粒子造像-金" className="fh-intro__img fh-intro__img--1 fh-fade-in" />
                <img src="/章节2素材/TD粒子截图/截屏2026-04-18 17.02.48.png" alt="TD粒子点云" className="fh-intro__img fh-intro__img--2 fh-fade-in" />
                <img src="/章节2素材/TD粒子截图/截屏2026-04-17 22.56.20.png" alt="TD粒子造像" className="fh-intro__img fh-intro__img--3 fh-fade-in" />
              </div>
            </div>
          </div>
        </section>

        {/* Marquee Section */}
        <section className="fh-marquee-section">
          <div className="fh-marquee">
            <div className="fh-marquee__inner">
              {Array(6).fill(null).map((_, i) => (
                <span className="fh-marquee__text" key={i}>数字复彩 ✦ 矿物颜料 ✦ 算法推演 ✦ 历史肌理 ✦ 时空对话 ✦ </span>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Preview Section */}
        <section className="fh-gallery-preview">
          <div className="fh-container">
            <div className="fh-gallery-preview__header">
              <h2 className="fh-section-title fh-section-title--medium">粒子<br />复彩实验</h2>
              <p className="fh-gallery-preview__subtitle">Particle Reconstruction</p>
              <p className="fh-gallery-preview__desc">在 TouchDesigner 中，我们将三维扫描点云数据转化为可交互的粒子系统。每一颗粒子承载着原始造像的空间坐标与色彩信息，通过流体力场驱动，在虚拟空间中完成从灰度石刻到矿物色彩的动态复现。</p>
            </div>

            <div className="fh-artwork-list fh-stagger-children">
              {[
                {
                  slug: 'td-detail-1',
                  img: '/章节2素材/TD粒子截图/截屏2026-05-04 16.22.14.png',
                  title: '宝冠与面容局部解析',
                  material: '高精度扫描与光谱比对',
                  size: '检出泥金(95%)、赭石(91%)、石绿',
                  objectPosition: 'right center',
                },
                {
                  slug: 'td-detail-2',
                  img: '/章节2素材/TD粒子截图/截屏2026-05-04 16.22.25.png',
                  title: '袈裟衣褶的粒子场模拟',
                  material: '点云流体力学渲染',
                  size: '测定石青(86%)与局部朱砂残留',
                },
                {
                  slug: 'td-detail-3',
                  img: '/章节2素材/TD粒子截图/截屏2026-05-04 16.22.35.png',
                  title: '下摆垂幔与结跏趺坐姿',
                  material: '高密度红色素富集区',
                  size: '测定高纯度朱砂(94%)分布带',
                },
                {
                  slug: 'td-detail-4',
                  img: '/章节2素材/TD粒子截图/截屏2026-05-04 16.22.45.png',
                  title: '仰覆莲座三维结构重建',
                  material: '花瓣彩绘层的空间测绘',
                  size: '底层石青与表层泥金(87%)交织',
                },
                {
                  slug: 'td-detail-5',
                  img: '/章节2素材/TD粒子截图/截屏2026-05-04 16.22.54.png',
                  title: '须弥座底座几何纹样',
                  material: '多层复合彩绘剖面分析',
                  size: '检出泥金(91%)与赭石(85%)叠加',
                },
                {
                  slug: 'td-detail-6',
                  img: '/章节2素材/TD粒子截图/796393d81933e0e487037c34f2e66562.png',
                  title: '造像色彩全息复原推演',
                  material: '多通道光谱数据映射合成',
                  size: '三维点云空间下的量子化显影',
                },
              ].map((art) => (
                <a
                  key={art.slug}
                  href="#"
                  className="fh-artwork-list__item"
                  onMouseEnter={() => startPreview(art.img)}
                  onMouseLeave={stopPreview}
                  onMouseMove={handlePreviewMove}
                >
                  <img 
                    src={art.img} 
                    alt={art.title} 
                    className="fh-artwork-list__thumb" 
                    style={{ objectPosition: art.objectPosition || 'center' }}
                  />
                  <span className="fh-artwork-list__title">{art.title}</span>
                  <span className="fh-artwork-list__meta">{art.material}</span>
                  <span className="fh-artwork-list__meta">{art.size}</span>
                </a>
              ))}
            </div>

            <div className="fh-gallery-preview__cta fh-fade-in" style={{ marginTop: '40px' }}>
            </div>
          </div>
        </section>

        {/* Video Split Section */}
        <section id="video-section" className="fh-video-section">
          <div className="fh-container fh-video-section__inner">
            <div className="fh-video-section__text">
              <div className="fh-video-text-header">
                <span className="fh-video-badge">数字修复 GrottoMind</span>
                <h2 className="fh-section-title fh-section-title--medium">流体重构推演</h2>
                <p className="fh-video-section__subtitle">Fluid Dynamics Simulation</p>
              </div>
              <div className="fh-video-section__desc">
                <p>由于千年风化，造像表面的矿物颜料已极度稀薄。为了还原其原始的色彩空间，我们提取了残存像素的色值分布，并将其转化为可被重力与流体力场驱动的算法系统。</p>
                <p>在这场数字重构实验中，数百万颗色彩粒子如星尘般凝聚、游走，最终精准附着于冰冷的石刻三维点云之上。这并非是对历史的机械复刻，而是一次跨越千年的数字生命焕颜。</p>
              </div>
              
              <ul className="fh-video-stats">
                <li>
                  <span className="fh-video-stats__label">粒子散布密度</span>
                  <span className="fh-video-stats__val">2,450,000+</span>
                </li>
                <li>
                  <span className="fh-video-stats__label">物理演算力场</span>
                  <span className="fh-video-stats__val">重力 / 涡流</span>
                </li>
                <li>
                  <span className="fh-video-stats__label">光谱映射模式</span>
                  <span className="fh-video-stats__val">四通道混合</span>
                </li>
              </ul>
            </div>
            
            <div className="fh-video-section__media">
              <div className="fh-video-wrapper">
                {/* 赛博考古感装饰元素 */}
                <div className="fh-video-ui fh-video-ui--tl"></div>
                <div className="fh-video-ui fh-video-ui--tr"></div>
                <div className="fh-video-ui fh-video-ui--bl"></div>
                <div className="fh-video-ui fh-video-ui--br"></div>
                <span className="fh-video-label">REC // TD_SIMULATION</span>
                <span className="fh-video-data">1080P / 60FPS</span>

                <video 
                  src="/章节2素材/td视频.mp4" 
                  className="fh-video-element"
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="fh-footer">
          <div className="fh-container">
            <p className="fh-footer__copyright">© 2026 GrottoMind Team</p>
          </div>
        </footer>
      </div>

      {/* Image Preview (cursor follow) */}
      <div
        className={`fh-image-preview ${previewVisible ? 'fh-image-preview--visible' : ''}`}
        ref={previewRef}
      >
        <img src={previewSrc} alt="Preview" />
      </div>
    </div>
  )
}
