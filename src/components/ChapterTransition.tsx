import { useEffect, useState } from 'react'
import './ChapterTransition.css'

interface ChapterTransitionProps {
  onComplete: () => void
  bgImage: string
  title: string
  subtitle: string
  englishTitle?: string
}

export function ChapterTransition({ onComplete, bgImage, title, subtitle, englishTitle }: ChapterTransitionProps) {
  const [progress, setProgress] = useState(0)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    // 模拟资源加载进度
    let start = Date.now()
    const duration = 3500 // 加载动画持续 3.5 秒
    
    const animate = () => {
      const now = Date.now()
      const elapsed = now - start
      const p = Math.min(100, (elapsed / duration) * 100)
      
      // 使用缓动函数让进度条看起来更自然（先快后慢）
      const easeOutQuart = 1 - Math.pow(1 - p / 100, 4)
      const currentProgress = Math.floor(easeOutQuart * 100)
      
      setProgress(currentProgress)
      
      if (p < 100) {
        requestAnimationFrame(animate)
      } else {
        // 加载完成，延迟一小段时间后触发淡出
        setTimeout(() => {
          setIsFadingOut(true)
          // 淡出动画结束后调用 onComplete 真正切换组件
          setTimeout(onComplete, 800)
        }, 400)
      }
    }
    
    requestAnimationFrame(animate)
  }, [onComplete])

  return (
    <div className={`chapter-transition-screen ${isFadingOut ? 'is-fading-out' : ''}`}>
      {/* 背景图层：壁画叠加 */}
      <div 
        className="transition-bg-layer" 
        style={{ backgroundImage: `url("${bgImage}")` }}
      />
      
      {/* 噪点质感叠加（可选，增加高级感） */}
      <div className="transition-noise" />

      <div className="transition-content">
        <div className="transition-text-group">
          <span className="transition-subtitle">{subtitle}</span>
          <h1 className="transition-title">{title}</h1>
          {englishTitle && <span className="transition-en-title">{englishTitle}</span>}
        </div>
        
        <div className="transition-loader-group">
          <div className="loader-track">
            <div className="loader-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="loader-percentage">{progress}%</span>
        </div>
      </div>
    </div>
  )
}
