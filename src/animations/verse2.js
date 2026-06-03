// src/animations/verse2.js
// Verse 2: 99s (1:39) → 132s (2:12)
//
// Timeline:
// 99s       — room fades in, 3D camera model appears, VR camera orbits it
// 104s      — flash, photo appears flat on floor, VR camera cranes to bird's-eye
// 104-106s  — "cut me out" (1:44-1:46) — photo shatters into falling triangles
// 106-120s  — pieces reassemble back into original photo
// 120-131s  — 5 overlay photos assemble from fragments, staggered & overlapping
// 131-132s  — 1s hold, then fade to black → next section

import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

// Swap these paths for your actual files
const VERSE2_PHOTO   = '/images/verse2_photo.jpg'   // "new me" photo shown before shatter
const OVERLAY_PHOTOS = [
  '/images/verse2_overlay1.jpg',
  '/images/verse2_overlay2.jpg',
  '/images/verse2_overlay3.jpg',
  '/images/verse2_side_left.jpg',   // left of camera model — swap filename when ready
  '/images/verse2_side_right.jpg',  // right of camera model — swap filename when ready
]

const SHATTER_TIME  = 104  // song time when shatter fires (1:44 = 104s from 0)
const REASSEMBLE_DUR = 9000 // ms to reassemble (106s → 115s)
const VERSE2_END    = 130  // song time when verse 2 ends

// Photo plane dimensions (portrait, same ratio as chorus pages)
const PHOTO_W = 2.0
const PHOTO_H = 2.6
const GRID_X  = 8   // triangle grid columns
const GRID_Y  = 10  // triangle grid rows

function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
function easeOutCubic(t)  { return 1 - Math.pow(1-t, 3) }
function easeInQuad(t)    { return t * t }

// ── Build verse 2 room ────────────────────────────────────────────────────────
export function buildVerse2Room() {
  if (document.getElementById('verse2Room')) return

  const scene = document.querySelector('a-scene')

  // Preload assets
  const assets = document.querySelector('a-assets')

  if (!document.getElementById('verse2CameraModel')) {
    const cam = document.createElement('a-asset-item')
    cam.setAttribute('id', 'verse2CameraModel')
    cam.setAttribute('src', '/models/camera.glb')
    assets.appendChild(cam)
  }

  if (!document.getElementById('verse2PhotoAsset')) {
    const img = document.createElement('img')
    img.setAttribute('id', 'verse2PhotoAsset')
    img.setAttribute('src', VERSE2_PHOTO)
    img.setAttribute('crossorigin', 'anonymous')
    assets.appendChild(img)
  }

  // Preload all overlay + side photos
  OVERLAY_PHOTOS.forEach((src, i) => {
    const id = `verse2Overlay${i}`
    if (!document.getElementById(id)) {
      const img = document.createElement('img')
      img.setAttribute('id', id)
      img.setAttribute('src', src)
      img.setAttribute('crossorigin', 'anonymous')
      assets.appendChild(img)
    }
  })

  const room = document.createElement('a-entity')
  room.setAttribute('id', 'verse2Room')
  room.setAttribute('visible', 'false')

  // Dark floor
  const floor = document.createElement('a-plane')
  floor.setAttribute('position', '0 0 0')
  floor.setAttribute('rotation', '-90 0 0')
  floor.setAttribute('width', '30')
  floor.setAttribute('height', '30')
  floor.setAttribute('material', 'color: #050505; roughness: 1; shader: flat')
  room.appendChild(floor)

  // Dim ambient
  const ambient = document.createElement('a-light')
  ambient.setAttribute('type', 'ambient')
  ambient.setAttribute('intensity', '0.1')
  room.appendChild(ambient)

  // Spotlight on camera model
  const spot = document.createElement('a-light')
  spot.setAttribute('id', 'verse2Spot')
  spot.setAttribute('type', 'spot')
  spot.setAttribute('position', '0 5 0')
  spot.setAttribute('rotation', '-90 0 0')
  spot.setAttribute('intensity', '4')
  spot.setAttribute('color', '#fff8f0')
  spot.setAttribute('angle', '25')
  spot.setAttribute('penumbra', '0.4')
  spot.setAttribute('distance', '10')
  room.appendChild(spot)

  // 3D camera model
  const camModel = document.createElement('a-entity')
  camModel.setAttribute('id', 'verse2CameraEntity')
  camModel.setAttribute('gltf-model', '#verse2CameraModel')
  camModel.setAttribute('position', '0 0.8 0')  // raised so base sits on floor
  camModel.setAttribute('rotation', '0 180 0')  // face toward +Z where user starts
  camModel.setAttribute('scale', '3 3 3')  // adjust if model appears too big/small

  camModel.addEventListener('model-loaded', () => {
    const box = new THREE.Box3().setFromObject(camModel.object3D)
    const size = new THREE.Vector3()
    box.getSize(size)
    console.log('[verse2] camera model size:', size)
    console.log('[verse2] camera model center:', box.getCenter(new THREE.Vector3()))
  })
  room.appendChild(camModel)

  scene.appendChild(room)
  console.log('[verse2] buildVerse2Room done')
}

// ── Camera orbit around the 3D model ─────────────────────────────────────────
function orbitCamera(rigObj, centerX, centerZ, radius, startAngle, endAngle, duration) {
  return new Promise(resolve => {
    const t0     = performance.now()
    const height = rigObj.position.y  // keep exactly at starting height — floor level
    ;(function tick() {
      const t = Math.min((performance.now() - t0) / duration, 1)
      const e = easeInOutQuad(t)
      const angle = startAngle + (endAngle - startAngle) * e

      const camX = centerX + Math.sin(angle) * radius
      const camZ = centerZ + Math.cos(angle) * radius
      rigObj.position.set(camX, height, camZ)

      // Always face the center of the model — no vertical tilt, purely horizontal
      // Add Math.PI so camera faces TOWARD model (not away from it)
      const yaw = Math.atan2(centerX - camX, centerZ - camZ) + Math.PI
      rigObj.rotation.set(0, yaw, 0)

      if (t >= 1) {
        console.log('[verse2] orbit end pos:', rigObj.position.x.toFixed(2), rigObj.position.y.toFixed(2), rigObj.position.z.toFixed(2), 'yaw:', (yaw * 180 / Math.PI).toFixed(1))
        resolve()
      } else requestAnimationFrame(tick)
    })()
  })
}

// ── Build photo as THREE.js mesh for shatter/reassemble ──────────────────────
function buildPhotoMesh(scene3D) {
  const geo = new THREE.PlaneGeometry(PHOTO_W, PHOTO_H, GRID_X, GRID_Y)
  const loader = new THREE.TextureLoader()
  const tex = loader.load(VERSE2_PHOTO)
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  })
  const mesh = new THREE.Mesh(geo, mat)
  // Lay flat on floor, face up
  mesh.rotation.x = -Math.PI / 2
  mesh.rotation.z = Math.PI  // flip to correct orientation
  mesh.position.set(0, 0.05, 0)
  scene3D.add(mesh)
  return { mesh, mat, tex }
}

// ── Shatter: split plane into triangle pieces with physics ───────────────────
function shatterPhoto(scene3D, photoMesh, photoMat, offsetX, offsetZ) {
  const geo   = photoMesh.geometry
  const pos   = geo.attributes.position
  const uv    = geo.attributes.uv
  const index = geo.index

  // Update world matrix so we can transform vertices to world space
  photoMesh.updateMatrixWorld(true)
  const mat = photoMesh.matrixWorld

  scene3D.remove(photoMesh)

  const pieces = []
  const triCount = index.count / 3

  for (let i = 0; i < triCount; i++) {
    const ia = index.getX(i * 3)
    const ib = index.getX(i * 3 + 1)
    const ic = index.getX(i * 3 + 2)

    // Transform each vertex to world space
    const va = new THREE.Vector3(pos.getX(ia), pos.getY(ia), pos.getZ(ia)).applyMatrix4(mat)
    const vb = new THREE.Vector3(pos.getX(ib), pos.getY(ib), pos.getZ(ib)).applyMatrix4(mat)
    const vc = new THREE.Vector3(pos.getX(ic), pos.getY(ic), pos.getZ(ic)).applyMatrix4(mat)

    const uva = [uv.getX(ia), uv.getY(ia)]
    const uvb = [uv.getX(ib), uv.getY(ib)]
    const uvc = [uv.getX(ic), uv.getY(ic)]

    // Centroid in world space
    const centX = (va.x + vb.x + vc.x) / 3
    const centY = (va.y + vb.y + vc.y) / 3
    const centZ = (va.z + vb.z + vc.z) / 3

    // Build geometry with vertices relative to centroid (so pivot = triangle center)
    const tGeo = new THREE.BufferGeometry()
    tGeo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([
        va.x - centX, va.y - centY, va.z - centZ,
        vb.x - centX, vb.y - centY, vb.z - centZ,
        vc.x - centX, vc.y - centY, vc.z - centZ,
      ]), 3
    ))
    tGeo.setAttribute('uv', new THREE.BufferAttribute(
      new Float32Array([...uva, ...uvb, ...uvc]), 2
    ))
    tGeo.setIndex([0, 1, 2])
    tGeo.computeVertexNormals()

    const tMat = new THREE.MeshBasicMaterial({
      map: photoMat.map,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1
    })
    const tMesh = new THREE.Mesh(tGeo, tMat)

    // No rotation needed — vertices are already in world space
    tMesh.position.set(centX, centY, centZ)
    scene3D.add(tMesh)

    const speed = 0.8 + Math.random() * 1.2
    const angle = Math.atan2(centZ - offsetZ, centX - offsetX) + (Math.random() - 0.5) * 1.2

    pieces.push({
      mesh: tMesh,
      mat:  tMat,
      origX: centX,
      origY: centY,
      origZ: centZ,
      vx:  Math.cos(angle) * speed,
      vy:  1.5 + Math.random() * 2,
      vz:  Math.sin(angle) * speed,
      rx:  (Math.random() - 0.5) * 4,
      ry:  (Math.random() - 0.5) * 4,
      rz:  (Math.random() - 0.5) * 4,
      gravity: 2.5 + Math.random() * 1.5
    })
  }

  return pieces
}


// ── Animate pieces falling then reassembling ─────────────────────────────────
function animatePieces(pieces, fallDur, reassembleDur) {
  const HOLD_DUR = 1500  // pause at peak scatter before reassembling
  return new Promise(resolve => {
    const FALL_DUR      = fallDur
    const REASSEM_DUR   = reassembleDur
    const FALL_END      = FALL_DUR
    const HOLD_END      = FALL_END + HOLD_DUR
    const REASSEM_END   = HOLD_END + REASSEM_DUR
    const t0 = performance.now()

    ;(function tick() {
      const elapsed = performance.now() - t0

      if (elapsed < FALL_END) {
        // ── Falling phase ───────────────────────────────────────
        const dt = Math.min((elapsed - (performance.now() - t0 - 16)) / 1000, 0.05)
        const t  = elapsed / FALL_END

        pieces.forEach(p => {
          // Apply gravity
          p.vy -= p.gravity * 0.016
          p.mesh.position.x += p.vx * 0.016
          p.mesh.position.y += p.vy * 0.016
          p.mesh.position.z += p.vz * 0.016
          p.mesh.rotation.x += p.rx * 0.016
          p.mesh.rotation.y += p.ry * 0.016
          p.mesh.rotation.z += p.rz * 0.016
          // Fade out slightly as they fall
          p.mat.opacity = Math.max(0, 1 - t * 0.3)
        })

      } else if (elapsed < HOLD_END) {
        // ── Hold phase — pieces drift slowly at peak scatter
        pieces.forEach(p => {
          p.mesh.position.y = Math.max(0.05, p.mesh.position.y - 0.01)
        })

      } else if (elapsed < REASSEM_END) {
        // ── Reassemble phase ────────────────────────────────────────
        const t = (elapsed - FALL_END) / REASSEM_DUR
        const e = easeOutCubic(t)

        // Capture each piece's position/rotation once when reassembly begins
        if (elapsed >= HOLD_END && !pieces[0]._rs) {
          pieces.forEach(p => {
            p._rs = {
              x:  p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z,
              rx: p.mesh.rotation.x, ry: p.mesh.rotation.y, rz: p.mesh.rotation.z,
            }
          })
        }

        pieces.forEach(p => {
          const s = p._rs
          // Lerp from captured fall position to exact world-space target
          p.mesh.position.x = s.x  + (p.origX - s.x)  * e
          p.mesh.position.y = s.y  + (p.origY - s.y)  * e
          p.mesh.position.z = s.z  + (p.origZ - s.z)  * e
          p.mesh.rotation.x = s.rx + (0        - s.rx) * e
          p.mesh.rotation.y = s.ry + (0        - s.ry) * e
          p.mesh.rotation.z = s.rz + (0        - s.rz) * e
          p.mat.opacity = Math.min(1, t * 1.4)
        })

      } else {
        // Snap all pieces to final position
        pieces.forEach(p => {
          p.mesh.position.set(p.origX, p.origY, p.origZ)
          p.mesh.rotation.set(0, 0, 0)
          p.mat.opacity = 1
        })
        resolve()
        return
      }

      requestAnimationFrame(tick)
    })()
  })
}

// ── Assemble photo from scattered fragments ──────────────────────────────────
// Loads texture, builds triangles scattered randomly, animates them assembling.
// spotRz is in DEGREES here — converted internally.
function assembleFromFragments(scene3D, src, spotX, spotZ, spotRzDeg, assembleDur) {
  return new Promise(resolve => {
    const spotRz = spotRzDeg * Math.PI / 180  // convert once, here

    const loader = new THREE.TextureLoader()
    loader.load(src, tex => {
      tex.colorSpace = THREE.SRGBColorSpace

      const geo   = new THREE.PlaneGeometry(PHOTO_W, PHOTO_H, GRID_X, GRID_Y)
      const index = geo.index
      const pos   = geo.attributes.position
      const uv    = geo.attributes.uv

      // Build a temporary mesh at the correct world position to get matrixWorld
      const dummyMat = new THREE.MeshBasicMaterial({ map: tex })
      const tmpMesh = new THREE.Mesh(geo, dummyMat)
      tmpMesh.rotation.x = -Math.PI / 2
      tmpMesh.rotation.z = Math.PI + spotRz
      tmpMesh.position.set(spotX, 0.05, spotZ)
      scene3D.add(tmpMesh)
      tmpMesh.updateMatrixWorld(true)
      const worldMat = tmpMesh.matrixWorld.clone()
      scene3D.remove(tmpMesh)

      const triCount = index.count / 3
      const pieces = []

      for (let i = 0; i < triCount; i++) {
        const ia = index.getX(i * 3)
        const ib = index.getX(i * 3 + 1)
        const ic = index.getX(i * 3 + 2)

        const va = new THREE.Vector3(pos.getX(ia), pos.getY(ia), 0).applyMatrix4(worldMat)
        const vb = new THREE.Vector3(pos.getX(ib), pos.getY(ib), 0).applyMatrix4(worldMat)
        const vc = new THREE.Vector3(pos.getX(ic), pos.getY(ic), 0).applyMatrix4(worldMat)

        const uva = [uv.getX(ia), uv.getY(ia)]
        const uvb = [uv.getX(ib), uv.getY(ib)]
        const uvc = [uv.getX(ic), uv.getY(ic)]

        const centX = (va.x + vb.x + vc.x) / 3
        const centY = (va.y + vb.y + vc.y) / 3
        const centZ = (va.z + vb.z + vc.z) / 3

        const tGeo = new THREE.BufferGeometry()
        tGeo.setAttribute('position', new THREE.BufferAttribute(
          new Float32Array([
            va.x - centX, va.y - centY, va.z - centZ,
            vb.x - centX, vb.y - centY, vb.z - centZ,
            vc.x - centX, vc.y - centY, vc.z - centZ,
          ]), 3
        ))
        tGeo.setAttribute('uv', new THREE.BufferAttribute(
          new Float32Array([...uva, ...uvb, ...uvc]), 2
        ))
        tGeo.setIndex([0, 1, 2])
        tGeo.computeVertexNormals()

        const tMat = new THREE.MeshBasicMaterial({
          map: tex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0
        })
        const tMesh = new THREE.Mesh(tGeo, tMat)

        // Start scattered — random offset from final position
        const scatterR = 3 + Math.random() * 3
        const scatterA = Math.random() * Math.PI * 2
        tMesh.position.set(
          centX + Math.cos(scatterA) * scatterR,
          centY + Math.random() * 2,
          centZ + Math.sin(scatterA) * scatterR
        )
        // Random initial rotation
        tMesh.rotation.set(
          (Math.random() - 0.5) * Math.PI,
          (Math.random() - 0.5) * Math.PI,
          (Math.random() - 0.5) * Math.PI
        )
        scene3D.add(tMesh)

        pieces.push({
          mesh: tMesh, mat: tMat,
          origX: centX, origY: centY, origZ: centZ,
          startX: tMesh.position.x, startY: tMesh.position.y, startZ: tMesh.position.z,
          startRx: tMesh.rotation.x, startRy: tMesh.rotation.y, startRz: tMesh.rotation.z,
        })
      }

      // Animate pieces flying into place
      const t0 = performance.now()
      ;(function tick() {
        const t = Math.min((performance.now() - t0) / assembleDur, 1)
        const e = easeOutCubic(t)

        pieces.forEach(p => {
          p.mesh.position.x = p.startX + (p.origX - p.startX) * e
          p.mesh.position.y = p.startY + (p.origY - p.startY) * e
          p.mesh.position.z = p.startZ + (p.origZ - p.startZ) * e
          p.mesh.rotation.x = p.startRx * (1 - e)
          p.mesh.rotation.y = p.startRy * (1 - e)
          p.mesh.rotation.z = p.startRz * (1 - e)
          p.mat.opacity = Math.min(1, t * 1.5)
          p.mat.needsUpdate = true
        })

        if (t < 1) {
          requestAnimationFrame(tick)
        } else {
          // Snap to final, cleanup fragments, leave a solid plane
          pieces.forEach(p => scene3D.remove(p.mesh))
          const finalGeo = new THREE.PlaneGeometry(PHOTO_W, PHOTO_H)
          const finalMat = new THREE.MeshBasicMaterial({
            map: tex,
            side: THREE.DoubleSide,
            transparent: false,
            opacity: 1
          })
          const finalMesh = new THREE.Mesh(finalGeo, finalMat)
          finalMesh.rotation.x = -Math.PI / 2
          finalMesh.rotation.z = Math.PI + spotRz
          finalMesh.position.set(spotX, 0.05, spotZ)
          scene3D.add(finalMesh)
          resolve()
        }
      })()
    })
  })
}

// ── Overlay images fade in on top of reassembled photo ───────────────────────
// Scattered positions for overlay photos — laid casually around the scene
const OVERLAY_SPOTS = [
  { x: -3.0, z: -2.0, rz:  15 },  // left of model, slight tilt
  { x:  3.2, z: -4.5, rz: -20 },  // right of first photo, angled
  { x: -0.8, z:  3.5, rz:   8 },  // north of camera model
  { x: -4.5, z:  0.0, rz:  10 },  // directly left of camera model
  { x:  4.5, z:  0.0, rz: -10 },  // directly right of camera model
]

function buildOverlayPlane(index, scene3D) {
  const loader = new THREE.TextureLoader()
  const tex    = loader.load(OVERLAY_PHOTOS[index])
  const mat    = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  })
  const geo  = new THREE.PlaneGeometry(PHOTO_W, PHOTO_H)
  const mesh = new THREE.Mesh(geo, mat)
  const spot = OVERLAY_SPOTS[index] || { x: index * 2.5, z: -4, rz: 0 }
  mesh.rotation.x = -Math.PI / 2
  mesh.rotation.z = Math.PI + (spot.rz * Math.PI / 180)
  mesh.position.set(spot.x, 0.05 + index * 0.01, spot.z)
  scene3D.add(mesh)
  return { mesh, mat }
}

function fadeInOverlay(mat, duration) {
  return new Promise(resolve => {
    const t0 = performance.now()
    ;(function tick() {
      const t = Math.min((performance.now() - t0) / duration, 1)
      mat.opacity = easeInOutQuad(t)
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })
}

// ── Main sequence ─────────────────────────────────────────────────────────────
export async function startVerse2Sequence() {
  console.log('[verse2] startVerse2Sequence called')

  buildVerse2Room()
  await wait(50)

  const verse2Room = document.getElementById('verse2Room')
  // Don't show room yet — wait until screen is black

  const { fadeOverlay, cameraRig } = getElements()
  const cam    = document.getElementById('camera')
  const rigObj = cameraRig.object3D
  const toRad  = d => d * Math.PI / 180
  const scene3D = document.querySelector('a-scene').object3D

  // Disable look-controls for cinematic camera
  if (cam) cam.setAttribute('look-controls', 'enabled: false')
  try {
    const rlc = cam && cam.components['resettable-look-controls']
    if (rlc) {
      rlc.resetYaw(Math.PI)
      if (rlc.lc) { rlc.lc.yawObject.rotation.y = Math.PI; rlc.lc.pitchObject.rotation.x = 0 }
    }
  } catch(e) {}

  // ── Phase 1: Snap VR camera while screen is still black ─────────
  // Model is at (0, 0.8, 0) facing +Z — user starts directly in front at +Z
  rigObj.position.set(0, 0.3, 4.0)
  rigObj.rotation.set(0.1, Math.PI, 0)  // face toward -Z where model is, slight upward tilt
  if (cam && cam.components.camera) {
    cam.components.camera.camera.fov = 65
    cam.components.camera.camera.updateProjectionMatrix()
  }

  const chorusRoom = document.getElementById('chorusRoom')

  // Build an in-scene black fade plane parented to the camera
  // This is in the same render loop as A-Frame so there's no timing mismatch
  const fadePane = document.createElement('a-plane')
  fadePane.setAttribute('width', '200')
  fadePane.setAttribute('height', '200')
  fadePane.setAttribute('position', '0 0 -0.5')
  fadePane.setAttribute('material', 'color: #000000; shader: flat; transparent: true; opacity: 1; depthTest: false')
  fadePane.setAttribute('render-order', '999')
  const camEl = document.getElementById('camera')
  camEl.appendChild(fadePane)

  await wait(100)  // let plane render for one frame

  // Swap rooms while fully black
  if (chorusRoom) chorusRoom.setAttribute('visible', 'false')
  verse2Room.setAttribute('visible', 'true')

  const cameraModelEl = document.getElementById('verse2CameraEntity')

  // Set all model materials to opacity 0 BEFORE making it visible
  // so it never renders at full opacity even for one frame
  const modelMaterials = []
  function collectAndHideMaterials() {
    cameraModelEl.object3D.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(m => {
          m.transparent = true
          m.opacity = 0
          m.needsUpdate = true
          modelMaterials.push(m)
        })
      }
    })
  }

  // Collect materials now (model was preloaded in buildVerse2Room)
  if (cameraModelEl) collectAndHideMaterials()

  // Now safe to make visible — already at opacity 0
  if (cameraModelEl) cameraModelEl.setAttribute('visible', 'true')

  // Wait for A-Frame to render new room
  await new Promise(resolve => {
    let f = 0; const tick = () => ++f >= 8 ? resolve() : requestAnimationFrame(tick)
    requestAnimationFrame(tick)
  })

  // Fade in: black plane 1→0 AND model 0→1 simultaneously
  const fadeDur = 800
  const fadeT0  = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - fadeT0) / fadeDur, 1)
      // Fade out black plane
      fadePane.setAttribute('material', `color: #000000; shader: flat; transparent: true; opacity: ${(1 - t).toFixed(3)}; depthTest: false`)
      // Fade in model
      modelMaterials.forEach(m => { m.opacity = t; m.needsUpdate = true })
      if (t < 1) requestAnimationFrame(tick)
      else {
        camEl.removeChild(fadePane)
        // Restore materials to fully opaque non-transparent for performance
        modelMaterials.forEach(m => { m.transparent = false; m.opacity = 1; m.needsUpdate = true })
        resolve()
      }
    })()
  })

  console.log('[verse2] starting orbit')

  // Orbit 180 degrees around the model over 5 seconds
  // Start angle: front (0) → back (π), so user sees full 360 pan
  await orbitCamera(rigObj, 0, 0, 4.0, 0, Math.PI, 5000)
  console.log('[verse2] orbit complete — flashing')

  // ── Camera flash ──────────────────────────────────────────────────
  fadeOverlay.style.background = 'white'
  fadeOverlay.classList.add('visible')
  await wait(120)
  fadeOverlay.classList.remove('visible')
  await wait(100)
  fadeOverlay.classList.add('visible')
  await wait(80)
  fadeOverlay.classList.remove('visible')
  await wait(50)
  fadeOverlay.style.background = 'black'

  // ── Phase 2: Photo appears BESIDE the camera model, not under it ─
  // Place photo to the right of the model at (2.5, 0.05, 0) flat on floor
  // Camera cranes to bird's-eye offset toward the photo so both are visible
  const PHOTO_POS = { x: 0, z: -3.5 }  // further south

  const { mesh: photoMesh, mat: photoMat } = buildPhotoMesh(scene3D)
  // Reposition mesh to beside the camera model
  photoMesh.position.set(PHOTO_POS.x, 0.05, PHOTO_POS.z)

  // Fade photo in quickly
  const fadeInT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - fadeInT0) / 600, 1)
      photoMat.opacity = t
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  // Crane to bird's-eye centered between camera model (0,0) and photo (2.5,0)
  // so both are in view: center = (1.25, y, 0)
  const birdCenter = { x: 0, z: -1.75 }  // midpoint between model (0,0) and photo (0,-3.5)
  const craneStart    = rigObj.position.clone()
  const craneStartPitch = rigObj.rotation.x  // preserve current pitch from orbit end
  const craneStartYaw   = rigObj.rotation.y  // preserve current yaw from orbit end — NO spin
  const craneT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - craneT0) / 2000, 1)
      const e = easeInOutQuad(t)

      // Move straight up toward birdCenter — camera lifts without drifting sideways
      rigObj.position.set(
        craneStart.x + (birdCenter.x - craneStart.x) * e,
        craneStart.y + (8 - craneStart.y) * e,
        craneStart.z + (birdCenter.z - craneStart.z) * e
      )

      // Only tilt pitch from current angle → -90° (straight down)
      // Yaw is completely frozen — no turning whatsoever
      rigObj.rotation.set(
        craneStartPitch + (toRad(-90) - craneStartPitch) * e,
        craneStartYaw,
        0
      )

      // Zoom out as crane rises so all photos stay in frame
      const fov = 65 + (95 - 65) * e
      if (cam && cam.components.camera) {
        cam.components.camera.camera.fov = fov
        cam.components.camera.camera.updateProjectionMatrix()
      }
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })
  // Lock FOV at wide value for overlay phase
  if (cam && cam.components.camera) {
    cam.components.camera.camera.fov = 95
    cam.components.camera.camera.updateProjectionMatrix()
  }

  // ── Phase 3: Shatter on "cut me out" — 2s sooner
  await wait(0)
  console.log('[verse2] shattering photo')

  const pieces = shatterPhoto(scene3D, photoMesh, photoMat, PHOTO_POS.x, PHOTO_POS.z)

  // ── Phase 4 (106s–115s): Pieces fall then reassemble ─────────────
  // Fall for 2s, reassemble over 7s (REASSEMBLE_DUR)
  await animatePieces(pieces, 2500, REASSEMBLE_DUR)
  console.log('[verse2] reassembly complete')

  // ── Phase 5: All 5 photos assemble from fragments, staggered & overlapping ──
  // Target: all assemblies complete by ~131s so we can hold 1s then fade at 132s (2:12).
  // Phase 5 has ~11s of budget (120s → 131s).
  // Each photo assembles over 4s. Stagger starts every 1.75s so the next photo's
  // fragments begin appearing before the previous one has fully reconstructed:
  //   Photo 0:  0s   → 4s
  //   Photo 1:  1.75s → 5.75s
  //   Photo 2:  3.5s  → 7.5s
  //   Photo 3:  5.25s → 9.25s
  //   Photo 4:  7s    → 11s   ← last fully assembled at ~11s
  // Then 1s hold → fade to black at 132s (2:12).

  const ASSEMBLE_DUR     = 4000   // ms each photo takes to fully reconstruct
  const ASSEMBLE_STAGGER = 1750   // ms between each photo's fragment spawn

  // Fire all assemblies concurrently with staggered starts — next photo's fragments
  // start appearing while the previous one is still assembling.
  const assemblePromises = OVERLAY_PHOTOS.map((src, i) =>
    wait(i * ASSEMBLE_STAGGER).then(() => {
      const spot = OVERLAY_SPOTS[i] || { x: i * 2.5, z: -4, rz: 0 }
      return assembleFromFragments(scene3D, src, spot.x, spot.z, spot.rz, ASSEMBLE_DUR)
    })
  )

  await Promise.all(assemblePromises)
  console.log('[verse2] all photos assembled')
  await wait(1000)  // 1s hold so all photos are visible before fade

  // ── Fade to black at 132s (2:12) ─────────────────────────────────
  fadeOverlay.classList.add('visible')
  console.log('[verse2] faded to black — ready for next section')

  // Cleanup pieces from scene
  pieces.forEach(p => scene3D.remove(p.mesh))
  if (cam) cam.setAttribute('look-controls', 'enabled: true')
}