import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { SNOISE } from './shaders.js'
import { useInteraction, PLANET_RADIUS } from './PlanetSystem.jsx'

const COUNT = 20000
const MAX_RIPPLES = 10

const vertexShader = /* glsl */ `
${SNOISE}

attribute vec3 aBase;   // unit-sphere direction (fibonacci lattice)
attribute vec4 aRand;   // per-particle randoms

uniform float uTime;
uniform float uRadius;
uniform float uPixelScale;
uniform vec3 uPointer;      // local-space disruptor point on the sphere
uniform float uHover;       // spring-smoothed 0..1 (may overshoot)
uniform vec3 uRippleO[${MAX_RIPPLES}];
uniform float uRippleT[${MAX_RIPPLES}]; // age in seconds, < 0 = inactive

varying float vAlpha;
varying float vAccent;
varying vec2 vUv;

void main() {
  vec3 n = aBase;

  // Gentle breathing.
  float r = uRadius * (1.0 + 0.012 * sin(uTime * 0.55));

  // Per-particle living-surface noise.
  float living = snoise(n * 2.6 + vec3(0.0, uTime * 0.13, uTime * 0.05));
  r += living * 0.035;

  vec3 p = n * r;
  float accent = 0.0;

  // --- Cursor as gravity disruptor -------------------------------------
  float d = distance(p, uPointer);

  // Elastic attraction at mid range: particles lean toward the cursor.
  float att = exp(-pow(d / 1.05, 2.0)) * uHover;
  p += normalize(uPointer - p + vec3(1e-4)) * att * 0.14;

  // Spring repulsion up close: localized dent + scatter.
  float rep = exp(-pow(d / 0.48, 2.0)) * uHover;
  vec3 away = normalize(p - uPointer + (aRand.xyz - 0.5) * 0.5);
  p += away * rep * (0.32 + aRand.w * 0.5);

  // Shell opening: wider outward push reveals the nucleus.
  float open = exp(-pow(d / 0.85, 2.0)) * uHover;
  p += n * open * 0.3 * (0.4 + aRand.x * 0.8);

  accent += rep * 0.9 + open * 0.25;

  // --- Expanding ripples ------------------------------------------------
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    float t = uRippleT[i];
    if (t < 0.0) continue;
    float ad = distance(n, normalize(uRippleO[i])); // chord distance on unit sphere
    float ring = ad - t * 0.85;
    float w = exp(-ring * ring * 55.0) * exp(-t * 1.9);
    p += n * w * (0.14 + aRand.y * 0.07);
    accent += w * 0.35;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);

  // Camera-facing billboard quad.
  float wobble = accent + rep;
  float size = uPixelScale * (0.72 + aRand.y * 0.56) * (1.0 + wobble * 0.35);
  mv.xy += position.xy * size;

  gl_Position = projectionMatrix * mv;

  // Depth cue: far-side particles fade to nothing so the shell reads as a
  // solid, hollow globe — you should not see through to the back hemisphere.
  vec3 vn = normalize(normalMatrix * n);
  float front = smoothstep(-0.1, 0.35, vn.z);   // 0 on back, 1 on front
  float facing = pow(vn.z * 0.5 + 0.5, 2.2);
  vAlpha = (0.5 + aRand.z * 0.5) * facing * front;
  vAlpha *= 1.0 - clamp(rep * 0.45, 0.0, 0.5);   // scattered particles thin out
  vAccent = clamp(accent, 0.0, 1.0) * 0.28;
  vUv = uv;
}
`

const fragmentShader = /* glsl */ `
varying float vAlpha;
varying float vAccent;
varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5);
  float a = smoothstep(0.5, 0.30, d) * vAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(vec3(0.96), vec3(0.137, 0.282, 1.0), vAccent);
  gl_FragColor = vec4(col, a);
}
`

export default function ParticleShell() {
  const inter = useInteraction()
  const matRef = useRef()

  const ripples = useRef({
    next: 0,
    lastSpawnWorld: new THREE.Vector3(1e9, 0, 0),
    lastSpawnAt: 0,
  })

  const geometry = useMemo(() => {
    const quad = new THREE.PlaneGeometry(1, 1)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = quad.index
    geo.setAttribute('position', quad.getAttribute('position'))
    geo.setAttribute('uv', quad.getAttribute('uv'))
    geo.instanceCount = COUNT

    // Fibonacci sphere: a perfect, even lattice.
    const base = new Float32Array(COUNT * 3)
    const rand = new Float32Array(COUNT * 4)
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2
      const rad = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = golden * i
      base[i * 3] = Math.cos(theta) * rad
      base[i * 3 + 1] = y
      base[i * 3 + 2] = Math.sin(theta) * rad
      rand[i * 4] = Math.random()
      rand[i * 4 + 1] = Math.random()
      rand[i * 4 + 2] = Math.random()
      rand[i * 4 + 3] = Math.random()
    }
    geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3))
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 4))
    return geo
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRadius: { value: PLANET_RADIUS },
      uPixelScale: { value: 0.032 },
      uPointer: { value: new THREE.Vector3(0, 0, PLANET_RADIUS) },
      uHover: { value: 0 },
      uRippleO: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector3(0, 1, 0)) },
      uRippleT: { value: new Float32Array(MAX_RIPPLES).fill(-1) },
    }),
    [],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const u = uniforms
    u.uTime.value += dt
    u.uHover.value = inter.strength
    u.uPointer.value.copy(inter.localPoint)

    // Age ripples; retire old ones.
    const ages = u.uRippleT.value
    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (ages[i] >= 0) {
        ages[i] += dt
        if (ages[i] > 3.5) ages[i] = -1
      }
    }

    // Spawn a ripple when the pointer travels across the surface.
    const rp = ripples.current
    const now = state.clock.elapsedTime
    if (inter.active && inter.strength > 0.15) {
      const moved = rp.lastSpawnWorld.distanceTo(inter.worldPoint)
      if (moved > 0.34 && now - rp.lastSpawnAt > 0.07) {
        const slot = rp.next
        rp.next = (rp.next + 1) % MAX_RIPPLES
        u.uRippleO.value[slot].copy(inter.localPoint).normalize()
        ages[slot] = 0
        rp.lastSpawnWorld.copy(inter.worldPoint)
        rp.lastSpawnAt = now
      }
    }
    if (matRef.current) matRef.current.uniformsNeedUpdate = true
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
