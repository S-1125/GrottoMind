import { useState } from 'react'
import { TimelineHall } from './TimelineHall'
import { DeepReadArticle } from './DeepReadArticle'
import { FadingHall } from './FadingHall'

/* ============================================================
   Exhibition: 进入后的展览主容器
   承载所有章节的切换与过渡逻辑。
============================================================ */
interface ExhibitionProps {}

export function Exhibition({}: ExhibitionProps) {
  const [activeDeepReadId, setActiveDeepReadId] = useState<string | null>(null)
  const [blackout, setBlackout] = useState(false)
  const [activeChapter, setActiveChapter] = useState<'ch1' | 'ch2'>('ch1')

  const handleDeepRead = (nodeId: string) => {
    setBlackout(true)
    setTimeout(() => {
      setActiveDeepReadId(nodeId)
      setTimeout(() => setBlackout(false), 200)
    }, 400)
  }

  const handleBackToExhibition = () => {
    setBlackout(true)
    setTimeout(() => {
      setActiveDeepReadId(null)
      setTimeout(() => setBlackout(false), 200)
    }, 400)
  }

  /* 进入下一章：黑屏过渡 → 直接切到第二章（Lumen 模板自带加载页） */
  const handleNextChapter = () => {
    setBlackout(true)
    setTimeout(() => {
      setActiveChapter('ch2')
      setTimeout(() => setBlackout(false), 300)
    }, 500)
  }

  return (
    <section className="exhibition-stage" aria-label="问窟沉浸式展览">
      {activeChapter === 'ch1' && (
        <TimelineHall
          onDeepRead={handleDeepRead}
          onNextChapter={handleNextChapter}
          isPaused={!!activeDeepReadId}
        />
      )}

      {/* 测试用：右上角快捷入口（与末尾按钮组完全一致） */}
      {activeChapter === 'ch1' && !activeDeepReadId && (
        <div
          className="next-chapter-group interactive"
          onClick={handleNextChapter}
          role="button"
          tabIndex={0}
          aria-label="进入第二章"
          onKeyDown={(e) => { if (e.key === 'Enter') handleNextChapter() }}
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 999 }}
        >
          <span className="next-pill">
            <span className="next-pill-bg"></span>
            <span className="next-pill-text">进入下一章</span>
          </span>
          <span className="next-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 13H3M13 13V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      )}

      {activeChapter === 'ch2' && (
        <FadingHall onBack={() => {
          setBlackout(true)
          setTimeout(() => {
            setActiveChapter('ch1')
            setTimeout(() => setBlackout(false), 300)
          }, 500)
        }} />
      )}

      {activeDeepReadId && (
        <DeepReadArticle nodeId={activeDeepReadId} onBack={handleBackToExhibition} />
      )}

      <div 
        className={`global-blackout ${blackout ? 'is-active' : ''}`} 
        aria-hidden="true" 
      />
    </section>
  )
}

