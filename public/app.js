async function check(){
  try{
    const meRes = await fetch('/api/me');
    const meData = await meRes.json();
    document.getElementById('me').textContent = JSON.stringify(meData, null, 2);
    
    if(meData.user || meData.name || meData.email){
      const nome = meData.user?.name || meData.name || meData.email || 'usuário';
      document.getElementById('status').innerHTML = `✅ Logado como <b>${nome}</b> (${meData.provider || meData.user?.provider || ''})`;
      document.getElementById('btnLogout').style.display = 'block';
    } else {
      document.getElementById('status').textContent = '❌ Não logado - clique em um dos botões';
    }

    const healthRes = await fetch('/api/health').catch(()=>null);
    if(healthRes){
      const h = await healthRes.json();
      document.getElementById('health').textContent = JSON.stringify(h, null, 2);
    }
  }catch(e){
    document.getElementById('status').textContent = 'Erro: ' + e.message;
    document.getElementById('me').textContent = String(e);
  }
}
function login(p){ window.location.href = '/oauth/login/' + p; }
async function logout(){ await fetch('/oauth/logout'); location.reload(); }
check();