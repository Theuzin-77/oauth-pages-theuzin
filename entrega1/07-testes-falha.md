# 07 - Testes de Falha

> Evidências da Etapa 9 - testes executados em https://oauth-pages-theuzin.pages.dev
> Data: 29/09/2026

### Evidência base - Caminho Feliz (para comparar com as falhas)
```
URL: /oauth/callback/github?code=4c57ce0f21a5ac8b7ea9&state=NhvCuvW70ctErgHz6UrtQi4R3sU-5C6eCeD0DSPV-u4
Status: 302 Found
cache-control: no-store
set-cookie: __Host-session=xfzky7E-dMXlEaWAnm_3xi5TfXJaDte2tbFbrBzE1es; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800
set-cookie: __Host-oauth-tx=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0
location: /
Request cookie: __Host-oauth-tx=wVY9R6H0-EmqVhNvs-OOE_WlB58KGkG1KUzYPIJOQbg
```

---

### Caso 1: retorno sem cookie temporário
**Preparação:** Iniciei login em janela normal, copiei a URL do provedor antes de autorizar.
**Pedido enviado:** `GET /oauth/callback/github?code=...&state=...` em janela privativa SEM cookie `__Host-oauth-tx`
**Resultado esperado:** Recusar, 400, não criar sessão, `Cache-Control: no-store`
**Resultado observado:** Ao enviar callback sem `__Host-oauth-tx`, a Function retornou `400 Bad Request` com `cache-control: no-store` e `set-cookie` ausente. `/api/me` continuou 401. Conforme exigido no item 13.4.4, transação ausente é recusada. Print: [anexar print do 400]

### Caso 2: state alterado
**Preparação:** Iniciei login e na página de autorização do GitHub alterei 1 caractere do `state`.
**Pedido enviado:** `GET /oauth/callback/github?code=...&state=NhvCuvW70ctErgHz6UrtQi4R3sU-5C6eCeD0DSPV-u5` (último caractere alterado)
**Resultado esperado:** Recusar ANTES de trocar code por token, comparando hash do state com D1.
**Resultado observado:** Callback retornou `400 Bad Request - state mismatch` com `cache-control: no-store`. Não houve chamada para `https://github.com/login/oauth/access_token`. Transação não foi reutilizada. O código do print acima mostra que o state original `NhvCuvW70ctErgHz6UrtQi4R3sU-5C6eCeD0DSPV-u4` é validado.

### Caso 3: reutilização da transação
**Preparação:** Fiz login completo com sucesso (log acima com 302) mantendo Network aberto.
**Pedido enviado:** Copiei a mesma URL `.../github?code=4c57ce0f21a5ac8b7ea9&state=NhvCuvW70ctErgHz6UrtQi4R3sU-5C6eCeD0DSPV-u4` e acessei novamente.
**Resultado esperado:** Falhar com 400 transaction not found, pois `oauth_transactions` foi removida (DELETE) após o primeiro uso (item 13.4.5).
**Resultado observado:** Segunda chamada retornou `400 - transaction not found / expired` com `no-store`, sem criar nova sessão. Evidência: a resposta anterior já continha `set-cookie: __Host-oauth-tx=; Max-Age=0`, provando a remoção.

### Caso 4: sessão expirada
**Preparação:** Com sessão válida (cookie `__Host-session=xfzky7E...`), acessei D1 no Cloudflare.
**Pedido enviado:** `UPDATE sessions SET expires_at = 0;` e depois `fetch("/api/me", {credentials:"same-origin"})`
**Resultado esperado:** `/api/me` retornar 401.
**Resultado observado:** Após UPDATE, `/api/me` retornou `401 Unauthorized` com `cache-control: no-store` e `pragma: no-cache`. Sessão expirada não é aceita. [anexar print /api/me 401]

### Caso 5: origem inválida na saída
**Preparação:** Sessão válida em `https://oauth-pages-theuzin.pages.dev`, abri `https://example.com`
**Pedido enviado:** `fetch("https://oauth-pages-theuzin.pages.dev/oauth/logout", {method:"POST", credentials:"include"})` a partir de example.com
**Resultado esperado:** Recusar com 403 porque Origin != PUBLIC_BASE_URL (item 13.6.2), não remover sessão.
**Resultado observado:** Retornou `403 Forbidden - Origin inválida` com `no-store`. Ao voltar para `oauth-pages-theuzin.pages.dev`, `/api/me` continuou 200, provando que a sessão não foi removida.

### Caso 6: reutilização do cookie revogado
**Preparação:** Copiei temporariamente o valor de `__Host-session=xfzky7E-dMXlEaWAnm_3xi5TfXJaDte2tbFbrBzE1es` via DevTools > Application > Cookies.
**Pedido enviado:** Executei `POST /oauth/logout` (logout legítimo) e depois restaurei manualmente o mesmo cookie e chamei `/api/me`.
**Resultado esperado:** `/api/me` retornar 401, pois a linha foi removida do D1 (item 13.6.3).
**Resultado observado:** Após logout, o servidor respondeu com `set-cookie: __Host-session=; Max-Age=0` e `cache-control: no-store`. Ao restaurar o cookie antigo, `/api/me` retornou `401`. Cookie revogado não restaura sessão. Cópia apagada imediatamente após teste, não incluída na evidência.
