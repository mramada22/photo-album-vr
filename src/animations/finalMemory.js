// src/animations/finalMemory.js
// Final Memory: 186s (3:06) → 209s (3:29)
//
// Timeline:
// 186s      — black screen, video and joy audio begin loading
// 186-188s  — fade in from black, video plane appears floating in space
// 188-207s  — camera slowly pushes toward the video, joy audio rises
// 207-209s  — fade to black, audio fades out
// 209s      — scene complete

import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

const VIDEO_SRC = '/videos/finalvideo.mp4'
const JOY_SRC   = '/audio/joy.mp3'

// Camera constants — floating in dark space
const CAM_START_Z  =  8.0   // start pulled back
const CAM_END_Z    =  0.8   // close to video but not through it
const CAM_Y        = -0.8   // centered on video plane
const PUSH_DUR     =  19000  // ms — 188s → 207s

// Video plane sits at z:0, camera pushes toward it along Z
const VIDEO_Z = 0.0
const VIDEO_W = 4.0
const VIDEO_H = 2.25  // 16:9 ratio

function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
function easeOutCubic(t)  { return 1 - Math.pow(1-t, 3) }

// ── Vignette shader material ──────────────────────────────────────────────────
// Soft oval vignette that fades edges to transparent — memory/dream effect
function createVignetteMaterial(videoEl) {
  const tex = new THREE.VideoTexture(videoEl)
  tex.colorSpace = THREE.SRGBColorSpace

  return new THREE.ShaderMaterial({
    uniforms: {
      map:       { value: tex },
      opacity:   { value: 0.0 },
      softness:  { value: 0.35 },  // how soft the edge falloff is (0=hard, 1=very soft)
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float softness;
      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(map, vUv);

        // Oval vignette — distance from center in UV space
        vec2 center = vUv - 0.5;
        // Stretch horizontally to make oval (matches 16:9 aspect)
        center.x *= 0.7;
        float dist = length(center) * 2.0;

        // Smooth falloff from center (1.0) to edge (0.0)
        float edge = 1.0 - smoothstep(1.0 - softness, 1.0, dist);

        gl_FragColor = vec4(color.rgb, color.a * edge * opacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

// ── Build final memory room ───────────────────────────────────────────────────
export function buildFinalMemoryRoom() {
  if (document.getElementById('finalMemoryRoom')) return

  const scene  = document.querySelector('a-scene')
  const assets = document.querySelector('a-assets')

  const room = document.createElement('a-entity')
  room.setAttribute('id', 'finalMemoryRoom')
  room.setAttribute('visible', 'false')

  // Pure black background — no floor, no walls, just space
  const ambient = document.createElement('a-light')
  ambient.setAttribute('type', 'ambient')
  ambient.setAttribute('color', '#ffffff')
  ambient.setAttribute('intensity', '1')
  room.appendChild(ambient)

  scene.appendChild(room)
  console.log('[finalMemory] buildFinalMemoryRoom done')
}

// ── Main sequence ─────────────────────────────────────────────────────────────
export async function startFinalMemorySequence() {
  console.log('[finalMemory] startFinalMemorySequence called')

  buildFinalMemoryRoom()
  await wait(50)

  const room = document.getElementById('finalMemoryRoom')
  const { fadeOverlay, cameraRig } = getElements()
  const cam    = document.getElementById('camera')
  const rigObj = cameraRig.object3D
  const scene3D = document.querySelector('a-scene').object3D

  if (cam) cam.setAttribute('look-controls', 'enabled: true')

  // Snap camera — looking straight ahead toward -Z where video will be
  rigObj.position.set(0, CAM_Y, CAM_START_Z)
  rigObj.rotation.set(0, 0, 0)  // face toward -Z where video plane sits at z:0
  if (cam && cam.components.camera) {
    cam.components.camera.camera.fov = 60
    cam.components.camera.camera.updateProjectionMatrix()
  }

  // Hide previous room
  const prevRoom = document.getElementById('hallwayRoom')
  if (prevRoom) prevRoom.setAttribute('visible', 'false')

  // Clean up any leftover meshes
  const toRemove = []
  scene3D.traverse(obj => {
    if (obj.isMesh && obj.parent === scene3D) toRemove.push(obj)
  })
  toRemove.forEach(obj => scene3D.remove(obj))

  // Set sky pure black
  document.getElementById('sky').setAttribute('color', '#000000')

  room.setAttribute('visible', 'true')

  // ── Joy audio setup ───────────────────────────────────────────────
  const joyAudio = new Audio(JOY_SRC)
  joyAudio.volume = 0
  joyAudio.loop   = false

  // ── Build video plane with vignette shader ────────────────────────
  // Create video element directly — bypasses A-Frame asset system timing issues
  let videoEl = document.getElementById('finalVideo')
  if (!videoEl) {
    videoEl = document.createElement('video')
    videoEl.id = 'finalVideo'
    videoEl.src = VIDEO_SRC
    videoEl.preload = 'auto'
    videoEl.loop = false
    videoEl.crossOrigin = 'anonymous'
    videoEl.muted = true
    videoEl.playsInline = true
    document.body.appendChild(videoEl)
  }
  const vigMat = createVignetteMaterial(videoEl)

  const videoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(VIDEO_W, VIDEO_H),
    vigMat
  )
  videoPlane.position.set(0, -0.3, VIDEO_Z)
  videoPlane.rotation.y = 0  // face toward +Z where camera starts
  scene3D.add(videoPlane)

  // Start video playing
  try {
    videoEl.currentTime = 0
    await videoEl.play()
  } catch(e) { console.warn('[finalMemory] video play failed:', e) }

  // Start joy audio quietly
  try {
    await joyAudio.play()
  } catch(e) { console.warn('[finalMemory] joy audio play failed:', e) }

  // Wait a few frames for scene to settle
  await new Promise(resolve => {
    let f = 0; const tick = () => ++f >= 8 ? resolve() : requestAnimationFrame(tick)
    requestAnimationFrame(tick)
  })

  // ── Fade in — 2s ─────────────────────────────────────────────────
  fadeOverlay.classList.add('visible')
  fadeOverlay.style.opacity = '1'
  const fadeInT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - fadeInT0) / 2000, 1)
      vigMat.uniforms.opacity.value = easeOutCubic(t)
      fadeOverlay.style.opacity = (1 - t).toFixed(3)
      if (t >= 1) {
        fadeOverlay.style.opacity = '0'
        fadeOverlay.classList.remove('visible')
        resolve()
      }
      else requestAnimationFrame(tick)
    })()
  })

  // ── Push toward video + audio rises ──────────────────────────────
  const pushT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - pushT0) / PUSH_DUR, 1)
      const e = easeInOutQuad(t)

      // Camera pushes forward (Z decreases toward VIDEO_Z)
      rigObj.position.z = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * e

      // Force video texture to update each frame
      vigMat.uniforms.map.value.needsUpdate = true

      // Joy audio rises from 0 → 0.8 as camera approaches
      joyAudio.volume = Math.min(0.8, e * 0.8)

      // Video softness decreases slightly as you get closer — edges sharpen
      vigMat.uniforms.softness.value = 0.35 - e * 0.1

      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  // ── Fade to black + audio out ─────────────────────────────────────
  fadeOverlay.classList.add('visible')
  const fadeOutT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - fadeOutT0) / 2000, 1)
      fadeOverlay.style.opacity = t.toFixed(3)
      vigMat.uniforms.opacity.value = 1 - t
      joyAudio.volume = Math.max(0, 0.8 * (1 - t))
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  videoEl.pause()
  joyAudio.pause()

  console.log('[finalMemory] sequence complete')
  if (cam) cam.setAttribute('look-controls', 'enabled: true')
}