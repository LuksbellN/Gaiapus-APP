# GitHub e domínio

O workflow `.github/workflows/deploy-azure.yml` publica imagens com tag do commit em todo push no main. Os segredos runtime permanecem nos Container Apps. A identidade OIDC `gaiapus-github` aceita apenas `repo:LuksbellN/Gaiapus-APP:ref:refs/heads/main`.

## Permissões pendentes

O proprietário deve atribuir à identidade gerenciada `gaiapus-github` (object ID `0f1d51bb-78bc-4a75-8a60-a70dfd752121`), no IAM de cada recurso:

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

No Supabase, adicionar https://gaiapus.space como Site URL e https://gaiapus.space/auth/callback e https://gaiapus.space/auth/recovery nas URLs permitidas. Validar login, recuperação e salvamento pelo domínio final.

## Verificação

Concluir permissões antes de enviar o workflow para main, acompanhar GitHub → Actions → Deploy Azure. Conferir SHA das imagens/revisões e endpoints públicos. O workflow não aplica migrações Supabase. Migrações futuras precisam de acesso de banco separado e revisão do histórico antes de automação.

Referências oficiais

- https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect
- https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates
