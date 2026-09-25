import { b64urlDecodeJson, nowSec } from './crypto.js';

let discoveryCache = null;
let jwksCache = { url: null, keys: null, exp: 0 };

async function getDiscovery(discoveryUrl){
  if(discoveryCache && discoveryCache.url===discoveryUrl && discoveryCache.exp > nowSec()) return discoveryCache.data;
  const r = await fetch(discoveryUrl);
  if(!r.ok) throw new Error('Falha discovery OIDC');
  const data = await r.json();
  discoveryCache = { url: discoveryUrl, data, exp: nowSec()+3600 };
  return data;
}
async function getJwks(jwksUrl){
  if(jwksCache.url===jwksUrl && jwksCache.exp > nowSec()) return jwksCache.keys;
  const r = await fetch(jwksUrl);
  if(!r.ok) throw new Error('Falha JWKS');
  const data = await r.json();
  jwksCache = { url: jwksUrl, keys: data, exp: nowSec()+3600 };
  return data;
}

export async function validateGoogleIdToken(idToken, clientId, expectedNonce){
  const parts = idToken.split('.');
  if(parts.length!==3) throw new Error('id_token malformado');
  const [h64,p64,sig64] = parts;
  let header, payload;
  try{
    header = b64urlDecodeJson(h64);
    payload = b64urlDecodeJson(p64);
  }catch{
    throw new Error('id_token base64 inválido');
  }
  if(header.alg !== 'RS256') throw new Error('alg != RS256');
  if(!header.kid) throw new Error('kid ausente');

  const discovery = await getDiscovery('https://accounts.google.com/.well-known/openid-configuration');
  const jwks = await getJwks(discovery.jwks_uri);
  const jwk = jwks.keys.find(k=>k.kid===header.kid);
  if(!jwk) throw new Error('kid não encontrado no JWKS');

  // importa chave
  const key = await crypto.subtle.importKey('jwk', jwk, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['verify']);
  const data = new TextEncoder().encode(`${h64}.${p64}`);
  // sig64 -> bytes
  let sigStr = sig64.replace(/-/g,'+').replace(/_/g,'/');
  while(sigStr.length%4) sigStr+='=';
  const sigBin = atob(sigStr);
  const sigBytes = new Uint8Array(sigBin.length);
  for(let i=0;i<sigBin.length;i++) sigBytes[i]=sigBin.charCodeAt(i);

  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigBytes, data);
  if(!ok) throw new Error('Assinatura id_token inválida');

  // validações payload
  const now = nowSec();
  const issValid = payload.iss==='https://accounts.google.com' || payload.iss==='accounts.google.com';
  if(!issValid) throw new Error('iss inválido');
  if(payload.aud !== clientId) throw new Error('aud inválido');
  if(typeof payload.exp!=='number' || payload.exp <= now) throw new Error('exp expirado');
  if(typeof payload.iat!=='number' || payload.iat > now+60) throw new Error('iat futuro');
  if(expectedNonce && payload.nonce !== expectedNonce) throw new Error('nonce inválido');

  return payload; // contém sub, email, name, picture
}

export async function exchangeCode(provider, code, redirectUri, env, codeVerifier){
  const clientId = env[provider.clientIdKey];
  const clientSecret = env[provider.clientSecretKey];
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  if(codeVerifier) body.set('code_verifier', codeVerifier);
  const res = await fetch(provider.tokenUrl, {
    method:'POST',
    headers:{ 'Accept':'application/json', 'Content-Type':'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok || data.error) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data;
}

export async function fetchGithubUser(accessToken){
  const r = await fetch('https://api.github.com/user', {
    headers:{ 'Authorization':`Bearer ${accessToken}`, 'User-Agent':'oauth-pages', 'Accept':'application/json' }
  });
  const data = await r.json();
  if(!r.ok) throw new Error(`GitHub /user falhou: ${JSON.stringify(data)}`);
  return data;
}
export async function revokeGithubGrant(clientId, clientSecret, accessToken){
  const url = `https://api.github.com/applications/${clientId}/grant`;
  const basic = btoa(`${clientId}:${clientSecret}`);
  const r = await fetch(url, {
    method:'DELETE',
    headers:{ 'Authorization':`Basic ${basic}`, 'User-Agent':'oauth-pages', 'Accept':'application/vnd.github+json' },
    body: JSON.stringify({ access_token: accessToken })
  });
  if(r.status!==204) {
    const txt = await r.text();
    throw new Error(`Revogação GitHub falhou ${r.status}: ${txt}`);
  }
}