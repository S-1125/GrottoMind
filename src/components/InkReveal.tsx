import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'

/* ============================================================
   InkReveal v2 — FBO 流体拖尾显影
   
   基于简化 Navier-Stokes 的双缓冲流体模拟：
   1. Velocity Field — 鼠标注入速度，自平流 + 消散
   2. Dye / Mask Field — 鼠标注入"墨"，被速度场携带流动
   3. Composite — 灰度 × (1-mask) + 彩色 × mask
   
   每帧管线：
   Splat → Advect Velocity → Advect Dye → Composite
============================================================ */

/* ---- 通用全屏 Vertex Shader ---- */
const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/* ---- Splat：在 FBO 上注入带 noise 不规则边缘的光斑 ---- */
const SPLAT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec2 uSplatDelta;
uniform float uRadius;
uniform vec2 uAspect;
uniform float uTime;
varying vec2 vUv;

// 简化 2D hash noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 diff = (vUv - uPoint) * uAspect;
  
  // 圆形基底距离
  float dist = length(diff);
  
  // 多层 FBM noise 叠加：模拟撕纸的粗糙锯齿纤维感
  float n = 0.0;
  n += noise(vUv * 6.0 + uTime * 0.3) * 0.35;          // 大尺度撕裂
  n += noise(vUv * 14.0 - uTime * 0.2) * 0.25;          // 中尺度毛边
  n += noise(vUv * 30.0 + uTime * 0.15) * 0.15;         // 小尺度纤维
  n += noise(vUv * 60.0 + vec2(uTime * 0.1, 0.0)) * 0.08; // 细微毛刺
  
  // noise 扰动半径：0.45~1.28 倍原始半径的随机波动
  float noisyRadius = uRadius * (0.45 + n * 1.0);
  
  // 撕纸效果：边缘过渡非常窄（几乎硬切），但内部平滑
  float falloff = 1.0 - smoothstep(noisyRadius * 0.7, noisyRadius, dist);
  
  vec4 base = texture2D(uTarget, vUv);
  base.xy += uSplatDelta * falloff;
  gl_FragColor = base;
}
`

/* ---- Advection：平流（将场沿速度场移动） ---- */
const ADVECT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uVelocity;   // 速度场
uniform sampler2D uSource;     // 被平流的场
uniform vec2 uTexelSize;       // 1.0 / resolution
uniform float uDissipation;    // 消散系数（<1 = 逐渐衰减）
uniform float uDt;             // 时间步长
varying vec2 vUv;

void main() {
  // 回溯：从当前位置沿速度反方向找源头
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vec2 prevUv = vUv - vel * uDt * uTexelSize;
  
  // 采样源场在回溯位置的值
  vec4 result = texture2D(uSource, prevUv);
  
  // 乘以消散系数
  gl_FragColor = result * uDissipation;
}
`

/* ---- Composite：最终合成（速度场微扭曲，无色差） ---- */
const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uGray;
uniform sampler2D uColor;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
varying vec2 vUv;

void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  
  // 速度驱动的微弱 UV 扭曲
  float distortStrength = 0.003;
  vec2 distortedUV = vUv + vel * distortStrength * 0.3;
  
  // 显影遮罩
  float mask = clamp(texture2D(uDye, vUv).r, 0.0, 1.0);
  mask = smoothstep(0.0, 0.8, mask);
  
  vec4 gray  = texture2D(uGray, distortedUV);
  vec4 color = texture2D(uColor, vUv + vel * distortStrength);
  
  gl_FragColor = mix(gray, color, mask);
}
`

/* ============================================================
   辅助：创建 ping-pong FBO 对
============================================================ */
function createDoubleFBO(w: number, h: number) {
  const params = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  }
  const read = new THREE.WebGLRenderTarget(w, h, params)
  const write = new THREE.WebGLRenderTarget(w, h, params)
  return { read, write, swap() { const tmp = this.read; this.read = this.write; this.write = tmp } }
}

/* ============================================================
   组件
============================================================ */
interface InkRevealProps {
  grayImageUrl: string
  colorImageUrl: string
  className?: string
}

export function InkReveal({ grayImageUrl, colorImageUrl, className = '' }: InkRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer
    camera: THREE.OrthographicCamera
    quad: THREE.Mesh
    velocity: ReturnType<typeof createDoubleFBO>
    dye: ReturnType<typeof createDoubleFBO>
    splatMat: THREE.ShaderMaterial
    advectMat: THREE.ShaderMaterial
    compositeMat: THREE.ShaderMaterial
    scene: THREE.Scene
    compositeScene: THREE.Scene
    animFrame: number
    simW: number
    simH: number
  } | null>(null)
  const mouseRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0, moved: false })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.clientWidth
    const h = container.clientHeight
    // 流体模拟用较低分辨率（性能优化），显示用全分辨率
    const simScale = 0.5
    const simW = Math.floor(w * simScale)
    const simH = Math.floor(h * simScale)

    // ---- 渲染器 ----
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.autoClear = false
    container.appendChild(renderer.domElement)

    // 检查浮点纹理支持
    const ext = renderer.getContext().getExtension('OES_texture_float')
    if (!ext) {
      // 如果不支持 float 纹理，也不报错，降级处理
      console.warn('OES_texture_float 不可用，流体模拟可能受限')
    }

    // ---- 正交相机 + 全屏四边形 ----
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1)
    const quadGeo = new THREE.PlaneGeometry(1, 1)

    // ---- FBO 双缓冲 ----
    const velocity = createDoubleFBO(simW, simH)
    const dye = createDoubleFBO(simW, simH)

    // ---- Splat 材质 ----
    const splatMat = new THREE.ShaderMaterial({
      uniforms: {
        uTarget: { value: null },
        uPoint: { value: new THREE.Vector2(0, 0) },
        uSplatDelta: { value: new THREE.Vector2(0, 0) },
        uRadius: { value: 0.025 },
        uAspect: { value: new THREE.Vector2(w / h, 1.0) },
        uTime: { value: 0 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: SPLAT_FRAG,
    })

    // ---- Advection 材质 ----
    const advectMat = new THREE.ShaderMaterial({
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uTexelSize: { value: new THREE.Vector2(1.0 / simW, 1.0 / simH) },
        uDissipation: { value: 0.98 },
        uDt: { value: 1.0 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: ADVECT_FRAG,
    })

    // ---- Composite 材质 ----
    const texLoader = new THREE.TextureLoader()
    const grayTex = texLoader.load(grayImageUrl)
    const colorTex = texLoader.load(colorImageUrl)
    ;[grayTex, colorTex].forEach(t => {
      t.minFilter = THREE.LinearFilter
      t.magFilter = THREE.LinearFilter
    })

    const compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        uGray: { value: grayTex },
        uColor: { value: colorTex },
        uDye: { value: dye.read.texture },
        uVelocity: { value: velocity.read.texture },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      transparent: true,
    })

    // ---- 场景 ----
    const scene = new THREE.Scene()
    const quad = new THREE.Mesh(quadGeo, splatMat) // 材质会在各 pass 间切换
    scene.add(quad)

    const compositeScene = new THREE.Scene()
    const compositeQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), compositeMat)
    compositeScene.add(compositeQuad)

    // 保存状态
    stateRef.current = {
      renderer, camera, quad, velocity, dye,
      splatMat, advectMat, compositeMat,
      scene, compositeScene, animFrame: 0,
      simW, simH,
    }

    // ---- 辅助：将 quad 切换材质并渲染到指定 FBO ----
    const renderPass = (material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
      quad.material = material
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
    }

    // ---- 主循环 ----
    let mouseInside = false
    const animate = () => {
      const st = stateRef.current
      if (!st) return

      const mouse = mouseRef.current
      const time = performance.now() * 0.001
      st.splatMat.uniforms.uTime.value = time

      // --- 1. Splat：注入速度和墨 ---
      if (mouse.moved) {
        const dx = mouse.x - mouse.prevX
        const dy = mouse.y - mouse.prevY

        // Splat 速度（移动时）
        st.splatMat.uniforms.uTarget.value = st.velocity.read.texture
        st.splatMat.uniforms.uPoint.value.set(mouse.x, mouse.y)
        st.splatMat.uniforms.uSplatDelta.value.set(dx * 400, dy * 400)
        st.splatMat.uniforms.uRadius.value = 0.22
        renderPass(st.splatMat, st.velocity.write)
        st.velocity.swap()

        mouse.prevX = mouse.x
        mouse.prevY = mouse.y
        mouse.moved = false
        mouseInside = true
      }

      // 鼠标停留时也持续注墨（不需要移动）
      if (mouseInside && mouse.x > 0 && mouse.y > 0) {
        st.splatMat.uniforms.uTarget.value = st.dye.read.texture
        st.splatMat.uniforms.uPoint.value.set(mouse.x, mouse.y)
        st.splatMat.uniforms.uSplatDelta.value.set(0.12, 0.12)
        st.splatMat.uniforms.uRadius.value = 0.8
        renderPass(st.splatMat, st.dye.write)
        st.dye.swap()
      }

      // --- 2. Advect 速度场 ---
      st.advectMat.uniforms.uVelocity.value = st.velocity.read.texture
      st.advectMat.uniforms.uSource.value = st.velocity.read.texture
      st.advectMat.uniforms.uDissipation.value = 0.97
      renderPass(st.advectMat, st.velocity.write)
      st.velocity.swap()

      // --- 3. Advect 墨场 ---
      st.advectMat.uniforms.uVelocity.value = st.velocity.read.texture
      st.advectMat.uniforms.uSource.value = st.dye.read.texture
      st.advectMat.uniforms.uDissipation.value = 0.985
      renderPass(st.advectMat, st.dye.write)
      st.dye.swap()

      // --- 4. Composite ---
      st.compositeMat.uniforms.uDye.value = st.dye.read.texture
      st.compositeMat.uniforms.uVelocity.value = st.velocity.read.texture
      renderer.setRenderTarget(null)
      renderer.clear()
      renderer.render(st.compositeScene, camera)

      st.animFrame = requestAnimationFrame(animate)
    }
    stateRef.current.animFrame = requestAnimationFrame(animate)

    // ---- 窗口缩放 ----
    const handleResize = () => {
      const st = stateRef.current
      if (!st) return
      const nw = container.clientWidth
      const nh = container.clientHeight
      st.renderer.setSize(nw, nh)
      st.splatMat.uniforms.uAspect.value.set(nw / nh, 1.0)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      const st = stateRef.current
      if (st) {
        cancelAnimationFrame(st.animFrame)
        st.velocity.read.dispose()
        st.velocity.write.dispose()
        st.dye.read.dispose()
        st.dye.write.dispose()
        st.renderer.dispose()
        container.removeChild(st.renderer.domElement)
      }
      window.removeEventListener('resize', handleResize)
      stateRef.current = null
    }
  }, [grayImageUrl, colorImageUrl])

  /* 鼠标移动：记录归一化坐标和速度 */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = 1.0 - (e.clientY - rect.top) / rect.height

    const mouse = mouseRef.current
    if (mouse.x === 0 && mouse.y === 0) {
      // 首次进入，初始化 prev 避免巨大的初始速度
      mouse.prevX = nx
      mouse.prevY = ny
    }
    mouse.x = nx
    mouse.y = ny
    mouse.moved = true
  }, [])

  return (
    <div
      ref={containerRef}
      className={`ink-reveal ${className}`}
      onMouseMove={handleMouseMove}
    />
  )
}
