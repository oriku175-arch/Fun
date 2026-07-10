import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { DOT_FRAGMENT, ACCENT_BLUE } from './shaders.js'

const HEX_COUNT = 8
const PARTICLE_COUNT = 2000

// Particle field geometry
function makeParticleGeometry() {
  const geometry = new THREE.BufferGeometry()
  const pos = new Float32Array(PARTICLE_COUNT * 3)
  const rand = new Float32Array(PARTICLE_COUNT)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = 8 + Math.random() * 6
    const u = Math.random() * 2 - 1
    const theta = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    pos[i * 3] = Math.cos(theta) * s * r
    pos[i * 3 + 1] = u * r
    pos[i * 3 + 2] = Math.sin(theta) * s * r
    rand[i] = Math.random()
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
  return geometry
}

const particleVertexShader = /* glsl */ `
attribute float aRand;
uniform float uTime;
uniform float uScale;
uniform vec3 uCursor;
varying float vAlpha;
varying float vAccent;

void main() {
  vec3 p = position;

  // Gentle orbit around center
  p += 0.3 * vec3(
    sin(uTime * 0.05 + aRand * 20.0),
    cos(uTime * 0.07 + aRand * 15.0),
    sin(uTime * 0.03 + aRand * 25.0)
  );

  // Cursor attraction
  vec3 toCursor = uCursor - p;
  float cursorDist = length(toCursor);
  float cursorAtt = exp(-pow(cursorDist / 3.0, 2.0)) * 0.15;
  p += normalize(toCursor + vec3(1e-4)) * cursorAtt;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.006 + aRand * 0.012) * uScale / -mv.z;

  vAlpha = (0.03 + aRand * 0.08) * (0.5 + 0.5 * sin(uTime * 0.3 + aRand * 60.0));
  vAccent = pow(cursorAtt, 2.0) * 0.6;
}
`

export default function GeometricHero() {
  const groupRef = useRef()
  const hexRefs = useRef([])
  const hexGlowRefs = useRef([])
  const icoRef = useRef()
  const particleMatRef = useRef()

  const particleGeometry = useMemo(() => makeParticleGeometry(), [])

  const particleUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uScale: { value: 1000 },
    uCursor: { value: new THREE.Vector3(0, 0, 5) },
  }), [])

  // Interaction state
  const cursorState = useMemo(() => ({
    pos: new THREE.Vector3(0, 0, 5),
    target: new THREE.Vector3(0, 0, 5),
    vel: new THREE.Vector3(0, 0, 0),
  }), [])

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1
      const dist = 5
      cursorState.target.set(x * dist * (window.innerWidth / window.innerHeight), y * dist, 5)
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [cursorState])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const scale = (state.size.height * state.gl.getPixelRatio()) / (2 * Math.tan(((state.camera.fov * Math.PI) / 180) / 2))

    // Smooth cursor following with spring physics
    const k = 8
    const c = 4
    cursorState.vel.x += (k * (cursorState.target.x - cursorState.pos.x) - c * cursorState.vel.x) * dt
    cursorState.vel.y += (k * (cursorState.target.y - cursorState.pos.y) - c * cursorState.vel.y) * dt
    cursorState.pos.add(cursorState.vel.clone().multiplyScalar(dt))

    // Update particle uniforms
    particleUniforms.uTime.value += dt
    particleUniforms.uScale.value = scale
    particleUniforms.uCursor.value.copy(cursorState.pos)
    if (particleMatRef.current) particleMatRef.current.uniformsNeedUpdate = true

    // Animate hexagon groups
    for (let i = 0; i < HEX_COUNT; i++) {
      const hexGroup = hexRefs.current[i]
      const hexGlow = hexGlowRefs.current[i]
      if (!hexGroup) continue

      // Gentle rotation
      hexGroup.rotation.z += dt * 0.3 * (i % 2 ? 1 : -1)

      // Glow response to cursor proximity
      if (hexGlow) {
        const distToHex = cursorState.pos.distanceTo(hexGroup.position)
        const targetGlow = Math.max(0, 1 - distToHex / 3)
        const currentOpacity = hexGlow.material.opacity
        hexGlow.material.opacity += (targetGlow * 0.8 - currentOpacity) * (1 - Math.exp(-4 * dt))

        // Color transition on glow
        const c = hexGlow.material.opacity
        hexGlow.material.color.setRGB(
          0.96 - c * (0.96 - 0.137),
          0.96 - c * (0.96 - 0.282),
          1.0
        )
      }
    }

    // Icosahedron rotation
    if (icoRef.current) {
      icoRef.current.rotation.x += dt * 0.3
      icoRef.current.rotation.y += dt * 0.4
      icoRef.current.rotation.z += dt * 0.2
    }
  })

  // Create hexagon lines
  const hexagons = useMemo(() => {
    return Array.from({ length: HEX_COUNT }, (_, i) => {
      const points = []
      const radius = 0.8 + (i / HEX_COUNT) * 0.6
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2
        points.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
      }
      points.push(points[0], points[1], points[2])
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3))
      return geo
    })
  }, [])

  return (
    <group ref={groupRef}>
      {/* Particle backdrop */}
      <points geometry={particleGeometry} frustumCulled={false} renderOrder={0}>
        <shaderMaterial
          ref={particleMatRef}
          vertexShader={particleVertexShader}
          fragmentShader={DOT_FRAGMENT}
          uniforms={particleUniforms}
          transparent
          depthWrite={false}
        />
      </points>

      {/* Central rotating icosahedron */}
      <mesh
        ref={icoRef}
        position={[0, 0, 0]}
        renderOrder={2}
      >
        <icosahedronGeometry args={[0.5, 3]} />
        <meshPhongMaterial
          color={ACCENT_BLUE}
          emissive={ACCENT_BLUE}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Orbiting hexagons */}
      {hexagons.map((geom, i) => {
        const angle = (i / HEX_COUNT) * Math.PI * 2
        const radius = 2 + i * 0.3
        return (
          <group
            key={i}
            ref={(g) => {
              if (g) hexRefs.current[i] = g
            }}
            position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
          >
            <line geometry={geom} renderOrder={1}>
              <lineBasicMaterial
                color={0xf5f5f5}
                transparent
                opacity={0.5}
                depthWrite={false}
                linewidth={2}
              />
            </line>
            <mesh
              ref={(m) => {
                if (m) hexGlowRefs.current[i] = m
              }}
              renderOrder={1}
            >
              <icosahedronGeometry args={[0.08, 1]} />
              <meshBasicMaterial
                color={0xf5f5f5}
                transparent
                opacity={0}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
