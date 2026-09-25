import { clearCookieHeader } from '../_shared/cookies.js';
export async function onRequest() {
  const headers = new Headers();
  headers.append('Set-Cookie', clearCookieHeader('session'));
  headers.set('Location', '/');
  return new Response(null, { status: 302, headers });
}