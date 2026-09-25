import { randomB64url, sha256B64url, nowSec } from '../../_shared/crypto.js';
import { setHostCookie, noStoreHeaders } from '../../_shared/cookies.js';
import { getProvider } from '../../_shared/providers.js';
import { ensureTables } from '../../_shared/d1.js';

export async function onRequest(context){
  const providerName = context.params.provider;
  try{
    const provider = getProvider(providerName);
    const url = new URL(context.request.url);
    const origin = url.origin;
    const publicBase = context.env.PUBLIC_BASE_URL || origin;
    const redirectUri = `${publicBase}/oauth/callback/${providerName}`;

    const clientId = context.env[provider.clientIdKey];
    if(!clientId){
      return new Response(`Falta env ${provider.clientIdKey}`, { status:500, headers: noStoreHeaders() });
    }
    if(!context.env.DB){
      return new Response('Falta binding DB (D1)', { status:500, headers: noStoreHeaders() });
    }
    await ensureTables(context.env.DB);

    // gera valores aleatórios 32 bytes -> 43 chars base64url
    const tx = randomB64url(32);
    const txHash = await sha256B64url(tx);
    const state = randomB64url(32);
    const stateHash = await sha256B64url(state);
    const codeVerifier = randomB64url(32);
    const codeChallenge = await sha256B64url(codeVerifier);
    const nonce = providerName==='google' ? randomB64url(32) : null;

    const now = nowSec();
    const expires = now + 600; // 10 min

    await context.env.DB.prepare(
      `INSERT INTO transactions (tx_hash, provider, state_hash, code_verifier, nonce, redirect_uri, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)`
    ).bind(txHash, providerName, stateHash, codeVerifier, nonce, redirectUri, now, expires).run();

    const authUrl = new URL(provider.authorizeUrl);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type','code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method','S256');
    if(providerName==='google'){
      authUrl.searchParams.set('scope', provider.scopes.join(' '));
      authUrl.searchParams.set('nonce', nonce);
      authUrl.searchParams.set('access_type','offline');
      authUrl.searchParams.set('prompt','consent');
    }
    // GitHub: escopo e nonce omitidos conforme PDF 13.1

    const headers = new Headers();
    headers.set('Location', authUrl.toString());
    headers.append('Set-Cookie', setHostCookie('__Host-oauth-tx', tx, { path:'/', sameSite:'Lax', maxAge:600 }));
    for(const [k,v] of Object.entries(noStoreHeaders())) headers.set(k,v);

    return new Response(null, { status:302, headers });
  }catch(e){
    return new Response(`Erro login ${providerName}: ${e.message}`, { status:500, headers: noStoreHeaders() });
  }
}