// src/animations/verse.js
// Verse animations — planet rise, floating words, constellation path.

import { getElements } from '../elements.js'

import { wait } from '../scene/camera.js'

export function riseWorldPlanet() {
  const { worldPlanet } = getElements()
  worldPlanet.setAttribute('visible', 'true')
  worldPlanet.setAttribute('position', '0 -8 -15')
  worldPlanet.setAttribute('scale', '0.1 0.1 0.1')
  worldPlanet.setAttribute('material', 'color: #1a6b3c; emissive: #0a3d8f; emissiveIntensity: 0.8; transparent: true; opacity: 0')

  worldPlanet.setAttribute('animation__rise',   { property: 'position', from: '0 -8 -15', to: '0 1.6 -15', dur: 3000, easing: 'easeOutQuad' })
  worldPlanet.setAttribute('animation__grow',   { property: 'scale', from: '0.1 0.1 0.1', to: '1 1 1', dur: 3000, easing: 'easeOutQuad' })
  worldPlanet.setAttribute('animation__fadein', { property: 'material.opacity', from: '0', to: '1', dur: 1500, easing: 'easeOutQuad' })

  wait(3000).then(() => {
    worldPlanet.setAttribute('animation__spin', { property: 'rotation', from: '0 0 0', to: '0 360 0', dur: 8000, easing: 'linear', loop: true })
    wait(3000).then(() => {
      worldPlanet.setAttribute('animation__float',   { property: 'position', from: '0 1.6 -15', to: '0 6 -15', dur: 2500, easing: 'easeInQuad' })
      worldPlanet.setAttribute('animation__fadeout', { property: 'material.opacity', from: '1', to: '0', dur: 2500, easing: 'easeInQuad' })
      wait(2600).then(() => {
        worldPlanet.setAttribute('visible', 'false')
        worldPlanet.removeAttribute('animation__spin')
        worldPlanet.removeAttribute('animation__float')
        worldPlanet.removeAttribute('animation__fadeout')
      })
    })
  })
}

export function spawnFloatingWords() {
  const { floatingTextContainer } = getElements()
  const words = [
    { text: 'miracle',  pos: '-4 3 -12',   rot: '0 15 0',  delay: 0    },
    { text: 'lyrical',  pos: '3 2.5 -10',  rot: '0 -10 0', delay: 600  },
    { text: 'dreams',   pos: '-2 1 -14',   rot: '0 8 0',   delay: 1200 },
    { text: 'promised', pos: '4 3.5 -12',  rot: '0 -20 0', delay: 1800 },
    { text: 'world',    pos: '-5 2 -10',   rot: '0 12 0',  delay: 2400 },
    { text: 'words',    pos: '1 4 -13',    rot: '0 -5 0',  delay: 3000 },
    { text: 'path',     pos: '-3 3.5 -11', rot: '0 18 0',  delay: 3600 },
  ]

  words.forEach(({ text, pos, rot, delay }) => {
    setTimeout(() => {
      const entity = document.createElement('a-text')
      entity.setAttribute('value', text)
      entity.setAttribute('position', pos)
      entity.setAttribute('rotation', rot)
      entity.setAttribute('color', '#ffffff')
      entity.setAttribute('opacity', '0')
      entity.setAttribute('width', '4')
      entity.setAttribute('align', 'center')
      entity.setAttribute('font', 'https://cdn.aframe.io/fonts/Exo2Bold.fnt')

      entity.setAttribute('animation__fadein', { property: 'opacity', from: '0', to: '0.9', dur: 800, easing: 'easeOutQuad' })

      const posObj = pos.split(' ').map(Number)
      entity.setAttribute('animation__drift', { property: 'position', from: pos, to: `${posObj[0]} ${posObj[1] + 1.5} ${posObj[2]}`, dur: 5000, easing: 'linear' })

      wait(3200).then(() => {
        entity.setAttribute('animation__fadeout', { property: 'opacity', from: '0.9', to: '0', dur: 1000, easing: 'easeInQuad' })
        wait(1100).then(() => { if (entity.parentNode) entity.parentNode.removeChild(entity) })
      })

      floatingTextContainer.appendChild(entity)
    }, delay)
  })
}

export function traceConstellationPath() {
  const { constellationContainer } = getElements()
  const pathPoints = [
    '-10 0 -18',   '-8  1 -18',  '-6  2.5 -18',
    '-4  3.5 -18', '-2  4.2 -18', '0   4.5 -18',
    '2   4.2 -18',  '4   3.5 -18', '6   2.5 -18',
    '8   1 -18',   '10  0 -18',
  ]

  pathPoints.forEach((pos, i) => {
    setTimeout(() => {
      const dot = document.createElement('a-sphere')
      dot.setAttribute('position', pos)
      dot.setAttribute('radius', '0.12')
      dot.setAttribute('material', 'color: #aaddff; emissive: #aaddff; emissiveIntensity: 1.5; transparent: true; opacity: 0')
      dot.setAttribute('animation__appear', { property: 'material.opacity', from: '0', to: '1', dur: 400, easing: 'easeOutQuad' })
      dot.setAttribute('animation__pop',    { property: 'scale', from: '0 0 0', to: '1 1 1', dur: 400, easing: 'easeOutBack' })

      constellationContainer.appendChild(dot)

      if (i > 0) {
        const prevPos = pathPoints[i - 1].trim().split(/\s+/).map(Number)
        const currPos = pos.trim().split(/\s+/).map(Number)
        const midX = (prevPos[0] + currPos[0]) / 2
        const midY = (prevPos[1] + currPos[1]) / 2
        const midZ = (prevPos[2] + currPos[2]) / 2
        const dx = currPos[0] - prevPos[0]
        const dy = currPos[1] - prevPos[1]
        const length = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)

        const line = document.createElement('a-box')
        line.setAttribute('position', `${midX} ${midY} ${midZ}`)
        line.setAttribute('rotation', `0 0 ${angle}`)
        line.setAttribute('width', length)
        line.setAttribute('height', '0.02')
        line.setAttribute('depth', '0.02')
        line.setAttribute('material', 'color: #aaddff; emissive: #aaddff; emissiveIntensity: 1; transparent: true; opacity: 0')
        line.setAttribute('animation__fadein', { property: 'material.opacity', from: '0', to: '0.5', dur: 300, easing: 'easeOutQuad' })
        constellationContainer.appendChild(line)
      }

      if (i === pathPoints.length - 1) {
        wait(1500).then(() => {
          constellationContainer.querySelectorAll('a-sphere, a-box').forEach(el => {
            el.setAttribute('animation__fadeout', { property: 'material.opacity', from: '1', to: '0', dur: 1500, easing: 'easeInQuad' })
          })
          wait(1600).then(() => {
            while (constellationContainer.firstChild) {
              constellationContainer.removeChild(constellationContainer.firstChild)
            }
          })
        })
      }
    }, i * 220)
  })
}