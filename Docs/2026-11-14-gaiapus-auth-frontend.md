---
title: Gaiapus — autenticação por e-mail no frontend
date: 2026-11-14
tags: [gaiapus, frontend, supabase, auth]
status: implemented-awaiting-live-verification
---

# Autenticação por e-mail

Complementa [[2026-11-14-gaiapus-frontend-implementation-plan]].

## Entrega

- [x] Cadastro, login, logout e reenvio da confirmação no diálogo Entrar.
- [x] `/auth/callback`: troca do código PKCE, estado de sucesso e retorno à exploração.
- [x] `/auth/recovery`: validação do link antes de mostrar a nova senha; confirmação das duas senhas.
- [x] Recuperação após atualizar a página: marcador sem tokens, vinculado ao usuário e à sessão, válido por até 15 minutos. Conclusão/logout removem o marcador.
- [x] Remoção de códigos/erros do histórico da URL; mensagens para links ausentes, expirados ou já usados.
- [x] Sessão persistida/renovada pelo SDK; bearer enviado ao Node para usuários com e-mail confirmado. A autorização continua no servidor.
- [x] Exploração pública disponível sem configuração de autenticação.
- [x] Testes automatizados com provedor simulado.
- [ ] Verificar entrega real de e-mails e o fluxo completo no projeto Supabase configurado.

## Configuração externa

No painel Supabase, habilitar Email/password e novos cadastros; manter Confirm email habilitado. O frontend não altera essas configurações administrativas.

```yaml
Site URL: http://localhost:5173
Redirect URLs:
  - http://localhost:5173/auth/callback
  - http://localhost:5173/auth/recovery
```

Para usar a prévia em `http://127.0.0.1:5180`, adicionar também seus dois caminhos correspondentes. Os redirects são gerados a partir da origem real da página. Hostname e porta devem coincidir com a lista permitida.

Configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `apps/web/.env.local`, seguindo o arquivo de exemplo, e reiniciar Vite. Usar o mesmo projeto do backend e `VITE_APP_API_MODE=http` para testar chamadas autenticadas ao Node. Nunca expor chaves secretas/service-role no frontend.

Manter templates padrão com `{{ .ConfirmationURL }}`. O deploy precisa servir a SPA nos dois caminhos e cadastrar os redirects HTTPS de produção separadamente.

## Decisões e limites

PKCE exige abrir o link no mesmo navegador/dispositivo em que o pedido foi iniciado. Um pedido mais recente pode substituir o anterior. A interface comunica essa restrição e oferece reenvio. Não foram criados cadastros nem enviados e-mails reais durante a implementação.

O marcador de recuperação resolve o caso identificado na revisão: atualizar a página depois da troca do código não deve obrigar o usuário a reiniciar a recuperação. Mudanças de sessão ou expiração exigem um novo link.

Onboarding, locais monitorados e comparações privadas continuam em etapas posteriores. Nenhuma tela apresenta essas funcionalidades como entregues.

## Referências

- [Supabase — redirects](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase — senhas](https://supabase.com/docs/guides/auth/passwords)
- [Supabase — PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
