// src/animations/bookTear.js
import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

export function createBook() {
  if (document.getElementById('tearBook')) return
  const scene = document.querySelector('a-scene')

  const bx = 3.27, by = 1.6, bz = -3.2, brx = 35

  // Back cover
  const back = document.createElement('a-box')
  back.setAttribute('id', 'tearBook')
  back.setAttribute('position', `${bx} ${by} ${bz}`)
  back.setAttribute('rotation', `${brx} 0 0`)
  back.setAttribute('scale', '1.8 1.8 1.8')
  back.setAttribute('width', '0.18')
  back.setAttribute('height', '0.24')
  back.setAttribute('depth', '0.025')
  back.setAttribute('material', 'color: #2a1a08; shader: flat')
  back.setAttribute('visible', 'false')
  scene.appendChild(back)

  // Pages block — a single cream-colored box representing the page stack
  const pagesBlock = document.createElement('a-box')
  pagesBlock.setAttribute('id', 'bookStack0')
  pagesBlock.setAttribute('position', `${bx} ${by} ${bz + 0.02}`)
  pagesBlock.setAttribute('rotation', `${brx} 0 0`)
  pagesBlock.setAttribute('scale', '1.8 1.8 1.8')
  pagesBlock.setAttribute('width', '0.155')
  pagesBlock.setAttribute('height', '0.215')
  pagesBlock.setAttribute('depth', '0.03')
  pagesBlock.setAttribute('material', 'color: #e8d5a3; shader: flat')
  pagesBlock.setAttribute('visible', 'false')
  scene.appendChild(pagesBlock)

  // Front cover — rendered last so it draws on top
  const front = document.createElement('a-box')
  front.setAttribute('id', 'tearBookFront')
  front.setAttribute('position', `${bx} ${by} ${bz + 0.05}`)
  front.setAttribute('rotation', `${brx} 0 0`)
  front.setAttribute('scale', '1.8 1.8 1.8')
  front.setAttribute('width', '0.18')
  front.setAttribute('height', '0.24')
  front.setAttribute('depth', '0.008')
  front.setAttribute('material', 'color: #3a2a10; shader: flat')
  front.setAttribute('visible', 'false')
  scene.appendChild(front)

  // Tear page — hidden until cover is fully open
  const tearPage = document.createElement('a-entity')
  tearPage.setAttribute('id', 'tearPage')
  tearPage.setAttribute('position', `${bx} ${by} ${bz + 0.043}`)
  tearPage.setAttribute('rotation', `${brx} 0 0`)
  tearPage.setAttribute('scale', '1.8 1.8 1.8')
  tearPage.setAttribute('visible', 'false')

  const pageBg = document.createElement('a-plane')
  pageBg.setAttribute('width', '0.15')
  pageBg.setAttribute('height', '0.21')
  pageBg.setAttribute('material', 'color: #f5e6c0; shader: flat; side: double')
  tearPage.appendChild(pageBg)

  // ── SWAP VIDEO HERE ──────────────────────────────────────────────
  const videoPlane = document.createElement('a-plane')
  videoPlane.setAttribute('id', 'tearPageVideoPlane')
  videoPlane.setAttribute('position', '0 0 0.002')
  videoPlane.setAttribute('width', '0.124')
  videoPlane.setAttribute('height', '0.184')
  videoPlane.setAttribute('material', 'color: #8a7050; shader: flat')
  // To use video: videoPlane.setAttribute('material', 'src: #yourVideoId; shader: flat')
  // ── END SWAP ZONE ────────────────────────────────────────────────
  tearPage.appendChild(videoPlane)
  scene.appendChild(tearPage)
}

export async function startBookSequence() {
  createBook()
  await wait(100)

  const back      = document.getElementById('tearBook')
  const front     = document.getElementById('tearBookFront')
  const tearPage  = document.getElementById('tearPage')
  const stackPages = [document.getElementById('bookStack0')].filter(Boolean)
  const { cameraRig, fadeOverlay } = getElements()
  const cam = document.getElementById('camera')

  ;['animation__swing1','animation__swing2','animation__follow1',
    'animation__follow2'].forEach(a => cameraRig.removeAttribute(a))
  cam.removeAttribute('animation__zoom')

  // Show back and front cover, float them up into view
  ;[back, front].forEach(el => {
    el.setAttribute('visible', 'true')
    const posAttr = el.getAttribute('position')
    const px = typeof posAttr === 'string' ? posAttr : `${posAttr.x} ${posAttr.y} ${posAttr.z}`
    const parts = px.split(' ')
    const startY = parseFloat(parts[1]) - 0.4
    el.setAttribute('animation__floatup', {
      property: 'position',
      from: `${parts[0]} ${startY} ${parts[2]}`,
      to:   px,
      dur:  800,
      easing: 'easeOutQuad'
    })
  })

  // Camera arc swings around to face the book
  cameraRig.setAttribute('animation__swing1', {
    property: 'position',
    to:   '3.27 1.8 -6.0',
    dur:  2500,
    easing: 'easeInOutQuad'
  })
  cameraRig.setAttribute('animation__swing2', {
    property: 'rotation',
    to:   '-40 180 0',
    dur:  2500,
    easing: 'easeInOutQuad'
  })

  await wait(1200)
  try {
    const rlc = cam.components['resettable-look-controls']
    if (rlc) rlc.resetYaw(Math.PI)
  } catch(e) { console.warn('look-controls reset failed', e) }

  await wait(1300)
  cameraRig.removeAttribute('animation__swing1')
  cameraRig.removeAttribute('animation__swing2')

  // Reveal page stack now that front cover is about to swing open
  stackPages.forEach(el => el.setAttribute('visible', 'true'))

  // FOV zoom in
  cam.setAttribute('animation__zoom', {
    property: 'fov',
    to:   '35',
    dur:  1000,
    easing: 'easeInOutQuad'
  })

  // Cover opens — animate Y rotation ~170deg via Three.js RAF
  const frontObj = front.object3D
  const scene3D  = front.sceneEl.object3D
  const pivot3D  = new THREE.Object3D()
  const frontWP  = new THREE.Vector3()
  frontObj.getWorldPosition(frontWP)
  // Spine at left edge: world X minus half world width (0.18 * 1.8 / 2 = 0.162)
  pivot3D.position.set(frontWP.x - 0.162, frontWP.y, frontWP.z)
  scene3D.add(pivot3D)
  pivot3D.add(frontObj)
  frontObj.position.set(0.162, 0, 0)
  frontObj.rotation.set(0, 0, 0)

  const t0 = performance.now()
  const dur = 1000
  ;(function animateCover() {
    const t = Math.min((performance.now() - t0) / dur, 1)
    const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t
    pivot3D.rotation.y = -Math.PI * 0.94 * e
    if (t < 1) requestAnimationFrame(animateCover)
  })()

  // Wait for cover to fully open, then immediately start the rip —
  // tearPage becomes visible and begins moving in the same frame
  // so it never sits idle and "pops" into view.
  await wait(950)
  tearPage.setAttribute('visible', 'true')

  // Page rips free immediately — no gap between visible and motion
  tearPage.setAttribute('animation__rip', {
    property: 'position',
    to:   '3.5 2.0 -2.6',
    dur:  400,
    easing: 'easeOutCubic'
  })
  tearPage.setAttribute('animation__tilt', {
    property: 'rotation',
    to:   '20 -30 15',
    dur:  400,
    easing: 'easeOutCubic'
  })

  await wait(400)

  // Page drifts down, camera follows
  tearPage.setAttribute('animation__drift', {
    property: 'position',
    to:   '3.3 0.05 -3.0',
    dur:  3600,
    easing: 'easeInQuad'
  })
  tearPage.setAttribute('animation__driftrot', {
    property: 'rotation',
    to:   '-85 -10 5',
    dur:  3600,
    easing: 'easeInOutSine'
  })

  cameraRig.setAttribute('animation__follow1', {
    property: 'position',
    to: '3.27 0.6 -5.5',
    dur:  3600,
    easing: 'easeInOutQuad'
  })
  cameraRig.setAttribute('animation__follow2', {
    property: 'rotation',
    to: '20 180 0',
    dur:  3600,
    easing: 'easeInOutQuad'
  })

  await wait(2000)
  fadeOverlay.classList.add('visible')
}