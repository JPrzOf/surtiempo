// CONFIG: hora objetivo en 24h
const DEST_HOUR = 17;
const DEST_MINUTE = 0;
const DEST_SECOND = 0;

// Elementos UI
const modal = document.querySelector(".modal");
const container = document.querySelector(".container");
const timeEl = document.getElementById("time");
const iframe = document.getElementById('yt-iframe');

// YouTube player reference
let ytPlayer = null;
let playerReady = false;
let videoId = (iframe && iframe.dataset && iframe.dataset.videoId) ? iframe.dataset.videoId : (window.YOUTUBE_VIDEO_ID || 'wq30q8NKU_A');
// video known duration (1 hora)
const KNOWN_VIDEO_DURATION = 3600;

// Helpers de tiempo
function getTodayTargetDate(now = new Date()) {
  const t = new Date(now);
  t.setHours(DEST_HOUR, DEST_MINUTE, DEST_SECOND, 0);
  return t;
}
function getNextTargetDate(now = new Date()) {
  const t = getTodayTargetDate(now);
  if (now <= t) return t;
  return new Date(t.getTime() + 24*60*60*1000);
}

// Countdown
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

// Mostrar/u ocultar modal
function showModal() {
  if (modal) {
    modal.style.opacity = 1;
  }
  if (container) {
    container.style.opacity = 0;
  }
  try { document.body.style.overflow = "hidden"; } catch(e){}
}
function hideModal() {
  if (modal) modal.style.opacity = 0;
  if (container) container.style.opacity = 1;
  try { document.body.style.overflow = "auto"; } catch(e){}
}

// Carga inmediata del iframe con start (fallback rápido)
function setIframeWithStart(startSec, muted = true) {
  if (!iframe) return;
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    autoplay: '1',
    mute: muted ? '1' : '0',
    start: String(Math.max(0, Math.floor(startSec))),
    controls: '1',
    enablejsapi: '1'
  });
  iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

// Cargar API y crear player
function loadYouTubeAPIAndCreatePlayer() {
  return new Promise((resolve) => {
    if (!iframe) return resolve(null);
    // set src minimal para que el iframe exista ya (si no lo puso el fallback)
    if (!iframe.src) setIframeWithStart(0, true);

    window.onYouTubeIframeAPIReady = function() {
      try {
        ytPlayer = new YT.Player('yt-iframe', {
          events: {
            onReady: function(e) {
              playerReady = true;
              try { e.target.mute(); } catch(e){}
              try { e.target.playVideo && e.target.playVideo(); } catch(e){}
              resolve(ytPlayer);
            },
            onStateChange: function(e) {
              if (e && e.data === 0) { // ended
                hideModal();
                startCountdownTo(getNextTargetDate(new Date()));
              }
            }
          }
        });
      } catch (err) {
        console.warn('YT Player create error', err);
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

// Intentar obtener duración con retry; si no responde, usar KNOWN_VIDEO_DURATION
function getDurationWithRetry(player, attempts = 12, delayMs = 300) {
  return new Promise((resolve) => {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      let dur = 0;
      try { dur = player.getDuration(); } catch(e){ dur = 0; }
      if (dur && dur > 0) {
        clearInterval(t);
        resolve(Math.floor(dur));
      } else if (tries >= attempts) {
        clearInterval(t);
        resolve(0);
      }
    }, delayMs);
  });
}

// Lógica principal
async function initOrStartPlayback() {
  const now = new Date();
  const today = getTodayTargetDate(now);
  const next = getNextTargetDate(now);

  if (!videoId) {
    console.warn('No videoId configurado');
    startCountdownTo(next);
    return;
  }

  if (now < today) {
    // antes de la función
    startCountdownTo(today);
    return;
  }

  // entre 17:00 y adelante -> calculamos elapsed (segundos desde 17:00)
  const elapsed = Math.floor((now - today) / 1000);

  // mostrarmos modal de inmediato y forzamos iframe con start=elapsed (fallback inmediato)
  showModal();
  setIframeWithStart(elapsed, true);

  // tratamos de crear player y sincronizar (seek/play) cuando esté listo
  const player = await loadYouTubeAPIAndCreatePlayer();

  if (!player) {
    // si no se pudo crear player, ya cargamos el iframe con start=elapsed, lo dejamos.
    return;
  }

  // si player existe, pedimos duration con retry
  const reportedDuration = await getDurationWithRetry(player, 12, 300);
  const duration = (reportedDuration > 0) ? reportedDuration : KNOWN_VIDEO_DURATION;

  if (elapsed < duration) {
    // video debe estar reproduciéndose y terminar a las 18:00
    try {
      // seekTo y reproducir (muted)
      if (typeof player.seekTo === 'function') {
        player.seekTo(elapsed, true);
      } else {
        // fallback: recargar iframe con start param
        setIframeWithStart(elapsed, true);
      }
      try { player.mute(); } catch(e){}
      try { player.playVideo && player.playVideo(); } catch(e){}
    } catch (err) {
      console.warn('Error en seek/play, recargando iframe con start:', err);
      setIframeWithStart(elapsed, true);
    }
    return;
  }

  // si elapsed >= duración => ya finalizó para hoy
  hideModal();
  startCountdownTo(getNextTargetDate(now));
}

// Overlay para desmutear al click
function createUnmuteOverlay() {
  if (!iframe) return;
  const parent = iframe.parentElement;
  if (!parent) return;
  if (document.getElementById('yt-unmute-overlay')) return;
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
      console.warn('Error unmute via API', err);
    }
    // fallback: recargar iframe sin mute
    const now = new Date();
    const elapsedNow = Math.floor((now - getTodayTargetDate(now)) / 1000);
    const params = new URLSearchParams({
      rel:'0', modestbranding:'1', autoplay:'1', mute:'0', start: String(Math.max(0, elapsedNow)), controls:'1', enablejsapi:'1'
    });
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    overlay.remove();
  });
}

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', function() {
  createUnmuteOverlay();
  initOrStartPlayback();
});

// export para debugging
window._surtiempo = { initOrStartPlayback, getTodayTargetDate, getNextTargetDate };
