import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import GeometricHero from './scene/GeometricHero.jsx'
import PlanetSystem from './scene/PlanetSystem.jsx'
import { OrbitControls } from '@react-three/drei'
import './heropage.css'

export default function HeroPage() {
  const [showPlanet, setShowPlanet] = useState(false)

  if (showPlanet) {
    return (
      <div className="planet-container">
        <Canvas
          dpr={[1, 2]}
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
        <div className="hint">
          drag to orbit <span>·</span> hover to disrupt <span>·</span> <button onClick={() => setShowPlanet(false)} className="toggle-button">back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="hero-container">
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 42, position: [0, 0, 8], near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        className="hero-canvas"
      >
        <color attach="background" args={['#050505']} />
        <GeometricHero />
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

      <div className="hero-content">
        <h1 className="hero-title">Geometric Futures</h1>
        <p className="hero-subtitle">Interactive experiences crafted with precision and beauty</p>
        <div className="hero-buttons">
          <button className="hero-cta">Explore</button>
          <button className="hero-cta hero-cta-secondary" onClick={() => setShowPlanet(true)}>Planet Demo</button>
        </div>
      </div>

      <div className="hero-hint">
        move cursor to interact
      </div>
    </div>
  )
}
