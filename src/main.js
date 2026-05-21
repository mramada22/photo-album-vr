// src/main.js
import 'aframe'
import 'aframe-extras'
import './style.css'

document.querySelector('#app').innerHTML = `
  <div id="welcomeOverlay" class="overlay">
    <div class="overlay-card">
      <h1>Welcome</h1>
      <p>
        This experience is an immersive visual companion to an original song.
      </p>
      <button id="startButton">Start Experience</button>
    </div>
  </div>

  <div id="theaterButtonOverlay" class="overlay hidden">
    <div class="overlay-card">
      <h2>The introduction has ended.</h2>
      <button id="enterTheaterButton">Enter Theater</button>
    </div>
  </div>

  <div id="fadeOverlay" class="fade-overlay"></div>

  <div id="skipIntroBtn" style="position: fixed; top: 16px; right: 16px; z-index: 999;">
    <button id="skipTrigger">Skip Intro (dev)</button>
  </div>

  <div id="preChorusTestBtn" style="position: fixed; top: 50px; right: 16px; z-index: 999;">
    <button id="preChorusTrigger">Test Pre-chorus (dev)</button>
  </div>

  <div id="songControlsOverlay" class="controls-overlay hidden">
    <div class="controls-card">
      <button id="playSongButton">Play Song</button>
      <button id="pauseSongButton">Pause Song</button>
      <button id="restartSongButton">Restart Song</button>
    </div>
  </div>

  <a-scene renderer="antialias: false; colorManagement: true; physicallyCorrectLights: false; maxCanvasWidth: 1920; maxCanvasHeight: 1080">
    <a-assets>
      <a-asset-item id="approachAlbumModel" src="/models/approach_album.glb"></a-asset-item>
      <audio id="introAudio" src="/audio/intro.mp3" preload="auto"></audio>
      <audio id="songAudio"  src="/audio/song.mp3"  preload="auto"></audio>
      <img id="earthTexture" src="/images/earth.jpg" crossorigin="anonymous">
      <a-asset-item id="preChorusFiguresAsset" src="/models/prechorus_figures.glb"></a-asset-item>
    </a-assets>

    <a-sky id="sky" color="#000005"></a-sky>

    <a-entity id="cameraRig" position="0 0 4">
      <a-camera id="camera" wasd-controls="enabled: false" look-controls="enabled: true"></a-camera>
    </a-entity>

    <!-- Intro Room -->
    <a-entity id="introRoom">
      <a-plane position="0 0 -4" rotation="-90 0 0" width="12" height="12" color="#222222"></a-plane>
      <a-plane position="0 3 -4" rotation="90 0 0"  width="12" height="12" color="#1a1a1a"></a-plane>
      <a-plane position="0 1.5 -10" width="12" height="6" color="#191919"></a-plane>
      <a-plane position="-6 1.5 -4" rotation="0 90 0"  width="12" height="6" color="#181818"></a-plane>
      <a-plane position="6 1.5 -4"  rotation="0 -90 0" width="12" height="6" color="#181818"></a-plane>

      <a-light type="ambient" intensity="0.6"></a-light>
      <a-light type="spot" position="0 4 -3" rotation="-90 0 0" intensity="1" angle="35"></a-light>

      <a-text
        id="introText"
        value="Welcome. An audio introduction will begin now."
        position="0 2 -7"
        align="center"
        width="8"
        color="#f5f5f5">
      </a-text>

      <a-box
        position="0 1 -6"
        depth="0.8"
        height="1.2"
        width="1.2"
        color="#6f5cff"
        animation="property: rotation; to: 0 360 0; loop: true; dur: 8000">
      </a-box>
    </a-entity>

    <!-- Theater Room -->
    <a-entity id="theaterRoom" visible="false">
      <a-plane position="0 0 -4" rotation="-90 0 0" width="18" height="18" color="#090909"></a-plane>
      <a-light type="ambient" intensity="0.25"></a-light>

      <a-entity id="albumIntroSpace" visible="false">
        <a-light type="ambient" intensity="0.55"></a-light>
        <a-light type="spot" position="0 4 -2" rotation="-90 0 0" intensity="1.2" angle="30"></a-light>

        <a-entity id="approachAlbumAnchor" position="0 1.4 -4">
          <a-entity
            id="approachAlbumEntity"
            gltf-model="#approachAlbumModel"
            position="0 0.6 -1.5"
            rotation="0 0 0"
            scale="1 1 1">
          </a-entity>
        </a-entity>

      </a-entity>
    </a-entity>

    <!-- ===== MEMORY ROOM ===== -->
    <a-entity id="memoryRoom" visible="false">

      <a-sphere
        id="spacePlanetEntity"
        position="0 0 -4"
        radius="2.5"
        material="src: #earthTexture; shader: flat; side: double"
        animation="property: rotation; to: 0 360 0; loop: true; dur: 30000; easing: linear">
      </a-sphere>

      <!-- Star field layers for A-Frame animations -->
      <a-entity id="starLayer1"></a-entity>
      <a-entity id="starLayer2"></a-entity>
      <a-entity id="starLayer3"></a-entity>

      <!-- Shooting star -->
      <a-sphere
        id="shootingStar"
        position="-30 12 -20"
        radius="0.18"
        visible="false"
        material="color: #ffffff; emissive: #ffffaa; emissiveIntensity: 1.5">
      </a-sphere>

      <!-- Trail and burst containers -->
      <a-entity id="starTrail"></a-entity>
      <a-entity id="burstContainer"></a-entity>

      <!-- Floating text container -->
      <a-entity id="floatingTextContainer"></a-entity>

      <!-- Constellation path container -->
      <a-entity id="constellationContainer"></a-entity>

    </a-entity>

    <!-- ===== PRE-CHORUS ROOM ===== -->
    <a-entity id="preChorusRoom" visible="false">

      <!-- Floor -->
      <a-plane position="0 0 -3" rotation="-90 0 0"
        width="30" height="20"
        material="color: #2a1a0a; roughness: 1">
      </a-plane>

      <!-- Ceiling -->
      <a-plane position="0 3.5 -3" rotation="90 0 0"
        width="30" height="20"
        material="color: #1a1008; roughness: 1">
      </a-plane>

      <!-- Back wall -->
      <a-plane position="0 1.75 -8" width="30" height="7"
        material="color: #2c1f10; roughness: 1">
      </a-plane>

      <!-- Left wall -->
      <a-plane position="-15 1.75 -3" rotation="0 90 0"
        width="20" height="7"
        material="color: #2a1e0f; roughness: 1">
      </a-plane>

      <!-- Right wall -->
      <a-plane position="15 1.75 -3" rotation="0 -90 0"
        width="20" height="7"
        material="color: #2a1e0f; roughness: 1">
      </a-plane>

      <!-- Boosted lighting -->
        <a-light type="ambient" intensity="1.5" color="#ff9944"></a-light>
        <a-light type="point" position="-4 2.5 -4" intensity="3" color="#ffaa44" distance="10"></a-light>
        <a-light type="point" position="4 2.5 -4"  intensity="3" color="#ffaa44" distance="10"></a-light>

      <!-- Figures -->
      <a-entity
        id="preChorusFigures"
        gltf-model="#preChorusFiguresAsset"
        position="0 1.2 -5"
        rotation="0 0 0"
        scale="1 1 1">
      </a-entity>

    </a-entity>

  </a-scene>
`

async function init() {
  const { getElements } = await import('./elements.js')
  const {
    startButton, enterTheaterButton, welcomeOverlay, theaterButtonOverlay,
    fadeOverlay, songControlsOverlay, playSongButton, pauseSongButton,
    restartSongButton, introRoom, cameraRig
  } = getElements()

  const { fadeAudio, fadeOutAudio, clearFade,
    SONG_TARGET_VOLUME, FADE_DURATION } = await import('./scene/audio.js')

  const { playApproachClip, transitionToMemoryRoom, transitionToPreChorus } = await import('./scene/transitions.js')
  const { startMemoryRoomSequence } = await import('./cues.js')

  const introAudio = document.getElementById('introAudio')
  const songAudio  = document.getElementById('songAudio')
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  let introHasFinished = false

  let preChorusFired = false
  let preChorusCheck = null

  function attachPreChorusListener() {
    preChorusFired = false
    if (preChorusCheck) songAudio.removeEventListener('timeupdate', preChorusCheck)
    preChorusCheck = () => {
      if (!preChorusFired && songAudio.currentTime >= 34) {
        preChorusFired = true
        songAudio.removeEventListener('timeupdate', preChorusCheck)
        transitionToPreChorus()
      }
    }
    songAudio.addEventListener('timeupdate', preChorusCheck)
  }

  document.getElementById('preChorusTrigger').addEventListener('click', async () => {
    console.log('test button clicked')
    document.getElementById('preChorusTestBtn').style.display = 'none'

    const scene = document.querySelector('a-scene')
    console.log('scene loaded:', scene.hasLoaded)
    if (!scene.hasLoaded) {
      console.log('waiting for scene to load...')
      await new Promise(resolve => scene.addEventListener('loaded', resolve, { once: true }))
      console.log('scene loaded now')
    }

    console.log('about to call transitionToPreChorus')
    welcomeOverlay.classList.add('hidden')
    songControlsOverlay.classList.remove('hidden')
    introRoom.setAttribute('visible', 'false')

    await transitionToPreChorus()
    console.log('transitionToPreChorus finished')
  })

  // ─── Event Listeners ──────────────────────────────────────────────

  startButton.addEventListener('click', async () => {
    fadeOverlay.classList.add('visible')
    await wait(1000)
    welcomeOverlay.classList.add('hidden')
    await wait(300)
    try {
      await introAudio.play()
    } catch (error) {
      console.error('Audio has failed to play:', error)
      alert('Intro Audio could not play, check MP3 file.')
    }
    fadeOverlay.classList.remove('visible')
  })

  introAudio.addEventListener('ended', () => {
    introHasFinished = true
    theaterButtonOverlay.classList.remove('hidden')
  })

  enterTheaterButton.addEventListener('click', async () => {
    if (!introHasFinished) return

    theaterButtonOverlay.classList.add('hidden')
    fadeOverlay.classList.add('visible')
    await wait(1000)

    introRoom.setAttribute('visible', 'false')
    cameraRig.setAttribute('position', '0 0 6')
    songControlsOverlay.classList.remove('hidden')

    await wait(300)
    fadeOverlay.classList.remove('visible')

    try {
      songAudio.currentTime = 0
      songAudio.volume = 0
      await songAudio.play()
      await fadeAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION)
    } catch (error) {
      console.error('Song failed to play:', error)
      alert('The song could not play. Check that /public/audio/song.mp3 exists.')
    }

    try {
      await playApproachClip()
      await transitionToMemoryRoom(startMemoryRoomSequence)
      attachPreChorusListener()
    } catch (error) {
      console.error('Approach clip or transition failed:', error)
    }
  })

  playSongButton.addEventListener('click', async () => {
    try {
      clearFade()
      if (songAudio.paused) {
        songAudio.volume = 0
        await songAudio.play()
        await fadeOutAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION)
      } else {
        await fadeOutAudio(songAudio, songAudio.volume, SONG_TARGET_VOLUME, FADE_DURATION)
      }
    } catch (error) {
      console.error('Song has failed to play:', error)
    }
  })

  pauseSongButton.addEventListener('click', async () => {
    if (songAudio.paused) return
    await fadeOutAudio(songAudio, songAudio.volume, 0, FADE_DURATION)
    songAudio.pause()
  })

  restartSongButton.addEventListener('click', async () => {
    try {
      clearFade()
      songAudio.pause()
      songAudio.currentTime = 0
      songAudio.volume = 0

      await songAudio.play()
      await fadeAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION)
      await playApproachClip()
      await transitionToMemoryRoom(startMemoryRoomSequence)
      attachPreChorusListener()
    } catch (error) {
      console.error('Song failed to restart:', error)
    }
  })

  document.getElementById('skipTrigger').addEventListener('click', async () => {
    document.getElementById('skipIntroBtn').style.display = 'none'

    introAudio.pause()
    introAudio.currentTime = 0

    welcomeOverlay.classList.add('hidden')
    theaterButtonOverlay.classList.add('hidden')
    songControlsOverlay.classList.remove('hidden')
    introHasFinished = true

    fadeOverlay.classList.add('visible')
    await wait(1000)

    introRoom.setAttribute('visible', 'false')
    cameraRig.setAttribute('position', '0 0 6')

    await wait(300)
    fadeOverlay.classList.remove('visible')

    try {
      songAudio.currentTime = 0
      songAudio.volume = 0
      await songAudio.play()
      await fadeAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION)
    } catch (error) {
      console.error('Song failed to play:', error)
    }

    try {
      await playApproachClip()
      await transitionToMemoryRoom(startMemoryRoomSequence)
      attachPreChorusListener()
    } catch (error) {
      console.error('Skip intro transition failed:', error)
    }
  })
}

init()