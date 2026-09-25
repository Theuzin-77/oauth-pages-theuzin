import { parseCookies, clearHostCookie, noStoreHeaders } from '../_shared/cookies.js';
import { sha256B64url } from '../_shared/crypto.js';
import { ensureTables } from '../_shared/d1.js';

export async function onRequest(context){
  const headersBase = noStoreHeaders();
  if(context.request.method!=='POST'){
    return new Response('Method Not Allowed - use POST', { status:405, headers: { ...headersBase, 'Allow':'POST' } });
  }
  try{
    if(!context.env.DB) return new Response(JSON.stringify({ ok:true }), { headers: { 'Content-Type':'application/json', ...headersBase } });
    await ensureTables(context.env.DB);

    const publicBase = context.env.PUBLIC_BASE_URL;
    const origin = context.request.headers.get('Origin');
    if(publicBase && origin !== publicBase){
      return new Response('Origin inválido', { status:403, headers: headersBase });
    }

    const cookies = parseCookies(context.request);
    const sess = cookies['__Host-session'];
    if(sess){
      const hash = await sha256B64url(sess);
      await context.env.DB.prepare(`DELETE FROM sessions WHERE session_hash=?`).bind(hash).run();
    }

    const headers = new Headers();
    headers.set('Content-Type','application/json');
    for(const [k,v] of Object.entries(headersBase)) headers.set(k,v);
    headers.append('Set-Cookie', clearHostCookie('__Host-session', { path:'/', sameSite:'Strict' }));

    return new Response(JSON.stringify({ ok:true }), { headers });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:e.message }), { status:500, headers: { 'Content-Type':'application/json', ...headersBase } });
  }
}