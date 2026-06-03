// src/animations/bridge.js
// Bridge: 138s (2:18) → ~153s (2:33)
//
// Timeline:
// 138s      — warm room fades in, two figures at opposite ends facing each other
// 138-143s  — both walk toward center, camera at eye level
// 143s      — figures meet, character1 → idle, character2 → reach-out idle
// 143-151s  — hold on the embrace moment
// 151-153s  — fade to black → final chorus

import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

const CHAR1_WALK = '/models/character1_walk.glb'
const CHAR1_IDLE = '/models/character1_idle.glb'
const CHAR2_WALK = '/models/character2_walk.glb?v=2'
const CHAR2_IDLE = '/models/character2_idle.glb'

const START_DISTANCE = 7.0
const WALK_DURATION  = 5000

const CAM_START_Z  =  8.0
const CAM_Y        =  0.0

function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
function easeOutCubic(t)  { return 1 - Math.pow(1-t, 3) }

// ── Build bridge room ─────────────────────────────────────────────────────────
export function buildBridgeRoom() {
  if (document.getElementById('bridgeRoom')) return

  const scene  = document.querySelector('a-scene')
  const assets = document.querySelector('a-assets')

  ;[
    { id: 'bridgeChar1Walk', src: CHAR1_WALK },
    { id: 'bridgeChar1Idle', src: CHAR1_IDLE },
    { id: 'bridgeChar2Walk', src: CHAR2_WALK },
    { id: 'bridgeChar2Idle', src: CHAR2_IDLE },
  ].forEach(({ id, src }) => {
    if (!document.getElementById(id)) {
      const item = document.createElement('a-asset-item')
      item.setAttribute('id', id)
      item.setAttribute('src', src)
      assets.appendChild(item)
    }
  })

  const room = document.createElement('a-entity')
  room.setAttribute('id', 'bridgeRoom')
  room.setAttribute('visible', 'false')

  const floor = document.createElement('a-plane')
  floor.setAttribute('rotation', '-90 0 0')
  floor.setAttribute('width', '30')
  floor.setAttribute('height', '30')
  floor.setAttribute('material', 'color: #f5ede0; roughness: 0.8; shader: flat')
  room.appendChild(floor)

  const ambient = document.createElement('a-light')
  ambient.setAttribute('type', 'ambient')
  ambient.setAttribute('color', '#fff5e6')
  ambient.setAttribute('intensity', '0.8')
  room.appendChild(ambient)

  const spot = document.createElement('a-light')
  spot.setAttribute('type', 'spot')
  spot.setAttribute('position', '0 6 0')
  spot.setAttribute('rotation', '-90 0 0')
  spot.setAttribute('color', '#ffe8a0')
  spot.setAttribute('intensity', '3.5')
  spot.setAttribute('angle', '30')
  spot.setAttribute('penumbra', '0.6')
  spot.setAttribute('distance', '12')
  room.appendChild(spot)

  const fillL = document.createElement('a-light')
  fillL.setAttribute('type', 'point')
  fillL.setAttribute('position', '-4 2 0')
  fillL.setAttribute('color', '#fff0d0')
  fillL.setAttribute('intensity', '1.2')
  fillL.setAttribute('distance', '10')
  room.appendChild(fillL)

  const fillR = document.createElement('a-light')
  fillR.setAttribute('type', 'point')
  fillR.setAttribute('position', '4 2 0')
  fillR.setAttribute('color', '#fff0d0')
  fillR.setAttribute('intensity', '1.2')
  fillR.setAttribute('distance', '10')
  room.appendChild(fillR)

  // Character 1 — mixer set BEFORE gltf-model so it catches model-loaded
  const char1 = document.createElement('a-entity')
  char1.setAttribute('id', 'bridgeChar1')
  char1.setAttribute('position', `-${START_DISTANCE} 0 0`)
  char1.setAttribute('rotation', '0 90 0')
  char1.setAttribute('scale', '1 1 1')
  char1.setAttribute('animation-mixer', 'clip: Armature|mixamo.com|Layer0; loop: repeat; timeScale: 1; crossFadeDuration: 0.3')
  char1.setAttribute('gltf-model', '#bridgeChar1Walk')
  room.appendChild(char1)

  // Character 2 — mixer set BEFORE gltf-model so it catches model-loaded
  const char2 = document.createElement('a-entity')
  char2.setAttribute('id', 'bridgeChar2')
  char2.setAttribute('position', `${START_DISTANCE} 0 0`)
  char2.setAttribute('rotation', '0 -90 0')
  char2.setAttribute('scale', '1 1 1')
  char2.setAttribute('animation-mixer', 'clip: Armature|mixamo.com|Layer0; loop: repeat; timeScale: 1; crossFadeDuration: 0.3')
  char2.setAttribute('gltf-model', '#bridgeChar2Walk')
  room.appendChild(char2)

  scene.appendChild(room)
  console.log('[bridge] buildBridgeRoom done')
}

// ── Main sequence ─────────────────────────────────────────────────────────────
export async function startBridgeSequence() {
  console.log('[bridge] startBridgeSequence called')

  buildBridgeRoom()
  await wait(50)

  const bridgeRoom = document.getElementById('bridgeRoom')
  const { fadeOverlay, cameraRig } = getElements()
  const cam    = document.getElementById('camera')
  const rigObj = cameraRig.object3D

  if (cam) cam.setAttribute('look-controls', 'enabled: false')

  rigObj.position.set(0, CAM_Y, CAM_START_Z)
  rigObj.rotation.set(0, 0, 0)
  if (cam && cam.components.camera) {
    cam.components.camera.camera.fov = 60
    cam.components.camera.camera.updateProjectionMatrix()
  }

  const fadePane = document.createElement('a-plane')
  fadePane.setAttribute('width', '200')
  fadePane.setAttribute('height', '200')
  fadePane.setAttribute('position', '0 0 -0.5')
  fadePane.setAttribute('material', 'color: #000000; shader: flat; transparent: true; opacity: 1; depthTest: false')
  fadePane.setAttribute('render-order', '999')
  const camEl = document.getElementById('camera')
  camEl.appendChild(fadePane)

  await wait(100)

  const prevRoom = document.getElementById('verse2Room')
  if (prevRoom) prevRoom.setAttribute('visible', 'false')
  bridgeRoom.setAttribute('visible', 'true')

  await new Promise(resolve => {
    let f = 0; const tick = () => ++f >= 8 ? resolve() : requestAnimationFrame(tick)
    requestAnimationFrame(tick)
  })

  const fadeInT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - fadeInT0) / 800, 1)
      fadePane.setAttribute('material', `color: #000000; shader: flat; transparent: true; opacity: ${(1-t).toFixed(3)}; depthTest: false`)
      if (t < 1) requestAnimationFrame(tick)
      else { camEl.removeChild(fadePane); resolve() }
    })()
  })

  console.log('[bridge] room visible — starting walk')

  const char1El = document.getElementById('bridgeChar1')
  const char2El = document.getElementById('bridgeChar2')

  // Use A-Frame animation component to drive position — linear to match walk speed
  char1El.setAttribute('animation__walk',
    `property: position; from: ${-START_DISTANCE} 0 0; to: -0.8 0 0; dur: ${WALK_DURATION}; easing: linear; loop: false`)
  char2El.setAttribute('animation__walk',
    `property: position; from: ${START_DISTANCE} 0 0; to: 0.8 0 0; dur: ${WALK_DURATION}; easing: linear; loop: false`)

  await wait(WALK_DURATION)

  console.log('[bridge] characters met — swapping to idle')

  char1El.removeAttribute('animation__walk')
  char2El.removeAttribute('animation__walk')

  // Hide, swap model, reposition, show
  char1El.setAttribute('visible', 'false')
  char2El.setAttribute('visible', 'false')

  const swapToIdle = (el, modelId, finalX) => new Promise(resolve => {
    const onLoaded = () => {
      el.removeEventListener('model-loaded', onLoaded)
      el.setAttribute('position', `${finalX} 0 0`)
      el.object3D.position.set(finalX, 0, 0)
      // Use * to match whatever clip name the idle GLB has
      // Remove first to ensure clean reinit, then wait a frame before re-adding
      el.removeAttribute('animation-mixer')
      requestAnimationFrame(() => {
        el.setAttribute('animation-mixer', 'clip: *; loop: repeat; timeScale: 1; crossFadeDuration: 0.3')
        el.setAttribute('visible', 'true')
        resolve()
      })
    }
    el.addEventListener('model-loaded', onLoaded)
    el.setAttribute('gltf-model', `#${modelId}`)
  })

  await Promise.all([
    swapToIdle(char1El, 'bridgeChar1Idle', -0.8),
    swapToIdle(char2El, 'bridgeChar2Idle', 0.8),
  ])

  // Hold on the embrace moment — 8 seconds
  await wait(8000)

  // ── Fade to black → final chorus ─────────────────────────────────
  fadeOverlay.classList.add('visible')
  console.log('[bridge] faded to black — ready for final chorus')

  if (cam) cam.setAttribute('look-controls', 'enabled: true')
}