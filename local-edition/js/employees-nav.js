/* Owner-only "الموظفون" entry in the More menu of every page.
   Injected hidden; revealed only when the is_admin() RPC confirms the
   owner. Hidden on any error. page-guard on employees.html remains the
   real access control - this only controls visibility. */
(function(){
  function build(){
    var a=document.createElement('a');
    a.href='employees.html'; a.className='moore-menu-item';
    a.id='employeesMenuItem'; a.style.display='none';
    a.innerHTML='<div class="moore-item-icon employees"><i class="fa-solid fa-users-gear"></i></div>'+
      '<div><strong>\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646</strong>'+
      '<span>\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646 \u0648\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a</span></div>';
    return a;
  }
  async function run(){
    try{
      var grid=document.querySelector('.moore-menu-grid');
      if(!grid) return;
      var el=document.getElementById('employeesMenuItem');
      if(!el){ el=build(); grid.appendChild(el); }
      if(!window.supabaseClient) return;
      var r=await window.supabaseClient.rpc('is_admin');
      if(!r.error && r.data===true) el.style.display='';
    }catch(_){ /* stay hidden */ }
  }
  /* other page scripts may rebuild the menu after DOMContentLoaded, so run
     after full load and once more shortly after (idempotent) */
  function later(){ run(); setTimeout(run,1500); }
  if(document.readyState==='complete') later(); else window.addEventListener('load',later);
})();
