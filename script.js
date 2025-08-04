// Your 32-byte secret key (pad to 32 bytes)
const keyString = "Talha<what!".padEnd(32);
const encoder = new TextEncoder();
const rawKey = encoder.encode(keyString);

// Get URL parameter
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// Import AES-GCM key
async function importKey() {
  return await crypto.subtle.importKey(
    'raw',
    rawKey.slice(0, 32),
    'AES-GCM',
    false,
    ['decrypt']
  );
}

// Decrypt base64 payload
async function decryptPayload(data) {
  try {
    const binaryStr = atob(data);
    const buffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      buffer[i] = binaryStr.charCodeAt(i);
    }
    const iv = buffer.slice(0, 12);
    const encryptedData = buffer.slice(12);

    const cryptoKey = await importKey();
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedData
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    throw new Error('Decryption failed or invalid data');
  }
}

const video = document.getElementById('video');
const bigPlayBtn = document.getElementById('big-play-button');
const controls = document.getElementById('controls');
const playPauseBtn = document.getElementById('play-pause');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress');
const timeDisplay = document.getElementById('time-display');
const volumeSlider = document.getElementById('volume-slider');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const playerWrapper = document.getElementById('player-wrapper');

// Format seconds to mm:ss
function formatTime(time) {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Toggle play/pause video
function togglePlayPause() {
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

// Update play/pause button icon
function updatePlayPauseIcon() {
  if (video.paused) {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    bigPlayBtn.style.display = 'flex';
  } else {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    bigPlayBtn.style.display = 'none';
  }
}

// Update progress bar and time display
function updateProgress() {
  const percent = (video.currentTime / video.duration) * 100;
  progressBar.style.width = percent + '%';
  timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  progressContainer.setAttribute('aria-valuenow', percent.toFixed(0));
  progressContainer.setAttribute('aria-valuetext', `${formatTime(video.currentTime)} elapsed`);
}

// Seek video on progress bar click
function seek(e) {
  const rect = progressContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const seekTime = (clickX / width) * video.duration;
  video.currentTime = seekTime;
}

// Toggle fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    playerWrapper.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// Show controls on interaction
let controlsTimeout;
function showControls() {
  playerWrapper.classList.add('controls-visible');
  clearTimeout(controlsTimeout);
  controlsTimeout = setTimeout(() => {
    if (!video.paused) {
      playerWrapper.classList.remove('controls-visible');
    }
  }, 3000);
}

// Volume change handler
function changeVolume() {
  video.volume = volumeSlider.value;
}

// Disable right click
video.addEventListener('contextmenu', e => e.preventDefault());

// Keyboard shortcuts (play/pause space, mute m, fullscreen f, etc)
window.addEventListener('keydown', e => {
  if (e.target.tagName.toLowerCase() === 'input') return; // ignore inputs
  switch(e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      togglePlayPause();
      break;
    case 'm':
      video.muted = !video.muted;
      break;
    case 'f':
      toggleFullscreen();
      break;
    case 'arrowright':
      video.currentTime = Math.min(video.currentTime + 10, video.duration);
      break;
    case 'arrowleft':
      video.currentTime = Math.max(video.currentTime - 10, 0);
      break;
  }
});

// Initialize player after decrypting URL
async function setupPlayer() {
  const encryptedData = getParam('Talha');
  if (!encryptedData) {
    alert('No video data found in URL.');
    return;
  }
  try {
    const decryptedText = await decryptPayload(encryptedData);
    const data = JSON.parse(decryptedText);
    video.src = data.url;
    video.title = data.name || "Talha's Stream";

    // Hide big play button on play
    video.addEventListener('play', updatePlayPauseIcon);
    video.addEventListener('pause', updatePlayPauseIcon);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', () => {
      updateProgress();
      showControls();
    });

    // Play/Pause controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    bigPlayBtn.addEventListener('click', togglePlayPause);

    // Progress bar seek
    progressContainer.addEventListener('click', seek);

    // Volume control
    volumeSlider.addEventListener('input', changeVolume);

    // Fullscreen button
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Show controls on mouse move
    playerWrapper.addEventListener('mousemove', showControls);
    playerWrapper.addEventListener('touchstart', showControls);

    // Initially show controls for 3 seconds
    showControls();

  } catch (err) {
    alert('Failed to load video: ' + err.message);
  }
}

window.onload = setupPlayer;
