export function b64urlEncode(bytes){
  let bin = '';
  bytes.forEach(b=> bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function b64urlDecodeToBytes(str){
  str = str.replace(/-/g,'+').replace(/_/g,'/');
  while(str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return bytes;
}
export function b64urlDecodeJson(str){
  const bytes = b64urlDecodeToBytes(str);
  const dec = new TextDecoder().decode(bytes);
  return JSON.parse(dec);
}
export function randomB64url(bytesLen=32){
  const a = new Uint8Array(bytesLen);
  crypto.getRandomValues(a);
  return b64urlEncode(a);
}
export async function sha256B64url(input){
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const hash = await crypto.subtle.digest('SHA-256', data);
  return b64urlEncode(new Uint8Array(hash));
}
export function nowSec(){ return Math.floor(Date.now()/1000); }