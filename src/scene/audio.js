// src/scene/audio.js
// Audio fade utilities.

let fadeInterval = null

export const SONG_TARGET_VOLUME = 0.8
export const FADE_DURATION = 400

export function clearFade() {
  if (fadeInterval) {
    clearInterval(fadeInterval)
    fadeInterval = null
  }
}

export function fadeOutAudio(audio, startVolume, endVolume, duration) {
  clearFade()

  const stepTime = 25
  const steps = Math.max(1, Math.floor(duration / stepTime))
  const volumeStep = (endVolume - startVolume) / steps

  audio.volume = startVolume

  return new Promise(resolve => {
    let currentStep = 0
    fadeInterval = setInterval(() => {
      currentStep++
      const newVolume = startVolume + volumeStep * currentStep
      audio.volume = Math.max(0, Math.min(1, newVolume))
      if (currentStep >= steps) {
        clearFade()
        audio.volume = endVolume
        resolve()
      }
    }, stepTime)
  })
}

export function fadeAudio(audio, startVolume, endVolume, duration) {
  return fadeOutAudio(audio, startVolume, endVolume, duration)
}