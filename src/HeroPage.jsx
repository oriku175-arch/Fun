import React, { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import PlanetSystem, { modeStore, introStore } from './scene/PlanetSystem.jsx'
import { spaceAudio } from './scene/audio.js'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './heropage.css'

const easeInOutCubic = (x) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

const FLIGHT_DUR = 2.8

// Drives the entrance: holds the camera at a far vantage during the intro,
// then flies it in along an arcing sweep when the user initiates. Hands
// control back to OrbitControls once it lands, and flips introStore.ready so
// the pointer interaction wakes up.
function CameraRig({ onArrive }) {
  const { camera } = useThree()
  const from = useMemo(() => new THREE.Vector3(0, 4.8, 15.5), [])
  const to = useMemo(() => new THREE.Vector3(0, 1.3, 8), [])
  const startT = useRef(null)
  const arrived = useRef(false)

  useFrame((state) => {
    if (arrived.current) return

    if (!introStore.flying) {
      camera.position.copy(from)
      camera.lookAt(0, 0, 0)
      return
    }

    if (startT.current === null) startT.current = state.clock.elapsedTime
    const t = state.clock.elapsedTime - startT.current

    if (t < FLIGHT_DUR) {
      const e = easeInOutCubic(t / FLIGHT_DUR)
      camera.position.lerpVectors(from, to, e)
      // Arcing azimuth sweep that unwinds to zero exactly on arrival.
      const ang = (1 - e) * 0.7
      const x = camera.position.x * Math.cos(ang) - camera.position.z * Math.sin(ang)
      const z = camera.position.x * Math.sin(ang) + camera.position.z * Math.cos(ang)
      camera.position.x = x
      camera.position.z = z
      camera.lookAt(0, 0, 0)
    } else {
      arrived.current = true
      camera.position.copy(to)
      camera.lookAt(0, 0, 0)
      introStore.ready = true
      onArrive()
    }
  })

  return null
}

export default function HeroPage() {
  // phase: 'intro' -> 'leaving' (flying in) -> 'active' (interactive)
  const [phase, setPhase] = useState('intro')
  const [solar, setSolar] = useState(false)
  const [audio, setAudio] = useState(false)

  const enter = () => {
    if (phase !== 'intro') return
    // The click is the browser gesture that lets audio start.
    if (!audio) {
      spaceAudio.toggle()
      setAudio(true)
    }
    introStore.flying = true
    setPhase('leaving')
  }

  const toggleMode = () => {
    modeStore.solar = !modeStore.solar
    setSolar(modeStore.solar)
  }

  const toggleAudio = () => {
    setAudio(spaceAudio.toggle())
  }

  return (
    <div className={`hero ${solar ? 'solar' : ''} phase-${phase}`}>
      <Canvas
        dpr={[1, 2]}
        flat
        camera={{ fov: 42, position: [0, 4.8, 15.5], near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050505']} />
        <PlanetSystem />
        <CameraRig onArrive={() => setPhase('active')} />
        <OrbitControls
          enabled={phase === 'active'}
          enableDamping
          dampingFactor={0.055}
          enablePan={false}
          rotateSpeed={0.55}
          minDistance={4}
          maxDistance={16}
        />
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.32}
            luminanceSmoothing={0.35}
            mipmapBlur
            kernelSize={KernelSize.SMALL}
            intensity={0.55}
            radius={0.55}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.55} />
        </EffectComposer>
      </Canvas>

      {/* ---- intro / launch field ---------------------------------------- */}
      {phase !== 'active' && (
        <div className={`intro ${phase === 'leaving' ? 'leaving' : ''}`}>
          <div className="intro-inner">
            <div className="intro-eyebrow">
              <span className="tick" /> DEEP·FIELD·STATION
            </div>
            <h1 className="intro-title">KEPLER·0X</h1>
            <p className="intro-sub">
              An interactive particle field — twenty thousand bodies, ten
              satellites. Reach in to disturb it.
            </p>
            <button className="intro-enter" onClick={enter} type="button">
              <span className="play">▶</span> INITIATE SEQUENCE
            </button>
            <div className="intro-note">SOUND ON · HEADPHONES RECOMMENDED</div>
          </div>
        </div>
      )}

      {/* ---- HUD (boots as the camera settles) --------------------------- */}
      {phase !== 'intro' && (
        <div className="hud">
          <div className="win id-block">
            <span className="dot" /> ORBITAL / DEEP·FIELD
          </div>

          <nav className="nav">
            <a href="#mission">MISSION</a>
            <a href="#contact">CONTACT</a>
          </nav>

          <div className="title-block">
            <div className="title">OBJECT KEPLER·0X</div>
          </div>

          <div className="foot-left">DRAG TO ORBIT · HOVER TO DISRUPT</div>

          <div className="controls-row">
            <button className="win mode-btn" onClick={toggleAudio} type="button">
              AUDIO: {audio ? 'ON' : 'OFF'}
              <span className={`swatch ${audio ? 'active' : ''}`} />
            </button>
            <button className="win mode-btn" onClick={toggleMode} type="button">
              SPECTRUM: {solar ? 'SOLAR' : 'MONO'}
              <span className="swatch" />
            </button>
          </div>

          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />
        </div>
      )}
    </div>
  )
}
