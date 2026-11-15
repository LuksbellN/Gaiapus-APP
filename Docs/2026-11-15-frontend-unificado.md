# Frontend unificado — 15/11/2026

## Local e versão
- Checkout de uso: C:/Users/leand/Documents/Gaiapus-APP
- Branch: codex/frontend-unificado
- URL única: http://127.0.0.1:5173/
- API local: http://127.0.0.1:3001/
- Preservação do mapa: cc0b078; merge de 2027/2028 e Lara: 91a9cb3 (inclui 7fae74d).
- Worktrees Lara e 2028 preservados. Arquivos científicos/treinamentos externos não alterados.

## Incluído
Mapa global e estados dos EUA; perfil do solo Lara; estaca e raízes ilustrativas determinísticas; alternativa 2D; planejamento 2027/2028 sobre publicações verificadas; histórico, cinco idiomas e tutoriais.

## Validação executada
- Build frontend e backend: aprovados.
- Frontend: 248 testes aprovados.
- API: 43 testes aprovados (sem suítes que exigem banco/serviço científico externo).
- Contratos: 21 testes aprovados; geração de tipos/OpenAPI consistente.
- Navegador: 102 jornadas aprovadas na execução completa; a única falha era registro ausente das mudanças deliberadas do mapa no manifesto visual. Registro atualizado e teste correspondente reexecutado: aprovado.
- HTTP 200 no frontend e em /v1/simulations/regional através do proxy.
- Somente 5173 (frontend) e 3001 (API) ativos dentre as portas da aplicação verificadas.

## Correção de integridade
Seis arquivos upstream antigos estavam em LF embora os hashes congelados correspondessem a CRLF. Restaurados exclusivamente os finais de linha após provar que o SHA-256 transformado coincidia exatamente com o manifesto original. Nenhum hash esperado nem conteúdo lógico alterado. .gitattributes já protege upstream como -text.

## Limites
Integração local: não foi feito push nem merge na main remota. Cenários futuros são publicações calculadas disponíveis no catálogo, não geração arbitrária para qualquer cultura/localidade. Café e demais pares ainda sem motor mantêm motivo de indisponibilidade. API iniciou na configuração local existente; autenticação Supabase, migrações e serviço Python live não foram ativados nem validados nesta tarefa.

## Reinício
Na pasta packages/contracts: bun run build.
Na pasta apps/api: bun run dev.
Na pasta apps/web: bun run dev.
Não executar os previews de Gaiapus-APP-lara ou Gaiapus-APP-2028 para uso cotidiano. Novos commits nessas branches precisam de integração explícita, não aparecem automaticamente nesta branch.
