import { useEffect, useRef } from 'react'

/* ============================================================
   AtmosphereEffects: Canvas 2D 浮尘粒子系统
   模拟石窟内悬浮的灰尘在光线中闪烁、飘动
   只在第一阶段显示，第二阶段立即全部消失
   ============================================================ */

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  baseOpacity: number
  life: number
  maxLife: number
  // 布朗运动参数
  noiseOffsetX: number
  noiseOffsetY: number
  noiseSpeed: number
}

interface AtmosphereEffectsProps {
  currentStep: number // 当前阶段，0=第一阶段，1+=后续阶段
}

function createParticle(w: number, h: number, fullRandom = false): Particle {
  // 粒子只在画面上方 65% 区域生成（底部不要有雾气/粒子）
  const maxY = h * 0.65
  const y = Math.random() * maxY

  let x: number
  if (fullRandom) {
    // 完全随机分布在整个宽度
    x = Math.random() * w
  } else {
    // 重生时：60%从两侧，40%从中间区域
    const rand = Math.random()
    if (rand < 0.3) {
      // 左侧
      x = -5
    } else if (rand < 0.6) {
      // 右侧
      x = w + 5
    } else {
      // 中间区域（20%-80%宽度）
      x = w * 0.2 + Math.random() * w * 0.6
    }
  }

  return {
    x,
    y,
    // 极慢的整体漂移方向（微微向下飘散 + 随机左右）
    vx: (Math.random() - 0.5) * 0.25,
    vy: Math.random() * 0.08 - 0.02, // 轻微向下飘
    // 粒子大小分布：大部分很小，少数较大
    size: Math.random() < 0.15 ? Math.random() * 3.5 + 2 : Math.random() * 1.8 + 0.4,
    baseOpacity: Math.random() * 0.45 + 0.08,
    life: fullRandom ? Math.random() : 1,
    maxLife: 1,
    noiseOffsetX: Math.random() * 100,
    noiseOffsetY: Math.random() * 100,
    noiseSpeed: Math.random() * 0.3 + 0.15,
  }
}

export function AtmosphereEffects({ currentStep }: AtmosphereEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    // 第二阶段立即隐藏整个 canvas
    if (currentStep >= 1) {
      if (canvasRef.current) {
        canvasRef.current.style.display = 'none'
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    // 第一阶段显示 canvas
    canvas.style.display = 'block'

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * Math.min(window.devicePixelRatio, 1.5)
      canvas.height = height * Math.min(window.devicePixelRatio, 1.5)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.scale(Math.min(window.devicePixelRatio, 1.5), Math.min(window.devicePixelRatio, 1.5))
    }
    resize()
    window.addEventListener('resize', resize)

    // 粒子数量：桌面端 240，移动端 120（增加1倍）
    const isMobile = width < 768
    const particleCount = isMobile ? 120 : 240
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(width, height, true))
    }

    let time = 0

    const animate = () => {
      time += 0.016
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // 布朗运动：基于时间的正弦扰动，每个粒子有独立的相位
        const brownX = Math.sin(time * p.noiseSpeed + p.noiseOffsetX) * 0.4
          + Math.sin(time * p.noiseSpeed * 0.7 + p.noiseOffsetX * 2.3) * 0.2
        const brownY = Math.cos(time * p.noiseSpeed * 0.8 + p.noiseOffsetY) * 0.3
          + Math.cos(time * p.noiseSpeed * 0.5 + p.noiseOffsetY * 1.7) * 0.15

        p.x += p.vx + brownX
        p.y += p.vy + brownY
        p.life -= 0.002

        // 边界检查 + 生命耗尽 → 重生
        if (
          p.x < -20 || p.x > width + 20 ||
          p.y < -20 || p.y > height + 20 ||
          p.life <= 0
        ) {
          Object.assign(p, createParticle(width, height, false))
          continue
        }

        // 绘制正方形粒子
        ctx.fillStyle = '#f6cea0'
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [currentStep])

  return (
    <canvas
      ref={canvasRef}
      className="atmosphere-canvas"
      aria-hidden="true"
    />
  )
}
