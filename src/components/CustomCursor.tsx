import { useEffect, useRef, useState } from 'react'

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  
  // 用于弹簧物理的坐标状态
  const mouse = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const ring = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      
      // 直接更新 Dot 的位置以保证零延迟
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      }
    }

    // 监听可交互元素的 Hover 状态
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 如果悬浮在 button, a, 或是带有交互类的元素上
      if (
        target.tagName.toLowerCase() === 'button' ||
        target.tagName.toLowerCase() === 'a' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('interactive')
      ) {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseover', onMouseOver)

    // RAF 驱动 Ring 的阻尼动画
    let rafId: number
    const animateRing = () => {
      // 弹簧物理插值 (0.15 是阻尼系数，数值越大跟随越快)
      ring.current.x += (mouse.current.x - ring.current.x) * 0.15
      ring.current.y += (mouse.current.y - ring.current.y) * 0.15

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0)`
      }
      rafId = requestAnimationFrame(animateRing)
    }
    rafId = requestAnimationFrame(animateRing)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
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
      <div 
        ref={ringRef} 
        className={`cursor-ring ${isHovering ? 'is-hovering' : ''}`} 
      />
      <div 
        ref={cursorRef} 
        className={`cursor-dot ${isHovering ? 'is-hovering' : ''}`} 
      />
    </div>
  )
}
