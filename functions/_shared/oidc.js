import { getProvider } from './providers.js';
export async function exchangeCode(providerName, code, redirectUri, env, codeVerifier) {
  const p = getProvider(providerName);
  const body = new URLSearchParams({
    client_id: env[p.clientIdKey],
    client_secret: env[p.clientSecretKey],
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  if (codeVerifier) body.set('code_verifier', codeVerifier);
  const res = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(JSON.stringify(data));
  return data;
}
export async function fetchUserInfo(providerName, accessToken) {
  const p = getProvider(providerName);
  const res = await fetch(p.userInfoUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'oauth-pages-matheus' }
  });
  return await res.json();
}