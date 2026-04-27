import { useCallback, useEffect, useRef, useState } from 'react'
import { Exhibition } from './components/Exhibition'
import { IntroAnimation } from './components/IntroAnimation'
import './App.css'

type ExperienceStage = 'intro' | 'exhibition'

function App() {
  const [stage, setStage] = useState<ExperienceStage>('intro')
  const [isVeiling, setIsVeiling] = useState(false)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const enterExhibition = useCallback(() => {
    if (stage === 'exhibition' || isVeiling) return

    setIsVeiling(true)
    timersRef.current.push(window.setTimeout(() => {
      setStage('exhibition')
      window.scrollTo(0, 0)
    }, 520))
    timersRef.current.push(window.setTimeout(() => {
      setIsVeiling(false)
    }, 1320))
  }, [isVeiling, stage])

  return (
    <main className={`app-root ${isVeiling ? 'is-veiling' : ''}`}>
      {stage === 'intro' ? (
        <IntroAnimation onEnter={enterExhibition} />
      ) : (
        <Exhibition />
      )}
      <div className="experience-veil" aria-hidden="true" />
    </main>
  )
}

export default App
