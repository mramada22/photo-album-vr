// src/elements.js
// Returns element references — called after innerHTML is set.

export function getElements() {
  return {
    startButton:              document.getElementById('startButton'),
    enterTheaterButton:       document.getElementById('enterTheaterButton'),
    welcomeOverlay:           document.getElementById('welcomeOverlay'),
    theaterButtonOverlay:     document.getElementById('theaterButtonOverlay'),
    fadeOverlay:              document.getElementById('fadeOverlay'),
    songControlsOverlay:      document.getElementById('songControlsOverlay'),
    playSongButton:           document.getElementById('playSongButton'),
    pauseSongButton:          document.getElementById('pauseSongButton'),
    restartSongButton:        document.getElementById('restartSongButton'),
    introRoom:                document.getElementById('introRoom'),
    theaterRoom:              document.getElementById('theaterRoom'),
    cameraRig:                document.getElementById('cameraRig'),
    albumIntroSpace:          document.getElementById('albumIntroSpace'),
    approachAlbumEntity:      document.getElementById('approachAlbumEntity'),
    memoryRoom:               document.getElementById('memoryRoom'),
    centralStar:              document.getElementById('centralStar'),
    shootingStar:             document.getElementById('shootingStar'),
    starTrail:                document.getElementById('starTrail'),
    burstContainer:           document.getElementById('burstContainer'),
    starLayer1:               document.getElementById('starLayer1'),
    starLayer2:               document.getElementById('starLayer2'),
    starLayer3:               document.getElementById('starLayer3'),
    worldPlanet:              document.getElementById('worldPlanet'),
    floatingTextContainer:    document.getElementById('floatingTextContainer'),
    constellationContainer:   document.getElementById('constellationContainer'),
    preChorusRoom: document.getElementById('preChorusRoom'),
    starImage: document.getElementById('starImage'),
  }
}