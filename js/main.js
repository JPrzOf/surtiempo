//Hora destino (FORMATO 24 HORAS) **MODIFICADO PARA TESTEO
let destHour = 17                   //
let destMinute = 0           //
let destSecond = 0       //
//////////////////////////////////////////////////////////
let destTotalSecs = destHour*3600+destMinute*60+destSecond*1;

let modal = document.querySelector(".modal");
// let videoContainer = document.querySelector(".videoContainer");
let video = document.querySelector(".video");
let container = document.querySelector(".container");
let clockBar = document.getElementById("clock");
let time = document.getElementById("time");

function countdownTimer() {

  h = new Date().getHours();
  m = new Date().getMinutes();
  s = new Date().getSeconds();
  let secsActuales = h*3600+m*60+s;
  let secsDistancia = destTotalSecs-secsActuales;

  // QUE PASA SI ALGUIEN ENTRA MIENTRAS EL VIDEO DEBERIA ESTAR REPRODUCIENDOSE?
  // Este if es valido si el video deberia estar reproduciendose y todavia faltan mas de 8 segundos para que el video finalice
  if ( !video.playing && secsDistancia<=0 && secsDistancia>( (video.duration-8) * (-1) ) ){
    start(Math.abs(secsDistancia));
  }

  if ( !video.playing && secsDistancia == 4 ) {
    start(0);
  }

  //Desvanecer el video 6 segundos antes de que termine
  if (video.playing && video.currentTime>=video.duration-6) {
    modal.style.opacity = 0;
  }
  // video.addEventListener("timeupdate",(e)=>{console.log(e.target.currentTime);}); //ESTA PODRIA SER OTRA FORMA

  // // En 00:00:04 empiezo a mostrar video y quito el timer, tambien añado un evento para que cuando termine mueste el boton y el reloj
  // if (secsDistancia == 4) {
  //   clockBar.style.opacity = 0;
  //   video.addEventListener("ended", () => {
  //     setTimeout(()=>{clockBar.style.opacity = 1;},5000);
  //   });
  // }
  //
  // // En 00:00:00 muestro video y lo reproduzco
  // if (secsDistancia == 0) {
  //   video.style.opacity = 1;
  //   video.play().then( () => {} ).catch(error => {console.log(error);});
  // }
  //
  // // 6 segundos antes de que termine el video lo voy apagando
  // if (video.playing && video.currentTime> video.duration - 6) {
  //   video.style.opacity=0;
  // }
  //
  //
  // //QUE PASA SI ALGUIEN ENTRA MIENTRAS EL VIDEO DEBERIA ESTAR REPRODUCIENDOSE?
  // //Este if es valido si el video deberia estar reproduciendose y todavia faltan mas de 8 segundos para que el video finalice
  // if ( !video.playing && secsDistancia<0 && secsDistancia>( (video.duration-8) * (-1) ) ) {
  //   clockBar.style.opacity = 0;
  //   video.currentTime = Math.abs(secsDistancia);
  //   console.log(`El video debería estar en curso, duración del video: ${video. duration}, empezando a reproducir desde el segundo ${Math.abs(secsDistancia)}`);
  //   video.style.opacity = 1;
  //   video.play().then( () => {} ).catch(error => {console.log(error);});
  //   video.addEventListener("ended", () => {
  //     setTimeout(()=>{clockBar.style.opacity = 1;},5000);
  //   });
  //
  // }







  //FORMATEO SEGUNDOS A HH:MM:SS y muestro en la pantalla
  let difHMS = new Date(secsDistancia * 1000).toISOString().substr(11, 8);
  time.innerHTML = difHMS;

}
 interval = setInterval(countdownTimer, 1000);



//START. Esta funcion desvanece todo el texto que haya en la pantalla
function start(startTime) {

  container.style.opacity = 0;
  video.currentTime = startTime;
  setTimeout(()=>{document.body.style.overflow= "hidden";},2000)
  setTimeout(()=>{
    modal.style.opacity = 1;
    // video.addEventListener("canplaythrough",()=>{video.play().then( () => {} ).catch(error => {console.log(error);});})
    video.play()

    video.addEventListener("ended",(e)=>{
      container.style.opacity = 1;
      document.body.style.overflow= "auto";
    });
  },3000);

}









 Object.defineProperty(HTMLMediaElement.prototype, 'playing', {  //un bloque de codigo que luego me va a servir para saber si un video se esta reproduciendo o no
     get: function(){
         return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
     }
 })
