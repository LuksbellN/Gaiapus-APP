# GitHub e domínio

O workflow `.github/workflows/deploy-azure.yml` publica imagens com tag do commit em todo push no main. Os segredos runtime permanecem nos Container Apps. A identidade OIDC `gaiapus-github` aceita apenas `repo:LuksbellN@108474778/Gaiapus-APP@1457908969:ref:refs/heads/main`, o subject efetivamente emitido pelo GitHub para este repositório.

## Permissões configuradas

O proprietário atribuiu à identidade gerenciada `gaiapus-github` (object ID `0f1d51bb-78bc-4a75-8a60-a70dfd752121`), no IAM de cada recurso:

| Recurso | Função |
|---|---|
| Container App gaiapus-app | Container Apps Contributor |
| Container App gaiapus-science | Container Apps Contributor |
| Registry gaiapusprod4d36 | AcrPush |

Escolher Identidade gerenciada → Identidade atribuída pelo usuário → gaiapus-github. A identidade de leitura das imagens `gaiapus-images` é outra identidade e mantém AcrPull.

## DNS Cloudflare

Os nameservers públicos já são bruce.ns.cloudflare.com e mimi.ns.cloudflare.com. Configure os registros abaixo na zona gaiapus.space, preservando registros de outros serviços.

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| A | @ | 172.131.165.226 | DNS only |
| TXT | asuid | 3BE1EE539CCCCF8F0AA232313E15559E8F041F4A8CBBA643095BE7C4504847F1 | — |

Após propagação, adicionar gaiapus.space em Container App gaiapus-app → Custom domains e selecionar certificado gerenciado gratuito. Manter o A direto e sem proxy para a validação/renovação Azure. Se existir CAA, permitir digicert.com conforme documentação Azure. O certificado deve ser emitido antes de anunciar o endereço como pronto.

Em 15/11/2026, o certificado gerenciado foi emitido e vinculado a gaiapus.space. A página, /health e /v1/simulations/regional responderam HTTP 200 via HTTPS. A escala mínima voltou a zero após a emissão. Existe apenas um A para a raiz, apontando para o Azure.

No Supabase, adicionar https://gaiapus.space como Site URL e https://gaiapus.space/auth/callback e https://gaiapus.space/auth/recovery nas URLs permitidas. Validar login, recuperação e salvamento pelo domínio final.

## Verificação

Concluir permissões antes de enviar o workflow para main, acompanhar GitHub → Actions → Deploy Azure. Conferir SHA das imagens/revisões e endpoints públicos. O workflow não aplica migrações Supabase. Migrações futuras precisam de acesso de banco separado e revisão do histórico antes de automação.

A primeira execução automática passou para o commit 38069a3, após ajustar o subject OIDC ao identificador emitido pelo GitHub. Cada push em main, incluindo merge de PR, inicia o workflow independentemente do autor. Colaboradores precisam apenas de permissão no repositório para enviar ou mesclar suas alterações. Commit local e push em outra branch aguardam a chegada a main. As permissões Azure pertencem à identidade do workflow.

O workflow compila ambos os containers e valida os endpoints públicos. Testes completos de aplicação e de autenticação permanecem fora desse workflow. Se uma etapa falhar, verificar os logs em Actions. As atualizações de Python e Node são sequenciais, sem transação conjunta nem rollback automático. Mudanças entre serviços precisam manter compatibilidade durante essa troca. O GitHub pode agrupar execuções pendentes quando vários pushes chegam durante um deploy, publicando a versão mais recente da fila.

Referências oficiais

- https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates
