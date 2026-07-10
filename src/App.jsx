import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import PlanetSystem from './scene/PlanetSystem.jsx'

export default function App() {
  return (
    <>
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
      </Canvas>
      <div className="hint">
        drag to orbit <span>·</span> hover to disrupt
      </div>
    </>
  )
}
