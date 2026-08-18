import { useCallback, useState, useEffect } from 'react'
import { Exhibition } from './components/Exhibition'
import { IntroAnimation } from './components/IntroAnimation'
import { CustomCursor } from './components/CustomCursor'
import { AgentProvider } from './components/agent/AgentContext'
import { GlobalAgent } from './components/agent/GlobalAgent'
import { GlobalControls } from './components/GlobalControls'
import { soundEngine } from './utils/soundEngine'
import './App.css'

/* ============================================================
   App：栖霞山数字复彩档案馆主容器
   集成 Web Audio 东方金石与石窟空灵程序化音效系统
============================================================ */
function App() {
  const [showExhibition, setShowExhibition] = useState(false)
  const [isVeiling, setIsVeiling] = useState(false)

  // 监听用户首次手势/点击，平滑淡入石窟空灵背景音
  useEffect(() => {
    const handleFirstGesture = () => {
      soundEngine.startAmbient()
      window.removeEventListener('pointerdown', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
    }

    window.addEventListener('pointerdown', handleFirstGesture, { once: true })
    window.addEventListener('keydown', handleFirstGesture, { once: true })

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
    }
  }, [])

  const enterExhibition = useCallback(() => {
    if (isVeiling) return

    // 播放进入大展厅的深沉宏阔古钟鸣响
    soundEngine.playGong(160)

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
    <AgentProvider>
      <CustomCursor />
      <GlobalAgent />
      <GlobalControls />
      <main className={`app-root ${isVeiling ? 'is-veiling' : ''}`}>
        {!showExhibition ? (
          <IntroAnimation onEnter={enterExhibition} />
        ) : (
          <Exhibition />
        )}
        {/* 纯黑幕过渡遮罩 */}
        <div className="experience-veil" aria-hidden="true" />
      </main>
    </AgentProvider>
  )
}

export default App
