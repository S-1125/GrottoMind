import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type HeroWebGLProps = {
  className?: string
}

const vertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin((pos.x * 2.4) + uTime * 0.32) * 0.06;
    float slow = sin((pos.y * 3.8) - uTime * 0.22) * 0.04;
    float mouseGlow = 1.0 - smoothstep(0.0, 0.72, distance(uv, uMouse));
    pos.z += wave + slow + mouseGlow * 0.18;
    vDepth = pos.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vDepth;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 p = vUv;
    float grain = noise(p * 38.0 + uTime * 0.04);
    float strata = noise(vec2(p.x * 18.0, p.y * 5.0 - uTime * 0.03));
    float fissure = smoothstep(0.76, 0.82, noise(p * vec2(18.0, 30.0) + 7.0));
    float mouseGlow = 1.0 - smoothstep(0.0, 0.42, distance(p, uMouse));
    float halo = smoothstep(0.48, 0.05, distance(p, vec2(0.52, 0.38)));

    vec3 base = vec3(0.075, 0.066, 0.055);
    vec3 ochre = vec3(0.34, 0.22, 0.14);
    vec3 ash = vec3(0.28, 0.27, 0.23);
    vec3 gold = vec3(0.83, 0.58, 0.25);
    vec3 cinnabar = vec3(0.55, 0.18, 0.12);

    vec3 color = mix(base, ash, grain * 0.55);
    color = mix(color, ochre, strata * 0.36);
    color += gold * halo * 0.28;
    color += cinnabar * mouseGlow * 0.18;
    color -= fissure * 0.13;
    color += vDepth * 0.28;

    float vignette = smoothstep(0.86, 0.22, distance(p, vec2(0.5, 0.45)));
    color *= 0.56 + vignette * 0.72;
    gl_FragColor = vec4(color, 1.0);
  }
`

export function HeroWebGL({ className }: HeroWebGLProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10)
    camera.position.z = 2.25

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    }

    const geometry = new THREE.PlaneGeometry(4.8, 2.8, 128, 88)
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
    const wall = new THREE.Mesh(geometry, material)
    scene.add(wall)

    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 600
    const positions = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 4.8
      positions[index * 3 + 1] = (Math.random() - 0.5) * 2.7
      positions[index * 3 + 2] = (Math.random() - 0.5) * 0.8 + 0.2
      sizes[index] = Math.random() * 0.8 + 0.2
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xd7a95a,
      size: 0.009,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    let frameId = 0
    const startTime = performance.now()

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000
      uniforms.uTime.value = elapsed
      particles.rotation.z = elapsed * 0.012
      particles.rotation.y = Math.sin(elapsed * 0.08) * 0.04
      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(render)
    }

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const pointer = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      uniforms.uMouse.value.set((event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height)
    }

    window.addEventListener('resize', resize)
    container.addEventListener('pointermove', pointer)
    render()

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      container.removeEventListener('pointermove', pointer)
      geometry.dispose()
      material.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={containerRef} className={className} aria-hidden="true" />
}
