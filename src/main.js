import 'aframe'
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
const fadeOverlay = document.getElementById('fadeOverlay');

const introRoom = document.getElementById('introRoom');
const theaterRoom = document.getElementById('theaterRoom');
const cameraRig = document.getElementById('cameraRig');

const introAudio = document.getElementById('introAudio');
const songControlsOverlay = document.getElementById('songControlsOverlay');

const playSongButton = document.getElementById('playSongButton');
const pauseSongButton = document.getElementById('pauseSongButton');
const restartSongButton = document.getElementById('restartSongButton');

let introHasFinished = false; 

// Pause for `ms` milliseconds
function wait(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

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



enterTheaterButton.addEventListener('click', async () =>{
    if(!introHasFinished) return;

    theaterButtonOverlay.classList.add('hidden');

    //Fade to black before switching rooms
    fadeOverlay.classList.add('visible');
    await wait(1000);

    //Swap Rooms during black screen
    introRoom.setAttribute('visible', 'false');
    theaterRoom.setAttribute('visible', 'true');
    cameraRig.setAttribute('position', '0 0 6');

    songControlsOverlay.classList.remove('hidden');

    //pause briefly
    await wait(300)

    try{
      songAudio.currentTime = 0;
      songAudio.volume = 0;
      await songAudio.play();
      await fadeOutAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION);
    } catch (error){
      console.error('Audio has failed to play:', error);
      alert('Song Audio Could not play, check MP3 file.');
    }


    //Fade back in
    fadeOverlay.classList.remove('visible');
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

restartSongButton.addEventListener('click', async () =>{

    try{
      clearFade();

      songAudio.pause();
      songAudio.currentTime = 0;
      songAudio.volume = 0;

      await songAudio.play();
      await fadeOutAudio(songAudio, 0, SONG_TARGET_VOLUME, FADE_DURATION);
    } catch (error){
      console.error('Song failed to restart', error);
    }
});
