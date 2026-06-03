// src/animations/chorus.js
import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

const PAGE_VIDEOS = [
  '/videos/page1.mp4',
  '/videos/page2.mp4',
  '/videos/page3.mp4',
]

const LAND_DELAYS = [0, 8000 - 2500, 18000 - 3500]  // page 2 starts 1s earlier

// Module-level map of photo plane references — bypasses getElementById on children
const photoPlanes = {}

// All pages land near the origin so the spotlight hits them
// and the bird's-eye camera at (0, 6.5, 0) sees everything
const SPOT0 = { x: 0.0, z:  0.0, ry:  5 }
const LANDING_SPOTS = [
  SPOT0,
  { x: -0.6, z:  0.5, ry: -18 },
  { x:  0.7, z: -0.3, ry:  22 },
  { x:  0.1, z:  0.8, ry:  -8 },
]

// Camera watching position: 2m behind SPOT0, elevated, looking down-forward
// "Behind" means +Z since the page faces toward -Z at ry:5
const CAM_WATCH = { x: 0.0, y: 3.5, z: 3.0 }  // position
const CAM_WATCH_ROT = { x: -49.4, y: 0, z: 0 }   // atan2(3.5,3.0) centers origin in frame

// ── Debug overlay ─────────────────────────────────────────────────────────────
function dbg(msg) {
  console.log(`[chorus] ${msg}`)
  let box = document.getElementById('chorusDebugBox')
  if (!box) {
    box = document.createElement('div')
    box.id = 'chorusDebugBox'
    box.style.cssText = `
      position: fixed; bottom: 12px; left: 12px; z-index: 9999;
      background: rgba(0,0,0,0.75); color: #0f0; font: 11px monospace;
      padding: 8px 12px; border-radius: 6px; max-width: 420px;
      pointer-events: none; white-space: pre-wrap;
    `
    document.body.appendChild(box)
  }
  const line = `${new Date().toISOString().slice(14,23)} ${msg}`
  box.textContent = box.textContent.split('\n').slice(-12).concat(line).join('\n')
}
// ─────────────────────────────────────────────────────────────────────────────

function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }

function buildVideoAsset(index) {
  const id = `chorusVideo${index}`
  if (document.getElementById(id)) return id
  const assets = document.querySelector('a-assets')
  const vid = document.createElement('video')
  vid.setAttribute('id', id)
  vid.setAttribute('src', PAGE_VIDEOS[index])
  vid.setAttribute('preload', 'auto')
  vid.setAttribute('loop', 'true')
  vid.setAttribute('crossorigin', 'anonymous')
  vid.muted = true
  assets.appendChild(vid)
  return id
}

function buildPage(index, spot, startOnFloor) {
  const chorusRoom = document.getElementById('chorusRoom')
  buildVideoAsset(index)

  // Each page sits slightly higher than the previous so later pages
  // visually stack on top — 0.003 per page is enough to prevent z-fighting
  const landY = 0.01 + index * 0.003

  const page = document.createElement('a-entity')
  page.setAttribute('id', `chorusPage${index}`)

  if (startOnFloor) {
    page.setAttribute('position', `${spot.x} ${landY} ${spot.z}`)
    page.setAttribute('rotation', `-90 ${spot.ry} 0`)
    page.setAttribute('visible', 'true')
  } else {
    page.setAttribute('position', `${spot.x} 5.5 ${spot.z}`)
    page.setAttribute('rotation', `-15 ${spot.ry} 8`)
    page.setAttribute('visible', 'false')
  }

  // Layer order (front to back, all offset forward from entity origin):
  // photo (z:0.006) → cream bg (z:0.004) → brown border (z:0.002)
  // This ensures border is always visible above any underlying page

  // Brown border — bottommost layer, still in front of floor
  const border = document.createElement('a-plane')
  border.setAttribute('width',  '0.74')
  border.setAttribute('height', '0.99')
  border.setAttribute('position', '0 0 0.002')
  border.setAttribute('material', 'color: #5c3a1e; roughness: 0.9; shader: flat; side: double')
  page.appendChild(border)

  // Cream page background
  const bg = document.createElement('a-plane')
  bg.setAttribute('width',  '0.7')
  bg.setAttribute('height', '0.95')
  bg.setAttribute('position', '0 0 0.004')
  bg.setAttribute('material', 'color: #f0e6d0; roughness: 0.8; shader: flat; side: double')
  page.appendChild(bg)

  // Photo area — topmost layer
  const photo = document.createElement('a-plane')
  photo.setAttribute('id', `chorusPhoto${index}`)
  photo.setAttribute('width',  '0.532')
  photo.setAttribute('height', '0.722')
  photo.setAttribute('position', '0 0 0.006')
  photo.setAttribute('material', 'color: #1a1a1a; roughness: 0.5; shader: flat; side: double')

  page.appendChild(photo)
  chorusRoom.appendChild(page)

  photoPlanes[index] = photo
  return page
}

function buildShadow(spot) {
  const chorusRoom = document.getElementById('chorusRoom')
  const shadow = document.createElement('a-circle')
  shadow.setAttribute('id', 'page0Shadow')
  shadow.setAttribute('radius', '0.45')
  shadow.setAttribute('rotation', '-90 0 0')
  shadow.setAttribute('position', `${spot.x} 0.005 ${spot.z}`)
  shadow.setAttribute('material', 'color: #000000; opacity: 0; transparent: true; shader: flat')
  chorusRoom.appendChild(shadow)
  return shadow
}

// Activates the video on a page by replacing the photo plane entirely
// (setAttribute alone doesn't reliably reinitialize the material in A-Frame)
function fadeInVideo(photo, index, duration) {
  // Set video src at opacity 0 first — keeps black background visible,
  // no white flash from default material color
  photo.setAttribute('material', `src: #chorusVideo${index}; shader: flat; side: double; transparent: true; opacity: 0; color: #000000`)
  // Wait two frames for the material to initialize before fading in
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const t0 = performance.now()
    ;(function tick() {
      const t = Math.min((performance.now() - t0) / duration, 1)
      photo.setAttribute('material', `src: #chorusVideo${index}; shader: flat; side: double; transparent: ${t < 1}; opacity: ${t.toFixed(3)}; color: #ffffff`)
      if (t < 1) requestAnimationFrame(tick)
    })()
  }))
}

export function activatePageVideo(index) {
  const vid = document.getElementById(`chorusVideo${index}`)
  if (!vid) { console.warn(`chorusVideo${index} not found`); return }

  vid.muted = true
  vid.play().catch(e => console.warn(`video${index} play failed`, e))

  // Use direct reference stored during buildPage — no getElementById needed
  const photo = photoPlanes[index]
  if (!photo) { console.warn(`photoPlanes[${index}] not found`); return }

  console.log(`[chorus] activating video ${index} on`, photo)
  // Set to black first to avoid white flash, then fade in via RAF
  photo.setAttribute('material', 'color: #000000; shader: flat; side: double')
  requestAnimationFrame(() => fadeInVideo(photo, index, 1200))
}

async function dropPage(index) {
  const spot = LANDING_SPOTS[index]
  dbg(`dropPage(${index}) start`)

  const page = buildPage(index, spot, false)
  await wait(100)
  page.setAttribute('visible', 'true')
  const landY = 0.01 + index * 0.003
  page.setAttribute('animation__fall', {
    property: 'position',
    from:     `${spot.x} 5.5 ${spot.z}`,
    to:       `${spot.x} ${landY} ${spot.z}`,
    dur:      2500,
    easing:   'easeInQuad'
  })
  page.setAttribute('animation__spin', {
    property: 'rotation',
    from:     `${-50 + Math.random()*20} ${spot.ry+20} ${(Math.random()-0.5)*25}`,
    to:       `-90 ${spot.ry} 0`,
    dur:      2500,
    easing:   'easeOutCubic'
  })
  await wait(2500)
  dbg(`dropPage(${index}) landed`)
  activatePageVideo(index)
  // Swap placeholder to video once landed exist:
  // activatePageVideo(index)
}

function cleanupPreChorusDebris() {
  const strayIds = [
    'tearBook', 'tearBookFront', 'tearBookPages', 'tearPage',
    'bookStack0', 'bookStack1', 'bookStack2',
  ]
  strayIds.forEach(id => {
    const el = document.getElementById(id)
    if (el) { el.parentNode.removeChild(el); dbg(`removed debris: ${id}`) }
  })
}

// ── Physics flutter fall ──────────────────────────────────────────────────────
function flutterFall(pageObj, shadowEl, spot, durationMs) {
  return new Promise(resolve => {
    const startY    = 3.5
    const endY      = 0.01  // page0 is always index 0, no offset needed
    const totalDist = startY - endY
    const wobbleFreq = 2.8
    const wobbleAmpZ = 18
    const wobbleAmpX = 12
    const driftX     = 0.18
    const driftZ     = 0.12
    const baseRyRad  = spot.ry * Math.PI / 180
    const t0 = performance.now()

    ;(function tick() {
      const elapsed = performance.now() - t0
      const rawT    = Math.min(elapsed / durationMs, 1)

      let fallT
      if (rawT < 0.7) {
        fallT = (rawT / 0.7) * (rawT / 0.7) * 0.6
      } else {
        const sub = (rawT - 0.7) / 0.3
        fallT = 0.6 + sub * sub * 0.4
      }
      const currentY = startY - totalDist * fallT
      const currentX = spot.x + Math.sin(rawT * Math.PI) * driftX
      const currentZ = spot.z + Math.sin(rawT * Math.PI * 0.7) * driftZ

      const decayFactor = 1 - Math.pow(rawT, 2.5)
      const timeSeconds = elapsed / 1000
      const wobZ = Math.sin(timeSeconds * wobbleFreq * Math.PI * 2) * wobbleAmpZ * decayFactor
      const wobX = Math.cos(timeSeconds * wobbleFreq * Math.PI * 2 + 1.2) * wobbleAmpX * decayFactor

      const restX     = -90
      const currentRx = wobX * (1 - rawT) + restX * rawT
      const currentRz = wobZ * (1 - rawT)

      pageObj.position.set(currentX, currentY, currentZ)
      pageObj.rotation.set(
        currentRx * Math.PI / 180,
        baseRyRad + currentRz * 0.01,
        currentRz * Math.PI / 180
      )

      if (shadowEl) {
        const heightRatio   = currentY / startY
        const shadowOpacity = (1 - heightRatio) * 0.55
        const shadowScale   = 0.4 + (1 - heightRatio) * 0.8
        shadowEl.object3D.position.set(currentX, 0.005, currentZ)
        shadowEl.object3D.scale.set(shadowScale, shadowScale, 1)
        shadowEl.setAttribute('material',
          `color: #000000; opacity: ${shadowOpacity.toFixed(3)}; transparent: true; shader: flat`)
      }

      if (rawT < 1) {
        requestAnimationFrame(tick)
      } else {
        pageObj.position.set(spot.x, 0.01, spot.z)  // page0 always index 0
        pageObj.rotation.set(-Math.PI / 2, baseRyRad, 0)
        if (shadowEl) {
          shadowEl.object3D.position.set(spot.x, 0.005, spot.z)
          shadowEl.object3D.scale.set(1.2, 1.2, 1)
          shadowEl.setAttribute('material',
            `color: #000000; opacity: 0.45; transparent: true; shader: flat`)
        }
        resolve()
      }
    })()
  })
}
// ─────────────────────────────────────────────────────────────────────────────

export function buildChorusRoom() {
  if (document.getElementById('chorusRoom')) return

  const scene = document.querySelector('a-scene')
  const room  = document.createElement('a-entity')
  room.setAttribute('id', 'chorusRoom')
  room.setAttribute('visible', 'false')

  // Floor — bright so we can see it during debug
  const floor = document.createElement('a-plane')
  floor.setAttribute('position', '0 0 0')
  floor.setAttribute('rotation', '-90 0 0')
  floor.setAttribute('width',  '20')
  floor.setAttribute('height', '20')
  floor.setAttribute('material', 'color: #0a0a0a; roughness: 1')
  room.appendChild(floor)

  // Walls
  ;[
    { pos: '0 3 -10', rot: '0 0 0'   },
    { pos: '-10 3 0', rot: '0 90 0'  },
    { pos: '10 3 0',  rot: '0 -90 0' },
  ].forEach(w => {
    const wall = document.createElement('a-plane')
    wall.setAttribute('position', w.pos)
    wall.setAttribute('rotation', w.rot)
    wall.setAttribute('width',  '20')
    wall.setAttribute('height', '6')
    wall.setAttribute('material', 'color: #111111; roughness: 1')
    room.appendChild(wall)
  })

  // Spotlight directly above SPOT0
  const spotLight = document.createElement('a-light')
  spotLight.setAttribute('type', 'spot')
  spotLight.setAttribute('position', `${SPOT0.x} 6 ${SPOT0.z}`)
  spotLight.setAttribute('rotation', '-90 0 0')
  spotLight.setAttribute('intensity', '6')
  spotLight.setAttribute('color', '#fff5e0')
  spotLight.setAttribute('angle', '30')
  spotLight.setAttribute('penumbra', '0.4')
  spotLight.setAttribute('distance', '10')
  room.appendChild(spotLight)

  // Bright ambient for debug visibility
  const ambient = document.createElement('a-light')
  ambient.setAttribute('type', 'ambient')
  ambient.setAttribute('intensity', '0.35')
  room.appendChild(ambient)

  scene.appendChild(room)

  // Preload all video assets now so they're ready when pages land
  for (let i = 0; i < 3; i++) buildVideoAsset(i)

  dbg('buildChorusRoom() done')
}

export async function startChorusSequence() {
  dbg('startChorusSequence() called')
  buildChorusRoom()
  await wait(50)

  cleanupPreChorusDebris()

  const chorusRoom = document.getElementById('chorusRoom')
  chorusRoom.setAttribute('visible', 'true')

  const { cameraRig } = getElements()
  const cam = document.getElementById('camera')

  // Disable look-controls FIRST, then reset yaw so the reset sticks
  if (cam) cam.setAttribute('look-controls', 'enabled: false')

  ;['animation__swing1','animation__swing2','animation__follow1','animation__follow2',
    'animation__move','animation__rotate','animation__tiltfollow','animation__driftforward',
    'animation__craneup','animation__cranerot'
  ].forEach(a => cameraRig.removeAttribute(a))
  if (cam) { cam.removeAttribute('animation__zoom'); cam.removeAttribute('animation__cranefov') }

  const rigObj = cameraRig.object3D
  const toRad  = d => d * Math.PI / 180

  // Reset yaw after disabling look-controls so it can't re-apply the stored value
  try {
    const rlc = cam && cam.components['resettable-look-controls']
    if (rlc) {
      rlc.resetYaw(Math.PI)
      // Also zero out the pitch object directly
      if (rlc.lc) {
        rlc.lc.yawObject.rotation.y = Math.PI
        rlc.lc.pitchObject.rotation.x = 0
      }
    }
  } catch(e) { console.warn('yaw reset failed', e) }

  rigObj.position.set(CAM_WATCH.x, CAM_WATCH.y, CAM_WATCH.z)
  rigObj.rotation.set(toRad(CAM_WATCH_ROT.x), toRad(CAM_WATCH_ROT.y), 0)
  if (cam && cam.components.camera) {
    cam.components.camera.camera.fov = 55
    cam.components.camera.camera.updateProjectionMatrix()
  }
  dbg(`camera at watch pos: ${CAM_WATCH.x} ${CAM_WATCH.y} ${CAM_WATCH.z}, rot: ${CAM_WATCH_ROT.x} ${CAM_WATCH_ROT.y}`)

  await wait(50)

  // ── Spawn page0 directly in the camera's field of view ───────────
  const page0    = buildPage(0, SPOT0, false)
  const shadowEl = buildShadow(SPOT0)
  const pageObj  = page0.object3D

  // Page starts at y:5.5 directly above SPOT0 — camera is looking right at it
  pageObj.position.set(SPOT0.x, 3.5, SPOT0.z)
  pageObj.rotation.set(toRad(-15), toRad(SPOT0.ry), toRad(8))
  page0.setAttribute('visible', 'true')
  dbg(`page0 spawned at ${SPOT0.x} 3.5 ${SPOT0.z}, camera watching from ${CAM_WATCH.x} ${CAM_WATCH.y} ${CAM_WATCH.z}`)

  // ── Phase 1: Camera holds at watch position, page flutters down ──
  const fallDur = 3200
  await flutterFall(pageObj, shadowEl, SPOT0, fallDur)
  dbg('page0 landed')

  activatePageVideo(0)

  // ── Phase 2: Crane straight to bird's-eye ───────────────────────
  const craneStartPos = rigObj.position.clone()
  const craneStartRot = { x: rigObj.rotation.x, y: rigObj.rotation.y, z: rigObj.rotation.z }
  const craneDur = 2200
  const craneT0  = performance.now()
  const endPos   = { x: SPOT0.x, y: 3.5, z: SPOT0.z + 1.8 }
  const endRot   = { x: toRad(-90), y: 0, z: 0 }

  await new Promise(resolve => {
    ;(function craneTick() {
      const t = Math.min((performance.now() - craneT0) / craneDur, 1)
      const e = easeInOutQuad(t)
      rigObj.position.set(
        craneStartPos.x + (endPos.x - craneStartPos.x) * e,
        craneStartPos.y + (endPos.y - craneStartPos.y) * e,
        craneStartPos.z + (endPos.z - craneStartPos.z) * e
      )
      rigObj.rotation.set(
        craneStartRot.x + (endRot.x - craneStartRot.x) * e,
        craneStartRot.y + (endRot.y - craneStartRot.y) * e,
        0
      )
      const fov = 55 + (42 - 55) * e
      if (cam && cam.components.camera) {
        cam.components.camera.camera.fov = fov
        cam.components.camera.camera.updateProjectionMatrix()
      }
      if (t < 1) requestAnimationFrame(craneTick)
      else resolve()
    })()
  })

  dbg('crane complete — bird\'s-eye hold')

  if (cam) {
    cam.setAttribute('fov', '42')
    cam.setAttribute('look-controls', 'enabled: true')
  }

  // ── Remaining pages fall in under bird's-eye ──────────────────────
  for (let i = 1; i < 3; i++) {
    wait(LAND_DELAYS[i] - LAND_DELAYS[1]).then(() => dropPage(i))
  }
}