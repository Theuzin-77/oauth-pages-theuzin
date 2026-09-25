import { randomString, sha256Base64Url } from '../../_shared/crypto.js';
import { cookieHeader } from '../../_shared/cookies.js';
import { getProvider } from '../../_shared/providers.js';
export async function onRequest(context) {
  const providerName = context.params.provider;
  const provider = getProvider(providerName);
  const url = new URL(context.request.url);
  const state = randomString(16);
  const codeVerifier = randomString(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const redirectUri = `${url.origin}/oauth/callback/${providerName}`;
  const authUrl = new URL(provider.authorizeUrl);
  authUrl.searchParams.set('client_id', context.env[provider.clientIdKey]);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', provider.scopes.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  const headers = new Headers();
  headers.append('Set-Cookie', cookieHeader('oauth_state', state, { maxAge: 600 }));
  headers.append('Set-Cookie', cookieHeader('oauth_verifier', codeVerifier, { maxAge: 600 }));
  headers.set('Location', authUrl.toString());
  return new Response(null, { status: 302, headers });
}