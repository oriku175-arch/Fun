import React, { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import PlanetSystem from './scene/PlanetSystem.jsx'
import './heropage.css'

// The planet IS the hero. All website chrome lives in the corners as a
// mission-control style HUD, with pointer-events disabled everywhere except
// the few interactive elements — so drag-to-orbit and hover-to-disrupt on
// the planet keep working through the overlay.
export default function HeroPage() {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(
        d.toISOString().slice(11, 19) + ' UTC',
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="hero">
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

      {/* ---- HUD overlay -------------------------------------------------- */}
      <div className="hud">
        {/* top bar */}
        <header className="hud-top">
          <div className="wordmark">
            <span className="wordmark-dot" />
            ORBITAL<span className="thin">/SYSTEMS</span>
          </div>
          <nav className="nav">
            <a href="#mission">Mission</a>
            <a href="#technology">Technology</a>
            <a href="#fleet">Fleet</a>
            <a href="#contact" className="nav-cta">
              Initiate Contact
            </a>
          </nav>
        </header>

        {/* left column — headline */}
        <div className="hud-left">
          <div className="eyebrow">
            <span className="tick" /> EXP·042 — DEEP FIELD
          </div>
          <h1>
            GRAVITY,
            <br />
            <em>REWRITTEN.</em>
          </h1>
          <p className="sub">
            Twenty thousand particles. Ten satellites.
            <br />
            One field you can reach into.
          </p>
          <div className="cta-row">
            <a className="cta" href="#mission">
              Begin Sequence
            </a>
            <span className="cta-note">SYS·READY</span>
          </div>
        </div>

        {/* right column — telemetry */}
        <aside className="hud-right">
          <div className="telemetry">
            <div className="row">
              <span>BODY</span>
              <span>KEPLER·0X</span>
            </div>
            <div className="row">
              <span>PARTICLES</span>
              <span>20,000</span>
            </div>
            <div className="row">
              <span>SATELLITES</span>
              <span>10 / 10</span>
            </div>
            <div className="row">
              <span>FIELD</span>
              <span className="ok">STABLE</span>
            </div>
            <div className="row">
              <span>T</span>
              <span>{clock}</span>
            </div>
          </div>
        </aside>

        {/* bottom bar */}
        <footer className="hud-bottom">
          <div className="hint-line">
            DRAG TO ORBIT <span>·</span> HOVER TO DISRUPT
          </div>
          <div className="scale-ticks" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} className={i % 6 === 0 ? 'major' : ''} />
            ))}
          </div>
          <div className="coords">LAT 00.000 / LON 00.000 / ALT 8.00</div>
        </footer>

        {/* viewfinder corners */}
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
      </div>
    </div>
  )
}
