// src/scene/camera.js
// All camera movement and animation functions.

import { getElements } from '../elements.js'

export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export function setCameraRotation(x = 0, y = 0, z = 0) {
  const { cameraRig } = getElements()
  const camera = cameraRig.querySelector('a-camera')
  if (!camera) return
  camera.setAttribute('rotation', `${x} ${y} ${z}`)
}

export function animateCameraRigTo(position, duration = 3000, easing = 'easeInOutQuad') {
  const { cameraRig } = getElements()
  cameraRig.removeAttribute('animation__move')
  cameraRig.setAttribute('animation__move', {
    property: 'position',
    to: position,
    dur: duration,
    easing
  })
}

export function animateCameraRigRotationTo(rotation, duration = 3000, easing = 'easeInOutQuad') {
  cameraRig.removeAttribute('animation__rotate')
  cameraRig.setAttribute('animation__rotate', {
    property: 'rotation',
    to: rotation,
    dur: duration,
    easing
  })
}

export function animateCameraLookTo(rotation, duration = 3000, easing = 'easeInOutQuad') {
  const { cameraRig } = getElements()
  const camera = cameraRig.querySelector('a-camera')
  if (!camera) return
  camera.removeAttribute('animation__look')
  camera.setAttribute('animation__look', {
    property: 'rotation',
    to: rotation,
    dur: duration,
    easing
  })
}

export function waitForModel(entity, timeout = 10000) {
  const { cameraRig } = getElements()
  if (!entity) return Promise.reject(new Error('Entity is not defined'))

  return new Promise((resolve, reject) => {
    const alreadyLoaded = entity.getObject3D('mesh')
    if (alreadyLoaded) { resolve(); return }

    const timeoutId = setTimeout(() => {
      entity.removeEventListener('model-loaded', onModelLoaded)
      reject(new Error('Timed out waiting for model to load'))
    }, timeout)

    function onModelLoaded() {
      clearTimeout(timeoutId)
      entity.removeEventListener('model-loaded', onModelLoaded)
      resolve()
    }

    entity.addEventListener('model-loaded', onModelLoaded)
  })
}