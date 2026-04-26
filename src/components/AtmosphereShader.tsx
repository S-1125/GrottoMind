import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

/* ============================================================
   AtmosphereShader: Three.js 全屏流动雾气
   核心算法：Inigo Quilez 经典 Domain Warping
   q = fbm(st + time)
   r = fbm(st + q + time)
   f = fbm(st + r)
   产生自然的流体卷曲效果。
============================================================ */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;

  varying vec2 vUv;

  // ——— 经典伪随机 ———
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // ——— 2D Value Noise ———
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // ——— FBM 5 阶 ———
  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;

    // 基础采样坐标
    vec2 st = vec2(uv.x * aspect, uv.y) * 3.0;

    // ——— Inigo Quilez 经典 Domain Warping ———
    vec2 q = vec2(0.0);
    q.x = fbm(st + 0.00 * uTime);
    q.y = fbm(st + vec2(1.0));

    vec2 r = vec2(0.0);
    r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * uTime);
    r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * uTime);

    float f = fbm(st + r);

    // 雾气浓度
    float fogAlpha = smoothstep(0.1, 0.9, f);
    fogAlpha *= 0.7;

    // ——— 上方遮罩：雾气集中在中部偏上 ———
    float topMask = smoothstep(0.2, 0.45, uv.y) * smoothstep(0.95, 0.6, uv.y);
    fogAlpha *= topMask;

    // ——— 边缘羽化 ———
    float edgeFade = smoothstep(0.0, 0.15, uv.x)
                   * smoothstep(1.0, 0.85, uv.x)
                   * smoothstep(0.0, 0.15, uv.y)
                   * smoothstep(1.0, 0.72, uv.y);
    fogAlpha *= edgeFade;

    // ——— 颜色：蓝深灰水墨 ———
    vec3 inkDark = vec3(0.04, 0.05, 0.10);    // 浓墨偏蓝
    vec3 inkLight = vec3(0.14, 0.16, 0.24);   // 淡墨偏蓝
    float colorBlend = clamp(length(q) * 0.8, 0.0, 1.0);
    vec3 fogColor = mix(inkDark, inkLight, f * 0.6 + colorBlend * 0.3);

    // ——— 天光光柱 ———
    float rayX = uv.x - 0.4 - sin(uTime * 0.3) * 0.04;
    float rayWidth = mix(0.03, 0.2, 1.0 - uv.y);
    float ray = exp(-rayX * rayX / (rayWidth * rayWidth * 2.0));
    ray *= smoothstep(0.3, 0.85, uv.y) * 0.25;

    float ray2X = uv.x - 0.65 + cos(uTime * 0.25) * 0.03;
    float ray2Width = mix(0.02, 0.14, 1.0 - uv.y);
    float ray2 = exp(-ray2X * ray2X / (ray2Width * ray2Width * 2.0));
    ray2 *= smoothstep(0.35, 0.8, uv.y) * 0.15;

    // 将之前的暖黄色天光改为冷白/浅灰色，避免产生黄色脏污感
    vec3 rayColor = vec3(0.85, 0.88, 0.92);
    vec3 finalColor = fogColor + rayColor * (ray + ray2);

    float finalAlpha = clamp(fogAlpha + (ray + ray2) * 0.6, 0.0, 0.55);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`

export function AtmosphereShader({ currentStep = 0 }: { currentStep?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!containerRef.current) return
    // 第二阶段（currentStep = 1）时雾气减半，到第三阶段（currentStep = 2）及之后彻底消失
    const targetOpacity = currentStep === 0 ? 1 : currentStep === 1 ? 0.4 : 0
    gsap.to(containerRef.current, {
      autoAlpha: targetOpacity,
      duration: 1.5,
      ease: 'power2.inOut',
    })
  }, [currentStep])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    // 使用平面几何体作为雾气载体（和参考写法一致）
    const geometry = new THREE.PlaneGeometry(16, 9)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new THREE.Vector2(container.clientWidth, container.clientHeight),
        },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const clock = new THREE.Clock()
    const animate = () => {
      // 时间乘 0.5 让流动更缓慢、更有电影感
      material.uniforms.uTime.value = clock.getElapsedTime() * 0.5
      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      material.uniforms.uResolution.value.set(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="atmosphere-shader"
      aria-hidden="true"
    />
  )
}
