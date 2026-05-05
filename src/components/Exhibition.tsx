import { useState, useEffect } from 'react'
import { TimelineHall } from './TimelineHall'
import { DeepReadArticle } from './DeepReadArticle'
import { FadingHall } from './FadingHall'
import { GrottoHub } from './GrottoHub'
import { useAgent } from './agent/AgentContext'


/* ============================================================
   Exhibition: 进入后的展览主容器
   承载所有章节的切换与过渡逻辑。
============================================================ */
export function Exhibition() {
  const [activeDeepReadId, setActiveDeepReadId] = useState<string | null>(null)
  const [blackout, setBlackout] = useState(false)
  const [activeChapter, setActiveChapter] = useState<'ch1' | 'ch2' | 'ch3'>('ch1')
  const [previousChapter, setPreviousChapter] = useState<'ch1' | 'ch2'>('ch1')
  const [visitedChapters, setVisitedChapters] = useState<Set<'ch1'|'ch2'|'ch3'>>(new Set(['ch1']))
  const { setCurrentChapter, registerNavigator } = useAgent()

  // 注册导航函数，让 GlobalAgent 可以从外部触发章节跳转
  useEffect(() => {
    registerNavigator((chapter: 'intro' | 'ch1' | 'ch2' | 'ch3') => {
      if (chapter === 'ch3' || chapter === 'ch2' || chapter === 'ch1') {
        setBlackout(true)
        setTimeout(() => {
          setActiveChapter(chapter as 'ch1' | 'ch2' | 'ch3')
          setTimeout(() => setBlackout(false), 300)
        }, 500)
      }
    })
  }, [registerNavigator])

  useEffect(() => {
    setCurrentChapter(activeChapter)
    setVisitedChapters(prev => {
      const next = new Set(prev)
      next.add(activeChapter)
      return next
    })
  }, [activeChapter, setCurrentChapter])

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
      {visitedChapters.has('ch1') && (
        <div style={{ display: activeChapter === 'ch1' ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <TimelineHall
            onDeepRead={handleDeepRead}
            onNextChapter={handleNextChapter}
            onGoToAI={() => {
              setPreviousChapter('ch1')
              setBlackout(true)
              setTimeout(() => {
                setActiveChapter('ch3')
                setTimeout(() => setBlackout(false), 300)
              }, 500)
            }}
            isPaused={!!activeDeepReadId || activeChapter !== 'ch1'}
          />
        </div>
      )}

      {visitedChapters.has('ch2') && (
        <div style={{ display: activeChapter === 'ch2' ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <FadingHall 
            onBack={() => {
              setBlackout(true)
              setTimeout(() => {
                setActiveChapter('ch1')
                setTimeout(() => setBlackout(false), 300)
              }, 500)
            }} 
            onNext={() => {
              setPreviousChapter('ch2')
              setBlackout(true)
              setTimeout(() => {
                setActiveChapter('ch3')
                setTimeout(() => setBlackout(false), 300)
              }, 500)
            }}
          />
        </div>
      )}

      {visitedChapters.has('ch3') && (
        <div style={{ display: activeChapter === 'ch3' ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <GrottoHub 
            onBack={() => {
              setBlackout(true)
              setTimeout(() => {
                setActiveChapter(previousChapter)
                setTimeout(() => setBlackout(false), 300)
              }, 500)
            }}
          />
        </div>
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

