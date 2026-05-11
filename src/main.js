import 'aframe'
import 'aframe-extras'
import './style.css'

const SONG_TARGET_VOLUME = 0.8;
const FADE_DURATION = 400; // in milliseconds
let fadeInterval = null;

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


  <div id="songControlsOverlay" class="controls-overlay hidden">
    <div class="controls-card">
      <button id="playSongButton">Play Song</button>
      <button id="pauseSongButton">Pause Song</button>
      <button id="restartSongButton">Restart Song</button>
    </div>
  </div>


  <a-scene>
    <a-assets>
      <a-asset-item id="approachAlbumModel" src="/models/approach_album.glb"></a-asset-item>
      <audio id="introAudio" src="/audio/intro.mp3" preload="auto"></audio>
      <audio id="songAudio" src="/audio/song.mp3" preload="auto"></audio>
      <video id="memoryVideo" src="/video/memory.mp4" preload="auto" loop crossorigin="anonymous"></video>
    </a-assets>

    <a-sky id="sky" color="#111111"></a-sky>

    <a-entity id="cameraRig" position="0 0 4">
      <a-camera id="camera" wasd-controls-enabled="true" look-controls="enabled: false"></a-camera>
    </a-entity>

 <!-- Intro Room -->
     <a-entity id="introRoom">
      <a-plane position="0 0 -4" rotation="-90 0 0" width="12" height="12" color="#222222"></a-plane>
      <a-plane position="0 3 -4" rotation="90 0 0" width="12" height="12" color="#1a1a1a"></a-plane>
      <a-plane position="0 1.5 -10" width="12" height="6" color="#191919"></a-plane>
      <a-plane position="-6 1.5 -4" rotation="0 90 0" width="12" height="6" color="#181818"></a-plane>
      <a-plane position="6 1.5 -4" rotation="0 -90 0" width="12" height="6" color="#181818"></a-plane>

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

 <!-- Theater room -->

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

      <!-- The floor, ceiling, and 3 walls that box you in -->
      <a-plane position="0 0 -4"  rotation="-90 0 0" width="14" height="14" color="#5c3d1e"></a-plane>
      <a-plane position="0 3 -4"  rotation="90 0 0"  width="14" height="14" color="#2a1a0e"></a-plane>
      <a-plane position="0 1.5 -11" width="14" height="6" color="#3b2410"></a-plane>
      <a-plane position="-7 1.5 -4" rotation="0 90 0"  width="14" height="6" color="#3b2410"></a-plane>
      <a-plane position="7 1.5 -4"  rotation="0 -90 0" width="14" height="6" color="#3b2410"></a-plane>

      <!-- Warm amber lighting — starts dim, will brighten during chorus -->
      <a-light id="memoryAmbient" type="ambient" intensity="0.3" color="#ffcc88"></a-light>
      <a-light id="memorySpot"    type="point"   intensity="0.5" color="#ffaa44"
               position="0 2.8 -4" distance="10"></a-light>

      <!-- Empty container — polaroids will be created here by JS -->
      <a-entity id="polaroidContainer"></a-entity>

      <!-- Picture frame with video — hidden until the bridge section -->
      <a-entity id="pictureFrameGroup" position="0 1.6 -9" visible="false">
        <a-box width="2.4" height="1.8" depth="0.05" color="#3b2410"></a-box>
        <a-video src="#memoryVideo" width="2" height="1.4" position="0 0 0.04"></a-video>
      </a-entity>

    </a-entity>

  </a-scene>
`

const startButton = document.getElementById('startButton');
const enterTheaterButton = document.getElementById('enterTheaterButton');

const welcomeOverlay = document.getElementById('welcomeOverlay');
const theaterButtonOverlay = document.getElementById('theaterButtonOverlay');
const fadeOverlay = document.getElementById('fadeOverlay');

const introRoom = document.getElementById('introRoom');
const theaterRoom = document.getElementById('theaterRoom');
const cameraRig = document.getElementById('cameraRig');

const introAudio = document.getElementById('introAudio');
const songAudio = document.getElementById('songAudio');
const songControlsOverlay = document.getElementById('songControlsOverlay');

const playSongButton = document.getElementById('playSongButton');
const pauseSongButton = document.getElementById('pauseSongButton');
const restartSongButton = document.getElementById('restartSongButton');

const albumIntroSpace = document.getElementById('albumIntroSpace')
const approachAlbumEntity = document.getElementById('approachAlbumEntity')

const memoryRoom          = document.getElementById('memoryRoom')
const memoryAmbient       = document.getElementById('memoryAmbient')
const memorySpot          = document.getElementById('memorySpot')
const polaroidContainer   = document.getElementById('polaroidContainer')
const pictureFrameGroup   = document.getElementById('pictureFrameGroup')
const memoryVideo         = document.getElementById('memoryVideo')

let introHasFinished = false; 

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function waitForModel(entity, timeout = 10000) {
  if (!entity) {
    return Promise.reject(new Error('Entity is not defined'))
  }

  return new Promise((resolve, reject) => {
    const alreadyLoaded = entity.getObject3D('mesh')
    if (alreadyLoaded) {
      resolve()
      return
    }

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

function fadeAudio(audio, startVolume, endVolume, duration) {
  return fadeOutAudio(audio, startVolume, endVolume, duration)
}

function setCameraRotation(x = 0, y = 0, z = 0) {
  const camera = cameraRig.querySelector('a-camera')
  if (!camera) return
  camera.setAttribute('rotation', `${x} ${y} ${z}`)
}

function animateCameraRigTo(position, duration = 3000, easing = 'easeInOutQuad') {
  cameraRig.removeAttribute('animation__move')

  cameraRig.setAttribute('animation__move', {
    property: 'position',
    to: position,
    dur: duration,
    easing
  })
}

function animateCameraRigRotationTo(rotation, duration = 3000, easing = 'easeInOutQuad') {
  cameraRig.removeAttribute('animation__rotate')

  cameraRig.setAttribute('animation__rotate', {
    property: 'rotation',
    to: rotation,
    dur: duration,
    easing
  })
}

function animateCameraLookTo(rotation, duration = 3000, easing = 'easeInOutQuad') {
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

async function playApproachClip() {
  if (theaterRoom && theaterRoom.getAttribute('visible') !== true && theaterRoom.getAttribute('visible') !== 'true') {
    theaterRoom.setAttribute('visible', 'true')
  }

  albumIntroSpace.setAttribute('visible', 'true')

  // Start the camera at eye level, directly behind the album — no pre-tilt
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

  // Phase 1 — push in AND tilt down simultaneously, arriving at birds-eye hover
  // Both animations share the same duration so they finish together
  animateCameraRigTo('0 5.5 -4', 4800, 'easeInOutQuad')
  animateCameraRigRotationTo('-90 0 0', 4800, 'easeInOutQuad')

  await wait(4900)

  // Phase 2 — slow creep downward, getting closer to the page surface
  animateCameraRigTo('0 3.0 -4', 2800, 'easeInQuad')
  // Rig rotation stays at -90 (straight down) — no need to re-set it

  await wait(2900)
}

async function holdOnTitlePage() {
  animateCameraRigTo('0 1.8 2.5', 1200, 'easeOutQuad')
  animateCameraLookTo('-82 0 0', 1200, 'easeOutQuad')
}

async function transitionToMemoryRoom() {
  // Camera tilts downward as if being pulled into the album page
  animateCameraRigTo('0 1.1 1.2', 1200, 'easeInQuad')
  animateCameraLookTo('-88 0 0', 1200, 'easeInQuad')
  await wait(900)

  // Fade screen to black
  fadeOverlay.classList.add('visible')
  await wait(1000)

  // Hide everything from the theater, show the memory room
  albumIntroSpace.setAttribute('visible', 'false')
  theaterRoom.setAttribute('visible', 'false')
  memoryRoom.setAttribute('visible', 'true')

  // Drop the camera inside the room, facing the back wall
  cameraRig.setAttribute('position', '0 1.6 -2')
  cameraRig.setAttribute('rotation', '0 0 0')
  setCameraRotation(0, 0, 0)

  // Small delay so the scene swap settles before we fade back in
  await wait(100)

  // Fade back in
  fadeOverlay.classList.remove('visible')
  // Begin the song-timed animation sequence
  startMemoryRoomSequence()
}
//**Song Playback Functions */



function clearFade(){

  if(fadeInterval){
    clearInterval(fadeInterval);
    fadeInterval = null;
  } 
};

function fadeOutAudio(audio, startVolume, endVolume, duration){
  clearFade();

  const stepTime = 25; // ms
  const steps = Math.max(1, Math.floor(duration / stepTime));
  const volumeStep = (endVolume - startVolume) / steps;
 
  audio.volume = startVolume;

  return new Promise(resolve => {
   let currentStep = 0;

   fadeInterval = setInterval(() => {
     currentStep++;
     const newVolume = startVolume + volumeStep * currentStep;
     audio.volume = Math.max(0, Math.min(1, newVolume));

     if(currentStep >= steps){  
        clearFade();
        audio.volume = endVolume;
        resolve();
     }
   }, stepTime);
 })
};

// ─── Song Cue System ────────────────────────────────────────────────
// Each entry fires once when songAudio.currentTime passes the 'time' value.
// Adjust the time values (in seconds) to match your actual song structure.

const SONG_CUES = [
  { time: 2,   fn: spawnPolaroids },       // Verse 1 starts
  { time: 35,  fn: triggerPageTurn },      // Pre-chorus
  { time: 55,  fn: warmRoomUp },           // Chorus: room brightens
  { time: 90,  fn: showCameraFrame },      // Verse 2: frame appears on wall
  { time: 120, fn: showVideoFrames },      // Bridge: video frame appears
  { time: 145, fn: fullWarmth },           // Final chorus: full brightness
]

let firedCues = new Set()   // tracks which cues have already fired
let cueListener = null      // reference so we can remove the listener on restart

function startMemoryRoomSequence() {
  firedCues.clear()
  // Remove any old listener from a previous playthrough
  if (cueListener) songAudio.removeEventListener('timeupdate', cueListener)

  cueListener = () => {
    const t = songAudio.currentTime
    SONG_CUES.forEach((cue, i) => {
      if (t >= cue.time && !firedCues.has(i)) {
        firedCues.add(i)
        cue.fn()           // fire the animation function
      }
    })
  }
  songAudio.addEventListener('timeupdate', cueListener)
};

// ─── Memory Room Animations ─────────────────────────────────────────

function spawnPolaroids() {
  // Positions and rotations for 6 floating polaroids around the room
  const polaroids = [
    { pos: '-2 1.8 -5',   rot: '0 10 -8'  },
    { pos: '-0.5 2.2 -6', rot: '0 -5 12'  },
    { pos: '1.5 1.5 -5.5',rot: '0 -15 5'  },
    { pos: '2.2 2 -7',    rot: '0 20 -10' },
    { pos: '-1.8 1.4 -7', rot: '0 8 15'   },
    { pos: '0.3 2.5 -8',  rot: '0 -12 -6' },
  ]

  polaroids.forEach(({ pos, rot }, i) => {
    setTimeout(() => {
      // The outer entity positions the polaroid in space
      const entity = document.createElement('a-entity')
      entity.setAttribute('position', pos)
      entity.setAttribute('rotation', rot)

      // White card (the polaroid itself)
      const card = document.createElement('a-box')
      card.setAttribute('width', '0.55')
      card.setAttribute('height', '0.66')
      card.setAttribute('depth', '0.01')
      card.setAttribute('color', '#f5f0e8')
      // Animates upward from slightly below its final position with a bounce
      card.setAttribute('animation', [
        'property: position;',
        'from: 0 -0.4 0;',
        'to: 0 0 0;',
        'dur: 900;',
        'easing: easeOutBack'
      ].join(' '))

      entity.appendChild(card)
      polaroidContainer.appendChild(entity)
    }, i * 700) // each polaroid appears 700ms after the last
  })
}

function triggerPageTurn() {
  // Dims the ambient light slightly — room feels more introspective
  // You'll replace this later with a Blender page-turn GLB animation
  let intensity = 0.3
  const target = 0.15
  const interval = setInterval(() => {
    intensity = Math.max(target, intensity - 0.008)
    memoryAmbient.setAttribute('light', `type: ambient; intensity: ${intensity}; color: #ffcc88`)
    if (intensity <= target) clearInterval(interval)
  }, 40)
}

function warmRoomUp() {
  // Gradually brightens the room for the chorus
  let intensity = parseFloat(memoryAmbient.getAttribute('light').intensity) || 0.3
  const target = 0.75
  const interval = setInterval(() => {
    intensity = Math.min(target, intensity + 0.008)
    memoryAmbient.setAttribute('light', `type: ambient; intensity: ${intensity}; color: #ffcc88`)
    memorySpot.setAttribute('light', `type: point; intensity: ${Math.min(1.2, intensity * 1.5)}; color: #ffaa44; distance: 10`)
    if (intensity >= target) clearInterval(interval)
  }, 40)
}

function showCameraFrame() {
  // Makes a picture frame appear on the back wall
  // Later you'll swap this entity for a Blender model of an actual frame
  const frame = document.createElement('a-entity')
  frame.setAttribute('position', '-2.5 1.8 -8')
  frame.setAttribute('rotation', '0 15 0')

  const border = document.createElement('a-box')
  border.setAttribute('width', '1')
  border.setAttribute('height', '0.8')
  border.setAttribute('depth', '0.05')
  border.setAttribute('color', '#3b2410')
  border.setAttribute('animation', 'property: scale; from: 0 0 0; to: 1 1 1; dur: 1000; easing: easeOutElastic')

  frame.appendChild(border)
  memoryRoom.appendChild(frame)
}

function showVideoFrames() {
  // Reveals the large video frame on the back wall and starts playback
  pictureFrameGroup.setAttribute('visible', 'true')
  pictureFrameGroup.setAttribute('animation', [
    'property: scale;',
    'from: 0 0 0;',
    'to: 1 1 1;',
    'dur: 1200;',
    'easing: easeOutBack'
  ].join(' '))
  // Start playing the video
  if (memoryVideo) {
    memoryVideo.play().catch(err => console.warn('Video autoplay blocked:', err))
  }
}

function fullWarmth() {
  // Final chorus — push lights to their warmest, brightest state
  memoryAmbient.setAttribute('light', 'type: ambient; intensity: 1; color: #ffddaa')
  memorySpot.setAttribute('light',    'type: point;   intensity: 2; color: #ffbb55; distance: 14')
}

startButton.addEventListener('click', async () =>{

  //Fade to black
    fadeOverlay.classList.add('visible');
    await wait(1000);

    welcomeOverlay.classList.add('hidden');

    await wait(300);

    try{
      await introAudio.play();
    } catch (error){
      console.error('Audio has failed to play:', error);
      alert('Intro Audio Could not play, check MP3 file.');
    }

    //Fade back in
    fadeOverlay.classList.remove('visible');
});

introAudio.addEventListener('ended', () =>{
    introHasFinished = true;
    theaterButtonOverlay.classList.remove('hidden');
});


enterTheaterButton.addEventListener('click', async () => {
  if (!introHasFinished) return

  theaterButtonOverlay.classList.add('hidden')

  fadeOverlay.classList.add('visible')
  await wait(1000)

  introRoom.setAttribute('visible', 'false')
  theaterRoom.setAttribute('visible', 'true')
  cameraRig.setAttribute('position', '0 0 6')

  songControlsOverlay.classList.remove('hidden')
  albumIntroSpace.setAttribute('visible', 'true')

  await wait(300)

  fadeOverlay.classList.remove('visible')

  // Start song
  try {
    songAudio.currentTime = 0
    songAudio.volume = 0
    await songAudio.play()
    await fadeAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION)
  } catch (error) {
    console.error('Song failed to play:', error)
    alert('The song could not play. Check that /public/audio/song.mp3 exists.')
  };

// Play Blender approach animation, then transition into the memory room
  try {
    await playApproachClip()
    await transitionToMemoryRoom()
  } catch (error) {
    console.error('Approach clip or transition failed:', error)
  }
});

playSongButton.addEventListener('click', async () =>{
    try{
      clearFade();

      if(songAudio.paused){
        songAudio.volume = 0;
        await songAudio.play();
        await fadeOutAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION);
      } else {
        await fadeOutAudio(songAudio, songAudio.volume, SONG_TARGET_VOLUME, FADE_DURATION);
      }
      
    } catch (error){
      console.error('Song has failed to play:', error);
    }
});

pauseSongButton.addEventListener('click', async () =>{
    if(songAudio.paused) return;

    await fadeOutAudio(songAudio, songAudio.volume, 0, FADE_DURATION)
    songAudio.pause();
});

restartSongButton.addEventListener('click', async () => {
  try {
    clearFade()

    songAudio.pause()
    songAudio.currentTime = 0
    songAudio.volume = 0

    await songAudio.play()
    await fadeAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION)
    await playApproachClip()
    await transitionToMemoryRoom()
  } catch (error) {
    console.error('Song failed to restart:', error)
  }
});
