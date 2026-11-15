# Primeiro deploy — frontend e API unificados

## Repositórios
- Aplicação: https://github.com/LuksbellN/Gaiapus-APP — usar main após o merge do PR de integração.
- Ciência: https://github.com/LeandroJerse/Gaiapus_nasa — código científico publicado separadamente. As execuções regionais deste APP são snapshots com hashes; não dependem de clonar o repositório científico no servidor.

## O que publicar agora
O Dockerfile apps/api/Dockerfile compila contratos, API e frontend. Um processo Node serve a página, os assets, /v1 e /publications no mesmo domínio. Não usar vite dev/preview em produção nem publicar apenas o frontend sem sua API.

Na raiz do repositório:

```sh
docker build -f apps/api/Dockerfile -t gaiapus-app:release .
docker run --name gaiapus-app --restart unless-stopped -p 127.0.0.1:3001:3001 gaiapus-app:release
```

O binding acima é local para um proxy HTTPS no mesmo servidor. Em plataforma gerenciada, usar porta interna 3001 (ou PORT fornecida pela plataforma), HOST=0.0.0.0 e healthcheck GET /health. Configurar domínio e HTTPS no provedor. Não colocar credenciais no Dockerfile, no Git ou em URLs.

## Escopo do primeiro deploy
- Mapa global, estados dos EUA, dados públicos, histórico e simulação com perfil do solo/raízes ilustrativas.
- Planejamento 2027/2028 disponível nos pares publicados: Sorriso, Uberlândia e Rio Verde (soja e rotação soja/milho); Barreiras (soja).
- Publicações calculadas, versionadas e verificadas por hash. Clima futuro climatológico, rendimento de referência; não anunciar previsão meteorológica diária nem inferência neural pré-plantio validada.
- Sem Supabase configurado, consultas públicas funcionam. Login e recursos privados não estão habilitados.
- A migração de simulações está no Git; upload no Supabase, geração privada por job e motor perene do café ainda não estão implementados por completo.

## Ativar contas depois da publicação pública
Seguir Docs/2026-11-14-gaiapus-supabase-setup.md e conferir as migrações no projeto de destino antes de aplicá-las.

Build arguments públicos (opcionais): VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. São incorporados ao bundle: nunca usar service_role, token Earthdata ou chave interna nesses campos. Se mudarem, reconstruir a imagem.

Variáveis runtime: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e APP_STORAGE_SIGNING_KEY conforme o guia de configuração. O mesmo projeto Supabase deve ser usado no browser e no backend. Configurar URLs autorizadas de callback/recuperação para o domínio final.

## Ciência ao vivo
O default SCIENCE_MODE=fixture mantém o limite atual dos exemplos e não inventa inferência ao vivo. Os cenários regionais publicados têm rotas próprias e continuam disponíveis.

Ativar SCIENCE_MODE=live somente após configurar e verificar o serviço Python interno, SCIENCE_ADAPTER_URL, SCIENCE_INTERNAL_TOKEN e seus artefatos. O Python não precisa ser exposto à internet e não é necessário para consultar os cenários já publicados. Ver services/science-adapter/README.md.

## Verificação pelo parceiro
1. GET /health retorna 200.
2. / retorna HTML; os arquivos JS/CSS referenciados retornam 200.
3. GET /v1/simulations/regional retorna publicações.
4. Abrir /#/explorar e verificar Brasil/EUA/estados.
5. Abrir /#/simulador?vista=perfil&dia=70 e conferir raízes e controles.
6. Abrir /#/simulador?modo=planejamento&mun=3170206&cultura=soy&safra=2027&vista=perfil e trocar para 2028.
7. Dados privados sem autenticação permanecem bloqueados; se Supabase estiver habilitado, testar isolamento entre duas contas.

## Atualizações e rollback
Registrar SHA do commit e digest da imagem. Manter a imagem anterior para rollback. Publicações científicas são imutáveis: nova emissão exige nova versão, nunca substituir os bytes sob o mesmo hash. Mudanças da sessão do Claude devem chegar por novos PRs; não trocar checkout em produção.

## Pacote verificado em 15/11/2026
Build Docker concluído; /, /health e endpoints públicos responderam 200. Doze jornadas de mapa, perfil/raízes e planejamento 2027/2028 passaram contra a imagem Linux de produção. As variáveis públicas de autenticação foram deixadas sem configuração; esse teste não comprova autenticação hospedada nem inferência Python ao vivo.
