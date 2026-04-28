import { useState } from 'react'
import { TimelineHall } from './TimelineHall'
import { DeepReadArticle } from './DeepReadArticle'

/* ============================================================
   Exhibition: 进入后的展览主容器
   当前阶段只承载第一章，后续展厅从这里继续生长。
============================================================ */
export function Exhibition() {
  const [isDeepRead, setIsDeepRead] = useState(false)
  const [blackout, setBlackout] = useState(false)

  const handleDeepRead = () => {
    // 触发黑屏 (Fade to black)
    setBlackout(true)
    setTimeout(() => {
      setIsDeepRead(true)
      // 保持短暂黑屏后再褪去
      setTimeout(() => setBlackout(false), 200)
    }, 400)
  }

  const handleBackToExhibition = () => {
    // 返回也是通过黑屏过渡
    setBlackout(true)
    setTimeout(() => {
      setIsDeepRead(false)
      setTimeout(() => setBlackout(false), 200)
    }, 400)
  }

  return (
    <section className="exhibition-stage" aria-label="问窟沉浸式展览">
      {isDeepRead ? (
        <DeepReadArticle onBack={handleBackToExhibition} />
      ) : (
        <TimelineHall onDeepRead={handleDeepRead} />
      )}

      {/* 全局转场遮罩 */}
      <div 
        className={`global-blackout ${blackout ? 'is-active' : ''}`} 
        aria-hidden="true" 
      />
    </section>
  )
}
