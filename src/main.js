import 'aframe'
import './style.css'

document.querySelector('#app').innerHTML = `
  <a-scene>
    <a-sky color="#101018"></a-sky>

    <a-entity position="0 1.6 4">
      <a-camera></a-camera>
    </a-entity>

    <a-plane
      position="0 0 -4"
      rotation="-90 0 0"
      width="12"
      height="12"
      color="#222">
    </a-plane>

    <a-box
      position="0 1 -3"
      rotation="0 45 0"
      color="#7c5cff"
      animation="property: rotation; to: 0 405 0; loop: true; dur: 4000">
    </a-box>

    <a-light type="ambient" intensity="0.8"></a-light>
    <a-light type="directional" position="2 4 2" intensity="0.9"></a-light>
  </a-scene>
`