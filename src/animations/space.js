// src/animations/space.js
// Space environment — star field, shooting star, central pulsing star.

import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'


export function buildStarField() {
  const { starLayer1, starLayer2, starLayer3 } = getElements()

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

export function fireShootingStar() {
  const { shootingStar } = getElements()

  shootingStar.setAttribute('visible', 'true')
  shootingStar.setAttribute('position', '-30 12 -20')

  shootingStar.setAttribute('animation__move', {
    property: 'position',
    to: '18 -4 -20',
    dur: 2200,
    easing: 'easeInQuad'
  })
  shootingStar.setAttribute('animation__scale', {
    property: 'scale',
    from: '1 1 1',
    to: '1.8 1.8 1.8',
    dur: 2200,
    easing: 'easeInQuad'
  })

  let trailCount = 0
  const trailInterval = setInterval(() => {
    spawnTrailDot()
    trailCount++
    if (trailCount >= 26) clearInterval(trailInterval)
  }, 80)

  wait(2200).then(() => {
    shootingStar.setAttribute('visible', 'false')
    burstStar()
  })
}

function spawnTrailDot() {
  const { shootingStar, starTrail } = getElements()

  const pos = shootingStar.getAttribute('position')
  if (!pos) return

  const dot = document.createElement('a-sphere')
  dot.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`)
  dot.setAttribute('radius', '0.08')
  dot.setAttribute('material', 'color: #ffffaa; emissive: #ffee88; emissiveIntensity: 1; transparent: true; opacity: 0.9')
  dot.setAttribute('animation__fade', {
    property: 'material.opacity',
    from: '0.9',
    to: '0',
    dur: 900,
    easing: 'easeOutQuad'
  })
  dot.setAttribute('animation__shrink', {
    property: 'scale',
    from: '1 1 1',
    to: '0.1 0.1 0.1',
    dur: 900,
    easing: 'easeOutQuad'
  })

  starTrail.appendChild(dot)
  wait(950).then(() => {
    if (dot.parentNode) dot.parentNode.removeChild(dot)
  })
}

function burstStar() {
  const { burstContainer } = getElements()
  const burstPos = '18 -4 -20'

  for (let i = 0; i < 16; i++) {
    const angle  = (i / 16) * Math.PI * 2
    const spread = 3 + Math.random() * 4
    const tx = 18 + Math.cos(angle) * spread
    const ty = -4 + Math.sin(angle) * spread
    const colors = ['#ffffff', '#ffffaa', '#ffddaa', '#aaddff']

    const particle = document.createElement('a-sphere')
    particle.setAttribute('position', burstPos)
    particle.setAttribute('radius', '0.1')
    particle.setAttribute('material', `color: ${colors[i % colors.length]}; emissive: #ffffff; emissiveIntensity: 1; transparent: true; opacity: 1`)
    particle.setAttribute('animation__move', {
      property: 'position',
      to: `${tx} ${ty} -20`,
      dur: 800,
      easing: 'easeOutQuad'
    })
    particle.setAttribute('animation__fade', {
      property: 'material.opacity',
      from: '1',
      to: '0',
      dur: 800,
      easing: 'easeOutQuad'
    })

    burstContainer.appendChild(particle)
    wait(820).then(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle)
    })
  }

  const flash = document.createElement('a-sphere')
  flash.setAttribute('position', burstPos)
  flash.setAttribute('radius', '0.6')
  flash.setAttribute('material', 'color: #ffffff; emissive: #ffffff; emissiveIntensity: 2; transparent: true; opacity: 1')
  flash.setAttribute('animation__fade', {
    property: 'material.opacity',
    from: '1',
    to: '0',
    dur: 400,
    easing: 'easeOutQuad'
  })
  flash.setAttribute('animation__grow', {
    property: 'scale',
    from: '1 1 1',
    to: '3 3 3',
    dur: 400,
    easing: 'easeOutQuad'
  })

  burstContainer.appendChild(flash)
  wait(420).then(() => {
    if (flash.parentNode) flash.parentNode.removeChild(flash)
  })
}

