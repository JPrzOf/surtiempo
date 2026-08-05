// CONFIG: hora objetivo en 24h
const DEST_HOUR = 17;
const DEST_MINUTE = 0;
const DEST_SECOND = 0;

// Elementos UI
const modal = document.querySelector(".modal");
const container = document.querySelector(".container");
const clockBar = document.getElementById("clock");
const timeEl = document.getElementById("time");
const iframe = document.getElementById('yt-iframe');
const video = document.querySelector('.video'); // fallback if needed

// YouTube player reference
let ytPlayer = null;
let playerReady = false;
let videoId = (iframe && iframe.dataset && iframe.dataset.videoId) ? iframe.dataset.videoId : (window.YOUTUBE_VIDEO_ID || 'wq30q8NKU_A');

// utility: compute today's target and next target
function getTodayTargetDate(now = new Date()) {
  const target = new Date(now);
  target.setHours(DEST_HOUR, DEST_MINUTE, DEST_SECOND, 0);
  return target;
}
function getNextTargetDate(now = new Date()) {
  const t = getTodayTargetDate(now);
  if (now <= t) return t;
  const next = new Date(t.getTime() + 24*60*60*1000);
  return next;
}

// UI: show countdown to a future date (updates every second)
let countdownInterval = null;
function startCountdownTo(targetDate) {
  if (countdownInterval) clearInterval(countdownInterval);
  function update() {
    const now = new Date();
    let diff = Math.floor((targetDate - now) / 1000);
    if (diff <= 0) {
      clearInterval(countdownInterval);
      timeEl.textContent = "00:00:00";
      initOrStartPlayback();
      return;
    }
    const h = String(Math.floor(diff / 3600)).padStart(2,'0');
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2,'0');
    const s = String(diff % 60).padStart(2,'0');
    timeEl.textContent = `${h}:${m}:${s}`;
  }
  update();
  countdownInterval = setInterval(update, 1000);
}

// Initialize YouTube iframe player (load API if needed)
function loadYouTubeAPIAndCreatePlayer() {
  return new Promise((resolve) => {
    if (!iframe) return resolve(null);
    const baseParams = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      autoplay: '1',
      mute: '1',
      enablejsapi: '1',
      controls: '1'
    });
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${baseParams.toString()}`;

    window.onYouTubeIframeAPIReady = function() {
      try {
        ytPlayer = new YT.Player('yt-iframe', {
          events: {
            onReady: function(e) {
              playerReady = true;
              try { e.target.mute(); } catch (err) {}
              try { e.target.playVideo && e.target.playVideo(); } catch (err) {}
              resolve(ytPlayer);
            },
            onStateChange: function(e) {
              if (e && e.data === 0) { // ended
                const next = getNextTargetDate(new Date());
                modal.style.opacity = 0;
                container.style.opacity = 1;
                document.body.style.overflow = "auto";
                startCountdownTo(next);
              }
            }
          }
        });
      } catch (err) {
        console.warn('Error creating YT player', err);
        resolve(null);
      }
    };

    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    } else {
      window.onYouTubeIframeAPIReady();
    }
  });
}

// Main logic: decide to play now or show countdown
async function initOrStartPlayback() {
  const now = new Date();
  const todayTarget = getTodayTargetDate(now);
  const nextTarget = getNextTargetDate(now);

  if (!videoId) {
    console.warn('No YOUTUBE video id configured.');
    startCountdownTo(nextTarget);
    return;
  }

  if (now < todayTarget) {
    startCountdownTo(todayTarget);
    return;
  }

  // now >= today's start: elapsed seconds since 17:00
  const elapsed = Math.floor((now - todayTarget) / 1000);

  const player = await loadYouTubeAPIAndCreatePlayer();

  if (!player) {
    // fallback: reload iframe with start param
    const params = new URLSearchParams({
      rel:'0', modestbranding:'1', autoplay:'1', mute:'1', start: String(elapsed), controls:'1'
    });
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    modal.style.opacity = 1;
    container.style.opacity = 0;
    document.body.style.overflow = "hidden";
    return;
  }

  function getDurationWithRetry(attempts = 12, delayMs = 300) {
    return new Promise((resolve) => {
      let tries = 0;
      const t = setInterval(() => {
        tries++;
        let dur = 0;
        try { dur = player.getDuration(); } catch (e) { dur = 0; }
        if (dur && dur > 0) {
          clearInterval(t);
          resolve(dur);
        } else if (tries >= attempts) {
          clearInterval(t);
          resolve(dur || 0);
        }
      }, delayMs);
    });
  }

  const duration = await getDurationWithRetry();
  if (duration && elapsed < Math.floor(duration)) {
    try {
      modal.style.opacity = 1;
      container.style.opacity = 0;
      document.body.style.overflow = "hidden";
      player.seekTo(elapsed, true);
      try { player.mute(); } catch (e) {}
      try { player.playVideo && player.playVideo(); } catch (e) {}
    } catch (err) {
      console.warn('Error seeking/playing:', err);
      const params = new URLSearchParams({
        rel:'0', modestbranding:'1', autoplay:'1', mute:'1', start: String(elapsed), controls:'1', enablejsapi:'1'
      });
      iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    }
  } else {
    player.pauseVideo && player.pauseVideo();
    const next = getNextTargetDate(now);
    modal.style.opacity = 0;
    container.style.opacity = 1;
    document.body.style.overflow = "auto";
    startCountdownTo(next);
  }
}

// Create overlay to unmute on first click
function createUnmuteOverlay() {
  if (!iframe) return;
  const parent = iframe.parentElement;
  if (!parent) return;
  const prevPos = window.getComputedStyle(parent).position;
  if (!prevPos || prevPos === 'static') parent.style.position = 'relative';

  const overlay = document.createElement('div');
  overlay.id = 'yt-unmute-overlay';
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    cursor: 'pointer',
    background: 'transparent',
    zIndex: '999'
  });
  overlay.title = 'Hacer click para activar sonido';
  parent.appendChild(overlay);

  overlay.addEventListener('click', function() {
    try {
      if (ytPlayer && typeof ytPlayer.unMute === 'function') {
        ytPlayer.unMute();
        ytPlayer.setVolume && ytPlayer.setVolume(100);
        overlay.remove();
        return;
      }
    } catch (err) {
      console.warn('Error unmute via API:', err);
    }
    const params = new URLSearchParams({
      rel:'0', modestbranding:'1', autoplay:'1', mute:'0', controls:'1', enablejsapi:'1'
    });
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    overlay.remove();
  });
}

// Start on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  initOrStartPlayback();
  createUnmuteOverlay();
});

// Expose for debugging
window._surtiempo = {
  initOrStartPlayback, getNextTargetDate, getTodayTargetDate
};
