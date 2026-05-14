// src/cues.js
// Song cue system — fires animation functions at specific song timestamps.

import { buildStarField, fireShootingStar } from './animations/space.js'
import {spawnFloatingWords, traceConstellationPath } from './animations/verse.js'

export const SONG_CUES = [
  { time: 8.5,  fn: fireShootingStar       },
  { time: 20, fn: spawnFloatingWords     },
  { time: 30, fn: traceConstellationPath },
]

let firedCues = new Set()
let cueListener = null

export function startMemoryRoomSequence() {
  const songAudio = document.getElementById('songAudio')
  firedCues.clear()
  if (cueListener) songAudio.removeEventListener('timeupdate', cueListener)

  buildStarField()

  cueListener = () => {
    const t = songAudio.currentTime
    SONG_CUES.forEach((cue, i) => {
      if (t >= cue.time && !firedCues.has(i)) {
        firedCues.add(i)
        try {
          cue.fn()
        } catch (err) {
          console.error(`Cue ${i} at time ${cue.time} failed:`, err)
        }
      }
    })
  }
  songAudio.addEventListener('timeupdate', cueListener)
}