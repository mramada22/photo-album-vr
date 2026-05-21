// src/animations/prechorus.js
// Pre-chorus — camera pans across low-poly women synced to lyrics.

import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

// Offsets in milliseconds from when the sequence starts
const STOPS = [
  { pos: '-4.5 2.5 3', rot: '-15 0 0',   fov: '20', offset: 0    }, // lone woman — fires immediately
  { pos: '-1.5 2.5 3', rot: '-15 0 0',   fov: '20', offset: 2000 }, // covering/hoodie — 2s after start
  { pos: '1 2.5 3',    rot: '-15 0 0',   fov: '20', offset: 4000 }, // hugging — 4s after start
  { pos: '3.5 2.5 8',  rot: '-15 0 0',   fov: '20', offset: 5000 }, // posing woman — 5s after start
  { pos: '7.5 2.5 7',  rot: '-12 20 0', fov: '20', offset: 6000 }, // both women — 6s after start
  { pos: '8.5 2.5 1', rot: '-19 45 -1', fov: '15', offset: 8000 }, // head down woman — 8s after start
]

function applyEmissive() {
  const { preChorusFigures } = getElements()
  preChorusFigures.object3D.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.emissive = new THREE.Color(0.08, 0.05, 0.02)
      child.material.emissiveIntensity = 1
      child.material.needsUpdate = true
    }
  })
}

function addStop6Spotlight() {
  const { preChorusRoom } = getElements()

  if (document.getElementById('stop6Light')) return

  const spotlight = document.createElement('a-light')
  spotlight.setAttribute('id', 'stop6Light')
  spotlight.setAttribute('type', 'spot')
  spotlight.setAttribute('position', '8 5 2')
  spotlight.setAttribute('rotation', '-70 0 0')
  spotlight.setAttribute('intensity', '3')
  spotlight.setAttribute('color', '#ffcc88')
  spotlight.setAttribute('angle', '25')
  spotlight.setAttribute('penumbra', '0.3')
  spotlight.setAttribute('distance', '10')
  spotlight.setAttribute('visible', 'false')
  preChorusRoom.appendChild(spotlight)
}

function moveCameraToStop(stop) {
  console.log('moveCameraToStop called with pos:', stop.pos)
  const { cameraRig } = getElements()
  const cam = document.getElementById('camera')
  
  if (!cameraRig) {
    console.error('cameraRig is null in moveCameraToStop')
    return
  }
  if (!cam) {
    console.error('camera is null in moveCameraToStop')
    return
  }

  cameraRig.setAttribute('position', stop.pos)
  cameraRig.setAttribute('rotation', stop.rot)
  cam.setAttribute('fov', stop.fov)
}

export async function startPreChorusSequence() {
  console.log('startPreChorusSequence called')

   const figures = document.getElementById('preChorusFigures')
  console.log('figures element:', figures)
  console.log('preChorusRoom visible:', document.getElementById('preChorusRoom')?.getAttribute('visible'))

  const { preChorusFigures } = getElements()

  // Show figures
  preChorusFigures.setAttribute('visible', 'true')

  // Move camera to Stop 1 immediately
  moveCameraToStop(STOPS[0])

  // Wait for model to load then apply emissive
  await new Promise(resolve => {
    const mesh = preChorusFigures.getObject3D('mesh')
    if (mesh) { resolve(); return }
    preChorusFigures.addEventListener('model-loaded', resolve, { once: true })
    setTimeout(resolve, 8000)
  })

  applyEmissive()
  addStop6Spotlight()

  // Smooth continuous pan through all stops
  async function panThroughStops() {
    for (let i = 1; i < STOPS.length; i++) {
      const stop = STOPS[i]
      const { cameraRig } = getElements()
      const cam = document.getElementById('camera')

      if (!cameraRig || !cam) return

      // Duration between each stop
      const durations = [2000, 2000, 1000, 1000, 2000]
      const dur = durations[i - 1] || 1500

      cameraRig.setAttribute('animation__move', {
        property: 'position',
        to: stop.pos,
        dur: dur,
        easing: 'easeInOutSine'
      })
      cameraRig.setAttribute('animation__rotate', {
        property: 'rotation',
        to: stop.rot,
        dur: dur,
        easing: 'easeInOutSine'
      })
      cam.setAttribute('fov', stop.fov)

      if (i === 5) {
        const light = document.getElementById('stop6Light')
        if (light) light.setAttribute('visible', 'true')
      }

      // Wait for this animation to finish before starting the next
      await wait(dur)
    }
  }

  panThroughStops()
}