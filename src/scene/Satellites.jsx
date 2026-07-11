import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useInteraction } from './PlanetSystem.jsx'
import { PALETTE } from './shaders.js'
import { spaceAudio } from './audio.js'

const SAT_COUNT = 10
const CLUSTER = 90
const TRAIL = 42

const clusterVertex = /* glsl */ `
attribute float aRand;
uniform float uTime;
uniform float uScale;
uniform float uDisrupt;
uniform float uSolar;
varying float vAlpha;
varying float vAccent;

void main() {
  // Cluster puffs apart while disrupted, plus a slight per-particle shimmer.
  vec3 p = position * (1.0 + uDisrupt * 0.9 * aRand);
  p += 0.014 * vec3(
    sin(uTime * 2.1 + aRand * 21.0),
    cos(uTime * 1.7 + aRand * 15.0),
    sin(uTime * 1.3 + aRand * 9.0)
  ) * (1.0 + uDisrupt * 2.0);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.018 + aRand * 0.02) * uScale / -mv.z;

  vAlpha = 0.35 + aRand * 0.55;
  // Solar mode: clusters glow like embers even at rest.
  vAccent = (uDisrupt * 0.45 + uSolar * 0.4) * aRand;
}
`

const trailVertex = /* glsl */ `
attribute float aT; // 0 = newest, 1 = oldest
uniform float uScale;
uniform float uFade;
varying float vAlpha;
varying float vAccent;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 0.022 * (1.0 - aT * 0.75) * uScale / -mv.z;
  vAlpha = uFade * pow(1.0 - aT, 1.6) * 0.5;
  vAccent = uFade * 0.35;
}
`

const dotFragment = /* glsl */ `
${PALETTE}
varying float vAlpha;
varying float vAccent;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.26, length(c)) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(palette(vAccent), a);
}
`

function makeClusterGeometry(rng) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(CLUSTER * 3)
  const rand = new Float32Array(CLUSTER)
  const gauss = () => rng() + rng() + rng() - 1.5
  for (let i = 0; i < CLUSTER; i++) {
    pos[i * 3] = gauss() * 0.075
    pos[i * 3 + 1] = gauss() * 0.075
    pos[i * 3 + 2] = gauss() * 0.075
    rand[i] = rng()
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
  return geo
}

function makeTrailGeometry() {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(TRAIL * 3)
  const t = new Float32Array(TRAIL)
  for (let i = 0; i < TRAIL; i++) t[i] = i / (TRAIL - 1)
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aT', new THREE.BufferAttribute(t, 1))
  return geo
}

function makeRingGeometry(radius) {
  const seg = 160
  const pos = new Float32Array(seg * 3)
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    pos[i * 3] = Math.cos(a) * radius
    pos[i * 3 + 1] = Math.sin(a) * radius
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return geo
}

// Mulberry32 — deterministic layout across reloads.
function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function Satellites() {
  const inter = useInteraction()

  const sats = useMemo(() => {
    const rng = mulberry32(1337)
    return Array.from({ length: SAT_COUNT }, (_, i) => {
      const radius = 3.1 + rng() * 2.4
      const normal = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1)
        .normalize()
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal,
      )
      return {
        id: i,
        radius,
        quaternion,
        speed: (0.1 + rng() * 0.3) * (rng() > 0.35 ? 1 : -1),
        phase: rng() * Math.PI * 2,
        spinAxis: new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(),
        clusterGeo: makeClusterGeometry(rng),
        trailGeo: makeTrailGeometry(),
        ringGeo: makeRingGeometry(radius),
        clusterUniforms: {
          uTime: { value: rng() * 100 },
          uScale: { value: 1000 },
          uDisrupt: { value: 0 },
          uSolar: { value: 0 },
        },
        trailUniforms: {
          uScale: { value: 1000 },
          uFade: { value: 0 },
          uSolar: { value: 0 },
        },
        // simulation state
        angle: rng() * Math.PI * 2,
        angleVel: 0,
        disrupt: 0,
        disruptVel: 0,
        offset: new THREE.Vector3(),
        offsetVel: new THREE.Vector3(),
        trailInit: false,
        pinged: false, // rising-edge guard so the ping fires once per touch
      }
    })
  }, [])

  const clusterRefs = useRef([])
  const trailRefs = useRef([])
  const ringMatRefs = useRef([])

  const tmpWorld = useMemo(() => new THREE.Vector3(), [])
  const tmpTarget = useMemo(() => new THREE.Vector3(), [])
  const tmpProj = useMemo(() => new THREE.Vector3(), [])
  const white = useMemo(() => new THREE.Color(0.96, 0.96, 0.96), [])
  const blue = useMemo(() => new THREE.Color('#2348FF'), [])
  const orange = useMemo(() => new THREE.Color('#ff4d06'), [])
  const yellow = useMemo(() => new THREE.Color('#ffc24d'), [])
  const tmpColA = useMemo(() => new THREE.Color(), [])
  const tmpColB = useMemo(() => new THREE.Color(), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const scale =
      (state.size.height * state.gl.getPixelRatio()) /
      (2 * Math.tan(((state.camera.fov * Math.PI) / 180) / 2))

    for (let i = 0; i < sats.length; i++) {
      const s = sats[i]
      const cluster = clusterRefs.current[i]
      const trail = trailRefs.current[i]
      if (!cluster || !trail) continue

      // --- Disruption spring (cursor proximity in world space) -----------
      cluster.getWorldPosition(tmpWorld)
      let target = 0
      if (inter.active) {
        const d = inter.ray.distanceToPoint(tmpWorld)
        target = THREE.MathUtils.clamp(1 - (d - 0.35) / 0.75, 0, 1)
      }
      // Ping only when the cursor is visually over THIS satellite's dot —
      // screen-space, not the 3D ray. Otherwise hovering the globe would
      // ping satellites that merely lie along the ray behind/in front of it.
      let overSat = false
      if (inter.active) {
        tmpProj.copy(tmpWorld).project(state.camera)
        if (tmpProj.z < 1) {
          const aspect = state.size.width / state.size.height
          const dx = (tmpProj.x - inter.ndc.x) * aspect
          const dy = tmpProj.y - inter.ndc.y
          if (Math.hypot(dx, dy) < 0.055) overSat = true
        }
      }
      // Rising edge with hysteresis so it fires once per genuine hover.
      if (!s.pinged && overSat) {
        s.pinged = true
        spaceAudio.satellitePing(s.id)
      } else if (s.pinged && !overSat) {
        s.pinged = false
      }

      const k = 14
      const c = 5
      s.disruptVel += (k * (target - s.disrupt) - c * s.disruptVel) * dt
      s.disrupt += s.disruptVel * dt
      const dis = THREE.MathUtils.clamp(s.disrupt, 0, 1.4)

      // --- Orbit with smooth easing; disruption sheds orbital speed ------
      const ease = 0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 0.3 + s.phase)
      s.angle += s.speed * ease * dt * (1 - 0.85 * Math.min(dis, 1))

      const bx = Math.cos(s.angle) * s.radius
      const by = Math.sin(s.angle) * s.radius

      // --- Drift outward while disrupted, spring back after --------------
      tmpTarget
        .set(bx, by, 0)
        .normalize()
        .multiplyScalar(1.15 * dis)
      tmpTarget.z += Math.sin(state.clock.elapsedTime * 2.4 + s.phase) * 0.35 * dis
      const ko = 16
      const co = 4.2 // underdamped: springy re-entry into orbit
      s.offsetVel.x += (ko * (tmpTarget.x - s.offset.x) - co * s.offsetVel.x) * dt
      s.offsetVel.y += (ko * (tmpTarget.y - s.offset.y) - co * s.offsetVel.y) * dt
      s.offsetVel.z += (ko * (tmpTarget.z - s.offset.z) - co * s.offsetVel.z) * dt
      s.offset.addScaledVector(s.offsetVel, dt)

      cluster.position.set(bx + s.offset.x, by + s.offset.y, s.offset.z)

      // Independent tumble while free.
      cluster.rotateOnAxis(s.spinAxis, (0.25 + 3.0 * dis) * dt)

      // --- Uniforms -------------------------------------------------------
      s.clusterUniforms.uTime.value += dt
      s.clusterUniforms.uScale.value = scale
      s.clusterUniforms.uDisrupt.value = dis
      s.clusterUniforms.uSolar.value = inter.solar
      s.trailUniforms.uScale.value = scale
      s.trailUniforms.uFade.value = THREE.MathUtils.clamp(dis * 1.2, 0, 1)
      s.trailUniforms.uSolar.value = inter.solar

      // --- Trail ring buffer (positions in the orbit-plane group space) ---
      const attr = trail.geometry.getAttribute('position')
      const arr = attr.array
      if (!s.trailInit) {
        for (let j = 0; j < TRAIL; j++) {
          arr[j * 3] = cluster.position.x
          arr[j * 3 + 1] = cluster.position.y
          arr[j * 3 + 2] = cluster.position.z
        }
        s.trailInit = true
      } else {
        arr.copyWithin(3, 0, (TRAIL - 1) * 3)
        arr[0] = cluster.position.x
        arr[1] = cluster.position.y
        arr[2] = cluster.position.z
      }
      attr.needsUpdate = true

      // --- Orbit ring: only fades in for THIS satellite while it's the one
      // being disrupted — hidden at rest, never shown for the others.
      const ringMat = ringMatRefs.current[i]
      if (ringMat) {
        const target = THREE.MathUtils.clamp(dis, 0, 1) * 0.45
        ringMat.opacity += (target - ringMat.opacity) * (1 - Math.exp(-6 * dt))
        const f = Math.min(dis, 1) * 0.6
        tmpColA.copy(white).lerp(blue, f)
        tmpColB.copy(orange).lerp(yellow, f)
        ringMat.color.copy(tmpColA).lerp(tmpColB, inter.solar)
      }
    }
  })

  return (
    <group>
      {sats.map((s, i) => (
        <group key={s.id} quaternion={s.quaternion}>
          <lineLoop geometry={s.ringGeo} renderOrder={0}>
            <lineBasicMaterial
              ref={(m) => (ringMatRefs.current[i] = m)}
              transparent
              opacity={0}
              color="#f5f5f5"
              depthWrite={false}
            />
          </lineLoop>
          <points
            ref={(p) => (clusterRefs.current[i] = p)}
            geometry={s.clusterGeo}
            frustumCulled={false}
            renderOrder={3}
          >
            <shaderMaterial
              vertexShader={clusterVertex}
              fragmentShader={dotFragment}
              uniforms={s.clusterUniforms}
              transparent
              depthWrite={false}
            />
          </points>
          <points
            ref={(p) => (trailRefs.current[i] = p)}
            geometry={s.trailGeo}
            frustumCulled={false}
            renderOrder={1}
          >
            <shaderMaterial
              vertexShader={trailVertex}
              fragmentShader={dotFragment}
              uniforms={s.trailUniforms}
              transparent
              depthWrite={false}
            />
          </points>
        </group>
      ))}
    </group>
  )
}
