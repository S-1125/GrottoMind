import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

interface GrottoModelSceneProps {
  progress: number
}

interface DragState {
  active: boolean
  x: number
  y: number
}

function easeInOut(t: number) {
  return t * t * (3 - 2 * t)
}

function getCameraPose(progress: number) {
  const p = easeInOut(THREE.MathUtils.clamp(progress, 0, 1))
  const angle = THREE.MathUtils.lerp(-0.62, 0.68, p)
  const radius = THREE.MathUtils.lerp(3.08, 1.78, p)
  // 相机高度降低到模型底部附近，实现平视/仰视效果
  const height = THREE.MathUtils.lerp(-0.1, -0.2, p)

  return {
    position: new THREE.Vector3(
      Math.sin(angle) * radius,
      height,
      Math.cos(angle) * radius
    ),
    target: new THREE.Vector3(
      THREE.MathUtils.lerp(-0.02, -0.06, p),
      // lookAt 指向模型中上部，产生仰视感
      THREE.MathUtils.lerp(0.7, 0.9, p),
      THREE.MathUtils.lerp(0.02, 0.08, p)
    ),
  }
}

/* ============================================================
   GrottoModelScene: 第一章 3D 模型漫游场景
   直接加载 OBJ 与贴图，作为可替换的轻量 Three.js 场景。
============================================================ */
export function GrottoModelScene({ progress }: GrottoModelSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(progress)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x090b0d, 0.12)

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.92
    container.appendChild(renderer.domElement)

    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    const ambient = new THREE.HemisphereLight(0x8795a4, 0x38302a, 2.5)
    scene.add(ambient)

    // 纯均匀环境光：填充所有方向的阴影死角，消除死黑
    const ambientFill = new THREE.AmbientLight(0x9098a4, 1.2)
    scene.add(ambientFill)

    // 主光：中性偏冷白光，凸显石质冷灰感
    const keyLight = new THREE.DirectionalLight(0xe8eaf0, 3.4)
    keyLight.position.set(-3.2, 5.4, 4.4)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x9fb4d0, 1.2)
    rimLight.position.set(4, 2.4, -3.5)
    scene.add(rimLight)

    // 右侧补光：冷白色，照亮右侧暗面
    const rightFill = new THREE.DirectionalLight(0xd8dce6, 2.0)
    rightFill.position.set(4, 3.0, 3.0)
    scene.add(rightFill)

    // 背光：从正后方照射，勾勒模型轮廓边缘
    const backLight = new THREE.DirectionalLight(0xc0c8d8, 1.8)
    backLight.position.set(0, 3.0, -5)
    scene.add(backLight)

    // 前方正面灯光：照亮塔身正面，消除檐下死黑
    const frontBottom = new THREE.DirectionalLight(0xd8d4ce, 1.6)
    frontBottom.position.set(0, 1.0, 5)
    scene.add(frontBottom)



    const modelGroup = new THREE.Group()
    const baseModelYaw = -0.22
    const baseModelPitch = -0.06
    const baseModelRoll = THREE.MathUtils.degToRad(3.2)
    modelGroup.rotation.set(baseModelPitch, baseModelYaw, baseModelRoll)
    modelGroup.position.set(0, 0.95, 0)
    scene.add(modelGroup)

    const textureLoader = new THREE.TextureLoader()
    const objLoader = new OBJLoader()



    textureLoader.load('/assets/qixia-model/3DModel.jpg', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.82,
        metalness: 0.02,
        envMapIntensity: 0.18,
      })

      objLoader.load('/assets/qixia-model/3DModel0.obj', (object) => {
        const box = new THREE.Box3().setFromObject(object)
        const size = new THREE.Vector3()
        const center = new THREE.Vector3()
        box.getSize(size)
        box.getCenter(center)

        object.position.sub(center)
        object.scale.multiplyScalar(2.1 / Math.max(size.x, size.y, size.z))

        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material
            child.frustumCulled = true
          }
        })

        modelGroup.add(object)
      })
    })

    const currentPosition = new THREE.Vector3()
    const currentTarget = new THREE.Vector3()
    const targetPosition = new THREE.Vector3()
    const targetLookAt = new THREE.Vector3()
    const startTime = performance.now()
    const envRotation = new THREE.Vector2(-0.42, 0)
    const targetEnvRotation = new THREE.Vector2(0, 0)
    const dragState: DragState = { active: false, x: 0, y: 0 }
    let raf = 0

    const initialPose = getCameraPose(progressRef.current)
    currentPosition.copy(initialPose.position)
    currentTarget.copy(initialPose.target)
    camera.position.copy(currentPosition)
    camera.lookAt(currentTarget)

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      const pose = getCameraPose(progressRef.current)
      targetPosition.copy(pose.position)
      targetLookAt.copy(pose.target)

      currentPosition.lerp(targetPosition, 0.065)
      currentTarget.lerp(targetLookAt, 0.065)
      camera.position.copy(currentPosition)
      camera.lookAt(currentTarget)



      modelGroup.rotation.y = baseModelYaw + Math.sin(elapsed * 0.28) * 0.006
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    const handleResize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    const handlePointerDown = (event: PointerEvent) => {
      dragState.active = true
      dragState.x = event.clientX
      dragState.y = event.clientY
      renderer.domElement.setPointerCapture?.(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.active) return

      const dx = event.clientX - dragState.x
      const dy = event.clientY - dragState.y
      dragState.x = event.clientX
      dragState.y = event.clientY

      targetEnvRotation.x += dx * 0.0015
      targetEnvRotation.y = THREE.MathUtils.clamp(targetEnvRotation.y + dy * 0.00075, -0.08, 0.08)
    }

    const handlePointerUp = (event: PointerEvent) => {
      dragState.active = false
      renderer.domElement.releasePointerCapture?.(event.pointerId)
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('pointerleave', handlePointerUp)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.removeEventListener('pointerleave', handlePointerUp)

      renderer.dispose()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className="grotto-model-scene" aria-hidden="true" />
}
