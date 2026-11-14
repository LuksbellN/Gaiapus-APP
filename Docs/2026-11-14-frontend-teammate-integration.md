---
title: Integração do frontend aprovado
date: 2026-11-14
tags: [frontend, integration]
status: implemented
---

# Integração

Fonte: pasta irmã `Nasa-Frontend`. Preservar CSS, componentes, composição, navegação, gráficos, mapa, 3D e comportamento local. A pasta de origem permanece intacta.

- [x] Inspecionar frontend e contratos atuais.
- [x] Incorporar o frontend aprovado em `apps/web/src/teammate`.
- [x] Conectar adapters aos endpoints científicos/públicos já existentes, preservando dados locais adicionais identificados.
- [x] Substituir identidade simulada por Supabase e callbacks reais com os mesmos componentes visuais.
- [x] Isolar armazenamento local por usuário e preservar visitantes sem converter sessão local em autenticação.
- [x] Verificar tipos, testes, build, jornadas de navegador e fidelidade do CSS.

Decisão: propriedades/talhões, registros, planos e sondas continuam locais/demonstrativos porque os contratos atuais não oferecem sincronização desses recursos. Não transformar propriedades em locais monitorados: são conceitos distintos. Perfil usa `/v1/me`; autorização permanece no backend. Não ampliar o backend silenciosamente.

Decisão: manter os exemplos adicionais v7, a série diária, métricas e testes selados do frontend como publicações locais identificadas; a API atual não publica todos esses dados. Falha HTTP não deve ser mascarada com fallback local. Renderização dos produtos já publicados usa os resultados reais da API sem modificar o payload científico.

## Verificação e revisão

- 64 testes unitários/de componente aprovados; 6 jornadas Chrome aprovadas contra a API real local. Typecheck e build de produção aprovados.
- CSS e componentes visuais principais preservados byte a byte, verificados por manifesto SHA-256 sem depender da pasta irmã.
- Comparação com cópia intocada: geometria de header, rail, main, page e card, fontes e cores idênticas no overview 1440 × 900. Capturas e métricas em `apps/web/design/verification/`.
- Revisão independente identificou isolamento de formulários montados, gravações pendentes após mudança de conta e saída da tela de callback. Os três casos foram corrigidos e cobertos por regressões. Alterações em `Records.tsx` limitam-se ao tratamento de falhas/cancelamento de gravação; estrutura visual preservada.
- As telas de conta usam os mesmos componentes e estilos, acrescentando senha e estados reais de confirmação/recuperação. Não houve teste de entrega real de e-mails.
- O callback retorna às rotas hash do handoff, sem mudar a navegação normal do aplicativo.
