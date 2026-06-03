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
  floor.setAttribute('material', 'color: #3d2a1a; roughness: 1')
  room.appendChild(floor)

  // Back wall
  const wallBack = document.createElement('a-plane')
  wallBack.setAttribute('position', '0 5 -8')
  wallBack.setAttribute('width', '30')
  wallBack.setAttribute('height', '12')
  wallBack.setAttribute('material', 'color: #2a1a0e; roughness: 1')
  room.appendChild(wallBack)

  // Left wall
  const wallLeft = document.createElement('a-plane')
  wallLeft.setAttribute('position', '-8 5 0')
  wallLeft.setAttribute('rotation', '0 90 0')
  wallLeft.setAttribute('width', '30')
  wallLeft.setAttribute('height', '12')
  wallLeft.setAttribute('material', 'color: #2a1a0e; roughness: 1')
  room.appendChild(wallLeft)

  // Right wall
  const wallRight = document.createElement('a-plane')
  wallRight.setAttribute('position', '8 5 0')
  wallRight.setAttribute('rotation', '0 -90 0')
  wallRight.setAttribute('width', '30')
  wallRight.setAttribute('height', '12')
  wallRight.setAttribute('material', 'color: #2a1a0e; roughness: 1')
  room.appendChild(wallRight)

  // Lights start dim — brighten during walk as characters approach
  const ambient = document.createElement('a-light')
  ambient.setAttribute('id', 'bridgeAmbient')
  ambient.setAttribute('type', 'ambient')
  ambient.setAttribute('color', '#fff5e6')
  ambient.setAttribute('intensity', '0.2')
  room.appendChild(ambient)

  const spot = document.createElement('a-light')
  spot.setAttribute('id', 'bridgeSpot')
  spot.setAttribute('type', 'spot')
  spot.setAttribute('position', '0 6 0')
  spot.setAttribute('rotation', '-90 0 0')
  spot.setAttribute('color', '#ffe8a0')
  spot.setAttribute('intensity', '1.0')
  spot.setAttribute('angle', '30')
  spot.setAttribute('penumbra', '0.6')
  spot.setAttribute('distance', '12')
  room.appendChild(spot)

  const fillL = document.createElement('a-light')
  fillL.setAttribute('id', 'bridgeFillL')
  fillL.setAttribute('type', 'point')
  fillL.setAttribute('position', '-4 2 0')
  fillL.setAttribute('color', '#fff0d0')
  fillL.setAttribute('intensity', '0.3')
  fillL.setAttribute('distance', '10')
  room.appendChild(fillL)

  const fillR = document.createElement('a-light')
  fillR.setAttribute('id', 'bridgeFillR')
  fillR.setAttribute('type', 'point')
  fillR.setAttribute('position', '4 2 0')
  fillR.setAttribute('color', '#fff0d0')
  fillR.setAttribute('intensity', '0.3')
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
      const t = Math.min((performance.now() - fadeInT0) / 300, 1)
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

  // Slow camera push + light brightening during the walk
  const walkPushStart = rigObj.position.z
  const walkPushEnd = walkPushStart - 2.0
  const ambientEl  = document.getElementById('bridgeAmbient')
  const spotEl     = document.getElementById('bridgeSpot')
  const fillLEl    = document.getElementById('bridgeFillL')
  const fillREl    = document.getElementById('bridgeFillR')
  const walkPushT0 = performance.now()
  ;(function walkPushTick() {
    const t = Math.min((performance.now() - walkPushT0) / WALK_DURATION, 1)
    const e = easeInOutQuad(t)

    // Camera push
    rigObj.position.z = walkPushStart + (walkPushEnd - walkPushStart) * e

    // Lights brighten from dim → full as characters approach
    if (ambientEl) ambientEl.setAttribute('light', `type: ambient; color: #fff5e6; intensity: ${(0.2 + 0.6 * e).toFixed(3)}`)
    if (spotEl)    spotEl.setAttribute('light',    `type: spot; color: #ffe8a0; intensity: ${(1.0 + 2.5 * e).toFixed(3)}`)
    if (fillLEl)   fillLEl.setAttribute('light',   `type: point; color: #fff0d0; intensity: ${(0.3 + 0.9 * e).toFixed(3)}`)
    if (fillREl)   fillREl.setAttribute('light',   `type: point; color: #fff0d0; intensity: ${(0.3 + 0.9 * e).toFixed(3)}`)

    if (t < 1) requestAnimationFrame(walkPushTick)
  })()

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
        el.setAttribute('animation-mixer', 'clip: *; loop: once; clampWhenFinished: true; timeScale: 0.4; crossFadeDuration: 0.8')
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

  // Hold until 2:31 (151s) — scene started at 136s, walk=5s, swap~0.5s
  // At 2:26 (4.5s into idle) start a slow gentle push in
  await wait(500)

  // Slow camera push in over 1.5s — subtle, doesn't reach the characters
  const pushT0 = performance.now()
  const pushStart = rigObj.position.z
  const pushEnd = Math.max(pushStart - 1.5, 1.5)  // push in 1.5 units, don't go closer than 1.5
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - pushT0) / 1500, 1)
      const e = easeOutCubic(t)
      rigObj.position.z = pushStart + (pushEnd - pushStart) * e
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  await wait(1000)

  // ── Fade to black → final chorus ─────────────────────────────────
  fadeOverlay.classList.add('visible')
  console.log('[bridge] faded to black — ready for final chorus')

  if (cam) cam.setAttribute('look-controls', 'enabled: true')
}