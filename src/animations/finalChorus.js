// src/animations/finalChorus.js
// Final Chorus: 145s (2:25) → 186s (3:06)
//
// Timeline:
// 145s        — hallway fades in, camera at entrance (x:33), starts slow dolly
// 145-182s    — camera dollies from x:33 → x:-8 over 37s
//               photos assemble from fragments as camera approaches each one
// 182-185s    — "every photo you didn't take" — all photos shatter outward
// 185-186s    — 1s hold on empty hallway
// 186s        — fade to black → turn around scene

import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

const HALLWAY_PHOTOS = [
  '/images/hallwayphoto1.jpg',
  '/images/hallwayphoto2.jpg',
  '/images/hallwayphoto3.jpg',
  '/images/hallwayphoto4.jpg',
  '/images/hallwayphoto5.jpg',
  '/images/hallwayphoto6.jpg',
  '/images/hallwayphoto7.jpg',
  '/images/hallwayphoto8.jpg',
  '/images/hallwayphoto9.jpg',
  '/images/hallwayphoto10.jpg',
  '/images/hallwayphoto11.jpg',
  '/images/hallwayphoto12.jpg',
]

// Hallway runs x: 33 → x: -23, figure at x: -12
// Photos spaced from x:28 down to x:-15, alternating z: -3 (left) and z: 3 (right)
const PHOTO_W = 0.8
const PHOTO_H = 1.0
const GRID_X  = 6
const GRID_Y  = 8

// Camera constants
const CAM_START_X  =  33
const CAM_END_X    =  -8
const CAM_Y        =  -2.0
const DOLLY_DUR    =  37000  // 145s → 182s

// Photos alternate left wall (positive Z, ry:180) and right wall (negative Z, ry:0)
// Left wall raycasted values, right wall consistently at z:-0.643 (body inner face -0.693 - 0.05)
const PHOTO_SPOT_DATA = [
  { x: 28.00, z: -0.64, ry:   0 },  // photo 1  — right wall
  { x: 24.73, z:  0.64, ry: 180 },  // photo 2  — left wall (body z:0.693)
  { x: 21.46, z: -0.64, ry:   0 },  // photo 3  — right wall
  { x: 14.92, z:  3.35, ry: 180 },  // photo 4  — Cube-1 alcove back wall, same X as photo 5
  { x: 17.00, z:  0.64, ry: 180 },  // photo 5  — left inner wall, ahead of Cube-1 alcove
  { x:  9.93, z:  3.35, ry: 180 },  // photo 6  — Cube-1 alcove center
  { x:  6.50, z: -0.64, ry:   0 },  // photo 7  — right wall, clear of Cube-1 edge (was x:8.38)
  { x:  5.11, z:  3.38, ry: 180 },  // photo 8  — Cube008 z:3.431
  { x:  1.84, z: -0.64, ry:   0 },  // photo 9  — right wall
  { x: -1.43, z:  3.35, ry: 180 },  // photo 10 — Cube-2 alcove back wall
  { x: -4.70, z: -3.41, ry:   0 },  // photo 11 — right wall gap
  { x: -4.70, z:  3.38, ry: 180 },  // photo 12 — directly across from photo 11, left alcove back wall
]
const PHOTO_SPOTS = PHOTO_SPOT_DATA.map(d => ({ ...d, y: 0.12 }))

// Trigger assembly when camera is ~15 units away so photo is fully assembled before camera arrives
const photoTriggerT = PHOTO_SPOTS.map(spot => {
  const camXAtTrigger = spot.x + 15
  return Math.max(0, Math.min(1, (CAM_START_X - camXAtTrigger) / (CAM_START_X - CAM_END_X)))
})

function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
function easeOutCubic(t)  { return 1 - Math.pow(1-t, 3) }

// ── Assemble photo from fragments ─────────────────────────────────────────────
function assembleFromFragments(scene3D, src, spotX, spotY, spotZ, rotY, assembleDur) {
  return new Promise(resolve => {
    const loader = new THREE.TextureLoader()
    loader.load(src, tex => {
      tex.colorSpace = THREE.SRGBColorSpace

      const geo   = new THREE.PlaneGeometry(PHOTO_W, PHOTO_H, GRID_X, GRID_Y)
      const index = geo.index
      const pos   = geo.attributes.position
      const uv    = geo.attributes.uv

      const dummyMat = new THREE.MeshBasicMaterial({ map: tex })
      const tmpMesh  = new THREE.Mesh(geo, dummyMat)
      tmpMesh.position.set(spotX, spotY, spotZ)
      tmpMesh.rotation.y = rotY * Math.PI / 180
      scene3D.add(tmpMesh)
      tmpMesh.updateMatrixWorld(true)
      const worldMat = tmpMesh.matrixWorld.clone()
      scene3D.remove(tmpMesh)

      const triCount = index.count / 3
      const pieces   = []

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
          map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0
        })
        const tMesh = new THREE.Mesh(tGeo, tMat)

        // Scatter only along Y and the wall-parallel axis (X), not into the hallway center
        const scatterR = 0.5 + Math.random() * 1.0
        const scatterA = Math.random() * Math.PI * 2
        tMesh.position.set(
          centX + Math.cos(scatterA) * scatterR,
          centY + Math.sin(scatterA) * scatterR,
          centZ + (Math.random() - 0.5) * 0.3  // barely move off wall
        )
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
          // Replace fragments with solid plane
          pieces.forEach(p => scene3D.remove(p.mesh))
          const finalGeo = new THREE.PlaneGeometry(PHOTO_W, PHOTO_H)
          const finalMat = new THREE.MeshBasicMaterial({
            map: tex, side: THREE.DoubleSide
          })
          const finalMesh = new THREE.Mesh(finalGeo, finalMat)
          finalMesh.position.set(spotX, spotY, spotZ)
          finalMesh.rotation.y = rotY * Math.PI / 180
          finalMesh.userData.isHallwayPhoto = true
          scene3D.add(finalMesh)
          resolve(finalMesh)
        }
      })()
    })
  })
}

// ── Shatter all assembled photos outward ──────────────────────────────────────
function shatterAllPhotos(scene3D, assembledMeshes, camX) {
  assembledMeshes.forEach(mesh => {
    if (!mesh) return

    // Make original invisible immediately but don't remove yet —
    // fragments will cover it, then we remove after a short delay
    mesh.visible = false
    setTimeout(() => scene3D.remove(mesh), 2500)

    const geo   = new THREE.PlaneGeometry(PHOTO_W, PHOTO_H, GRID_X, GRID_Y)
    const index = geo.index
    const pos   = geo.attributes.position
    const uv    = geo.attributes.uv

    mesh.updateMatrixWorld(true)
    const mat = mesh.matrixWorld

    const triCount = index.count / 3
    const pieces   = []

    for (let i = 0; i < triCount; i++) {
      const ia = index.getX(i * 3)
      const ib = index.getX(i * 3 + 1)
      const ic = index.getX(i * 3 + 2)

      const va = new THREE.Vector3(pos.getX(ia), pos.getY(ia), pos.getZ(ia)).applyMatrix4(mat)
      const vb = new THREE.Vector3(pos.getX(ib), pos.getY(ib), pos.getZ(ib)).applyMatrix4(mat)
      const vc = new THREE.Vector3(pos.getX(ic), pos.getY(ic), pos.getZ(ic)).applyMatrix4(mat)

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

      const tMat = new THREE.MeshBasicMaterial({
        map: mesh.material.map, side: THREE.DoubleSide,
        transparent: true, opacity: 1
      })
      const tMesh = new THREE.Mesh(tGeo, tMat)
      tMesh.position.set(centX, centY, centZ)
      scene3D.add(tMesh)

      // Explode outward from camera position
      const angle = Math.atan2(centZ, centX - camX) + (Math.random() - 0.5) * 1.5
      const speed = 1.5 + Math.random() * 2
      pieces.push({
        mesh: tMesh, mat: tMat,
        vx: Math.cos(angle) * speed,
        vy: 1 + Math.random() * 2,
        vz: Math.sin(angle) * speed,
        rx: (Math.random() - 0.5) * 5,
        ry: (Math.random() - 0.5) * 5,
        rz: (Math.random() - 0.5) * 5,
        gravity: 2 + Math.random()
      })
    }

    // Animate pieces flying out and fading
    const t0 = performance.now()
    ;(function tick() {
      const t = Math.min((performance.now() - t0) / 2000, 1)
      pieces.forEach(p => {
        p.vy -= p.gravity * 0.016
        p.mesh.position.x += p.vx * 0.016
        p.mesh.position.y += p.vy * 0.016
        p.mesh.position.z += p.vz * 0.016
        p.mesh.rotation.x += p.rx * 0.016
        p.mesh.rotation.y += p.ry * 0.016
        p.mesh.rotation.z += p.rz * 0.016
        p.mat.opacity = Math.max(0, 1 - t)
      })
      if (t < 1) requestAnimationFrame(tick)
      else pieces.forEach(p => scene3D.remove(p.mesh))
    })()
  })
}

// ── Build hallway room ────────────────────────────────────────────────────────
export function buildHallwayRoom() {
  if (document.getElementById('hallwayRoom')) return

  const scene  = document.querySelector('a-scene')
  const assets = document.querySelector('a-assets')

  // Preload all hallway photos
  HALLWAY_PHOTOS.forEach((src, i) => {
    const id = `hallwayPhoto${i}`
    if (!document.getElementById(id)) {
      const img = document.createElement('img')
      img.setAttribute('id', id)
      img.setAttribute('src', src)
      img.setAttribute('crossorigin', 'anonymous')
      assets.appendChild(img)
    }
  })

  const room = document.createElement('a-entity')
  room.setAttribute('id', 'hallwayRoom')
  room.setAttribute('visible', 'false')

  // Hallway GLB
  const hallway = document.createElement('a-entity')
  hallway.setAttribute('id', 'hallwayEntity')
  hallway.setAttribute('gltf-model', '#hallwayModel')
  hallway.setAttribute('position', '0 0 0')
  room.appendChild(hallway)

  // Set sky to match hallway wall color so gaps don't show black
  document.getElementById('sky').setAttribute('color', '#8B7355')

  // Each alcove is open on sides/top/bottom — fill them all with brown planes
  // Alcove dimensions: depth z:0.52→3.46 (~3 units), height y:-1.54→1.78 (~3.3 units)
  // Alcove X ranges: Cube-1: 7.7→12.16 (w:4.46), Cube-2: -2.2→1.74 (w:3.94), Cube-3: -12.13→-8.66 (w:3.47)
  const alcoves = [
    { x: 9.93,  hw: 2.23, backZ: 0.744 },  // Cube-1 half-width
    { x: -0.23, hw: 1.97, backZ: 0.590 },  // Cube-2
    { x: -10.393, hw: 1.735, backZ: 0.523 },  // Cube-3 exact center (alcove wall still here)
  ]
  const MAT = 'color: #8B7355; roughness: 1; shader: flat; side: double'
  const alcoveDepthCenter = (3.46 + 0.52) / 2   // ~1.99
  const alcoveDepth       = 3.46 - 0.52          // ~2.94
  const alcoveHeightCenter = (1.78 + -1.54) / 2  // ~0.12
  const alcoveHeight       = 1.78 - -1.54         // ~3.32

  alcoves.forEach(({ x, hw, backZ }, i) => {
    // Left side wall
    const left = document.createElement('a-plane')
    left.setAttribute('position', `${x - hw} ${alcoveHeightCenter} ${alcoveDepthCenter}`)
    left.setAttribute('rotation', '0 90 0')
    left.setAttribute('width', `${alcoveDepth}`)
    left.setAttribute('height', `${alcoveHeight}`)
    left.setAttribute('material', MAT)
    room.appendChild(left)

    // Right side wall
    const right = document.createElement('a-plane')
    right.setAttribute('position', `${x + hw} ${alcoveHeightCenter} ${alcoveDepthCenter}`)
    right.setAttribute('rotation', '0 -90 0')
    right.setAttribute('width', `${alcoveDepth}`)
    right.setAttribute('height', `${alcoveHeight}`)
    right.setAttribute('material', MAT)
    room.appendChild(right)

    // Top wall
    const top = document.createElement('a-plane')
    top.setAttribute('position', `${x} 1.78 ${alcoveDepthCenter}`)
    top.setAttribute('rotation', '90 0 0')
    top.setAttribute('width', `${hw * 2}`)
    top.setAttribute('height', `${alcoveDepth}`)
    top.setAttribute('material', MAT)
    room.appendChild(top)

    // Bottom wall
    const bottom = document.createElement('a-plane')
    bottom.setAttribute('position', `${x} -1.54 ${alcoveDepthCenter}`)
    bottom.setAttribute('rotation', '-90 0 0')
    bottom.setAttribute('width', `${hw * 2}`)
    bottom.setAttribute('height', `${alcoveDepth}`)
    bottom.setAttribute('material', MAT)
    room.appendChild(bottom)

    // Back wall (outer face, closes the alcove completely)
    const back = document.createElement('a-plane')
    back.setAttribute('id', `gapWall${i+1}`)
    back.setAttribute('position', `${x} ${alcoveHeightCenter} 3.40`)
    back.setAttribute('rotation', '0 180 0')
    back.setAttribute('width', `${hw * 2}`)
    back.setAttribute('height', `${alcoveHeight}`)
    back.setAttribute('material', MAT)
    room.appendChild(back)
  })

  // Lighting
  const dirLight = document.createElement('a-light')
  dirLight.setAttribute('type', 'directional')
  dirLight.setAttribute('position', '-23 2 0')
  dirLight.setAttribute('rotation', '0 90 0')
  dirLight.setAttribute('color', '#fff5e0')
  dirLight.setAttribute('intensity', '0.8')
  room.appendChild(dirLight)

  const ambient = document.createElement('a-light')
  ambient.setAttribute('type', 'ambient')
  ambient.setAttribute('color', '#fff5e0')
  ambient.setAttribute('intensity', '0.15')
  room.appendChild(ambient)

  const endLight = document.createElement('a-light')
  endLight.setAttribute('type', 'point')
  endLight.setAttribute('position', '-22 0 0')
  endLight.setAttribute('color', '#fff8e0')
  endLight.setAttribute('intensity', '3')
  endLight.setAttribute('distance', '8')
  room.appendChild(endLight)

  const figLight = document.createElement('a-light')
  figLight.setAttribute('type', 'point')
  figLight.setAttribute('position', '-12 -1.5 0')
  figLight.setAttribute('color', '#ffffff')
  figLight.setAttribute('intensity', '3')
  figLight.setAttribute('distance', '4')
  room.appendChild(figLight)

  scene.appendChild(room)
  console.log('[finalChorus] buildHallwayRoom done')
}

// ── Main sequence ─────────────────────────────────────────────────────────────
export async function startFinalChorusSequence() {
  console.log('[finalChorus] startFinalChorusSequence called')

  buildHallwayRoom()
  await wait(50)

  const hallwayRoom = document.getElementById('hallwayRoom')
  const { fadeOverlay, cameraRig } = getElements()
  const cam    = document.getElementById('camera')
  const rigObj = cameraRig.object3D
  const scene3D = document.querySelector('a-scene').object3D

  if (cam) cam.setAttribute('look-controls', 'enabled: true')

  // Snap camera to hallway entrance while still black
  rigObj.position.set(CAM_START_X, CAM_Y, 0)
  rigObj.rotation.set(0, Math.PI / 2, 0)  // face toward -X (down the hallway)
  if (cam && cam.components.camera) {
    cam.components.camera.camera.fov = 65
    cam.components.camera.camera.updateProjectionMatrix()
  }

  // Fade pane
  const fadePane = document.createElement('a-plane')
  fadePane.setAttribute('width', '200')
  fadePane.setAttribute('height', '200')
  fadePane.setAttribute('position', '0 0 -0.5')
  fadePane.setAttribute('material', 'color: #000000; shader: flat; transparent: true; opacity: 1; depthTest: false')
  fadePane.setAttribute('render-order', '999')
  const camEl = document.getElementById('camera')
  camEl.appendChild(fadePane)

  await wait(100)

  // Hide previous room, show hallway
  const bridgeRoom = document.getElementById('bridgeRoom')
  if (bridgeRoom) bridgeRoom.setAttribute('visible', 'false')

  // Clean up any leftover bridge meshes
  const toRemove = []
  scene3D.traverse(obj => {
    if (obj.isMesh && obj.parent === scene3D && obj.position.y < 0.1 && obj.geometry?.type === 'PlaneGeometry') {
      toRemove.push(obj)
    }
  })
  toRemove.forEach(obj => scene3D.remove(obj))

  hallwayRoom.setAttribute('visible', 'true')

  await new Promise(resolve => {
    let f = 0; const tick = () => ++f >= 8 ? resolve() : requestAnimationFrame(tick)
    requestAnimationFrame(tick)
  })

  // Fade in
  const fadeInT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - fadeInT0) / 500, 1)
      fadePane.setAttribute('material', `color: #000000; shader: flat; transparent: true; opacity: ${(1-t).toFixed(3)}; depthTest: false`)
      if (t < 1) requestAnimationFrame(tick)
      else { camEl.removeChild(fadePane); resolve() }
    })()
  })

  console.log('[finalChorus] starting dolly')

  // Track assembled photo meshes so we can shatter them later
  const assembledMeshes = new Array(HALLWAY_PHOTOS.length).fill(null)
  const triggered       = new Array(HALLWAY_PHOTOS.length).fill(false)

  // ── Dolly with pause at each photo ──────────────────────────────
  // Total budget: 37s (145s→182s)
  // 12 photos — each gets: 1s approach, 1.5s pause, 0.5s depart = 3s per photo
  // 12 × 3s = 36s + 1s buffer = 37s total
  const APPROACH_DUR = 1000   // ms to travel between photos
  const PAUSE_DUR    = 1500   // ms to pause in front of each photo
  const ASSEMBLE_DUR = 2500   // ms for fragments to assemble (starts on approach)

  for (let i = 0; i < PHOTO_SPOTS.length - 1; i++) {  // stop at 11, photo 12 handled separately
    const spot    = PHOTO_SPOTS[i]
    // Always move forward (toward -X), never backward
    // Stop at photo X for alcove photos, 1.5 units before for wall photos
    const idealX  = spot.z > 1.0 ? spot.x : spot.x + 1.5
    const targetX = Math.min(rigObj.position.x, idealX)  // never go backward
    const startX  = rigObj.position.x

    // If photos are directly across (same X), skip approach and just pause longer
    if (Math.abs(targetX - startX) < 0.2) {
      assembleFromFragments(scene3D, HALLWAY_PHOTOS[i], spot.x, spot.y, spot.z, spot.ry, ASSEMBLE_DUR)
        .then(mesh => { assembledMeshes[i] = mesh })
      await wait(PAUSE_DUR)
      continue
    }

    // Start assembling fragments as we approach
    assembleFromFragments(scene3D, HALLWAY_PHOTOS[i], spot.x, spot.y, spot.z, spot.ry, ASSEMBLE_DUR)
      .then(mesh => { assembledMeshes[i] = mesh })

    // Approach the photo
    const approachT0 = performance.now()
    await new Promise(resolve => {
      ;(function tick() {
        const t = Math.min((performance.now() - approachT0) / APPROACH_DUR, 1)
        rigObj.position.x = startX + (targetX - startX) * easeInOutQuad(t)
        if (t < 1) requestAnimationFrame(tick)
        else resolve()
      })()
    })

    // Pause in front of photo
    await wait(PAUSE_DUR)
  }

  // ── After photo 11: pan left toward last alcove, show gallery photo ──
  // Camera stays at photo 11 position, then slowly pans left (toward +Z)
  // to reveal the last photo centered in the Cube-3 alcove

  const lastSpot = PHOTO_SPOTS[PHOTO_SPOTS.length - 1]  // photo 12

  // Add gallery spotlight on the last photo position
  const gallerySpot = document.createElement('a-light')
  gallerySpot.setAttribute('type', 'spot')
  gallerySpot.setAttribute('position', `${lastSpot.x} 2 ${lastSpot.z - 1.5}`)
  gallerySpot.setAttribute('rotation', '-45 0 0')
  gallerySpot.setAttribute('color', '#fff8e0')
  gallerySpot.setAttribute('intensity', '0')
  gallerySpot.setAttribute('angle', '25')
  gallerySpot.setAttribute('penumbra', '0.4')
  gallerySpot.setAttribute('distance', '5')
  hallwayRoom.appendChild(gallerySpot)

  // Assemble last photo at double size with frame and black backing
  const LARGE_W   = PHOTO_W * 2
  const LARGE_H   = PHOTO_H * 2
  const FRAME_T   = 0.08   // frame thickness
  const FRAME_D   = 0.02   // frame depth offset in front of wall
  const rotY12    = lastSpot.ry * Math.PI / 180

  // Photo is at z:3.38, facing -Z (ry:180)
  // "in front" of the photo (toward viewer) means lower Z values
  // Layering from back to front: wall → backing → frame → photo

  const baseZ  = lastSpot.z  // 3.38

  // Black backing — behind photo and frame, slightly in front of wall
  const backGeo = new THREE.PlaneGeometry(LARGE_W + FRAME_T * 2 + 0.02, LARGE_H + FRAME_T * 2 + 0.02)
  const backMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
  const backMesh = new THREE.Mesh(backGeo, backMat)
  backMesh.position.set(lastSpot.x, lastSpot.y, baseZ - 0.01)  // just in front of wall
  backMesh.rotation.y = rotY12
  backMesh.userData.isLastPhotoBacking = true
  scene3D.add(backMesh)

  // Frame — four gold bars, in front of backing but behind photo
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xc8a84b, side: THREE.DoubleSide })
  ;[
    // top bar
    { w: LARGE_W + FRAME_T * 2, h: FRAME_T, ox: 0,                      oy:  LARGE_H / 2 + FRAME_T / 2 },
    // bottom bar
    { w: LARGE_W + FRAME_T * 2, h: FRAME_T, ox: 0,                      oy: -LARGE_H / 2 - FRAME_T / 2 },
    // left bar
    { w: FRAME_T,                h: LARGE_H, ox: -LARGE_W / 2 - FRAME_T / 2, oy: 0 },
    // right bar
    { w: FRAME_T,                h: LARGE_H, ox:  LARGE_W / 2 + FRAME_T / 2, oy: 0 },
  ].forEach(({ w, h, ox, oy }) => {
    const fMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), frameMat)
    fMesh.position.set(lastSpot.x + ox, lastSpot.y + oy, baseZ - 0.02)
    fMesh.rotation.y = rotY12
    scene3D.add(fMesh)
  })

  // Photo — frontmost layer
  const loader = new THREE.TextureLoader()
  const lastPhotoMesh = await new Promise(resolve => {
    loader.load(HALLWAY_PHOTOS[11], tex => {
      tex.colorSpace = THREE.SRGBColorSpace
      const geo = new THREE.PlaneGeometry(LARGE_W, LARGE_H)
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(lastSpot.x, lastSpot.y, baseZ - 0.03)  // in front of frame
      mesh.rotation.y = rotY12
      mesh.userData.isHallwayPhoto = true
      scene3D.add(mesh)
      assembledMeshes[11] = mesh
      resolve({ mesh, mat })
    })
  })

  // Pan camera slowly left (rotate toward +Z / left wall) over 2s
  const panStartYaw = rigObj.rotation.y
  const panEndYaw   = panStartYaw + Math.PI * 0.4   // pan toward +Z (left alcove)
  const panT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - panT0) / 2000, 1)
      const e = easeInOutQuad(t)
      rigObj.rotation.y = panStartYaw + (panEndYaw - panStartYaw) * e
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  // Fade in last photo and spotlight simultaneously over 2s
  const revealT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - revealT0) / 2000, 1)
      const e = easeOutCubic(t)
      lastPhotoMesh.mat.opacity = e
      lastPhotoMesh.mat.needsUpdate = true
      gallerySpot.setAttribute('light', `type: spot; intensity: ${(4 * e).toFixed(3)}; angle: 25; penumbra: 0.4; distance: 5; color: #fff8e0`)
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  // Ensure last photo is fully opaque before anything shatters
  lastPhotoMesh.mat.opacity = 1
  lastPhotoMesh.mat.needsUpdate = true

  // Hold on the last photo
  await wait(3000)

  console.log('[finalChorus] dolly complete — shattering photos')

  // Hide the last photo's backing temporarily so fragments are visible
  // Backing reappears after fragments have flown away
  const lastBacking = scene3D.getObjectByProperty ? null : null
  scene3D.traverse(o => {
    if (o.userData.isLastPhotoBacking) o.visible = false
  })

  // ── Shatter all photos on "every photo you didn't take" ───────────
  shatterAllPhotos(scene3D, assembledMeshes, rigObj.position.x)

  // After fragments fly (1.5s), reveal black backing
  setTimeout(() => {
    scene3D.traverse(o => {
      if (o.userData.isLastPhotoBacking) o.visible = true
    })
  }, 1500)

  // After fragments fly (1.5s), reveal black backing
  setTimeout(() => {
    scene3D.traverse(o => {
      if (o.userData.isLastPhotoBacking) o.visible = true
    })
  }, 1500)

  // Wait for fragments to finish flying
  await wait(2000)

  // ── Zoom into the black rectangle → transition to next room ──────
  // Camera pushes toward the framed black rectangle — as it gets close
  // the screen fades to black, hiding any wall flash and becoming the transition
  const zoomStartX  = rigObj.position.x
  const zoomStartZ  = rigObj.position.z
  const zoomTargetX = lastSpot.x
  const zoomTargetZ = lastSpot.z - 0.4  // stop just before the backing
  const ZOOM_DUR    = 2500

  if (cam) cam.setAttribute('look-controls', 'enabled: false')

  const zoomT0 = performance.now()
  await new Promise(resolve => {
    ;(function tick() {
      const t = Math.min((performance.now() - zoomT0) / ZOOM_DUR, 1)
      const e = easeInOutQuad(t)

      // Push camera toward the black rectangle
      rigObj.position.x = zoomStartX + (zoomTargetX - zoomStartX) * e
      rigObj.position.z = zoomStartZ + (zoomTargetZ - zoomStartZ) * e

      // Fade to black in the second half of the zoom
      if (t > 0.4) {
        const fadeT = (t - 0.4) / 0.6
        fadeOverlay.style.opacity = fadeT.toFixed(3)
        if (!fadeOverlay.classList.contains('visible')) fadeOverlay.classList.add('visible')
      }

      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    })()
  })

  console.log('[finalChorus] zoomed into black — ready for turn around scene')
  if (cam) cam.setAttribute('look-controls', 'enabled: true')
}