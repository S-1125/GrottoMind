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
  const [showcaseVisible, setShowcaseVisible] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    // 1. 隐藏按钮
    setCtaVisible(false)

    // 2. 200ms 后开始淡出 loader（opacity 过渡 0.6s）
    setTimeout(() => setLoaderFading(true), 200)

    // 3. 400ms 后激活激光线（loader 正在淡出，激光从顶部射入）
    setTimeout(() => setCurtainActive(true), 400)

    // 4. 激光射满后（~900ms），拉开幕布
    setTimeout(() => setCurtainOpen(true), 900)

    // 5. 幕布拉开的同时显示主内容
    setTimeout(() => {
      setMainVisible(true)
      setNavVisible(true)
      setHeroVisible(true)
      setShowcaseVisible(true)
    }, 1000)

    // 6. 过渡全部完成后卸载 loader DOM
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
                // onClick={handleEnter} // TODO: 上线后恢复点击进入第二章
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
              <a href="#" className="fh-nav__link fh-nav__link--active">Home</a>
              <a href="#" className="fh-nav__link">About</a>
              <a href="#" className="fh-nav__link">Gallery</a>
            </div>
            <div className="fh-nav__logo">
              <div className="fh-nav__logo-mark">LA</div>
              <span className="fh-nav__year">20 | 25</span>
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

        {/* Hero Section */}
        <section className="fh-hero">
          <div className={`fh-hero__inner ${heroVisible ? 'fh-hero__inner--visible' : ''}`}>
            <p className="fh-hero__brand fh-script-text">Lumen Artspace</p>
            <h1 className="fh-hero__title">
              <span className="fh-hero__line">Heritage</span>
              <span className="fh-hero__line">In Art</span>
            </h1>
            <div className="fh-hero__decoration">
              <svg className="fh-hero__clouds" viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 100C200 150 400 50 600 100C800 150 1000 50 1200 100C1400 150 1440 100 1440 100V200H0V100Z" fill="rgba(255,255,255,0.03)" />
                <path d="M0 120C300 80 500 140 800 100C1100 60 1300 120 1440 100V200H0V120Z" fill="rgba(255,255,255,0.02)" />
              </svg>
            </div>
          </div>
          <div className="fh-hero__bg">
            <img
              src="https://cdn.prod.website-files.com/6734928e2af1829d3c568460/67474474ad8257aab934d534_bg-overlay.avif"
              alt=""
              className="fh-hero__texture"
              aria-hidden="true"
            />
          </div>
        </section>

        {/* Artwork Showcase */}
        <section className="fh-showcase">
          <div className="fh-showcase__grid">
            <div className={`fh-showcase__item fh-showcase__item--left ${showcaseVisible ? 'fh-showcase__item--visible' : ''}`}>
              <img src="https://cdn.prod.website-files.com/67862174a33a316e969b0659/67877b2a334e5d497b8029e0_untitled-3.avif" alt="Artwork" className="fh-showcase__image" />
            </div>
            <div className={`fh-showcase__item fh-showcase__item--center ${showcaseVisible ? 'fh-showcase__item--visible' : ''}`}>
              <img src="https://cdn.prod.website-files.com/67862174a33a316e969b0659/678769a2ebfab8e3dfcc3ae6_main-img.avif" alt="Featured Artwork" className="fh-showcase__image fh-showcase__image--center" />
            </div>
            <div className={`fh-showcase__item fh-showcase__item--right ${showcaseVisible ? 'fh-showcase__item--visible' : ''}`}>
              <img src="https://cdn.prod.website-files.com/67862174a33a316e969b0659/67877b1274fe16d98dc88948_untitled-1.avif" alt="Artwork" className="fh-showcase__image" />
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
                <span className="fh-marquee__text" key={i}>Lumen Artspace</span>
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
            <p className="fh-footer__copyright">© 2025 Lumen Artspace</p>
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
