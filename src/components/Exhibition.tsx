import { useState } from 'react'
import { TimelineHall } from './TimelineHall'
import { DeepReadArticle } from './DeepReadArticle'

/* ============================================================
   Exhibition: 进入后的展览主容器
   当前阶段只承载第一章，后续展厅从这里继续生长。
============================================================ */
interface ExhibitionProps {
  onAssetsProgress?: (progress: number) => void
  onAssetsReady?: () => void
}

export function Exhibition({ onAssetsProgress, onAssetsReady }: ExhibitionProps) {
  const [activeDeepReadId, setActiveDeepReadId] = useState<string | null>(null)
  const [blackout, setBlackout] = useState(false)

  const handleDeepRead = (nodeId: string) => {
    // 触发黑屏 (Fade to black)
    setBlackout(true)
    setTimeout(() => {
      setActiveDeepReadId(nodeId)
      // 保持短暂黑屏后再褪去
      setTimeout(() => setBlackout(false), 200)
    }, 400)
  }

  const handleBackToExhibition = () => {
    // 返回也是通过黑屏过渡
    setBlackout(true)
    setTimeout(() => {
      setActiveDeepReadId(null)
      setTimeout(() => setBlackout(false), 200)
    }, 400)
  }

  return (
    <section className="exhibition-stage" aria-label="问窟沉浸式展览">
        <TimelineHall
          onDeepRead={handleDeepRead}
          onAssetsProgress={onAssetsProgress}
          onAssetsReady={onAssetsReady}
          isPaused={!!activeDeepReadId}
        />

      {activeDeepReadId && (
        <DeepReadArticle nodeId={activeDeepReadId} onBack={handleBackToExhibition} />
      )}

      {/* 全局转场遮罩 */}
      <div 
        className={`global-blackout ${blackout ? 'is-active' : ''}`} 
        aria-hidden="true" 
      />
    </section>
  )
}
