# Particle Planet

An interactive 3D particle planet built with Three.js and React Three Fiber.

![](https://img.shields.io/badge/particles-20%2C000-white) ![](https://img.shields.io/badge/target-60%20FPS-blue)

## Features

- **20,000 GPU-instanced particles** on a Fibonacci-lattice sphere, rendered with
  `InstancedBufferGeometry` and custom shaders — all displacement (breathing,
  simplex-noise living surface, cursor physics, ripples) is computed on the GPU.
- **10 particle satellites** orbiting on unique planes, radii, and speeds, each with a
  thin translucent orbital path.
- **Gravity-disruptor cursor**: hovering dents the surface with spring-based repulsion,
  spawns expanding ripples, opens the shell to reveal a dense particle nucleus, and
  knocks nearby satellites out of orbit — they drift outward, tumble independently, and
  leave subtle particle trails before spring-damping back onto their paths.
- **Elastic recovery**: on mouse leave every particle interpolates home and the sphere
  reforms into a perfect globe.
- **Full OrbitControls** with damping and inertia for true 3D rotation of the system.
- Ambient particle dust, matte `#050505` background, white particles with subtle
  opacity variation, and faint `#2348FF` interaction accents.

## Run

```bash
npm install
npm run dev
```

## Interactions

| Input       | Effect                                                        |
| ----------- | ------------------------------------------------------------- |
| Hover       | Gravity disruption — dent, ripples, shell opening, satellite drift |
| Mouse move  | Elastic attraction + propagating ripples                      |
| Mouse leave | Everything springs back to a perfect sphere                   |
| Drag        | Orbit the whole planetary system with inertia                 |
