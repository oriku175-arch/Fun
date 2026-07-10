import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { DOT_FRAGMENT } from './shaders.js'
import { useInteraction } from './PlanetSystem.jsx'

const COUNT = 900

const vertexShader = /* glsl */ `
attribute float aRand;
uniform float uTime;
uniform float uScale;
varying float vAlpha;
varying float vAccent;

void main() {
  vec3 p = position;
  // Slow ambient drift, unique per particle.
  p += 0.35 * vec3(
    sin(uTime * 0.07 + aRand * 43.0),
    cos(uTime * 0.09 + aRand * 29.0),
    sin(uTime * 0.06 + aRand * 17.0)
  );

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.008 + aRand * 0.018) * uScale / -mv.z;

  // Faint, with a slow twinkle.
  vAlpha = (0.04 + aRand * 0.12) * (0.6 + 0.4 * sin(uTime * 0.5 + aRand * 60.0));
  vAccent = 0.0;
}
`

export default function Dust() {
  const inter = useInteraction()
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(COUNT * 3)
    const rand = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      // Hollow shell around the whole system.
      const r = 2.7 + Math.pow(Math.random(), 0.7) * 6.0
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
      uScale: { value: 1000 },
      uSolar: { value: 0 },
    }),
    [],
  )

  useFrame((state, delta) => {
    uniforms.uTime.value += Math.min(delta, 1 / 30)
    uniforms.uSolar.value = inter.solar
    const fov = (state.camera.fov * Math.PI) / 180
    uniforms.uScale.value =
      (state.size.height * state.gl.getPixelRatio()) / (2 * Math.tan(fov / 2))
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={0}>
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
