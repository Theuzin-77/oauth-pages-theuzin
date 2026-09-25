import { parseCookies, cookieHeader, clearCookieHeader } from '../../_shared/cookies.js';
import { getProvider } from '../../_shared/providers.js';
import { exchangeCode, fetchUserInfo } from '../../_shared/oidc.js';
import { base64url } from '../../_shared/crypto.js';
export async function onRequest(context) {
  const providerName = context.params.provider;
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(context.request);
  if (state!== cookies['oauth_state']) return new Response('State inválido', { status: 400 });
  const redirectUri = `${url.origin}/oauth/callback/${providerName}`;
  const tokenData = await exchangeCode(providerName, code, redirectUri, context.env, cookies['oauth_verifier']);
  const userInfo = await fetchUserInfo(providerName, tokenData.access_token);
  const sessionData = {
    provider: providerName,
    email: userInfo.email,
    name: userInfo.name || userInfo.login,
    avatar: userInfo.picture || userInfo.avatar_url,
  };
  const sessionValue = base64url(JSON.stringify(sessionData));
  const headers = new Headers();
  headers.append('Set-Cookie', cookieHeader('session', sessionValue, { maxAge: 604800 }));
  headers.append('Set-Cookie', clearCookieHeader('oauth_state'));
  headers.append('Set-Cookie', clearCookieHeader('oauth_verifier'));
  headers.set('Location', '/');
  return new Response(null, { status: 302, headers });
}