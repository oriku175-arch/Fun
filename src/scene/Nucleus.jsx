import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { SNOISE, DOT_FRAGMENT } from './shaders.js'
import { useInteraction, PLANET_RADIUS } from './PlanetSystem.jsx'

const COUNT = 4000

const vertexShader = /* glsl */ `
${SNOISE}

attribute float aRand;

uniform float uTime;
uniform float uReveal;      // 0 idle .. 1 shell open
uniform float uScale;       // drawingBufferHeight / (2 * tan(fov / 2))
uniform vec3 uPointer;      // local-space disruptor point

varying float vAlpha;
varying float vAccent;

void main() {
  vec3 p = position;

  // Slow internal swirl.
  float ang = uTime * 0.12 + aRand * 6.2831;
  float s = sin(ang * 0.35);
  float cs = cos(ang * 0.35);
  p.xz = mat2(cs, -s, s, cs) * p.xz;

  // The nucleus tightens and stirs when revealed.
  p *= 1.0 + snoise(p * 1.8 + vec3(uTime * 0.2)) * 0.06 * (1.0 + uReveal);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = (0.014 + aRand * 0.018) * (1.0 + uReveal * 0.35); // world units
  gl_PointSize = size * uScale / -mv.z;

  // Only visible when hovering (reveal > 0.05); brighten on cursor-facing side.
  float side = 0.25 + 0.75 * smoothstep(-0.2, 0.95, dot(normalize(p + vec3(1e-4)), normalize(uPointer)));
  vAlpha = uReveal * side * (0.24 + aRand * 0.36);
  vAccent = uReveal * side * 0.28 * aRand;
}
`

export default function Nucleus() {
  const inter = useInteraction()

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(COUNT * 3)
    const rand = new Float32Array(COUNT)
    const R = PLANET_RADIUS * 0.5
    for (let i = 0; i < COUNT; i++) {
      // Dense toward the center.
      const r = R * Math.cbrt(Math.random())
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      pos[i * 3] = Math.cos(th) * s * r
      pos[i * 3 + 1] = u * r
      pos[i * 3 + 2] = Math.sin(th) * s * r
      rand[i] = Math.random()
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
    return geo
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uScale: { value: 1000 },
      uPointer: { value: new THREE.Vector3(0, 0, 1) },
    }),
    [],
  )

  useFrame((state, delta) => {
    uniforms.uTime.value += Math.min(delta, 1 / 30)
    const fov = (state.camera.fov * Math.PI) / 180
    uniforms.uScale.value =
      (state.size.height * state.gl.getPixelRatio()) / (2 * Math.tan(fov / 2))
    // Reveal lags the hover spring a touch, so the shell opens first.
    const target = Math.max(0, Math.min(1, inter.strength))
    uniforms.uReveal.value += (target - uniforms.uReveal.value) * (1 - Math.exp(-4 * delta))
    uniforms.uPointer.value.copy(inter.localPoint)
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={DOT_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
