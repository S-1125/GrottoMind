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
      setNavScrolled(container.scrollTop > 50)
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
              <a href="#" className="fh-nav__link fh-nav__link--active">复彩实验</a>
              <a href="#" className="fh-nav__link">颜料考古</a>
              <a href="#" className="fh-nav__link">观影</a>
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
        <section className="fh-hero">
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

        {/* Introduction Section */}
        <section className="fh-intro">
          <div className="fh-container">
            <div className="fh-intro__grid">
              <div className="fh-intro__content fh-fade-in">
                <h2 className="fh-intro__title">
                  A <span className="fh-script-text">(Journey)</span><br />
                  Thr<span className="fh-script-text">o</span>ugh Time
                </h2>
                <p className="fh-intro__text">
                  Step into a world where tradition meets artistry. Here, you are invited to explore a personal collection of Vietnamese artworks, where each piece reveals layers of Vietnamese history, meticulous craftsmanship, and the enduring beauty of heritage.
                </p>
                <a href="#" className="fh-intro__link">About Us</a>
              </div>
              <div className="fh-intro__images">
                <img src="https://cdn.prod.website-files.com/6734928e2af1829d3c568460/6746f266179eba53bc511bf2_home_intro_img-2.avif" alt="Lacquer painting detail" className="fh-intro__img fh-intro__img--1 fh-fade-in" />
                <img src="https://cdn.prod.website-files.com/6734928e2af1829d3c568460/6746f266f64158298731e48d_home_intro_img-1.avif" alt="Lacquer painting detail" className="fh-intro__img fh-intro__img--2 fh-fade-in" />
                <img src="https://cdn.prod.website-files.com/6734928e2af1829d3c568460/6746f2668a26a1778c11750a_home_intro_img-3.avif" alt="Lacquer painting detail" className="fh-intro__img fh-intro__img--3 fh-fade-in" />
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
              <h2 className="fh-section-title fh-section-title--medium">Impressions<br />Of Heritage</h2>
              <p className="fh-gallery-preview__subtitle">Timeless Masterpieces</p>
              <p className="fh-gallery-preview__desc">Each piece exhibited at Lumen Artspace embodies both the visual allure and the spirit of lacquer art.</p>
            </div>

            <div className="fh-artwork-list fh-stagger-children">
              {[
                {
                  slug: 'u-1',
                  img: 'https://cdn.prod.website-files.com/67862174a33a316e969b0659/678779fbbebddb19b16be359_untitle-4.avif',
                  title: 'Untitled 1',
                  material: 'Lacquer on Wood',
                  size: '80x80cm',
                },
                {
                  slug: 'u-2',
                  img: 'https://cdn.prod.website-files.com/67862174a33a316e969b0659/678769a2ebfab8e3dfcc3ae6_main-img.avif',
                  title: 'Untitled 2',
                  material: 'Lacquer on Wood',
                  size: '100x100cm',
                },
                {
                  slug: 'hue-traces-ii',
                  img: 'https://cdn.prod.website-files.com/67862174a33a316e969b0659/67877443f7e26549e71733d7_main-img.avif',
                  title: 'Hue Traces II',
                  material: 'Lacquer on Wood',
                  size: '80x80cm',
                },
                {
                  slug: 'hue-traces-iii',
                  img: 'https://cdn.prod.website-files.com/67862174a33a316e969b0659/67877afaf7e26549e71f98bc_Hue%20traces%20III.avif',
                  title: 'Hue Traces III',
                  material: 'Lacquer on Wood',
                  size: '80x80cm',
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
                  <img src={art.img} alt={art.title} className="fh-artwork-list__thumb" />
                  <span className="fh-artwork-list__title">{art.title}</span>
                  <span className="fh-artwork-list__meta">{art.material}</span>
                  <span className="fh-artwork-list__meta">{art.size}</span>
                </a>
              ))}
            </div>

            <div className="fh-gallery-preview__cta fh-fade-in">
              <a href="#" className="fh-btn">View All Works</a>
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
