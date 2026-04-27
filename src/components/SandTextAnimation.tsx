import { useEffect, useRef } from 'react'

/* ============================================================
   SandTextAnimation: 风沙粒子汇聚文字效果
   直接在原始文字位置上渲染粒子，替代原文字
   ============================================================ */

interface SandTextAnimationProps {
  text: string
  isActive: boolean
}

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  settled: boolean
}

export function SandTextAnimation({ text, isActive }: SandTextAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    // 获取目标文字元素的位置和样式
    const targetElement = document.querySelector('.intro-copy-line.is-title') as HTMLElement
    if (!targetElement) {
      window.removeEventListener('resize', resize)
      return
    }

    const rect = targetElement.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(targetElement)
    const fontSize = parseInt(computedStyle.fontSize)
    const fontFamily = computedStyle.fontFamily

    // 创建离屏 canvas 获取文字像素
    const offscreen = document.createElement('canvas')
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) return

    offscreen.width = width
    offscreen.height = height

    // 使用与原始文字完全相同的字体设置
    offCtx.font = `400 ${fontSize}px ${fontFamily}`
    offCtx.textAlign = 'center'
    offCtx.textBaseline = 'middle'
    offCtx.fillStyle = '#ffffff'

    // 计算文字位置 - 与原始文字元素中心对齐
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    offCtx.fillText(text, centerX, centerY)

    const imageData = offCtx.getImageData(0, 0, width, height)
    const pixels = imageData.data

    // 密集采样
    const targetPoints: { x: number; y: number }[] = []
    const sampleStep = 2

    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4
        if (pixels[idx + 3] > 100) {
          targetPoints.push({ x, y })
        }
      }
    }

    // 创建粒子
    const particles: Particle[] = []

    targetPoints.forEach((point) => {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * Math.max(width, height) * 0.6 + 50

      particles.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        targetX: point.x,
        targetY: point.y,
        vx: 0,
        vy: 0,
        size: Math.random() * 1.2 + 0.3,
        opacity: 0,
        color: '#ffffff',
        settled: false,
      })
    })

    let time = 0
    const duration = 150

    const animate = () => {
      time++
      ctx.clearRect(0, 0, width, height)

      const progress = Math.min(time / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 2.5)

      particles.forEach((p) => {
        if (!p.settled) {
          const dx = p.targetX - p.x
          const dy = p.targetY - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist > 0.5) {
            const noiseX = (Math.random() - 0.5) * 3
            const noiseY = (Math.random() - 0.5) * 3
            const turbulence = Math.sin(time * 0.1 + p.targetX * 0.01) * 2

            const speed = 0.03 + easeProgress * 0.08
            p.vx = dx * speed + noiseX + turbulence
            p.vy = dy * speed + noiseY

            p.x += p.vx
            p.y += p.vy

            p.opacity = Math.min(progress * 1.5, 0.9)
          } else {
            p.settled = true
            p.x = p.targetX
            p.y = p.targetY
          }
        } else {
          p.x = p.targetX + Math.sin(time * 0.025 + p.targetY * 0.02) * 0.6
          p.y = p.targetY + Math.cos(time * 0.02 + p.targetX * 0.02) * 0.6
          p.opacity = 0.7 + Math.sin(time * 0.04 + p.targetX) * 0.3
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fill()
      })

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isActive, text])

  return (
    <canvas
      ref={canvasRef}
      className="sand-text-canvas"
      aria-hidden="true"
    />
  )
}
