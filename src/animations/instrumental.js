// src/animations/instrumental.js
// 82s → 99s (17 seconds):
// Camera zooms out continuously, pages 1+2 fade mid-way,
// page 0 (new video) fades last, then fade to black for verse 2

import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
function easeInQuad(t)    { return t * t }

const TOTAL_DUR   = 15000  // 82s → 97s (fade 2s earlier)
const VERSE2_TIME = 99     // song timestamp when verse 2 starts

export async function startInstrumentalTransition() {
  console.log('[instrumental] startInstrumentalTransition called')

  const { fadeOverlay, cameraRig } = getElements()
  const cam        = document.getElementById('camera')
  const rigObj     = cameraRig.object3D
  const chorusRoom = document.getElementById('chorusRoom')
  if (!chorusRoom) { console.warn('[instrumental] chorusRoom not found'); return }

  const spotLight = chorusRoom.querySelector('a-light[type="spot"]')
  const ambient   = chorusRoom.querySelector('a-light[type="ambient"]')

  // Snapshot camera start state
  const camStartPos = rigObj.position.clone()
  const camStartFov = cam && cam.components.camera
    ? cam.components.camera.camera.fov : 42

  // Camera ends very high and wide — verse 2 will fade in from black
  const camEndY   = 14
  const camEndFov = 28  // narrower FOV from high up keeps pages visible longer

  // ── Helper: fade a single page's child planes out ────────────────
  function fadePage(pageIdx, duration) {
    return new Promise(resolve => {
      const page = document.getElementById(`chorusPage${pageIdx}`)
      if (!page) { resolve(); return }

      // Use Three.js material opacity directly — getAttribute returns an object not a string
      const materials = []
      page.object3D.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.transparent = true
          materials.push(child.material)
        }
      })
      if (!materials.length) { page.setAttribute('visible', 'false'); resolve(); return }

      const t0 = performance.now()
      ;(function tick() {
        const t = Math.min((performance.now() - t0) / duration, 1)
        const opacity = 1 - easeInQuad(t)
        materials.forEach(mat => { mat.opacity = opacity; mat.needsUpdate = true })
        if (t < 1) requestAnimationFrame(tick)
        else { page.setAttribute('visible', 'false'); resolve() }
      })()
    })
  }

  // ── Single RAF loop drives camera zoom for full 17s ──────────────
  const t0 = performance.now()

  // Pages 1 & 2 start fading at 35% through (≈6s in, around 88s)
  // and finish fading at 65% (≈11s in, around 93s)
  // Page 0 starts fading at 75% (≈12.75s in, ~94.75s)
  // and finishes at 94% (≈16s in, right before fade to black)
  let page1FadeStarted = false
  let page2FadeStarted = false
  let page0FadeStarted = false

  await new Promise(resolve => {
    ;(function tick() {
      const elapsed = performance.now() - t0
      const rawT    = Math.min(elapsed / TOTAL_DUR, 1)
      const e       = easeInOutQuad(rawT)

      // Camera rises continuously from start pos to camEndY
      rigObj.position.set(
        camStartPos.x,
        camStartPos.y + (camEndY - camStartPos.y) * e,
        camStartPos.z
      )

      // FOV tightens as camera rises (zoomed out but more telephoto feel)
      if (cam && cam.components.camera) {
        const fov = camStartFov + (camEndFov - camStartFov) * e
        cam.components.camera.camera.fov = fov
        cam.components.camera.camera.updateProjectionMatrix()
      }

      // Spotlight dims gradually over full duration
      if (spotLight) {
        const intensity = 6 * (1 - e)
        spotLight.setAttribute('intensity', intensity.toFixed(3))
      }
      if (ambient) {
        const intensity = Math.max(0.35 * (1 - e * 0.85), 0.05).toFixed(3)
        ambient.setAttribute('intensity', intensity)
      }

      // Trigger page fades at the right moments
      if (!page1FadeStarted && rawT >= 0.35) {
        page1FadeStarted = true
        fadePage(1, 3000)
      }
      if (!page2FadeStarted && rawT >= 0.45) {
        page2FadeStarted = true
        fadePage(2, 3000)
      }
      if (!page0FadeStarted && rawT >= 0.75) {
        page0FadeStarted = true
        fadePage(0, 3500)  // longer fade for page 0 — last to go
      }

      if (rawT < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  // Don't fade to black here — verse2.js handles its own entry
  console.log('[instrumental] complete — verse 2 will handle transition')
}