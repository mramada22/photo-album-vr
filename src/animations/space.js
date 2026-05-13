// src/animations/space.js
import { getElements } from '../elements.js'
import { wait } from '../scene/camera.js'

// ─── Image Preloader ─────────────────────────────────────────────────

function createVignettedImage(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const size = 512
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')

      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)

      // Cut hard circular mask
      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.fillStyle = 'black'
      ctx.fill()

      // Soft fade over the circular mask
      ctx.globalCompositeOperation = 'destination-out'
      const gradient = ctx.createRadialGradient(
        size / 2, size / 2, size * 0.2,
        size / 2, size / 2, size * 0.5
      )
      gradient.addColorStop(0,   'rgba(0, 0, 0, 0)')
      gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)')
      gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.85)')
      gradient.addColorStop(1,   'rgba(0, 0, 0, 1)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)

      canvas.toBlob(blob => {
        const blobUrl = URL.createObjectURL(blob)
        resolve(blobUrl)
      }, 'image/png')
    }
    img.onerror = () => {
      console.error('Failed to load star image:', src)
      resolve(null)
    }
    img.src = src
  })
}

// Store the promise itself — not just the result
// Any code that needs the image awaits this promise directly
const starImagePromise = createVignettedImage('/images/praying_hands.png')

// ─── Star Field ───────────────────────────────────────────────────────

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

// ─── Shooting Star Animation ──────────────────────────────────────────

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

// ─── Central Pulsing Star ─────────────────────────────────────────────

export function startCentralStar() {
  const { centralStar, starImage } = getElements()

  centralStar.setAttribute('visible', 'true')
  centralStar.setAttribute('scale', '0.1 0.1 0.1')
  centralStar.setAttribute('animation__appear', {
    property: 'scale',
    from: '0.1 0.1 0.1',
    to: '3 3 3',
    dur: 2000,
    easing: 'easeOutElastic'
  })

  // Wait for both the appear animation AND the image to be ready
  Promise.all([
    wait(1800),
    starImagePromise
  ]).then(([, vignettedSrc]) => {
    if (!vignettedSrc) {
      console.warn('Star image failed to load — showing star without image')
      pulseCentralStar()
      return
    }

    starImage.setAttribute('visible', 'true')
    starImage.setAttribute('material', [
      `src: ${vignettedSrc};`,
      'shader: flat;',
      'transparent: true;',
      'alphaTest: 0.01;',
      'side: double;',
      'depthWrite: false'
    ].join(' '))

    pulseCentralStar()
  })
}

function pulseCentralStar() {
  const { centralStar } = getElements()

  centralStar.setAttribute('animation__pulse', {
    property: 'scale',
    from: '3 3 3',
    to: '4 4 4',
    dur: 1800,
    easing: 'easeInOutSine',
    loop: true,
    dir: 'alternate'
  })
  centralStar.setAttribute('animation__glow', {
    property: 'material.emissiveIntensity',
    from: '0.6',
    to: '2',
    dur: 1800,
    easing: 'easeInOutSine',
    loop: true,
    dir: 'alternate'
  })
}

export function bloomCentralStar() {
  const { centralStar, burstContainer, starImage } = getElements()

  centralStar.removeAttribute('animation__pulse')
  centralStar.removeAttribute('animation__glow')

  starImage.setAttribute('animation__shrink', {
    property: 'scale',
    from: '1 1 1',
    to: '0 0 0',
    dur: 300,
    easing: 'easeInQuad'
  })
  wait(320).then(() => {
    starImage.setAttribute('visible', 'false')
  })

  centralStar.setAttribute('animation__bloom', {
    property: 'scale',
    from: '4 4 4',
    to: '12 12 12',
    dur: 1200,
    easing: 'easeOutQuad'
  })
  centralStar.setAttribute('animation__fade', {
    property: 'material.opacity',
    from: '1',
    to: '0',
    dur: 1200,
    easing: 'easeOutQuad'
  })

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2
    const dist  = 4 + Math.random() * 3
    const tx = Math.cos(angle) * dist
    const ty = Math.sin(angle) * dist

    const ringDot = document.createElement('a-sphere')
    ringDot.setAttribute('position', '0 1.6 -15')
    ringDot.setAttribute('radius', '0.08')
    ringDot.setAttribute('material', 'color: #ffffff; emissive: #aaddff; emissiveIntensity: 1.5; transparent: true; opacity: 1')
    ringDot.setAttribute('animation__move', {
      property: 'position',
      to: `${tx} ${1.6 + ty} -15`,
      dur: 1000,
      easing: 'easeOutQuad'
    })
    ringDot.setAttribute('animation__fade', {
      property: 'material.opacity',
      from: '1',
      to: '0',
      dur: 1000,
      easing: 'easeOutQuad'
    })

    burstContainer.appendChild(ringDot)
    wait(1050).then(() => {
      if (ringDot.parentNode) ringDot.parentNode.removeChild(ringDot)
    })
  }

  wait(1300).then(() => {
    centralStar.setAttribute('visible', 'false')
  })
}