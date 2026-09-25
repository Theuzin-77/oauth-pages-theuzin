async function check(){
  try{
    const meRes = await fetch('/api/me', { credentials:'same-origin', cache:'no-store' });
    const { user } = await meRes.json();
    const statusEl = document.getElementById('status');
    const meEl = document.getElementById('me');
    const btn = document.getElementById('btnLogout');
    if(user){
      statusEl.innerHTML = `✅ Logado como <b>${user.name || user.email || user.login}</b> via ${user.provider}`;
      meEl.textContent = JSON.stringify(user, null, 2);
      btn.style.display = 'inline-block';
    }else{
      statusEl.textContent = '❌ Não logado - clique em um dos botões';
      meEl.textContent = JSON.stringify({ user:null }, null, 2);
      btn.style.display = 'none';
    }
    const h = await fetch('/api/health', { cache:'no-store' }).then(r=>r.json()).catch(()=>null);
    if(h) document.getElementById('health').textContent = JSON.stringify(h, null, 2);
  }catch(e){
    document.getElementById('status').textContent = 'Erro: '+e.message;
  }
}
function login(p){ window.location.href = '/oauth/login/' + p; }
document.getElementById('logoutForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  await fetch('/oauth/logout', { method:'POST', credentials:'same-origin', headers:{ 'Origin': location.origin } });
  location.reload();
});
check();