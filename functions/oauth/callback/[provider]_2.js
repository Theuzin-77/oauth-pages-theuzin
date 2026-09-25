import { parseCookies, setHostCookie, clearHostCookie, noStoreHeaders } from '../../_shared/cookies.js';
import { sha256B64url, randomB64url, nowSec } from '../../_shared/crypto.js';
import { getProvider } from '../../_shared/providers.js';
import { ensureTables } from '../../_shared/d1.js';
import { validateGoogleIdToken, exchangeCode, fetchGithubUser, revokeGithubGrant } from '../../_shared/oidc.js';

export async function onRequest(context){
  const providerName = context.params.provider;
  const url = new URL(context.request.url);
  const headersBase = noStoreHeaders();
  try{
    const provider = getProvider(providerName);
    if(!context.env.DB) return new Response('Falta DB', { status:500, headers: headersBase });
    await ensureTables(context.env.DB);

    const errParam = url.searchParams.get('error');
    if(errParam) return new Response(`Authorization error: ${errParam}`, { status:400, headers: headersBase });

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if(!code || !state) return new Response('Falta code ou state', { status:400, headers: headersBase });

    const cookies = parseCookies(context.request);
    const txCookie = cookies['__Host-oauth-tx'];
    if(!txCookie) return new Response('Transação ausente', { status:400, headers: headersBase });

    const txHash = await sha256B64url(txCookie);
    const stateHash = await sha256B64url(state);

    const row = await context.env.DB.prepare(
      `SELECT * FROM transactions WHERE tx_hash = ? AND provider = ?`
    ).bind(txHash, providerName).first();

    if(!row) return new Response('Transação inválida ou expirada', { status:400, headers: headersBase });
    if(row.expires_at < nowSec()){
      await context.env.DB.prepare(`DELETE FROM transactions WHERE tx_hash = ?`).bind(txHash).run();
      return new Response('Transação expirada', { status:400, headers: headersBase });
    }
    if(row.state_hash !== stateHash){
      await context.env.DB.prepare(`DELETE FROM transactions WHERE tx_hash = ?`).bind(txHash).run();
      return new Response('State inválido', { status:400, headers: headersBase });
    }

    // Apaga ANTES de concluir (previne replay) - exigência PDF 13.4
    await context.env.DB.prepare(`DELETE FROM transactions WHERE tx_hash = ?`).bind(txHash).run();

    const publicBase = context.env.PUBLIC_BASE_URL || url.origin;
    const redirectUri = row.redirect_uri || `${publicBase}/oauth/callback/${providerName}`;

    const tokenData = await exchangeCode(provider, code, redirectUri, context.env, row.code_verifier);

    let userInfo;
    if(providerName==='google'){
      const idToken = tokenData.id_token;
      if(!idToken) throw new Error('id_token ausente');
      const clientId = context.env[provider.clientIdKey];
      const payload = await validateGoogleIdToken(idToken, clientId, row.nonce);
      userInfo = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
        login: payload.email,
      };
    }else{
      const accessToken = tokenData.access_token;
      if(!accessToken) throw new Error('access_token ausente');
      const ghUser = await fetchGithubUser(accessToken);
      // revoga imediatamente antes de criar sessão local - exigência PDF 13.2
      await revokeGithubGrant(context.env[provider.clientIdKey], context.env[provider.clientSecretKey], accessToken);
      userInfo = {
        id: String(ghUser.id),
        email: ghUser.email,
        name: ghUser.name || ghUser.login,
        avatar: ghUser.avatar_url,
        login: ghUser.login,
      };
    }

    const sessionId = randomB64url(32);
    const sessionHash = await sha256B64url(sessionId);
    const now = nowSec();
    const sessExp = now + 28800; // 8h

    await context.env.DB.prepare(
      `INSERT INTO sessions (session_hash, provider, user_id, email, name, avatar, login, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(sessionHash, providerName, userInfo.id, userInfo.email||null, userInfo.name||null, userInfo.avatar||null, userInfo.login||null, now, sessExp).run();

    const headers = new Headers();
    headers.set('Location','/');
    headers.append('Set-Cookie', setHostCookie('__Host-session', sessionId, { path:'/', sameSite:'Strict', maxAge:28800 }));
    headers.append('Set-Cookie', clearHostCookie('__Host-oauth-tx', { path:'/', sameSite:'Lax' }));
    for(const [k,v] of Object.entries(headersBase)) headers.set(k,v);

    return new Response(null, { status:302, headers });
  }catch(e){
    return new Response(`Erro callback ${providerName}: ${e.message}`, { status:500, headers: headersBase });
  }
}
