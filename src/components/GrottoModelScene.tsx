import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import gsap from 'gsap'

const MODEL_TEXTURE_URL = '/assets/qixia-model/qixia-stupa-texture.jpg'
const MODEL_GLB_URL = '/assets/qixia-model/qixia-stupa.glb'
const MODEL_OBJ_URL = '/assets/qixia-model/qixia-stupa.obj'
const DRACO_DECODER_PATH = '/assets/draco/'

/* ============================================================
   相机停靠点：每个 stop 对应一个相机位置和注视目标
============================================================ */
const cameraStops = [
  {
    position: new THREE.Vector3(Math.sin(-0.62) * 3.08, -0.1, Math.cos(-0.62) * 3.08),
    target: new THREE.Vector3(-0.02, 0.7, 0.02),
  },
  {
    // 塔刹 (Finial) - 改为接近平视：相机高度和目标高度几乎一致
    position: new THREE.Vector3(-0.25, 1.5, 0.9),
    target: new THREE.Vector3(0.08, 1.42, 0),
  },
  {
    // 密檐 (Eaves) - 稍微拉远并把视线下移，确保五层塔檐完整入镜，同时保持轻微仰视
    position: new THREE.Vector3(-0.5, 0.7, 1.5),
    target: new THREE.Vector3(0.3, 0.9, 0),
  },
  {
    // 佛龛 (Niche) - 拉近焦距并平视，聚焦塔身中段的浮雕细节，让三十二尊佛像更加清晰
    position: new THREE.Vector3(-0.4, 0.75, 1.1),
    target: new THREE.Vector3(0.1, 0.75, 0),
  },
  {
    // 天王 (Guardian) - 采用您发现的最佳威严机位：低机位仰视，完美捕捉天王正面
    position: new THREE.Vector3(-0.74, 0.1, 0.31),
    target: new THREE.Vector3(0.3, 0.35, 0.14),
  },
  {
    // 菩萨 (Bodhisattva) - 从天王视角继续严格向左平移一面（绕Y轴45度），抬高相机高度接近平视
    position: new THREE.Vector3(-1.0, -0.05, -0.05),
    target: new THREE.Vector3(-0.3, 0.30, 0.20),
  },
  {
    position: new THREE.Vector3(0.18, -0.32, 1.54),
    target: new THREE.Vector3(0.2, 0.28, 0.04),
  },
  {
    position: new THREE.Vector3(-0.82, -0.18, 1.18),
    target: new THREE.Vector3(0.5, 0.22, 0.04),
  },
]

/* ============================================================
   移动端专属机位预设 (针对竖屏构图优化，防止裁切)
============================================================ */
const mobileCameraStops = [
  {
    // 全景
    position: new THREE.Vector3(Math.sin(-0.62) * 3.5, 0, Math.cos(-0.62) * 3.5),
    target: new THREE.Vector3(0, 0.8, 0),
  },
  {
    // 塔刹
    position: new THREE.Vector3(-0.25, 1.5, 1.2),
    target: new THREE.Vector3(0, 1.35, 0),
  },
  {
    // 密檐
    position: new THREE.Vector3(-0.5, 0.7, 1.8),
    target: new THREE.Vector3(0, 0.8, 0),
  },
  {
    // 佛龛
    position: new THREE.Vector3(-0.4, 0.75, 1.3),
    target: new THREE.Vector3(0, 0.65, 0),
  },
  {
    // 天王 (修复头部被切，整体向上看)
    position: new THREE.Vector3(-1.1, 0.35, 0.5),
    target: new THREE.Vector3(0.15, 0.5, 0.14),
  },
  {
    // 菩萨 (修复视角偏离，正确看向左侧面)
    position: new THREE.Vector3(-1.4, 0.3, -0.1),
    target: new THREE.Vector3(-0.3, 0.5, 0.15),
  },
  {
    // 塔基 (修复穿模，稍微抬高相机)
    position: new THREE.Vector3(0.18, -0.1, 1.7),
    target: new THREE.Vector3(0, 0.25, 0),
  },
  {
    // 八相成道图 (修复底部截断穿模，抬高机位)
    position: new THREE.Vector3(-0.82, 0.05, 1.35),
    target: new THREE.Vector3(0.2, 0.25, 0.04),
  },
]

/* ============================================================
   根据 progress (0~1) 在停靠点间插值计算相机姿态
============================================================ */
function getCameraPose(progress: number) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const stops = isMobile ? mobileCameraStops : cameraStops
  const p = THREE.MathUtils.clamp(progress, 0, 1) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(p))
  const t = p - i
  // smoothstep 缓动
  const s = t * t * (3 - 2 * t)
  
  const position = stops[i].position.clone().lerp(stops[i + 1].position, s)
  const target = stops[i].target.clone().lerp(stops[i + 1].target, s)

  return { position, target }
}

/* ============================================================
   暴露给父组件的命令式接口
============================================================ */
export interface GrottoModelSceneHandle {
  /** 立即设置相机进度（0~1），由外部 GSAP 驱动 */
  setCameraProgress: (progress: number) => void
  /** 设置是否开启环绕模式（八相成道图特写） */
  setOrbitMode: (isOrbit: boolean) => void
  /** 播放入场推进动画 */
  playIntroDolly: (duration: number) => void
}

interface GrottoModelSceneProps {
  onLoadProgress?: (progress: number) => void
  onSceneReady?: () => void
  className?: string
}

function loadTexture(loader: THREE.TextureLoader, url: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(url, resolve, undefined, reject)
  })
}

function loadObj(loader: OBJLoader, url: string) {
  return new Promise<THREE.Group>((resolve, reject) => {
    loader.load(url, resolve, undefined, reject)
  })
}

function loadGltfScene(loader: GLTFLoader, url: string) {
  return new Promise<THREE.Group>((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject)
  })
}

async function hasGlbAsset() {
  try {
    const response = await fetch(MODEL_GLB_URL, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/* ============================================================
   GrottoModelScene: 第一章 3D 模型漫游场景
   相机控制完全由父组件通过 ref.setCameraProgress 驱动。
   内部 RAF 仅负责渲染和微小呼吸动效。
============================================================ */
export const GrottoModelScene = forwardRef<GrottoModelSceneHandle, GrottoModelSceneProps>(
  function GrottoModelScene({ onLoadProgress, onSceneReady, className = '' }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const loadCallbacksRef = useRef({ onLoadProgress, onSceneReady })

    useEffect(() => {
      loadCallbacksRef.current = { onLoadProgress, onSceneReady }
    }, [onLoadProgress, onSceneReady])

    // 存储 Three.js 内部对象供 imperative handle 访问
    const sceneInternals = useRef<{
      camera: THREE.PerspectiveCamera
      currentTarget: THREE.Vector3
      targetPose: { position: THREE.Vector3; target: THREE.Vector3 }
    } | null>(null)

    // 控制是否进入轨道环绕模式（八相成道特写）
    const isOrbitingRef = useRef(false)
    // 累加计算轨道旋转角度
    const orbitAngleRef = useRef(0)

    useImperativeHandle(ref, () => ({
      setCameraProgress(progress: number) {
        if (!sceneInternals.current) return
        const { targetPose } = sceneInternals.current
        const pose = getCameraPose(progress)
        
        // 杀掉可能正在运行的开场推移(Dolly)动画，防止在用户开始滚动时，Dolly 还在强行重写 Z 轴，导致冲突和跳变
        gsap.killTweensOf(targetPose.position)

        // 更新目标位置，而不直接硬切相机位置。动画循环会自动插值过去，消除 GSAP 掉帧造成的跳变。
        targetPose.position.copy(pose.position)
        targetPose.target.copy(pose.target)
      },
      setOrbitMode(isOrbit: boolean) {
        isOrbitingRef.current = isOrbit
        // 当退出轨道模式时，保留当前的旋转角度，或让它在 idle 状态中平滑过渡（这里简化为保持）
      },
      playIntroDolly(duration: number) {
        if (!sceneInternals.current) return
        const { camera, targetPose } = sceneInternals.current
        
        const finalZ = targetPose.position.z
        const startZ = finalZ + 2.5
        
        // 瞬间将真实相机和目标位置都放到远处
        camera.position.z = startZ
        targetPose.position.z = startZ

        // 利用 GSAP 将目标位置平滑推回到初始位置
        gsap.to(targetPose.position, {
          z: finalZ,
          duration,
          ease: 'power3.out'
        })
      }
    }))

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
      // 将最大像素比放宽到 2.0（原本为 1.75），这能直接提升高分屏下的物理锐度
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.92
      container.appendChild(renderer.domElement)

      renderer.domElement.style.position = 'absolute'
      renderer.domElement.style.inset = '0'
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'

      // ---- 照明系统 ----
      // 整体氛围光稍微压暗
      const ambient = new THREE.HemisphereLight(0x8795a4, 0x38302a, 1.7)
      scene.add(ambient)
      const ambientFill = new THREE.AmbientLight(0x9098a4, 1.0)
      scene.add(ambientFill)
      // 主光源（原2.2 -> 1.5），减弱正面高光，让阴影更重，从而凸显雕刻纹理的立体感
      const keyLight = new THREE.DirectionalLight(0xe8eaf0, 1.5)
      keyLight.position.set(-3.2, 5.4, 4.4)
      scene.add(keyLight)
      const rimLight = new THREE.DirectionalLight(0x9fb4d0, 1.2)
      rimLight.position.set(4, 2.4, -3.5)
      scene.add(rimLight)
      const rightFill = new THREE.DirectionalLight(0xd8dce6, 1.2)
      rightFill.position.set(4, 3.0, 3.0)
      scene.add(rightFill)
      const backLight = new THREE.DirectionalLight(0xc0c8d8, 1.8)
      backLight.position.set(0, 3.0, -5)
      scene.add(backLight)
      // 底部补光减弱，避免“洗掉”下方基座的材质细节（0.8 -> 0.3）
      const frontBottom = new THREE.DirectionalLight(0xd8d4ce, 0.3)
      frontBottom.position.set(0, 1.0, 5)
      scene.add(frontBottom)

      // ---- 标准化模型展示容器 (Standard Display State) ----
      // 严格使用多层父级 Group 分离不同的空间变换逻辑，防止坐标系污染和加载重置

      // 层级 1: 最终展示组 (控制模型在场景中的全局位置与朝向)
      const displayGroup = new THREE.Group()
      displayGroup.name = "StandardDisplayGroup"
      displayGroup.rotation.y = Math.PI // 旋转 180 度展示背面
      displayGroup.position.set(0, 0.92, 0.1) // 整体抬高以适应镜头
      scene.add(displayGroup)

      // 层级 2: 物理校准组 (专门用于抵消扫描模型本身的物理倾斜)
      const alignmentGroup = new THREE.Group()
      alignmentGroup.name = "PhysicalAlignmentGroup"
      alignmentGroup.rotation.set(-0.06, -0.22, THREE.MathUtils.degToRad(3.2))
      displayGroup.add(alignmentGroup)

      // 层级 3: 原始模型居中组 (专门用于包裹加载好的原始几何体并进行缩放居中)
      const rawModelContainer = new THREE.Group()
      rawModelContainer.name = "RawModelContainer"
      alignmentGroup.add(rawModelContainer)

      // ---- 初始相机姿态 ----
      const currentTarget = new THREE.Vector3()
      const targetPose = {
        position: new THREE.Vector3(),
        target: new THREE.Vector3()
      }
      const initialPose = getCameraPose(0)
      camera.position.copy(initialPose.position)
      currentTarget.copy(initialPose.target)
      targetPose.position.copy(initialPose.position)
      targetPose.target.copy(initialPose.target)
      camera.lookAt(currentTarget)

      // 保存供 imperative handle 使用
      sceneInternals.current = { camera, currentTarget, targetPose }

      // ---- 加载模型 ----
      const manager = new THREE.LoadingManager()
      const textureLoader = new THREE.TextureLoader(manager)
      const objLoader = new OBJLoader(manager)
      const gltfLoader = new GLTFLoader(manager)
      const dracoLoader = new DRACOLoader(manager)
      dracoLoader.setDecoderPath(DRACO_DECODER_PATH)
      gltfLoader.setDRACOLoader(dracoLoader)

      let disposed = false
      let stupaTexture: THREE.Texture | null = null
      let stupaMaterial: THREE.MeshStandardMaterial | null = null

      manager.onProgress = (_url, loaded, total) => {
        const progress = total > 0 ? (loaded / total) * 100 : 0
        loadCallbacksRef.current.onLoadProgress?.(progress)
      }

      const createStupaMaterial = (texture: THREE.Texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        // 彻底拉满各向异性过滤，这能极大缓解贴图在倾斜视角下的模糊感。
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.82,
          metalness: 0.02,
          envMapIntensity: 0.18,
          transparent: true, // 开启透明，以支持底部羽化
          depthWrite: true,  // 保持深度写入，避免排序问题
        })

        // 通过修改底层着色器，实现 Y 轴底部的平滑渐隐，代替生硬的裁剪。
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vWorldPosCustom;'
          )
          shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            '#include <worldpos_vertex>\nvWorldPosCustom = (modelMatrix * vec4(transformed, 1.0)).xyz;'
          )
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vWorldPosCustom;'
          )
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
             // 圆柱形包围盒裁剪：稍微收紧裁剪半径和高度，切除右侧残留的红边
             float radius = length(vWorldPosCustom.xz);
             if (vWorldPosCustom.y < 0.01 && radius > 0.6) {
                 discard;
             }
            `
          )
        }

        return material
      }

      const mountModel = (object: THREE.Object3D, material: THREE.Material) => {
        const box = new THREE.Box3().setFromObject(object)
        const size = new THREE.Vector3()
        const center = new THREE.Vector3()
        box.getSize(size)
        box.getCenter(center)
        object.position.sub(center)
        object.scale.multiplyScalar(2.2 / Math.max(size.x, size.y, size.z))
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material
            child.frustumCulled = true
          }
        })
        rawModelContainer.add(object)
      }

      const loadModelObject = async () => {
        if (await hasGlbAsset()) {
          try {
            return await loadGltfScene(gltfLoader, MODEL_GLB_URL)
          } catch (error) {
            console.warn('GLB 模型加载失败，已回退到 OBJ。', error)
          }
        }
        return loadObj(objLoader, MODEL_OBJ_URL)
      }

      Promise.all([
        loadTexture(textureLoader, MODEL_TEXTURE_URL),
        loadModelObject(),
      ])
        .then(([texture, object]) => {
          if (disposed) {
            texture.dispose()
            return
          }
          stupaTexture = texture
          stupaMaterial = createStupaMaterial(texture)
          mountModel(object, stupaMaterial)
          loadCallbacksRef.current.onLoadProgress?.(100)
          loadCallbacksRef.current.onSceneReady?.()
        })
        .catch((error) => {
          console.error('舍利塔模型资源加载失败。', error)
          loadCallbacksRef.current.onLoadProgress?.(100)
          loadCallbacksRef.current.onSceneReady?.()
        })

      // ---- 渲染循环：仅渲染 + 呼吸微动 / 轨道自转 ----
      const startTime = performance.now()
      let lastTime = startTime
      let raf = 0
      const animate = () => {
        const now = performance.now()
        const elapsed = (now - startTime) / 1000
        const delta = Math.min((now - lastTime) / 1000, 0.05) // 防止切后台时 delta 过大导致瞬移
        lastTime = now

        if (isOrbitingRef.current) {
          // 轨道模式：缓慢顺时针持续旋转 (每秒约 2 度)
          orbitAngleRef.current += 0.0005
        } else {
          if (orbitAngleRef.current !== 0) {
            // 退出轨道模式时，平滑地将轨道累加角度归零，让模型优雅地“转回正轨”
            // 1. 将角度取模，避免观看太久后多圈疯狂反转，寻找最短回归路径
            orbitAngleRef.current = orbitAngleRef.current % (Math.PI * 2)
            if (orbitAngleRef.current > Math.PI) orbitAngleRef.current -= Math.PI * 2
            else if (orbitAngleRef.current < -Math.PI) orbitAngleRef.current += Math.PI * 2
            
            // 2. 阻尼平滑回正
            orbitAngleRef.current = THREE.MathUtils.lerp(orbitAngleRef.current, 0, 0.05)
            if (Math.abs(orbitAngleRef.current) < 0.001) orbitAngleRef.current = 0
          }

          // 平滑插值相机位置，解决由于 GSAP + React 重渲染掉帧导致的跳变卡顿问题
          const dampFactor = 1 - Math.exp(-8 * delta)
          camera.position.lerp(targetPose.position, dampFactor)
          currentTarget.lerp(targetPose.target, dampFactor)
        }

        // 叠加基础旋转 + 呼吸微动 + 轨道累加旋转 (基础旋转现已改为 Math.PI 以展示背面)
        displayGroup.rotation.y = Math.PI + Math.sin(elapsed * 0.28) * 0.006 + orbitAngleRef.current

        camera.lookAt(currentTarget)
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

      return () => {
        disposed = true
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', handleResize)
        sceneInternals.current = null
        dracoLoader.dispose()
        renderer.dispose()
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose()
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose())
            } else {
              object.material.dispose()
            }
          }
        })
        stupaMaterial?.dispose()
        stupaTexture?.dispose()
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement)
        }
      }
    }, [])

    return <div ref={containerRef} className={`grotto-model-scene ${className}`.trim()} aria-hidden="true" />
  }
)
