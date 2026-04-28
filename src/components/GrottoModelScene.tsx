import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

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
    position: new THREE.Vector3(-0.25, 1.5, 0.8),
    target: new THREE.Vector3(0.15, 1.5, 0),
  },
  {
    position: new THREE.Vector3(1.42, 0.98, 2.05),
    target: new THREE.Vector3(-0.04, 1.42, 0.04),
  },
  {
    position: new THREE.Vector3(0.26, 0.28, 1.58),
    target: new THREE.Vector3(-0.02, 0.96, 0.05),
  },
  {
    position: new THREE.Vector3(-1.32, -0.08, 1.38),
    target: new THREE.Vector3(-0.24, 0.54, 0.1),
  },
  {
    position: new THREE.Vector3(1.28, -0.02, 1.42),
    target: new THREE.Vector3(0.18, 0.58, 0.08),
  },
  {
    position: new THREE.Vector3(0.18, -0.32, 1.54),
    target: new THREE.Vector3(0, 0.28, 0.04),
  },
  {
    position: new THREE.Vector3(-0.82, -0.18, 1.18),
    target: new THREE.Vector3(-0.08, 0.22, 0.04),
  },
]

/* ============================================================
   根据 progress (0~1) 在停靠点间插值计算相机姿态
============================================================ */
function getCameraPose(progress: number) {
  const p = THREE.MathUtils.clamp(progress, 0, 1) * (cameraStops.length - 1)
  const i = Math.min(cameraStops.length - 2, Math.floor(p))
  const t = p - i
  // smoothstep 缓动
  const s = t * t * (3 - 2 * t)
  return {
    position: cameraStops[i].position.clone().lerp(cameraStops[i + 1].position, s),
    target: cameraStops[i].target.clone().lerp(cameraStops[i + 1].target, s),
  }
}

/* ============================================================
   暴露给父组件的命令式接口
============================================================ */
export interface GrottoModelSceneHandle {
  /** 立即设置相机进度（0~1），由外部 GSAP 驱动 */
  setCameraProgress: (progress: number) => void
  /** 设置是否开启环绕模式（八相成道图特写） */
  setOrbitMode: (isOrbit: boolean) => void
}

/* ============================================================
   GrottoModelScene: 第一章 3D 模型漫游场景
   相机控制完全由父组件通过 ref.setCameraProgress 驱动。
   内部 RAF 仅负责渲染和微小呼吸动效。
============================================================ */
export const GrottoModelScene = forwardRef<GrottoModelSceneHandle>(
  function GrottoModelScene(_props, ref) {
    const containerRef = useRef<HTMLDivElement>(null)

    // 存储 Three.js 内部对象供 imperative handle 访问
    const sceneInternals = useRef<{
      camera: THREE.PerspectiveCamera
      currentTarget: THREE.Vector3
    } | null>(null)

    // 记录是否处于轨道模式
    const isOrbitingRef = useRef(false)
    const orbitAngleRef = useRef(0)

    useImperativeHandle(ref, () => ({
      setCameraProgress(progress: number) {
        if (!sceneInternals.current) return
        const { camera, currentTarget } = sceneInternals.current
        const pose = getCameraPose(progress)
        camera.position.copy(pose.position)
        currentTarget.copy(pose.target)
        camera.lookAt(pose.target)
      },
      setOrbitMode(isOrbit: boolean) {
        isOrbitingRef.current = isOrbit
        // 当退出轨道模式时，保留当前的旋转角度，或让它在 idle 状态中平滑过渡（这里简化为保持）
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

      // ---- 照明系统 ----
      const ambient = new THREE.HemisphereLight(0x8795a4, 0x38302a, 2.5)
      scene.add(ambient)
      const ambientFill = new THREE.AmbientLight(0x9098a4, 1.2)
      scene.add(ambientFill)
      const keyLight = new THREE.DirectionalLight(0xe8eaf0, 3.4)
      keyLight.position.set(-3.2, 5.4, 4.4)
      scene.add(keyLight)
      const rimLight = new THREE.DirectionalLight(0x9fb4d0, 1.2)
      rimLight.position.set(4, 2.4, -3.5)
      scene.add(rimLight)
      const rightFill = new THREE.DirectionalLight(0xd8dce6, 2.0)
      rightFill.position.set(4, 3.0, 3.0)
      scene.add(rightFill)
      const backLight = new THREE.DirectionalLight(0xc0c8d8, 1.8)
      backLight.position.set(0, 3.0, -5)
      scene.add(backLight)
      const frontBottom = new THREE.DirectionalLight(0xd8d4ce, 1.6)
      frontBottom.position.set(0, 1.0, 5)
      scene.add(frontBottom)

      // ---- 模型组 ----
      const modelGroup = new THREE.Group()
      
      // 1. 先创建一个用来“扶正”原始扫描模型的内部容器
      const alignedModel = new THREE.Group()
      alignedModel.rotation.set(-0.06, -0.22, THREE.MathUtils.degToRad(3.2))
      
      // 2. 将扶正后的模型组沿 Y 轴旋转 180 度，展示背面
      modelGroup.rotation.y = Math.PI
      modelGroup.position.set(0, 0.95, 0)
      
      modelGroup.add(alignedModel)
      scene.add(modelGroup)

      // ---- 初始相机姿态 ----
      const currentTarget = new THREE.Vector3()
      const initialPose = getCameraPose(0)
      camera.position.copy(initialPose.position)
      currentTarget.copy(initialPose.target)
      camera.lookAt(currentTarget)

      // 保存供 imperative handle 使用
      sceneInternals.current = { camera, currentTarget }

      // ---- 加载模型 ----
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
          transparent: true, // 开启透明，以支持底部羽化
          depthWrite: true,  // 保持深度写入，避免排序问题
        })

        // 通过修改底层着色器，实现 Y 轴底部的平滑渐隐（羽化），代替生硬的裁剪
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
             // 圆柱形包围盒裁剪：只针对底部杂乱区域进行裁剪
             // 测量该像素到中心 Y 轴的距离
             float radius = length(vWorldPosCustom.xz);
             
             // 扩大半径到 0.66，以免切到方形须弥座的边角；同时把高度压低到 0.0 以下，只切最底部的红边
             if (vWorldPosCustom.y < 0.0 && radius > 0.66) {
                 discard;
             }
            `
          )
        }
        objLoader.load('/assets/qixia-model/3DModel0.obj', (object) => {
          const box = new THREE.Box3().setFromObject(object)
          const size = new THREE.Vector3()
          const center = new THREE.Vector3()
          box.getSize(size)
          box.getCenter(center)
          object.position.sub(center)
          object.scale.multiplyScalar(2.1 / Math.max(size.x, size.y, size.z))
          alignedModel.add(object)
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = material
              child.frustumCulled = true
            }
          })
        })
      })

      // ---- 渲染循环：仅渲染 + 呼吸微动 / 轨道自转 ----
      const startTime = performance.now()
      let raf = 0
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000
        
        if (isOrbitingRef.current) {
          // 轨道模式：缓慢顺时针持续旋转 (每秒约 2 度)
          orbitAngleRef.current += 0.0005
        }
        
        // 叠加基础旋转 + 呼吸微动 + 轨道累加旋转 (基础旋转现已改为 Math.PI 以展示背面)
        modelGroup.rotation.y = Math.PI + Math.sin(elapsed * 0.28) * 0.006 + orbitAngleRef.current
        
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
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', handleResize)
        sceneInternals.current = null
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
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement)
        }
      }
    }, [])

    return <div ref={containerRef} className="grotto-model-scene" aria-hidden="true" />
  }
)
