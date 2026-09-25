import { parseCookies } from '../_shared/cookies.js';
export async function onRequest({ request }) {
  const cookies = parseCookies(request);
  const session = cookies['session'];
  if (!session) return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });
  try {
    const jsonStr = atob(session.replace(/-/g, '+').replace(/_/g, '/'));
    return new Response(JSON.stringify({ user: JSON.parse(jsonStr) }), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });
  }
}