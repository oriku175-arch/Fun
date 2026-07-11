import React, { createContext, useContext, useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import ParticleShell from './ParticleShell.jsx'
import Satellites from './Satellites.jsx'
import Dust from './Dust.jsx'
import { spaceAudio } from './audio.js'

export const PLANET_RADIUS = 2.2

// Toggled from the HUD (outside the canvas); read every frame inside it.
export const modeStore = { solar: false }

// Intro/arrival flow. `flying` starts the camera flight; `ready` gates all
// pointer interaction until the flight lands, so the entry stays cinematic.
export const introStore = { flying: false, ready: false }

const InteractionContext = createContext(null)
export const useInteraction = () => useContext(InteractionContext)

// Shared, per-frame-mutated interaction state. The pointer ray is cast every
// mousemove; the sphere hit point and hover strength are resolved each frame
// with a slightly underdamped spring so everything responds elastically.
export default function PlanetSystem() {
  const groupRef = useRef()
  const { camera, gl } = useThree()

  const inter = useMemo(
    () => ({
      active: false,
      ray: new THREE.Ray(),
      ndc: new THREE.Vector2(),
      hasPointer: false,
      // resolved per frame:
      worldPoint: new THREE.Vector3(0, 0, PLANET_RADIUS), // pointer on/near sphere, world space
      localPoint: new THREE.Vector3(0, 0, PLANET_RADIUS), // same, in rotating-group space
      strength: 0, // spring value, 0..~1 (can overshoot)
      strengthVel: 0,
      solar: 0, // smoothed 0..1 crossfade between mono and solar palettes
      group: null,
    }),
    [],
  )

  useEffect(() => {
    const el = gl.domElement
    const raycaster = new THREE.Raycaster()
    const onMove = (e) => {
      if (!introStore.ready) return // no interaction until the flight lands
      const rect = el.getBoundingClientRect()
      inter.ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      inter.active = true
      inter.hasPointer = true
      raycaster.setFromCamera(inter.ndc, camera)
      inter.ray.copy(raycaster.ray)
    }
    const onLeave = () => {
      inter.active = false
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointercancel', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointercancel', onLeave)
    }
  }, [gl, camera, inter])

  const tmpClosest = useMemo(() => new THREE.Vector3(), [])
  const tmpPoint = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const group = groupRef.current
    if (!group) return
    inter.group = group

    // Idle: slow continuous Y rotation of the whole system.
    group.rotation.y += dt * 0.05

    // Smooth crossfade toward the selected color mode (~0.8s).
    const solarTarget = modeStore.solar ? 1 : 0
    inter.solar += (solarTarget - inter.solar) * (1 - Math.exp(-4 * dt))

    // Resolve pointer against the planet sphere (centered at world origin).
    let target = 0
    if (inter.active && inter.hasPointer) {
      // Ray must be recast against the (possibly moved) camera each frame is
      // unnecessary: OrbitControls moves the camera only while dragging, and
      // dragging fires pointermove which refreshes the ray.
      const t = -inter.ray.origin.dot(inter.ray.direction)
      tmpClosest.copy(inter.ray.direction).multiplyScalar(t).add(inter.ray.origin)
      const distC = tmpClosest.length()
      if (distC < PLANET_RADIUS) {
        const half = Math.sqrt(PLANET_RADIUS * PLANET_RADIUS - distC * distC)
        tmpPoint
          .copy(inter.ray.direction)
          .multiplyScalar(t - half)
          .add(inter.ray.origin)
        target = 1
      } else {
        tmpPoint.copy(tmpClosest).normalize().multiplyScalar(PLANET_RADIUS)
        target = Math.max(0, 1 - (distC - PLANET_RADIUS) / 1.4)
      }
      // Elastic interpolation of the disruptor point itself.
      inter.worldPoint.lerp(tmpPoint, 1 - Math.exp(-12 * dt))
    }

    // Slightly underdamped spring on hover strength -> springy engage/release.
    const k = 26
    const c = 8.5
    inter.strengthVel += (k * (target - inter.strength) - c * inter.strengthVel) * dt
    inter.strength += inter.strengthVel * dt

    // Pointer point in the rotating group's local space.
    inter.localPoint.copy(inter.worldPoint)
    group.worldToLocal(inter.localPoint)

    // Update the procedural audio with current interaction state.
    spaceAudio.update(inter.strength, inter.solar)
  })

  return (
    <InteractionContext.Provider value={inter}>
      <group ref={groupRef}>
        {/* Solid matte core: writes depth so nothing (satellites, dust, the
            far shell) is ever visible through the planet — kept hollow. */}
        <mesh>
          <sphereGeometry args={[PLANET_RADIUS * 0.94, 64, 64]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <ParticleShell />
        <Satellites />
        <Dust />
      </group>
    </InteractionContext.Provider>
  )
}
