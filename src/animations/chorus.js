// src/animations/chorus.js
import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

const PAGE_VIDEOS = [
  '/videos/page1.mp4',
  '/videos/page2.mp4',
  '/videos/page3.mp4',
  '/videos/page4.mp4',
]

const LAND_DELAYS = [0, 8000, 18000, 28000]

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

  const page = document.createElement('a-plane')
  page.setAttribute('id', `chorusPage${index}`)
  page.setAttribute('width',  '0.7')
  page.setAttribute('height', '0.95')
  page.setAttribute('side', 'double')
  // Debug: bright red so it's impossible to miss
  page.setAttribute('material', `color: #ff2222; roughness: 0.3; emissive: #ff0000; emissiveIntensity: 0.8`)

  if (startOnFloor) {
    page.setAttribute('position', `${spot.x} 0.01 ${spot.z}`)
    page.setAttribute('rotation', `-90 ${spot.ry} 0`)
    page.setAttribute('visible', 'true')
  } else {
    page.setAttribute('position', `${spot.x} 5.5 ${spot.z}`)
    page.setAttribute('rotation', `-15 ${spot.ry} 8`)
    page.setAttribute('visible', 'false')
  }

  chorusRoom.appendChild(page)
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

async function dropPage(index) {
  const spot = LANDING_SPOTS[index]
  dbg(`dropPage(${index}) start`)
  const page = buildPage(index, spot, false)
  await wait(100)
  page.setAttribute('visible', 'true')
  page.setAttribute('animation__fall', {
    property: 'position',
    from:     `${spot.x} 5.5 ${spot.z}`,
    to:       `${spot.x} 0.01 ${spot.z}`,
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
  const vid = document.getElementById(`chorusVideo${index}`)
  if (vid) vid.play().catch(() => {})
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
    const endY      = 0.01
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
        pageObj.position.set(spot.x, endY, spot.z)
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
  floor.setAttribute('material', 'color: #1a1a2e; roughness: 1')
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
    wall.setAttribute('material', 'color: #16213e; roughness: 1')
    room.appendChild(wall)
  })

  // Spotlight directly above SPOT0
  const spotLight = document.createElement('a-light')
  spotLight.setAttribute('type', 'spot')
  spotLight.setAttribute('position', `${SPOT0.x} 6 ${SPOT0.z}`)
  spotLight.setAttribute('rotation', '-90 0 0')
  spotLight.setAttribute('intensity', '8')
  spotLight.setAttribute('color', '#fff5e0')
  spotLight.setAttribute('angle', '30')
  spotLight.setAttribute('penumbra', '0.4')
  spotLight.setAttribute('distance', '10')
  room.appendChild(spotLight)

  // Bright ambient for debug visibility
  const ambient = document.createElement('a-light')
  ambient.setAttribute('type', 'ambient')
  ambient.setAttribute('intensity', '1.2')
  room.appendChild(ambient)

  scene.appendChild(room)
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

  if (cam) cam.setAttribute('look-controls', 'enabled: false')

  ;['animation__swing1','animation__swing2','animation__follow1','animation__follow2',
    'animation__move','animation__rotate','animation__tiltfollow','animation__driftforward',
    'animation__craneup','animation__cranerot'
  ].forEach(a => cameraRig.removeAttribute(a))
  if (cam) { cam.removeAttribute('animation__zoom'); cam.removeAttribute('animation__cranefov') }

  const rigObj = cameraRig.object3D
  const toRad  = d => d * Math.PI / 180

  // Snap camera to CAM_WATCH — directly looking at SPOT0
  // This is also done in transitionToChorus while black, but we do it
  // here too as a safety net in case timing varies
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

  const vid0 = document.getElementById('chorusVideo0')
  if (vid0) vid0.play().catch(() => {})

  // ── Phase 2: Re-center on landed page (800ms) ───────────────────
  // Camera moves to (0, 1.8, 0.6) tilted -71.6° — mathematically
  // points exactly at origin so the landed page is dead center.
  const recenterStartPos = rigObj.position.clone()
  const recenterStartRot = { x: rigObj.rotation.x, y: rigObj.rotation.y, z: rigObj.rotation.z }
  const recenterEndPos   = { x: SPOT0.x, y: 2.0, z: SPOT0.z + 1.8 }
  const recenterEndRot   = { x: toRad(-38.7), y: 0, z: 0 }
  const recenterT0       = performance.now()

  await new Promise(resolve => {
    ;(function recenterTick() {
      const t = Math.min((performance.now() - recenterT0) / 800, 1)
      const e = easeInOutQuad(t)
      rigObj.position.set(
        recenterStartPos.x + (recenterEndPos.x - recenterStartPos.x) * e,
        recenterStartPos.y + (recenterEndPos.y - recenterStartPos.y) * e,
        recenterStartPos.z + (recenterEndPos.z - recenterStartPos.z) * e
      )
      rigObj.rotation.set(
        recenterStartRot.x + (recenterEndRot.x - recenterStartRot.x) * e,
        recenterStartRot.y + (recenterEndRot.y - recenterStartRot.y) * e,
        0
      )
      const fov = 55 + (48 - 55) * e
      if (cam && cam.components.camera) {
        cam.components.camera.camera.fov = fov
        cam.components.camera.camera.updateProjectionMatrix()
      }
      if (t < 1) requestAnimationFrame(recenterTick)
      else resolve()
    })()
  })
  dbg('re-centered on landed page')

  // ── Phase 3: Crane to bird's-eye ─────────────────────────────────
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
      const fov = 48 + (42 - 48) * e
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
  for (let i = 1; i < 4; i++) {
    wait(LAND_DELAYS[i] - LAND_DELAYS[1]).then(() => dropPage(i))
  }
}