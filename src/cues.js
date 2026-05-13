// src/cues.js
import { buildStarField, fireShootingStar, startCentralStar, bloomCentralStar } from './animations/space.js'
import { riseWorldPlanet, spawnFloatingWords, traceConstellationPath } from './animations/verse.js'

export const SONG_CUES = [
  { time: 0,  fn: startCentralStar       },
  { time: 9,  fn: fireShootingStar       },
  { time: 21, fn: bloomCentralStar       },
  { time: 24, fn: riseWorldPlanet        },
  { time: 28, fn: spawnFloatingWords     },
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
          // Log the error but don't let it stop other cues from firing
          console.error(`Cue ${i} at time ${cue.time} failed:`, err)
        }
      }
    })
  }
  songAudio.addEventListener('timeupdate', cueListener)
}