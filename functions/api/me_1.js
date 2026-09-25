import { parseCookies, noStoreHeaders } from '../_shared/cookies.js';
import { sha256B64url, nowSec } from '../_shared/crypto.js';
import { ensureTables } from '../_shared/d1.js';

export async function onRequest(context){
  const headers = { 'Content-Type':'application/json', ...noStoreHeaders() };
  try{
    if(!context.env.DB) return new Response(JSON.stringify({ user:null }), { headers });
    await ensureTables(context.env.DB);
    const cookies = parseCookies(context.request);
    const sess = cookies['__Host-session'];
    if(!sess) return new Response(JSON.stringify({ user:null }), { headers });
    const hash = await sha256B64url(sess);
    const row = await context.env.DB.prepare(`SELECT * FROM sessions WHERE session_hash=?`).bind(hash).first();
    if(!row || row.expires_at < nowSec()){
      if(row) await context.env.DB.prepare(`DELETE FROM sessions WHERE session_hash=?`).bind(hash).run();
      return new Response(JSON.stringify({ user:null }), { headers });
    }
    const user = {
      provider: row.provider,
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatar: row.avatar,
      login: row.login,
    };
    return new Response(JSON.stringify({ user }), { headers });
  }catch(e){
    return new Response(JSON.stringify({ user:null, error:e.message }), { headers, status:500 });
  }
}