// js/main.js
// Versión: botón "Ver función" que abre modal en negro y reproduce el embed de YouTube
// Comportamiento:
//  - Si ahora está entre 17:00 y 17:59:59: al click reproducir el video en el segundo correspondiente (para que termine a las 18:00).
//  - Si ahora < 17:00 o >= 18:00: mostrar el contador hasta la próxima función.
//  - No hay fade-in automático al cargar la página.
//  - Reproducción inicia muteada; botón visible para activar sonido.

const DEST_HOUR = 17;
const DEST_MINUTE = 0;
const DEST_SECOND = 0;

const KNOWN_VIDEO_DURATION = 3600; // 1 hora

// Elementos
const modal = document.querySelector('.modal');
const videoContainer = document.querySelector('.videoContainer');
const container = document.querySelector('.container');
const clockEl = document.getElementById('clock');
const timeEl = document.getElementById('time');
const verBtn = document.getElementById('ver-funcion-btn'); // botón que añadiste en index.html

// YouTube video id que querías reproducir
const YT_VIDEO_ID = 'wq30q8NKU_A';

// temporizadores
let countdownInterval = null;
let hideTimeout = null;

// Helpers de tiempo
function todayTarget(now = new Date()) {
  const t = new Date(now);
  t.setHours(DEST_HOUR, DEST_MINUTE, DEST_SECOND, 0);
  return t;
}
function nextTarget(now = new Date()) {
  const t = todayTarget(now);
  if (now <= t) return t;
  return new Date(t.getTime() + 24*60*60*1000);
}
function formatHMS(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = String(Math.floor(sec / 3600)).padStart(2,'0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2,'0');
  const s = String(sec % 60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

// Mostrar contador hasta target (actualiza cada segundo)
function startCountdownTo(targetDate) {
  if (countdownInterval) clearInterval(countdownInterval);
  function update() {
    const now = new Date();
    let diff = Math.floor((targetDate - now) / 1000);
    if (diff <= 0) {
      clearInterval(countdownInterval);
      if (timeEl) timeEl.textContent = '00:00:00';
      // si el reloj llega a la hora, no lanzamos automáticamente: el usuario puede presionar "Ver función"
      return;
    }
    if (timeEl) timeEl.textContent = formatHMS(diff);
  }
  update();
  countdownInterval = setInterval(update, 1000);
}

// UI modal show/hide (no fade-in al cargar)
function showModal() {
  if (modal) modal.style.opacity = 1;
  if (container) container.style.opacity = 0;
  try { document.body.style.overflow = 'hidden'; } catch(e) {}
}
function hideModal() {
  if (modal) modal.style.opacity = 0;
  if (container) container.style.opacity = 1;
  try { document.body.style.overflow = 'auto'; } catch(e) {}
  // limpiar iframe/hideTimeout si quedó algo
  if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
  // vaciar videoContainer y restaurar (dejamos preview iframe del index intacto bajo .videoExtra)
  // Si dentro de videoContainer se añadió un iframe dinámico, lo removemos
  const created = videoContainer.querySelector('#surtiempo-yt-player');
  if (created) created.remove();
  const soundBtn = videoContainer.querySelector('#surtiempo-sound-btn');
  if (soundBtn) soundBtn.remove();
}

// Crea y agrega iframe de YouTube al modal y devuelve referencia
function injectYouTubeIframe(startSec, muted = true) {
  // limpiar cualquier iframe existente
  const existing = videoContainer.querySelector('#surtiempo-yt-player');
  if (existing) existing.remove();

  // Usamos youtube-nocookie para reducir trackers (algunas extensiones siguen bloqueando)
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    autoplay: '1',
    mute: muted ? '1' : '0',
    start: String(Math.max(0, Math.floor(startSec))),
    controls: '1',
    playsinline: '1'
  });

  const iframe = document.createElement('iframe');
  iframe.id = 'surtiempo-yt-player';
  iframe.className = 'responsive-iframe';
  iframe.width = '560';
  iframe.height = '315';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen');
  iframe.allowFullscreen = true;
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(YT_VIDEO_ID)}?${params.toString()}`;

  // Insertar en videoContainer: buscamos el primer hijo (por la estructura original hay un <video> en el modal)
  // Vamos a esconder el <video> original si existe para que el iframe ocupe el espacio.
  const vid = videoContainer.querySelector('video');
  if (vid) { vid.style.display = 'none'; }

  // Asegurar contenedor para el iframe: si .videoContainer no tiene tamaño por el CSS, insertar en su interior.
  // Añadimos el iframe y también un botón de sonido visible
  videoContainer.appendChild(iframe);

  // Botón visible para habilitar sonido
  const soundBtn = document.createElement('button');
  soundBtn.id = 'surtiempo-sound-btn';
  soundBtn.textContent = 'Activar sonido';
  Object.assign(soundBtn.style, {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    zIndex: '1001',
    padding: '10px 14px',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255,255,255,0.9)',
    color: '#000'
  });
  // Asegurar que el contenedor esté en position:relative para posicionar el botón
  const prevPos = window.getComputedStyle(videoContainer).position;
  if (!prevPos || prevPos === 'static') videoContainer.style.position = 'relative';
  videoContainer.appendChild(soundBtn);

  // Al click en el botón re-cargamos el iframe sin mute (fallback simple)
  soundBtn.addEventListener('click', () => {
    const now = new Date();
    const startNow = Math.floor((now - todayTargetClamp(now)) / 1000);
    const params2 = new URLSearchParams({
      rel: '0', modestbranding: '1', autoplay: '1', mute: '0', start: String(Math.max(0, startNow)), controls: '1', playsinline: '1'
    });
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(YT_VIDEO_ID)}?${params2.toString()}`;
    // removemos el botón (el usuario ya activó)
    soundBtn.remove();
  });

  return iframe;
}

// clamp today target so seconds calculation doesn't overshoot to negative before 17:00
function todayTargetClamp(now) {
  const t = todayTarget(now);
  return t;
}

// Start playback flow invoked on button click
function handleVerFuncionClick(e) {
  const now = new Date();
  const tToday = todayTarget(now);
  const tNext = nextTarget(now);

  if (now < tToday) {
    // Antes de 17:00 -> no reproducir, mostrar countdown hasta hoy 17:00
    startCountdownTo(tToday);
    alert('La función comienza a las 17:00. Mostrando cuenta regresiva.');
    return;
  }

  // Si ya pasó la hora límite (>= 18:00) -> mostrar siguiente conteo
  const endToday = new Date(tToday.getTime() + KNOWN_VIDEO_DURATION*1000); // 18:00 (si duración = 3600s)
  if (now >= endToday) {
    startCountdownTo(tNext);
    alert('La función terminó hoy; mostrando cuenta regresiva hasta la próxima función (17:00).');
    return;
  }

  // Estamos entre 17:00 y 18:00 -> reproducir sincronizado
  // elapsed = segundos desde 17:00
  const elapsed = Math.floor((now - tToday) / 1000);

  // mostrar modal (va a negro por CSS de modal)
  showModal();

  // Inyectar iframe con start=elapsed y mute=1
  const playerIframe = injectYouTubeIframe(elapsed, true);

  // Calcular cuánto queda hasta terminar (para cerrar modal automáticamente a las 18:00)
  const remainingMs = (endToday.getTime() - now.getTime());
  // Si hubiera un hideTimeout anterior, limpiarlo
  if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
  // programar ocultar modal a las 18:00 exacto (más 500ms tolerancia)
  hideTimeout = setTimeout(() => {
    hideModal();
    // remover iframe insertado
    const created = videoContainer.querySelector('#surtiempo-yt-player');
    if (created) created.remove();
    const btn = videoContainer.querySelector('#surtiempo-sound-btn');
    if (btn) btn.remove();
    // si existe el <video> original, restaurarlo
    const vid = videoContainer.querySelector('video');
    if (vid) { vid.style.display = ''; }
    startCountdownTo(nextTarget(new Date()));
    hideTimeout = null;
  }, Math.max(0, remainingMs + 500));
}

// Initial timer visible on page load: show appropriate countdown / remaining
function refreshClockOnce() {
  const now = new Date();
  const tToday = todayTarget(now);
  const endToday = new Date(tToday.getTime() + KNOWN_VIDEO_DURATION*1000);

  if (now < tToday) {
    // show countdown to today 17:00
    startCountdownTo(tToday);
  } else if (now >= tToday && now < endToday) {
    // inside the function window -> show remaining until end
    const remaining = Math.floor((endToday.getTime() - now.getTime()) / 1000);
    if (timeEl) timeEl.textContent = formatHMS(remaining);
    // also update every second
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      const now2 = new Date();
      const rem2 = Math.floor((endToday.getTime() - now2.getTime()) / 1000);
      if (rem2 <= 0) {
        clearInterval(countdownInterval);
        startCountdownTo(nextTarget(new Date()));
        return;
      }
      if (timeEl) timeEl.textContent = formatHMS(rem2);
    }, 1000);
  } else {
    // after end -> countdown to next day's 17:00
    startCountdownTo(nextTarget(now));
  }
}

// Start: attach click handler and initialize clock (do not autoplay on load)
document.addEventListener('DOMContentLoaded', function() {
  // ensure modal is hidden on load and we do NOT trigger any fade-in
  if (modal) modal.style.opacity = 0;
  if (container) container.style.opacity = 1;

  // attach button handler (only if button exists)
  if (verBtn) {
    verBtn.addEventListener('click', handleVerFuncionClick);
  }

  // initialize visible clock/counter
  refreshClockOnce();
});
