# Deploy Azure — Gaiapus

Arquitetura: Container Apps Consumption, um app público (web + Node) e um Python interno no mesmo ambiente. Supabase continua hospedado separadamente. Os Dockerfiles existentes já atendem esse formato.

## 1. Preparação

Instale Azure CLI e abra novamente o PowerShell. Tenha Docker Desktop iniciado em modo Linux. Execute os comandos abaixo na raiz do projeto, conferindo o resultado de cada comando antes de continuar.

```powershell
az login --tenant SEU_TENANT_ID
az account set --subscription SUA_SUBSCRIPTION_ID
az extension add --name containerapp --upgrade
$rg = 'gaiapus-prod'
$location = 'brazilsouth'
$acr = 'SUBSTITUA_POR_NOME_UNICO_MINUSCULO'
$environment = 'gaiapus-env'
$tag = Get-Date -Format 'yyyyMMddHHmmss'
```

O grupo deve existir e sua conta precisa ser Colaborador nele. O proprietário registra Microsoft.App, Microsoft.ContainerRegistry, Microsoft.OperationalInsights e Microsoft.ManagedIdentity na assinatura. Região e quota precisam permitir Container Apps Consumption; se houver bloqueio, escolher outra região disponível antes de criar o ambiente.

## 2. Supabase

Siga `Docs/2026-11-14-gaiapus-supabase-setup.md`. Confira as migrações já aplicadas antes de executar, em ordem, as pendentes de `supabase/migrations` (personal e future_simulations). Não reaplique SQL já aplicado. Preserve RLS.

Configure APP_STORAGE_SIGNING_KEY no servidor e o mesmo valor em app_private.signing_config, conforme aquele guia. Use entrada privada para carregar as variáveis desta sessão; não coloque segredos em arquivos versionados:

```powershell
$supabaseUrl = Read-Host 'URL Supabase'
$supabaseKey = Read-Host 'Chave PUBLICAVEL Supabase'
$storageKey = [System.Net.NetworkCredential]::new('', (Read-Host 'Storage signing key ja configurada no banco' -AsSecureString)).Password
$scienceToken = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

O último comando requer PowerShell 7. Guarde os segredos em seu gerenciador de senhas. Nunca use service_role no frontend. Não use transcrição de terminal durante a configuração.

## 3. Registry e identidade

```powershell
az acr create -g $rg -n $acr --sku Basic --location $location --admin-enabled false
az identity create -g $rg -n gaiapus-images --location $location
$registryId = az acr show -g $rg -n $acr --query id -o tsv
$registry = az acr show -g $rg -n $acr --query loginServer -o tsv
$identityId = az identity show -g $rg -n gaiapus-images --query id -o tsv
$principalId = az identity show -g $rg -n gaiapus-images --query principalId -o tsv
```

No portal, peça ao seu amigo duas atribuições no IAM **do registry**: AcrPull para a identidade `gaiapus-images`, e AcrPush para sua conta. Isso considera registry no modo RBAC tradicional; em registry ABAC, usar os papéis Repository Reader/Writer correspondentes. Colaborador não permite atribuir essas funções. Aguarde a propagação antes do próximo passo.

## 4. Build local e envio

Build local evita depender da disponibilidade de ACR Tasks na assinatura acadêmica.

```powershell
az acr login -n $acr
docker build --platform linux/amd64 -f apps/api/Dockerfile --build-arg "VITE_SUPABASE_URL=$supabaseUrl" --build-arg "VITE_SUPABASE_PUBLISHABLE_KEY=$supabaseKey" -t "${registry}/gaiapus-app:${tag}" .
docker push "${registry}/gaiapus-app:${tag}"
docker build --platform linux/amd64 -f services/science-adapter/Dockerfile -t "${registry}/gaiapus-science:${tag}" .
docker push "${registry}/gaiapus-science:${tag}"
```

## 5. Ambiente e Python

```powershell
az containerapp env create -g $rg -n $environment --location $location --logs-destination none
az containerapp create -g $rg -n gaiapus-science --environment $environment --image "${registry}/gaiapus-science:${tag}" --user-assigned $identityId --registry-server $registry --registry-identity $identityId --ingress internal --target-port 8001 --cpu 1 --memory 2Gi --min-replicas 0 --max-replicas 1 --secrets "science-token=$scienceToken" --env-vars "SCIENCE_INTERNAL_TOKEN=secretref:science-token" --revision-mode single
$scienceHost = az containerapp show -g $rg -n gaiapus-science --query properties.configuration.ingress.fqdn -o tsv
```

O dimensionamento Python é inicial, precisa ser medido. Use um worker, já configurado na imagem. Não habilite múltiplas réplicas sem rever a coordenação científica. O health Python exige token; não configure probe HTTP anônima em /health. As probes TCP padrão verificam processo/porta, não prontidão científica.

## 6. Aplicação pública

```powershell
az containerapp create -g $rg -n gaiapus-app --environment $environment --image "${registry}/gaiapus-app:${tag}" --user-assigned $identityId --registry-server $registry --registry-identity $identityId --ingress external --target-port 3001 --cpu 0.5 --memory 1Gi --min-replicas 0 --max-replicas 1 --secrets "storage-key=$storageKey" "science-token=$scienceToken" --env-vars "SUPABASE_URL=$supabaseUrl" "SUPABASE_PUBLISHABLE_KEY=$supabaseKey" "APP_STORAGE_SIGNING_KEY=secretref:storage-key" "SCIENCE_MODE=live" "SCIENCE_ADAPTER_URL=https://$scienceHost" "SCIENCE_INTERNAL_TOKEN=secretref:science-token" "SCIENCE_DEADLINE_MS=130000" --revision-mode single
$appHost = az containerapp show -g $rg -n gaiapus-app --query properties.configuration.ingress.fqdn -o tsv
$origin = "https://$appHost"
$origin
```

No Supabase Authentication → URL Configuration, defina Site URL como essa origem e cadastre as URLs exatas de callback/recovery usadas pelo frontend. Teste confirmação e recuperação; não basta configurar localhost. Alterar URL/chave pública Supabase exige rebuild da imagem web.

## 7. Verificação obrigatória

```powershell
Invoke-RestMethod "$origin/health"
Invoke-WebRequest "$origin/" | Select-Object StatusCode
Invoke-RestMethod "$origin/v1/simulations/regional"
az containerapp logs show -g $rg -n gaiapus-app --type console --tail 50
az containerapp logs show -g $rg -n gaiapus-science --type console --tail 50
```

Abra mapa, perfil de raízes e planejamento 2027/2028. Cadastre e confirme uma conta, entre, salve um local/comparação, saia e reabra. Teste duas contas sem acesso cruzado e execute `pnpm test:database` com as variáveis de teste do guia Supabase. Execute um caso científico suportado pela interface e confira logs/resposta: /health público não testa dependências. Confira que o endereço Python não é acessível da internet.

Live não significa todos os modelos disponíveis: água exige manifest confiável; pesos regionais ausentes continuam indisponíveis. Publicações regionais não provam comunicação Python. Teste novamente após período ocioso: escala zero causa cold start e pode exceder o prazo inicial de prontidão. Para uma apresentação, aqueça ambos temporariamente:

```powershell
az containerapp update -g $rg -n gaiapus-science --min-replicas 1
az containerapp update -g $rg -n gaiapus-app --min-replicas 1
```

Depois retorne ambos a `--min-replicas 0`.

## 8. Custos e atualizações

Escala 0–1 limita capacidade, mas não é teto financeiro. Registry Basic tem custo mesmo sem tráfego; Supabase tem cobrança separada. Logs persistentes estão desativados inicialmente para evitar custo de ingestão; logs de console ao vivo continuam úteis. Crie orçamento e alertas no Cost Management (alerta não bloqueia gasto). Consulte preços da região/assinatura antes de publicar; créditos acadêmicos e quotas variam.

Para atualizar, gere nova `$tag`, repita build/push e use `az containerapp update -g $rg -n NOME --image IMAGEM:TAG`. Registre commit, tag e digest. Para rollback, execute update com a imagem anterior, preservada no registry. Nunca altere publicações sob o mesmo hash. Migrações precisam de avaliação própria; trocar imagem não desfaz banco.

Referências: https://learn.microsoft.com/en-us/cli/azure/containerapp e https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull
