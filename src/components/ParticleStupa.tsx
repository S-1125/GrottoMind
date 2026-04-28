import React, { useMemo, useRef, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as THREE from 'three'

function HoloModel() {
  // 加载原始 OBJ 网格
  const rawObj = useLoader(OBJLoader, '/assets/qixia-model/3DModel0.obj')
  const groupRef = useRef<THREE.Group>(null)

  // 预处理模型与创建材质
  const { model, uniforms } = useMemo(() => {
    const obj = rawObj.clone()
    
    // 居中与缩放参数计算
    const box = new THREE.Box3().setFromObject(obj)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const scaleScalar = 2.1 / Math.max(size.x, size.y, size.z)
    
    // 创建 Shader 材质的 Uniforms (使用梦核感极强的冰蓝色/水晶蓝)
    const shaderUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#88ccff') }, 
    }

    // 自定义全息 Shader 材质 (X光/边缘发光效果)
    const holoMaterial = new THREE.ShaderMaterial({
      uniforms: shaderUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide, // 双面渲染让内部结构穿透发光
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying float vShimmer;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;

          // 基于顶点坐标的固定随机值，用于产生星闪
          float rand = fract(sin(dot(position, vec3(12.9898, 78.233, 54.53))) * 43758.5453);
          
          // 只有大约 2% 的顶点会成为“细闪”的星点，伴随时间闪烁
          float sparkle = step(0.98, rand);
          vShimmer = sparkle * (sin(uTime * 4.0 + rand * 20.0) * 0.5 + 0.5);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;

        varying vec3 vWorldPosition;
        varying float vShimmer;

        void main() {
          // 1. 体积叠加发光 (Volumetric Additive Glow)
          float baseGlow = 0.15; 

          // 2. 梦核柔和扫描光晕
          float scanline = sin(vWorldPosition.y * 3.5 - uTime * 1.0) * 0.5 + 0.5;
          scanline = pow(scanline, 2.0); // 更柔和的波段
          float scanGlow = scanline * 0.3;

          // 3. 星碎细闪
          float sparkleGlow = vShimmer * 0.4;

          float intensity = baseGlow + scanGlow + sparkleGlow;

          // 对于 AdditiveBlending，我们直接通过 RGB 乘以强度输出，并将 Alpha 设为 1.0，
          // 这样能确保我们设置的 intensity 就是最终加到屏幕上的亮度，不会被 Alpha 二次衰减
          gl_FragColor = vec4(uColor * intensity, 1.0);
        }
      `
    })

    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        // 克隆几何体以防止污染缓存
        mesh.geometry = mesh.geometry.clone()
        // 烘焙平移和缩放，使旋转轴心绝对居中
        mesh.geometry.translate(-center.x, -center.y, -center.z)
        mesh.geometry.scale(scaleScalar, scaleScalar, scaleScalar)
        // 赋予全息材质
        mesh.material = holoMaterial
      }
    })

    return { model: obj, uniforms: shaderUniforms }
  }, [rawObj])

  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15
    }
    // 更新着色器时间
    uniforms.uTime.value += delta
  })

  return (
    <group rotation={[0, Math.PI, 0]}>
      <group ref={groupRef} position={[0, -0.1, 0]} rotation={[-0.06, -0.22, THREE.MathUtils.degToRad(3.2)]}>
        <primitive object={model} />
      </group>
    </group>
  )
}

export function ParticleStupa() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas camera={{ position: [0, 0, 2.8], fov: 40 }}>
        <Suspense fallback={null}>
          <HoloModel />
        </Suspense>
      </Canvas>
    </div>
  )
}
