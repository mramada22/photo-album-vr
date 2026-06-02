// src/scene/transitions.js
import { getElements } from '../elements.js'
import {
  wait, setCameraRotation, animateCameraRigTo,
  animateCameraRigRotationTo, animateCameraLookTo, waitForModel
} from './camera.js'

export async function playApproachClip() {
  const { theaterRoom, albumIntroSpace, approachAlbumEntity, cameraRig } = getElements()

  if (theaterRoom && theaterRoom.getAttribute('visible') !== 'true') {
    theaterRoom.setAttribute('visible', 'true')
  }

  albumIntroSpace.setAttribute('visible', 'true')
  cameraRig.setAttribute('position', '0 2.2 6.5')
  setCameraRotation(0, 0, 0)

  await waitForModel(approachAlbumEntity)

  approachAlbumEntity.removeAttribute('animation-mixer')
  await wait(50)

  approachAlbumEntity.setAttribute(
    'animation-mixer',
    'clip: *; loop: once; clampWhenFinished: true; timeScale: 1'
  )

  await wait(40)

  animateCameraRigTo('0 5.5 -4', 4800, 'easeInOutQuad')
  animateCameraRigRotationTo('-90 0 0', 4800, 'easeInOutQuad')

  await wait(4900)

  animateCameraRigTo('0 3.0 -4', 2800, 'easeInQuad')

  await wait(2900)
}

export async function transitionToMemoryRoom(onComplete) {
  const { albumIntroSpace, theaterRoom, memoryRoom, fadeOverlay, cameraRig } = getElements()

  animateCameraRigTo('0 1.1 1.2', 1200, 'easeInQuad')
  animateCameraLookTo('-88 0 0', 1200, 'easeInQuad')
  await wait(900)

  fadeOverlay.classList.add('visible')
  await wait(1000)

  albumIntroSpace.setAttribute('visible', 'false')
  theaterRoom.setAttribute('visible', 'false')
  memoryRoom.setAttribute('visible', 'true')

  cameraRig.setAttribute('position', '0 1.6 0')
  cameraRig.setAttribute('rotation', '0 0 0')
  setCameraRotation(0, 0, 0)

  await wait(100)
  fadeOverlay.classList.remove('visible')

  if (onComplete) onComplete()
}

export async function transitionToPreChorus(onComplete) {
  const { fadeOverlay, memoryRoom, preChorusRoom, songControlsOverlay } = getElements()

  fadeOverlay.classList.add('visible')
  await wait(1200)

  memoryRoom.setAttribute('visible', 'false')
  preChorusRoom.setAttribute('visible', 'true')

  if (onComplete) onComplete()

  await wait(300)

  songControlsOverlay.classList.remove('hidden')
  fadeOverlay.classList.remove('visible')

  const { startPreChorusSequence } = await import('../animations/prechorus.js')
  startPreChorusSequence()
}

export async function transitionToChorus() {
  const { fadeOverlay, preChorusRoom, cameraRig } = getElements()

  // Screen is already going black from bookTear.js
  // Wait for it to be fully opaque
  await wait(400)

  preChorusRoom.setAttribute('visible', 'false')

  // Build chorus room while black
  const { buildChorusRoom, startChorusSequence } = await import('../animations/chorus.js')
  buildChorusRoom()

  const chorusRoom = document.getElementById('chorusRoom')
  if (chorusRoom) chorusRoom.setAttribute('visible', 'true')

  // Snap camera to watch position while screen is still black —
  // SPOT0 is at (0,0,0), camera watches from (0, 3.2, 3.5) looking down
  const cam = document.getElementById('camera')
  const rigObj = cameraRig.object3D

  ;['animation__swing1','animation__swing2','animation__follow1','animation__follow2',
    'animation__move','animation__rotate'
  ].forEach(a => cameraRig.removeAttribute(a))
  if (cam) {
    cam.setAttribute('look-controls', 'enabled: false')
    cam.removeAttribute('animation__zoom')
  }

  const toRad = d => d * Math.PI / 180

  // Reset look-controls yaw/pitch before disabling so stored rotation
  // doesn't fight our programmatic snap and cause a spin
  try {
    const rlc = cam && cam.components['resettable-look-controls']
    if (rlc) rlc.resetYaw(0)
  } catch(e) { console.warn('yaw reset failed', e) }

  rigObj.position.set(0, 3.5, 3.0)
  rigObj.rotation.set(toRad(-49.4), 0, 0)
  if (cam && cam.components.camera) {
    cam.components.camera.camera.fov = 55
    cam.components.camera.camera.updateProjectionMatrix()
  }

  await wait(150)
  fadeOverlay.classList.remove('visible')
  startChorusSequence()
}