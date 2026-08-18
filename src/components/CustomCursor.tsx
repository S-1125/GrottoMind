import { useEffect, useRef, useState } from 'react'

export function CustomCursor() {
  // 触屏设备不渲染自定义光标
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  if (isTouchDevice) return null

  const cursorRef = useRef<HTMLDivElement>(null)
  const reticleRef = useRef<HTMLDivElement>(null)
  
  // 用于弹簧物理的坐标状态
  const mouse = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const reticle = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  
  const [isHovering, setIsHovering] = useState(false)
  const [isClicking, setIsClicking] = useState(false)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      
      // 直接更新中心菱形位置保证零延迟
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      }
    }

    const onMouseDown = () => setIsClicking(true)
    const onMouseUp = () => setIsClicking(false)

    // 监听可交互元素的 Hover 状态
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName.toLowerCase() === 'button' ||
        target.tagName.toLowerCase() === 'a' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('interactive') ||
        target.classList.contains('clickable')
      ) {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseover', onMouseOver)

    // RAF 驱动十字测绘准星的阻尼平滑跟随
    let rafId: number
    const animateReticle = () => {
      reticle.current.x += (mouse.current.x - reticle.current.x) * 0.22
      reticle.current.y += (mouse.current.y - reticle.current.y) * 0.22

      if (reticleRef.current) {
        reticleRef.current.style.transform = `translate3d(${reticle.current.x}px, ${reticle.current.y}px, 0)`
      }
      rafId = requestAnimationFrame(animateReticle)
    }
    rafId = requestAnimationFrame(animateReticle)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mouseover', onMouseOver)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // 隐藏原生鼠标
  useEffect(() => {
    document.body.style.cursor = 'none'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [])

  return (
    <div className="custom-cursor-container" aria-hidden="true">
      {/* 极简外围直角十字测绘准星 */}
      <div 
        ref={reticleRef} 
        className={`cursor-reticle ${isHovering ? 'is-hovering' : ''} ${isClicking ? 'is-clicking' : ''}`}
      >
        <span className="reticle-line reticle-top" />
        <span className="reticle-line reticle-bottom" />
        <span className="reticle-line reticle-left" />
        <span className="reticle-line reticle-right" />
      </div>

      {/* 中心菱形光晶 */}
      <div 
        ref={cursorRef} 
        className={`cursor-diamond ${isHovering ? 'is-hovering' : ''} ${isClicking ? 'is-clicking' : ''}`} 
      />
    </div>
  )
}
