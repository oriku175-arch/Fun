import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import PlanetSystem, { modeStore } from './scene/PlanetSystem.jsx'
import { spaceAudio } from './scene/audio.js'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './heropage.css'

// Observation-deck layout, minimal: the planet is the centerpiece, the HUD
// is a handful of small mono labels at the edges plus two controls — the
// spectrum (color-mode) and audio toggles. Overlay ignores the pointer except
// the nav links and the toggles, so the interaction is never blocked.
export default function HeroPage() {
  const [solar, setSolar] = useState(false)
  const [audio, setAudio] = useState(false)

  const toggleMode = () => {
    modeStore.solar = !modeStore.solar
    setSolar(modeStore.solar)
  }

  const toggleAudio = () => {
    const enabled = spaceAudio.toggle()
    setAudio(enabled)
  }

  return (
    <div className={solar ? 'hero solar' : 'hero'}>
      <Canvas
        dpr={[1, 2]}
        flat
        camera={{ fov: 42, position: [0, 1.3, 8], near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050505']} />
        <PlanetSystem />
        <OrbitControls
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

      <div className="hud">
        {/* top-left: station id */}
        <div className="win id-block">
          <span className="dot" /> ORBITAL / DEEP·FIELD
        </div>

        {/* top-right: nav */}
        <nav className="nav">
          <a href="#mission">MISSION</a>
          <a href="#contact">CONTACT</a>
        </nav>

        {/* top-center: object title */}
        <div className="title-block">
          <div className="title">OBJECT KEPLER·0X</div>
        </div>

        {/* bottom-left: hint */}
        <div className="foot-left">DRAG TO ORBIT · HOVER TO DISRUPT</div>

        {/* bottom-right: controls */}
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

        {/* viewfinder corners */}
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
      </div>
    </div>
  )
}
