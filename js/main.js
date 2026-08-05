//Hora destino (FORMATO 24 HORAS)
const destHour = 17;
const destMinute = 0;
const destSecond = 0;
const destTotalSecs = destHour * 3600 + destMinute * 60 + destSecond;

const videoId = "wq30q8NKU_A";
const modal = document.querySelector(".modal");
const modalVideo = document.getElementById("modalVideo");
const playButton = document.getElementById("playButton");
const container = document.querySelector(".container");
const time = document.getElementById("time");

function isFunctionHour() {
  return new Date().getHours() === destHour;
}

function getCurrentOffsetSeconds() {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() - destTotalSecs;
}

function getYoutubeEmbedUrl(startSeconds) {
  const origin = encodeURIComponent(window.location.origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&start=${startSeconds}&rel=0&modestbranding=1&controls=0&fs=1&iv_load_policy=3&playsinline=1&enablejsapi=1&origin=${origin}`;
}

function showVideo(startSeconds) {
  container.classList.add('fade-out');
  document.body.style.overflow = "hidden";
  setTimeout(() => {
    modal.classList.add("show");
    modalVideo.src = getYoutubeEmbedUrl(startSeconds);
  }, 900);
}

function updatePlayButtonVisibility() {
  if (isFunctionHour()) {
    playButton.style.display = "inline-block";
    time.textContent = "";
  } else {
    playButton.style.display = "none";
  }
}

playButton.addEventListener("click", () => {
  let startOffset = getCurrentOffsetSeconds();
  if (startOffset < 0) startOffset = 0;
  showVideo(startOffset);
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("show");
    modalVideo.src = "";
    document.body.style.overflow = "auto";
    container.classList.remove('fade-out');
  }
});

function countdownTimer() {
  const now = new Date();
  const secsActuales = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const secsDistancia = destTotalSecs - secsActuales;

  updatePlayButtonVisibility();

  let displaySeconds = secsDistancia;
  if (now.getHours() === destHour && secsDistancia < 0) {
    displaySeconds = 0;
  }

  if (!isFunctionHour()) {
    const difHMS = new Date(displaySeconds * 1000).toISOString().substr(11, 8);
    time.textContent = difHMS;
  }
}

countdownTimer();
setInterval(countdownTimer, 1000);

// Initialize the preview iframe with origin-aware youtube-nocookie URL
window.addEventListener('DOMContentLoaded', () => {
  const preview = document.querySelector('.responsive-iframe[data-videoid]');
  if (preview) {
    const vid = preview.getAttribute('data-videoid');
    const origin = encodeURIComponent(window.location.origin);
    preview.src = `https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1&enablejsapi=1&playsinline=1&origin=${origin}`;
    preview.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
  }
});
