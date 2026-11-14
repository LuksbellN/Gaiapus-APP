---
title: Gaiapus-APP — preservação de funções, UX, tutoriais, mundo e idiomas
date: 2026-11-14
status: planejamento concluído; implementação aguardando autorização
revisao_auditada: 2cf2881992c2226483f05045b28e45236cab0680 (main, "Frontend integration")
---

# Plano de UX com preservação de funções

Esta pasta é a entrega da fase de **planejamento**. Nada em `apps/`, `packages/`, `services/` ou `supabase/` foi alterado. Não houve commit, push nem deploy.

## O que foi confirmado

- **Ponto de entrada:** `apps/web/src/main.tsx:9` importa `./teammate/App`; `main.tsx:15-16` inicia Auth e a ponte de sessão antes de montar; `main.tsx:17-18` monta `AuthPage` em `/auth/callback` e `/auth/recovery`. `apps/web/src/App.tsx` (1.227 linhas) é a interface anterior e **não é importado** pelo ponto de entrada.
- **Nenhuma tela foi removida na integração.** `src/teammate` difere do protótipo `gaiapus-web` (commit `ba34a03`) em 8 arquivos, todos por acréscimo de API, Auth e isolamento por conta. As 11 páginas, o mapa, o 3D e o CSS são idênticos byte a byte.
- **Linha de base executada nesta revisão:** typecheck limpo; 64 de 64 testes unitários; 5 de 6 jornadas de navegador. A que falha é a conferência de hashes do manifesto, por diferença de fim de linha, sem relação com a interface (ver `02-diagnostico.md`, D-18).

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [01-inventario.md](01-inventario.md) | Repositório, rotas, controles, estados, fonte de cada dado e persistência |
| [02-diagnostico.md](02-diagnostico.md) | 28 achados com prioridade, reprodução, impacto e força da evidência |
| [03-fluxos-propostos.md](03-fluxos-propostos.md) | Duas abordagens, fluxos antes/depois e a matriz de preservação |
| [04-tutoriais.md](04-tutoriais.md) | Sistema de tutorial opcional e nove roteiros com textos nos cinco idiomas |
| [05-implementacao-e-aceite.md](05-implementacao-e-aceite.md) | Tarefas pequenas em ordem, arquivos, testes, critérios de aceite e reversão |
| [06-exploracao-global.md](06-exploracao-global.md) | Mundo pesquisável, destaque das regiões com dados e estados de cobertura |
| [07-idiomas.md](07-idiomas.md) | pt-BR, en, es, fr, de: seletor, catálogo, números, datas, migração e testes |
| `evidencias/2cf2881/` | 68 capturas da varredura, 5 capturas de sondagem, `varredura.json`, `sondagens.json` e os scripts que as geraram (`scripts/`) |

## Como ler a evidência

Cada afirmação traz uma marca de origem:

- **[N]** observado no navegador nesta revisão (Chrome via Playwright, perfil de teste vazio)
- **[C]** lido no código, com `arquivo:linha`
- **[T]** teste automatizado executado nesta revisão
- **[D]** consta em documentação do repositório, não reverificado
- **[H]** hipótese ainda sem verificação

## Decisões

Tomadas em 14/11/2026:

- Idioma de reserva: **inglês**.
- `axe-core` e outras dependências do frontend podem entrar no lockfile sem autorização prévia (Leandro e Lucas são donos do repositório).
- Revisão das traduções: feita aqui com apoio do Codex (`08-revisao-traducoes.md`).
- Verificações com Supabase real, outros navegadores, aparelho físico e leitor de tela serão feitas em outra máquina.

Ainda abertas (ver `05`, seção 8): grupos no trilho do desktop (etapa 2), regra do manifesto de hashes (T1), fonte geográfica fora do Brasil, formato do inglês, contexto do Simulador e do Field Shift.

## Skills e ferramentas realmente usadas

| Ferramenta | Uso |
|---|---|
| Superpowers `brainstorming` | Leitura do contexto antes de propor; abordagens comparadas em `03` |
| Superpowers `writing-plans` | Formato das tarefas de `05` |
| Web Design Guidelines | Regras buscadas na fonte em 14/11/2026 e aplicadas ao código ativo (achados em `02`) |
| Playwright (Chrome instalado) | Varredura de 34 estados × 2 tamanhos e 8 sondagens dirigidas |
| Impeccable, Taste, Hue, shadcn | **Não usadas** nesta fase |

Limites desta auditoria: sem Supabase configurado (login real, e-mail e troca de conta só por código e testes unitários), sem Safari, Firefox, aparelho físico ou leitor de tela, e sem usuários agricultores. Ganhos de usabilidade aqui são hipóteses até serem medidos.
