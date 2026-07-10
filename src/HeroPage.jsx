import React, { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import PlanetSystem from './scene/PlanetSystem.jsx'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './heropage.css'

// Observation-deck layout: the planet stays dead-center and fully
// interactive; everything else is a small flat monitoring window pinned to
// the edges, mono type, boxy, no gradients. The whole overlay ignores the
// pointer except nav links, so the interaction is never blocked.
export default function HeroPage() {
  const [clock, setClock] = useState('00:00:00')
  const [samples, setSamples] = useState(18114)
  const logRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19))
      setSamples((s) => s + Math.floor(Math.random() * 7))
    }, 1000)
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

      <div className="hud">
        {/* top-left: station id */}
        <div className="win id-block">
          <span className="dot" /> ORBITAL / DEEP·FIELD·STATION
        </div>

        {/* top-right: nav */}
        <nav className="nav">
          <a href="#mission">MISSION</a>
          <a href="#archive">ARCHIVE</a>
          <a href="#contact">CONTACT</a>
        </nav>

        {/* top-center: object title, quiet and letterspaced */}
        <div className="title-block">
          <div className="title">OBJECT KEPLER·0X — “THE FIELD”</div>
          <div className="subtitle">
            20,000 BOUND PARTICLES · 10 SATELLITES · REACH IN TO DISRUPT
          </div>
        </div>

        {/* left: observation log window */}
        <section className="win panel panel-left">
          <header>
            OBS·LOG <i>—</i> CH.02
          </header>
          <div className="body" ref={logRef}>
            <div className="kv"><span>«field»</span></div>
            <div className="kv note">[Orbit 2, Pass 25,<br />Frame 3, Node 13]</div>
            <div className="kv"><span>SHELL</span><span>{'{1; 24; 2; 12; 0}'}</span></div>
            <div className="kv"><span>DRIFT</span><span>{'{1; 24; 2; 12; 1}'}</span></div>
            <div className="kv"><span>PULSE</span><span>{'{1; 24; 2; 12; 2}'}</span></div>
            <div className="kv"><span>RIPPLE</span><span>{'{1; 24; 2; 12; 3}'}</span></div>
            <div className="kv"><span>RETURN</span><span>{'{1; 24; 2; 12; 4}'}</span></div>
          </div>
        </section>

        {/* right: telemetry window */}
        <section className="win panel panel-right">
          <header>
            TELEMETRY <i>—</i> LIVE
          </header>
          <div className="body">
            <div className="kv"><span>BODY</span><span>KEPLER·0X</span></div>
            <div className="kv"><span>PARTICLES</span><span>20,000</span></div>
            <div className="kv"><span>SATELLITES</span><span>10 / 10</span></div>
            <div className="kv"><span>FIELD</span><span className="ok">STABLE</span></div>
            <div className="kv"><span>T+</span><span>{clock} UTC</span></div>
          </div>
        </section>

        {/* bottom-center: stage line */}
        <div className="stage-block">STAGE 5: OBSERVATION</div>

        {/* bottom-left: hint / bottom-right: counter */}
        <div className="foot-left">DRAG TO ORBIT · HOVER TO DISRUPT</div>
        <div className="foot-right">TOTAL: {samples.toLocaleString('en-US').replace(/,/g, ' ')}</div>

        {/* viewfinder corners */}
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
      </div>
    </div>
  )
}
