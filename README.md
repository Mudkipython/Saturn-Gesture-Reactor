# Saturn Gesture Reactor

A cinematic, real-time **3D Saturn particle system** built with **Three.js** + **MediaPipe Hands**.  
Hand gestures control scaling, diffusion, chaos, camera mode, and orbit dynamics.

## Demo

**Live Demo:** [https://gesturesdemo.netlify.app/](https://gesturesdemo.netlify.app/)

## Highlights

- Real-time hand tracking via webcam
- Particle-based Saturn body + Kepler-like ring motion
- Gesture-driven interaction (scale, spread, rotation, chaos, cinematic mode)
- Mobile-friendly layout + start overlay instructions
- Fullscreen mode
- Netlify-ready static deployment

## Gesture Controls

| Gesture | Meaning | Effect |
|---|---|---|
| 🤏 Pinch | Thumb + index pinch | **Shrink** Saturn |
| ✋ Open Palm | All fingers open | **Enlarge + spread** particles |
| ✊ Fist | Hand closed | Trigger chaos burst |
| ☝️ Point | Index finger only | Control tilt/orientation |
| 🤟 L-shape | Thumb + index open | Rotate ring direction/speed |
| ✌️ Two Fingers (V) | Index + middle | Toggle cinematic camera |
| 🖖 Three Fingers | Index + middle + ring | Time warp / speed boost |
| 👌 OK | Thumb-index circle | Stabilize orbit dynamics |
| 🤘 Rock | Index + pinky | Accelerate ring spin |

## Tech Stack

- [Three.js](https://threejs.org/) (rendering + shaders + postprocessing)
- [MediaPipe Hands](https://developers.google.com/mediapipe) (gesture tracking)
- Vanilla HTML / CSS / JavaScript (no build step required)

## Quick Start (Local)

1. Clone the repository.
2. Go to the project folder:
   ```bash
   cd "Three.js Demo"
3. Start a local static server:
   python3 -m http.server 8000
   Open:
   http://localhost:8000
4. Click Start Experience and allow camera access.

## Project Structure
Three.js Demo/
├─ index.html
├─ styles.css
├─ app.js
├─ netlify.toml
└─ README_NETLIFY.md

## Notes
1. Camera access requires HTTPS or localhost.
2. For best tracking on mobile, keep your hand in frame and at moderate distance.
3. If FPS drops, reduce device pixel ratio or particle counts.
