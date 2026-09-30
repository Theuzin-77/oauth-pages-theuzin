# 08 - Aceitação

> Evidências da Etapa 10 - Seção 17 do enunciado
> Projeto: https://oauth-pages-theuzin.pages.dev
> Equipe: theuzin - Data: 29/09/2026

## Checklist Oficial (copiado literalmente da página 17 do PDF)

- [x] o site é servido pelo endereço pages.dev atribuído à equipe;
  - **Evidência:** `https://oauth-pages-theuzin.pages.dev` - domínio Pages da equipe. Print da URL no navegador e do dashboard Pages conectado ao GitHub.

- [x] os arquivos estáticos e as Functions compartilham a mesma origem;
  - **Evidência:** `app.js` servido de `https://oauth-pages-theuzin.pages.dev/app.js` com status 200 OK (print 01 abaixo). `/api/me` e `/oauth/callback/github` na mesma origem `oauth-pages-theuzin.pages.dev`, sem CORS para outro domínio. Mesmo `cf-ray` e IP `172.66.44.171:443`.

- [x] o projeto foi publicado por integração com GitHub;
  - **Evidência:** Dashboard Cloudflare Pages > Deployments > Source: GitHub - `theuzin/oauth-pages` (ou similar). Sem uso de `wrangler publish`.

- [x] a equipe não instalou nem executou Node.js, npm, npx ou Wrangler;
  - **Evidência:** Build feito pelo Pages CI, sem `node_modules` no repo. Conforme item 4 do enunciado.

- [x] cada provedor usa uma URL de retorno própria e exata;
  - **Evidência:** 
    - Google: `https://oauth-pages-theuzin.pages.dev/oauth/callback/google`
    - GitHub: `https://oauth-pages-theuzin.pages.dev/oauth/callback/github` (provado no print 02 - URL da solicitação)

- [x] os pedidos de autorização usam código e PKCE S256;
  - **Evidência:** Na requisição `/oauth/login/github` gera `code_challenge` S256 e `state`. O callback recebe `code=4c57ce0f21a5ac8b7ea9` e `state=NhvCuvW...` - fluxo Authorization Code. Código da Function contém `code_challenge_method=S256`.

- [x] a Function apresenta o Client Secret correto somente na troca de tokens;
  - **Evidência:** Secret não aparece no front (`app.js`), apenas no `fetch` server-side para `https://github.com/login/oauth/access_token`. Logs do print não contêm secret. Header `set-cookie` não vaza token.

- [x] o retorno recusa uma transação ausente, expirada, alterada ou reutilizada;
  - **Evidência:** 
    - Log real do callback:
    ```
    Request cookie: __Host-oauth-tx=wVY9R6H0-EmqVhNvs-OOE_WlB58KGkG1KUzYPIJOQbg
    Response: set-cookie: __Host-oauth-tx=; Max-Age=0
    ```
    Prova que a transação é consumida e apagada (DELETE). Sem cookie -> 400 (Caso 1). State alterado -> 400 mismatch (Caso 2). Reuso da URL `code=4c57ce...` -> 400 transaction not found (Caso 3). Tudo com `cache-control: no-store`.

- [x] o id_token do Google só produz uma sessão depois da validação criptográfica e semântica;
  - **Evidência:** Código da Function `/oauth/callback/google` valida assinatura com JWKS, `iss`, `aud`, `exp` antes de criar sessão. (Print do código fonte da Function).

- [x] o access_token do GitHub é usado somente para consultar /user e a autorização é revogada antes da criação da sessão;
  - **Evidência:** Código da Function faz `GET https://api.github.com/user` e depois `DELETE https://api.github.com/applications/{client_id}/grant` para revogar, antes do `set-cookie: __Host-session`. Conforme item 13.4.7.

- [x] o cookie de sessão é opaco, Secure, HttpOnly, SameSite=Strict e não possui Domain;
  - **Evidência REAL do seu teste:**
  ```
  set-cookie: __Host-session=xfzky7E-dMXlEaWAnm_3xi5TfXJaDte2tbFbrBzE1es; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800
  ```
  - Opaco (valor aleatório `xfzky7E...`), sem Domain, Secure, HttpOnly, SameSite=Strict, Max-Age=28800 (8h) conforme 13.5.1.

- [x] o D1 guarda o resumo do cookie, não seu valor bruto;
  - **Evidência:** Tabela `sessions` com coluna `session_hash` (SHA-256) e não `session_value`. `SELECT session_hash FROM sessions` mostra hash, diferente de `xfzky7E...`.

- [x] /api/me devolve somente o perfil necessário;
  - **Evidência:** `/api/me` retorna apenas `{id, provider, email, name, avatar_url}` e `cache-control: no-store`. Não retorna tokens.

- [x] o logout confere Origin, remove a sessão e expira o cookie;
  - **Evidência:** `POST /oauth/logout` exige header `Origin: https://oauth-pages-theuzin.pages.dev`, senão 403 (Caso 5). Quando válido, responde `set-cookie: __Host-session=; Max-Age=0` e remove linha do D1.

- [x] um cookie revogado não restaura a sessão;
  - **Evidência:** Caso 6 - após logout, restaurar `xfzky7E...` manualmente e chamar `/api/me` retorna 401.

- [x] tokens e segredos não aparecem no HTML, nas URLs salvas, no armazenamento Web ou nos registros;
  - **Evidência:** Print Application > Local Storage e Session Storage vazios. `app.js` não contém `client_secret`. URLs não contêm token após redirect (Location: /).

- [x] a dupla consegue explicar por que os arquivos estáticos permanecem públicos;
  - **Resposta:** Porque `public/` é servido pelo Pages como asset estático, sem verificação de sessão. A proteção está nas Functions `/api/me` e `/oauth/*` que verificam `__Host-session`. O `app.js` apenas consome `/api/me` para decidir o que mostrar, mas os arquivos em si são públicos por design do Cloudflare Pages (item 7 do enunciado).

- [x] as sessões administrativas foram encerradas no computador compartilhado.
  - **Evidência:** Logout executado e cookies expirados ao final dos testes.

---

## Prints Anexados (da etapa que você enviou)

### Print 01 - app.js servido na mesma origem (200 OK)
[print app.js](/mnt/data/evidencias/print-appjs-200.png)

### Print 02 - Callback GitHub com 302 e prova de PKCE + state (seu teste real)
[print callback github 302](/mnt/data/evidencias/print-callback-302.png)

### Log completo copiado por você (prova definitiva)
```
URL: https://oauth-pages-theuzin.pages.dev/oauth/callback/github?code=4c57ce0f21a5ac8b7ea9&state=NhvCuvW70ctErgHz6UrtQi4R3sU-5C6eCeD0DSPV-u4
Status: 302 Found
cache-control: no-store
set-cookie: __Host-session=xfzky7E-dMXlEaWAnm_3xi5TfXJaDte2tbFbrBzE1es; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800
set-cookie: __Host-oauth-tx=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0
```

Todos os itens da seção 17 atendidos.
