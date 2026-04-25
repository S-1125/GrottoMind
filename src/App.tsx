import { useState } from 'react'
import { IntroAnimation } from './components/IntroAnimation'
import { HeroWebGL } from './components/HeroWebGL'
import { ScrollFilm } from './components/ScrollFilm'
import './App.css'

function App() {
  const [introComplete, setIntroComplete] = useState(false)

  return (
    <main className={`app-root ${introComplete ? 'is-entered' : ''}`}>

      {/* ——— 入场动画（加载完成后淡出） ——— */}
      {!introComplete && (
        <IntroAnimation onComplete={() => setIntroComplete(true)} />
      )}

      {/* ——— 主站内容（入场后显示） ——— */}
      <div
        className={`site-body ${introComplete ? 'is-visible' : ''}`}
        aria-hidden={!introComplete}
      >

        {/* WebGL 背景：只负责环境质感，不抢叙事主体 */}
        <HeroWebGL className="webgl-canvas" />

        {/* 顶部导航 */}
        <nav className="site-nav">
          <div className="brand-logo" aria-label="GrottoMind">
            <div className="site-logo-img" />
            <div className="site-logo-img-en" />
          </div>
          <button className="menu-toggle">
            <span className="menu-dot" />
            MENU
          </button>
        </nav>

        {/* 右下角控制按钮 */}
        <nav className="secondary-nav" aria-label="辅助控制">
          <button className="ctrl-btn" aria-label="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="ctrl-btn" aria-label="Sound">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
        </nav>

        {/* ——— 参考站式滚动电影场景 ——— */}
        <ScrollFilm />
      </div>
    </main>
  )
}

export default App
