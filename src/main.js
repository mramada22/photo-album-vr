import 'aframe'
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

  <a-scene>
    <a-assets>
      <audio id="introAudio" src="/audio/Intro.mp3" preload="auto"></audio>
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
      <a-plane position="0 0 -4" rotation="-90 0 0" width="18" height="18" color="#101010"></a-plane>
      <a-plane position="0 4 -12" width="10" height="5" color="#f2f2f2"></a-plane>

      <a-box position="0 1 -9" width="8" height="0.5" depth="3" color="#2b2b2b"></a-box>

      <a-light type="ambient" intensity="0.45"></a-light>
      <a-light type="spot" position="0 6 -6" rotation="-60 0 0" intensity="1.2" angle="30"></a-light>

      <a-text
        value="The Theater"
        position="0 5 -10"
        align="center"
        width="10"
        color="#ffffff">
      </a-text>
    </a-entity>
  </a-scene>
`

const startButton = document.getElementById('startButton');
const enterTheaterButton = document.getElementById('enterTheaterButton');

const welcomeOverlay = document.getElementById('welcomeOverlay');
const theaterButtonOverlay = document.getElementById('theaterButtonOverlay');

const introRoom = document.getElementById('introRoom');
const theaterRoom = document.getElementById('theaterRoom');
const cameraRig = document.getElementById('cameraRig');

const introAudio = document.getElementById('introAudio');

let introHasFinished = false; 

startButton.addEventListener('click', async () =>{
    welcomeOverlay.classList.add('hidden');

    try{
      await introAudio.play();
    } catch (error){
      console.error('Audio has failed to play:', error);
      alert('Intro Audio Could not play, check MP3 file.');
    }
});

introAudio.addEventListener('ended', () =>{
    introHasFinished = true;
    theaterButtonOverlay.classList.remove('hidden');
});

enterTheaterButton.addEventListener('click', () =>{
    if(!introHasFinished) return;

    theaterButtonOverlay.classList.add('hidden');

    introRoom.setAttribute('visible', 'false');
    theaterRoom.setAttribute('visible', 'true');

    cameraRig.setAttribute('position', '0 0 6');
})