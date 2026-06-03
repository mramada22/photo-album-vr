// src/animations/pageFlip.js
// Page 0 lifts, rotates, swaps video, floats back down, then fades to black.

import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

const FLIP_DUR    = 8000   // 1:15 → 1:23 = 8 seconds total
const LIFT_HEIGHT = 0.35   // how high the page rises off the floor
const ROTATE_DEG  = 25     // max tilt during the "correction" rotate

function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
function easeOutCubic(t)  { return 1 - Math.pow(1-t, 3) }

export async function startPageFlipSequence() {
  console.log('[pageFlip] startPageFlipSequence called')
  const page0  = document.getElementById('chorusPage0')
  const photo0 = document.getElementById('chorusPhoto0')
  if (!page0 || !photo0) {
    console.warn('[pageFlip] page0 or photo0 not found')
    return
  }

  const { fadeOverlay } = getElements()
  const pageObj  = page0.object3D
  const toRad    = d => d * Math.PI / 180

  // Register the new video asset if not already present
  const newVidId = 'chorusVideoChanged'
  if (!document.getElementById(newVidId)) {
    const assets = document.querySelector('a-assets')
    const vid = document.createElement('video')
    vid.setAttribute('id', newVidId)
    vid.setAttribute('src', '/videos/page1_changed.mp4')
    vid.setAttribute('preload', 'auto')
    vid.setAttribute('loop', 'true')
    vid.setAttribute('crossorigin', 'anonymous')
    vid.muted = true
    assets.appendChild(vid)
  }

  // Snapshot the page's current world state so we can return to it
  const startPos = pageObj.position.clone()
  const startRot = { x: pageObj.rotation.x, y: pageObj.rotation.y, z: pageObj.rotation.z }
  console.log('[pageFlip] startPos:', startPos, 'startRot:', startRot)

  // Phase timing within the 8s window:
  // 0.0 → 0.35  lift up + tilt (2.8s)
  // 0.35 → 0.55 hold at peak, photo fades black then new video fades in (1.6s)
  // 0.55 → 1.0  float back down + straighten (3.6s)
  const t0 = performance.now()

  // ── Phase 1 & 2 & 3 all driven by a single RAF loop ──────────────
  await new Promise(resolve => {
    ;(function tick() {
      const elapsed = performance.now() - t0
      const rawT    = Math.min(elapsed / FLIP_DUR, 1)

      // ── Vertical position ────────────────────────────────────────
      let liftT
      if (rawT < 0.35) {
        // Rise up
        liftT = easeInOutQuad(rawT / 0.35)
      } else if (rawT < 0.55) {
        // Hold at peak
        liftT = 1
      } else {
        // Float back down — land higher than original so it sits on top of pages 1 & 2
        liftT = 1 - easeOutCubic((rawT - 0.55) / 0.45)
      }
      // landY: 0.022 puts page0 above page1 (0.013) and page2 (0.016)
      const landY = 0.022
      const baseY = rawT >= 0.55 
        ? landY                          // returning: aim for new higher landing spot
        : startPos.y                     // lifting: start from original position
      pageObj.position.set(
        startPos.x,
        baseY + LIFT_HEIGHT * liftT,
        startPos.z
      )

      // ── Rotation: tilts during lift, straightens on return ───────
      let rotT
      if (rawT < 0.35) {
        rotT = easeInOutQuad(rawT / 0.35)
      } else if (rawT < 0.55) {
        rotT = 1
      } else {
        rotT = 1 - easeOutCubic((rawT - 0.55) / 0.45)
      }
      // Tilt on Z axis (like someone tilting a photo to look at it)
      // and slight Y rotation for the "correction" feel
      pageObj.rotation.set(
        startRot.x,
        startRot.y + toRad(ROTATE_DEG * 0.4) * rotT,
        startRot.z + toRad(ROTATE_DEG) * rotT
      )

      if (rawT < 1) requestAnimationFrame(tick)
      else {
        // Snap back to exact start position/rotation
        pageObj.position.set(startPos.x, 0.022, startPos.z)
        pageObj.rotation.set(startRot.x, startRot.y, startRot.z)
        resolve()
      }
    })()
  })
}

// Called from main.js at 1:15 — runs the full lift/swap/land/fadeout
export async function runPageFlipAndFade() {
  console.log('[pageFlip] runPageFlipAndFade called')
  const photo0 = document.getElementById('chorusPhoto0')
  if (!photo0) { console.warn('[pageFlip] photo0 not found'); return }

  const { fadeOverlay } = getElements()

  // ── Video fade: current video → black → new video ────────────────
  // Runs in parallel with the page lift animation
  // 0–2.8s: fade current video to black (matches lift phase)
  // 2.8–4.4s: swap video, fade new one in
  // 4.4–8s: new video plays while page floats down

  const FADE_OUT_DUR = 2800
  const FADE_IN_DUR  = 1600
  const t0FadeOut    = performance.now()

  // Phase A: fade out current video to black
  const fadeOutPromise = new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - t0FadeOut) / FADE_OUT_DUR, 1)
      const opacity = 1 - t
      photo0.setAttribute('material',
        `src: #chorusVideo0; shader: flat; side: double; transparent: true; opacity: ${opacity.toFixed(3)}`)
      if (t < 1) requestAnimationFrame(tick)
      else {
        // Snap to solid black so cream background never shows through
        photo0.setAttribute('material', 'color: #000000; shader: flat; side: double')
        resolve()
      }
    })()
  })

  // Run page lift animation in parallel with fade-out
  const liftPromise = startPageFlipSequence()

  // Wait for fade-out to complete (2.8s), then swap and fade in new video
  await fadeOutPromise

  // Swap to new video — stay on black, then fade in
  const newVid = document.getElementById('chorusVideoChanged')
  if (newVid) {
    newVid.muted = true
    newVid.play().catch(() => {})
  }

  // Set new video at opacity 0 (black frame visible underneath)
  photo0.setAttribute('material',
    `src: #chorusVideoChanged; shader: flat; side: double; transparent: true; opacity: 0; color: #000000`)

  await wait(30)

  // Phase B: fade in new video over 1.6s
  const t0FadeIn = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - t0FadeIn) / FADE_IN_DUR, 1)
      photo0.setAttribute('material',
        `src: #chorusVideoChanged; shader: flat; side: double; transparent: ${t < 1}; opacity: ${t.toFixed(3)}; color: #ffffff`)
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  // Wait for lift animation to fully complete (page back on floor)
  await liftPromise

  // ── Fade to black at 1:23 ─────────────────────────────────────────
  await wait(200) // tiny beat after page settles
  fadeOverlay.classList.add('visible')
}