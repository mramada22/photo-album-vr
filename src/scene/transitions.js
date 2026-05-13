// src/scene/transitions.js
// Scene transition flows — theater entry and memory room transition.

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

          // Call whatever was passed in — startMemoryRoomSequence in normal use
            if (onComplete) onComplete()
}

export function buildStarField() {
  const { starLayer1, starLayer2, starLayer3 } = getElements()

  // Using a clean 4-pointed star texture from a reliable CDN
  const starTexture = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/sprites/spark1.png'

  const layers = [
    { container: starLayer1, count: 80,  minDist: 30, maxDist: 50, size: 0.5  },
    { container: starLayer2, count: 120, minDist: 50, maxDist: 65, size: 0.3  },
    { container: starLayer3, count: 60,  minDist: 20, maxDist: 35, size: 0.65 },
  ]

  layers.forEach(({ container, count, minDist, maxDist, size }) => {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const dist  = minDist + Math.random() * (maxDist - minDist)

      const x = dist * Math.sin(phi) * Math.cos(theta)
      const y = dist * Math.sin(phi) * Math.sin(theta)
      const z = dist * Math.cos(phi)

      const star = document.createElement('a-plane')
      star.setAttribute('position', `${x} ${y} ${z}`)

      const s = size + Math.random() * (size * 0.5)
      star.setAttribute('width', s)
      star.setAttribute('height', s)

      // Face the camera at all times
      star.setAttribute('look-at', '[camera]')

      const colors = ['#ffffff', '#ffffff', '#fffde0', '#dde8ff', '#ffeedd']
      const color = colors[Math.floor(Math.random() * colors.length)]

      star.setAttribute('material', [
        `src: ${starTexture};`,
        `color: ${color};`,
        'transparent: true;',
        'alphaTest: 0.05;',
        'depthWrite: false;',
        'shader: flat'
      ].join(' '))

      container.appendChild(star)
    }
  })
}

export async function transitionToPreChorus(onComplete) {
  const { fadeOverlay, memoryRoom, preChorusRoom } = getElements()

  // Fade to black
  fadeOverlay.classList.add('visible')
  await wait(1200)

  // Swap rooms while screen is black
  memoryRoom.setAttribute('visible', 'false')
  preChorusRoom.setAttribute('visible', 'true')

  // Reset camera to center of new space
  const { cameraRig } = getElements()
  cameraRig.setAttribute('position', '0 1.6 0')
  cameraRig.setAttribute('rotation', '0 0 0')
  setCameraRotation(0, 0, 0)

  if (onComplete) onComplete()

  await wait(300)

    // Make sure controls stay visible across scene transitions
  const { songControlsOverlay } = getElements()
  songControlsOverlay.classList.remove('hidden')

  // Fade back in revealing new room
  fadeOverlay.classList.remove('visible')
}