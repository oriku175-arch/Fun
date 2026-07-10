import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useInteraction } from './PlanetSystem.jsx'

const SAT_COUNT = 10
const SAT_PARTICLES = 900
const TRAIL = 48

const satVertexShader = /* glsl */ `
attribute vec3 aBase;   // unit-sphere direction (fibonacci lattice per satellite)
attribute float aRand;
uniform float uTime;
uniform float uScale;
uniform float uDisrupt;
uniform float uRadius;

varying float vAlpha;
varying float vAccent;

void main() {
  vec3 n = aBase;
  // Fixed radius -> clean little globe. Particles only scatter when disrupted.
  vec3 p = n * uRadius;
  p += n * uDisrupt * (0.12 + aRand * 0.35);  // shell puffs apart on disruption

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = (0.012 + aRand * 0.014) * (1.0 + uDisrupt * 0.6);
  gl_PointSize = size * uScale / -mv.z;

  // Solid-looking front hemisphere, faded back — same read as the planet.
  vec3 vn = normalize(normalMatrix * n);
  float facing = pow(vn.z * 0.5 + 0.5, 1.8);
  vAlpha = (0.55 + aRand * 0.45) * (0.12 + 0.88 * facing);
  vAccent = uDisrupt * 0.5 * aRand;
}
`

const trailVertex = /* glsl */ `
attribute float aT;
uniform float uScale;
uniform float uFade;

varying float vAlpha;
varying float vAccent;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 0.028 * (1.0 - aT * 0.8) * uScale / -mv.z;
  vAlpha = uFade * pow(1.0 - aT, 1.8) * 0.6;
  vAccent = uFade * 0.45;
}
`

const dotFragment = /* glsl */ `
varying float vAlpha;
varying float vAccent;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.26, length(c)) * vAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(vec3(0.96), vec3(0.137, 0.282, 1.0), clamp(vAccent, 0.0, 1.0));
  gl_FragColor = vec4(col, a);
}
`

function makeSatelliteGeometry(count) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const rand = new Float32Array(count)
  const base = new Float32Array(count * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    const x = Math.cos(theta) * rad
    const z = Math.sin(theta) * rad

    base[i * 3] = x
    base[i * 3 + 1] = y
    base[i * 3 + 2] = z
    pos[i * 3] = x * 0.24
    pos[i * 3 + 1] = y * 0.24
    pos[i * 3 + 2] = z * 0.24
    rand[i] = Math.random()
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aBase', new THREE.BufferAttribute(base, 3))
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
  const seg = 180
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
      // Solar-system layout: nested orbits sharing a common ecliptic plane,
      // each with only a small inclination and its own ascending node.
      const radius = 3.1 + i * 0.42 + rng() * 0.18
      const inclination = (rng() - 0.5) * 0.42 // ±~12°
      const node = rng() * Math.PI * 2
      const normal = new THREE.Vector3(
        Math.sin(inclination) * Math.cos(node),
        Math.cos(inclination),
        Math.sin(inclination) * Math.sin(node),
      ).normalize()
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal,
      )
      const satRadius = 0.12 + rng() * 0.16 // varied planet sizes
      return {
        id: i,
        radius,
        quaternion,
        speed: (0.06 + rng() * 0.16) * (rng() > 0.2 ? 1 : -1),
        phase: rng() * Math.PI * 2,
        spinAxis: new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(),
        satGeo: makeSatelliteGeometry(SAT_PARTICLES),
        trailGeo: makeTrailGeometry(),
        ringGeo: makeRingGeometry(radius),
        satUniforms: {
          uTime: { value: rng() * 100 },
          uScale: { value: 1000 },
          uDisrupt: { value: 0 },
          uRadius: { value: satRadius },
        },
        trailUniforms: {
          uScale: { value: 1000 },
          uFade: { value: 0 },
        },
        angle: rng() * Math.PI * 2,
        angleVel: 0,
        disrupt: 0,
        disruptVel: 0,
        offset: new THREE.Vector3(),
        offsetVel: new THREE.Vector3(),
        trailInit: false,
      }
    })
  }, [])

  const satRefs = useRef([])
  const trailRefs = useRef([])
  const ringMatRefs = useRef([])

  const tmpWorld = useMemo(() => new THREE.Vector3(), [])
  const tmpTarget = useMemo(() => new THREE.Vector3(), [])
  const white = useMemo(() => new THREE.Color(0.96, 0.96, 0.96), [])
  const blue = useMemo(() => new THREE.Color('#2348FF'), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const scale =
      (state.size.height * state.gl.getPixelRatio()) /
      (2 * Math.tan(((state.camera.fov * Math.PI) / 180) / 2))

    for (let i = 0; i < sats.length; i++) {
      const s = sats[i]
      const sat = satRefs.current[i]
      const trail = trailRefs.current[i]
      if (!sat || !trail) continue

      // Disruption spring (cursor proximity).
      sat.getWorldPosition(tmpWorld)
      let target = 0
      if (inter.active) {
        const d = inter.ray.distanceToPoint(tmpWorld)
        target = THREE.MathUtils.clamp(1 - (d - 0.4) / 0.9, 0, 1)
      }
      const k = 16
      const c = 6
      s.disruptVel += (k * (target - s.disrupt) - c * s.disruptVel) * dt
      s.disrupt += s.disruptVel * dt
      const dis = THREE.MathUtils.clamp(s.disrupt, 0, 1.5)

      // Orbit with easing; disruption sheds speed.
      const ease = 0.87 + 0.13 * Math.sin(state.clock.elapsedTime * 0.25 + s.phase)
      s.angle += s.speed * ease * dt * (1 - 0.8 * Math.min(dis, 1))

      const bx = Math.cos(s.angle) * s.radius
      const by = Math.sin(s.angle) * s.radius

      // Drift outward and vertical while disrupted.
      tmpTarget
        .set(bx, by, 0)
        .normalize()
        .multiplyScalar(1.2 * dis)
      tmpTarget.z += Math.sin(state.clock.elapsedTime * 2.2 + s.phase) * 0.4 * dis
      const ko = 18
      const co = 5
      s.offsetVel.x += (ko * (tmpTarget.x - s.offset.x) - co * s.offsetVel.x) * dt
      s.offsetVel.y += (ko * (tmpTarget.y - s.offset.y) - co * s.offsetVel.y) * dt
      s.offsetVel.z += (ko * (tmpTarget.z - s.offset.z) - co * s.offsetVel.z) * dt
      s.offset.addScaledVector(s.offsetVel, dt)

      sat.position.set(bx + s.offset.x, by + s.offset.y, s.offset.z)
      sat.rotateOnAxis(s.spinAxis, (0.35 + 2.5 * dis) * dt)

      // Uniforms.
      s.satUniforms.uTime.value += dt
      s.satUniforms.uScale.value = scale
      s.satUniforms.uDisrupt.value = dis
      s.trailUniforms.uScale.value = scale
      s.trailUniforms.uFade.value = THREE.MathUtils.clamp(dis * 1.2, 0, 1)

      // Trail ring buffer.
      const attr = trail.geometry.getAttribute('position')
      const arr = attr.array
      if (!s.trailInit) {
        for (let j = 0; j < TRAIL; j++) {
          arr[j * 3] = sat.position.x
          arr[j * 3 + 1] = sat.position.y
          arr[j * 3 + 2] = sat.position.z
        }
        s.trailInit = true
      } else {
        arr.copyWithin(3, 0, (TRAIL - 1) * 3)
        arr[0] = sat.position.x
        arr[1] = sat.position.y
        arr[2] = sat.position.z
      }
      attr.needsUpdate = true

      // Orbit ring.
      const ringMat = ringMatRefs.current[i]
      if (ringMat) {
        ringMat.opacity = 0.08 + 0.14 * dis
        ringMat.color.copy(white).lerp(blue, dis * 0.7)
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
              opacity={0.08}
              color="#f5f5f5"
              depthWrite={false}
            />
          </lineLoop>
          <points
            ref={(p) => (satRefs.current[i] = p)}
            geometry={s.satGeo}
            frustumCulled={false}
            renderOrder={3}
          >
            <shaderMaterial
              vertexShader={satVertexShader}
              fragmentShader={dotFragment}
              uniforms={s.satUniforms}
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
