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
    </a-assets>

    <a-sky id="sky" color="#111111"></a-sky>

    <a-entity id="cameraRig" position="0 0 4">
      <a-camera wasd-controls-enabled="true"></a-camera>
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

    <a-entity
        id="approachAlbumEntity"
        gltf-model="#approachAlbumModel"
        position="0 1.4 -4"
        rotation="0 0 0"
        scale="1 1 1">
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

  cameraRig.setAttribute('position', '0 2.8 6.5')
  setCameraRotation(-28, 0, 0)

  await waitForModel(approachAlbumEntity)

  approachAlbumEntity.removeAttribute('animation-mixer')
  await wait(50)

  approachAlbumEntity.setAttribute(
    'animation-mixer',
    'clip: *; loop: once; clampWhenFinished: true; timeScale: 1'
  )

  await wait(40)
  setCameraRotation(0, 0, 0)
  animateCameraRigTo('0 6 -4', 4200, 'easeInOutQuad')
  animateCameraRigRotationTo('-90 0 0', 4200, 'easeInOutQuad')

  await wait(4500)
  animateCameraRigTo('0 3.2 -4.5', 2600, 'easeInOutQuad')
  animateCameraRigRotationTo('-90 0 0', 2600, 'easeInOutQuad')
}

async function holdOnTitlePage() {
  animateCameraRigTo('0 1.8 2.5', 1200, 'easeOutQuad')
  animateCameraLookTo('-82 0 0', 1200, 'easeOutQuad')
}

async function enterPageWorldPlaceholder() {
  animateCameraRigTo('0 1.1 1.2', 1200, 'easeInQuad')
  animateCameraLookTo('-88 0 0', 1200, 'easeInQuad')

  await wait(900)

  fadeOverlay.classList.add('visible')
  await wait(900)

  albumIntroSpace.setAttribute('visible', 'false')

  cameraRig.setAttribute('position', '0 0 4')
  setCameraRotation(0, 0, 0)

  fadeOverlay.classList.remove('visible')
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
  }

  // Play Blender approach animation
  try {
    await playApproachClip()
  } catch (error) {
    console.error('Approach clip failed to play:', error)
  }
})

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
  } catch (error) {
    console.error('Song failed to restart:', error)
  }
});
