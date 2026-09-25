import { noStoreHeaders } from '../_shared/cookies.js';
export async function onRequest(){
  return new Response(JSON.stringify({ ok:true, time:new Date().toISOString() }), { headers:{ 'Content-Type':'application/json', ...noStoreHeaders() } });
}