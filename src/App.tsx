import { useCallback, useEffect, useRef, useState } from 'react'
import { Exhibition } from './components/Exhibition'
import { IntroAnimation } from './components/IntroAnimation'
import { CustomCursor } from './components/CustomCursor'
import gsap from 'gsap'
import './App.css'

type ExperienceStage = 'intro' | 'loading' | 'exhibition'

function App() {
  const [stage, setStage] = useState<ExperienceStage>('intro')
  const [isVeiling, setIsVeiling] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const timersRef = useRef<number[]>([])
  const loadStartedAtRef = useRef(0)
  const loadFinishedRef = useRef(false)

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const completeLoadTransition = useCallback(() => {
    if (loadFinishedRef.current) return

    loadFinishedRef.current = true
    setLoadProgress(100)

    // 黑幕至少停留一段时间，避免缓存命中时一闪而过。
    const elapsed = performance.now() - loadStartedAtRef.current
    const delay = Math.max(0, 1200 - elapsed)

    timersRef.current.push(window.setTimeout(() => {
      gsap.to('.veil-loader', {
        y: -15,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          setStage('exhibition')
          timersRef.current.push(window.setTimeout(() => {
            setIsVeiling(false)
          }, 100))
        }
      })
    }, delay))
  }, [])

  const handleAssetsProgress = useCallback((progress: number) => {
    const nextProgress = Math.max(0, Math.min(99, Math.round(progress)))
    setLoadProgress((current) => Math.max(current, nextProgress))
  }, [])

  const enterExhibition = useCallback(() => {
    if (stage !== 'intro' || isVeiling) return

    // 第一阶段：黑幕淡入
    setIsVeiling(true)
    setLoadProgress(0)
    loadFinishedRef.current = false
    loadStartedAtRef.current = performance.now()

    timersRef.current.push(window.setTimeout(() => {
      // 第二阶段：在黑幕下挂载展厅，让模型和贴图开始真实加载。
      setStage('loading')
      window.scrollTo(0, 0)
    }, 520))
  }, [isVeiling, stage])

  return (
    <>
      <CustomCursor />
      <main className={`app-root ${isVeiling ? 'is-veiling' : ''}`}>
      {stage === 'intro' ? (
        <IntroAnimation onEnter={enterExhibition} />
      ) : (
        <Exhibition
          onAssetsProgress={handleAssetsProgress}
          onAssetsReady={completeLoadTransition}
        />
      )}
      <div className="experience-veil" aria-hidden="true">
        <div className="veil-loader">
          <div className="veil-ornament" aria-hidden="true" />
          <svg
            className="progress-ring-svg"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="100" cy="100" r={75} fill="none" stroke="rgba(212,169,106,0.12)" strokeWidth="0.4" />
            <circle
              cx="100" cy="100" r={75}
              fill="none" stroke="#d4a96a" strokeWidth="0.6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 75 * (loadProgress / 100)} ${2 * Math.PI * 75}`}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dasharray 0.1s linear' }}
            />
          </svg>
          <span className="veil-progress-text">{loadProgress}</span>
        </div>
      </div>
    </main>
    </>
  )
}

export default App
