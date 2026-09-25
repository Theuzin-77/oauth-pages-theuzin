export function parseCookies(request){
  const h = request.headers.get('Cookie') || '';
  const out = {};
  h.split(';').forEach(p=>{
    const i = p.indexOf('=');
    if(i>-1){
      const k = p.slice(0,i).trim();
      const v = p.slice(i+1).trim();
      if(k) out[k]=decodeURIComponent(v);
    }
  });
  return out;
}
export function setHostCookie(name, value, opts={}){
  // opts: maxAge, path, sameSite
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path||'/'}`, 'HttpOnly', 'Secure', `SameSite=${opts.sameSite||'Lax'}`];
  if(opts.maxAge!==undefined) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join('; ');
}
export function clearHostCookie(name, opts={}){
  return setHostCookie(name, '', { ...opts, maxAge: 0 });
}
export function noStoreHeaders(){
  return { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' };
}