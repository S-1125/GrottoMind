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
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const enterExhibition = useCallback(() => {
    if (stage !== 'intro' || isVeiling) return

    // 第一阶段：黑幕淡入
    setIsVeiling(true)
    setLoadProgress(0)

    timersRef.current.push(window.setTimeout(() => {
      // 第二阶段：切换到加载中状态，开始模拟进度
      setStage('loading')
      window.scrollTo(0, 0)

      let progress = 0
      const startTime = performance.now()
      // 总加载时间 2.5 秒
      const duration = 2500

      const tick = () => {
        const elapsed = performance.now() - startTime
        // 使用缓入缓出曲线让进度更自然
        const t = Math.min(elapsed / duration, 1)
        progress = Math.round(t * t * (3 - 2 * t) * 100)
        setLoadProgress(progress)

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          // 加载完成，使用 GSAP 执行浮动淡出动画
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
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }, 520))
  }, [isVeiling, stage])

  return (
    <>
      <CustomCursor />
      <main className={`app-root ${isVeiling ? 'is-veiling' : ''}`}>
      {stage === 'intro' ? (
        <IntroAnimation onEnter={enterExhibition} />
      ) : stage === 'loading' ? null : (
        <Exhibition />
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
