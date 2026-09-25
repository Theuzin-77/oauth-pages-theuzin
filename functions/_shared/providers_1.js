export const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdKey: 'GOOGLE_CLIENT_ID',
    clientSecretKey: 'GOOGLE_CLIENT_SECRET',
    discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
    scopes: ['openid','email','profile'],
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    revokeUrl: (clientId)=> `https://api.github.com/applications/${clientId}/grant`,
    clientIdKey: 'GITHUB_CLIENT_ID',
    clientSecretKey: 'GITHUB_CLIENT_SECRET',
  }
};
export function getProvider(name){
  const p = PROVIDERS[name];
  if(!p) throw new Error(`Provider desconhecido: ${name}`);
  return p;
}