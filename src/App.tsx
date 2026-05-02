import { useCallback, useState } from 'react'
import { Exhibition } from './components/Exhibition'
import { IntroAnimation } from './components/IntroAnimation'
import { CustomCursor } from './components/CustomCursor'
import './App.css'

/* ============================================================
   App：序章 → 第一章的直接过渡
   移除了纹样加载页，改为纯黑幕淡入淡出过渡
============================================================ */
function App() {
  const [showExhibition, setShowExhibition] = useState(false)
  const [isVeiling, setIsVeiling] = useState(false)

  const enterExhibition = useCallback(() => {
    if (isVeiling) return

    // 黑幕淡入
    setIsVeiling(true)

    // 黑幕完全覆盖后，直接切换到展厅
    setTimeout(() => {
      setShowExhibition(true)
      window.scrollTo(0, 0)

      // 短暂延迟后淡出黑幕
      setTimeout(() => setIsVeiling(false), 300)
    }, 600)
  }, [isVeiling])

  return (
    <>
      <CustomCursor />
      <main className={`app-root ${isVeiling ? 'is-veiling' : ''}`}>
      {!showExhibition ? (
        <IntroAnimation onEnter={enterExhibition} />
      ) : (
        <Exhibition />
      )}
      {/* 纯黑幕过渡遮罩 */}
      <div className="experience-veil" aria-hidden="true" />
    </main>
    </>
  )
}

export default App
