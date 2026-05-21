// src/scene/transitions.js
// Scene transition flows.

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

  // Start the camera pan sequence
  const { startPreChorusSequence } = await import('../animations/prechorus.js')
  console.log('prechorus imported successfully')
  startPreChorusSequence()
}