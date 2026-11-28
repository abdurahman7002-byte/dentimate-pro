/* Full screen toggle: a small icon button placed next to the theme and language buttons
   (dashboard and login page). Uses the browser Fullscreen API; inside the Android app it
   uses the app's immersive mode. F11 toggles it too. Stores nothing. */
(function(){
  var de=document.documentElement;
  var app=window.DentimateApp&&typeof window.DentimateApp.toggleFullscreen==='function'?window.DentimateApp:null;
  var supported=!!app||!!(de.requestFullscreen||de.webkitRequestFullscreen);
  function ar(){ return (de.getAttribute('lang')||'ar').toLowerCase().indexOf('ar')===0; }
  function isFull(){ return app?!!app.isFullscreen():!!(document.fullscreenElement||document.webkitFullscreenElement); }
  function toggle(){
    try{
      if(app){ app.toggleFullscreen(); setTimeout(refresh,300); return; }
      if(isFull()){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); }
      else{ var p=(de.requestFullscreen||de.webkitRequestFullscreen).call(de); if(p&&p.catch)p.catch(function(){}); }
    }catch(_){}
  }
  function refresh(){
    var b=document.getElementById('fullscreenBtn'); if(!b) return;
    var f=isFull();
    var t=f?(ar()?'\u0627\u0644\u062e\u0631\u0648\u062c \u0645\u0646 \u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629':'Exit full screen'):(ar()?'\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629':'Full screen');
    b.title=t; b.setAttribute('aria-label',t);
    var i=b.querySelector('i'); if(i) i.className=f?'fa-solid fa-compress':'fa-solid fa-expand';
  }
  function place(){
    if(!supported||document.getElementById('fullscreenBtn')) return;
    var src=document.getElementById('themeToggle')||document.getElementById('themeBtn');
    if(!src||!src.parentNode) return;
    var b=src.cloneNode(false); /* same class and style as the theme button, no children or handlers */
    b.removeAttribute('onclick'); b.id='fullscreenBtn'; b.type='button';
    b.innerHTML='<i class="fa-solid fa-expand"></i>';
    b.style.minWidth='0'; b.style.width='52px'; b.style.flex='0 0 auto'; b.style.padding='7px 0';
    if(src.id==='themeToggle'){ b.style.height='58px'; }
    b.addEventListener('click',toggle);
    src.parentNode.appendChild(b); refresh();
  }
  document.addEventListener('keydown',function(e){
    if(e.key==='F11'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&supported){ e.preventDefault(); toggle(); }
  });
  ['fullscreenchange','webkitfullscreenchange'].forEach(function(n){ document.addEventListener(n,refresh); });
  new MutationObserver(refresh).observe(de,{attributes:true,attributeFilter:['lang']});
  function go(){ place(); setTimeout(place,1200); setTimeout(place,3500); }
  if(document.readyState==='complete') go(); else window.addEventListener('load',go);
})();
