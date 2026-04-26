import { useEffect, useRef } from 'react'

/* ============================================================
   GlowText: 字母逐个浮现 + 金色光晕效果
   每个字母依次从下方浮现，像古老的文字被点亮
   ============================================================ */

interface GlowTextProps {
  text: string
  isActive: boolean
}

export function GlowText({ text, isActive }: GlowTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!isActive || hasAnimated.current) return
    hasAnimated.current = true

    const container = containerRef.current
    if (!container) return

    // 清空内容并重新构建带动画的字母
    const chars = text.split('')
    container.innerHTML = ''

    chars.forEach((char, index) => {
      const span = document.createElement('span')
      span.className = 'char'
      span.textContent = char === ' ' ? '\u00A0' : char
      span.style.animationDelay = `${index * 0.08}s`
      container.appendChild(span)
    })

    return () => {
      hasAnimated.current = false
    }
  }, [isActive, text])

  // 初始状态：直接显示文字（无动画）
  if (!isActive) {
    return <span>{text}</span>
  }

  return (
    <span ref={containerRef} className="title-glow-text">
      {text}
    </span>
  )
}
