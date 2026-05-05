import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ============================================================
   AgentOrb: 全息流体光泡
   使用 Mesh + Fresnel 边缘发光 + 极低频噪声位移
   实现类似 Siri / Gemini 的高级悬浮球视觉
============================================================ */

const vertexShader = `
  uniform float uTime;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vNoise;
  varying vec3 vPosition;

  // Simplex 3D 噪声
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i); 
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec3 pos = position;
    
    // 极低频、极柔和的位移 —— 像呼吸一样的微小起伏
    float n1 = snoise(pos * 0.8 + uTime * 0.15);
    float n2 = snoise(pos * 1.6 + uTime * 0.1 + 10.0) * 0.5;
    float noise = n1 + n2;
    
    // 位移幅度非常小，只是让球体表面产生微妙的流动感
    pos += normal * noise * 0.06;
    
    vNoise = noise;
    vPosition = pos;
    vNormal = normalize(normalMatrix * normal);
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vNoise;
  varying vec3 vPosition;
  uniform float uTime;
  
  void main() {
    // —— 菲涅尔 (Fresnel) 边缘发光 ——
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = 1.0 - abs(dot(viewDir, normal));
    
    // 柔和的边缘光环 (pow 值越大，边缘越锐利)
    float rim = pow(fresnel, 3.0);
    // 更宽的辉光层
    float glow = pow(fresnel, 1.5);
    
    // —— 内部流体色 ——
    // 根据噪声和球面位置混合出梦幻般的色彩流转
    float t = vNoise * 0.5 + 0.5; // 映射到 0~1
    
    // 核心色盘：深邃蓝 → 青 → 淡紫/粉
    vec3 deepBlue = vec3(0.05, 0.1, 0.35);
    vec3 cyan     = vec3(0.15, 0.5, 0.7);
    vec3 violet   = vec3(0.5, 0.25, 0.65);
    vec3 rose     = vec3(0.7, 0.35, 0.5);
    
    vec3 innerColor = mix(deepBlue, cyan, smoothstep(0.0, 0.4, t));
    innerColor = mix(innerColor, violet, smoothstep(0.35, 0.7, t));
    innerColor = mix(innerColor, rose, smoothstep(0.65, 1.0, t));
    
    // —— 边缘发光色 ——
    // 边缘用更明亮的青白色
    vec3 rimColor = vec3(0.5, 0.85, 1.0);
    
    // —— 合成 ——
    // 内部：半透明的流体色 + 柔和辉光
    // 边缘：明亮的菲涅尔光环
    vec3 finalColor = innerColor * (0.6 + glow * 0.4) + rimColor * rim * 1.2;
    
    // 透明度控制：
    // 中心比较透明(能看穿)，边缘因 Fresnel 更实
    float alpha = 0.25 + glow * 0.35 + rim * 0.4;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`

export function AgentOrb() {
  return (
    <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <HolographicOrb />
      </Canvas>
    </div>
  )
}

function HolographicOrb() {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), [])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1
      
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  return (
    <mesh ref={meshRef}>
      {/* 球体细分 64×64 已足够平滑 */}
      <sphereGeometry args={[1.3, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  )
}
