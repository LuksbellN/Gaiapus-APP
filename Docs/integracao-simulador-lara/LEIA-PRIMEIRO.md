# Integração Gaiapus + simulador do Lara

Data da análise: 15/11/2026. Destinatário: Claude responsável por implementar no **Gaiapus-APP**.

## Objetivo

Construir um simulador agrícola unificado, aproveitando o produto, os contratos, a geografia e a rastreabilidade da Gaiapus e a apresentação de solo, raízes, irrigação, cenários históricos e economia do Lara. Preservar as funcionalidades atuais e distinguir cálculo físico, previsão estatística e ilustração 3D.

**Esta entrega é um planejamento com evidências. Não aplicou a integração, não alterou modelos servidos, não migrou banco e não abriu avaliações de rendimento.**

## Ordem de leitura e execução

1. Leia `AUDITORIA.md`: compara implementações reais e registra problemas reproduzidos.
2. Leia `ARQUITETURA.md`: define o produto integrado, contratos, ciência, dados, UX e implantação.
3. Execute `PLANO.md` por entregas pequenas, começando pelo inventário atualizado e pelos testes de regressão.
4. Consulte `evidencias/manifest.json`, `evidencias/probe-results.json` e o subconjunto de código em `evidencias/source/`. Esse código é referência de auditoria, não um pacote pronto para produção.

## Repositórios e estado observado

| Papel | Repositório | HEAD observado na análise |
|---|---|---|
| Produto que receberá a integração | https://github.com/LuksbellN/Gaiapus-APP | `e8d24023ae189c334ffe9702f63bf83dba031197` |
| Ciência, dados e modelos | https://github.com/LeandroJerse/Gaiapus_nasa | `8bb735850e7cdaafd43e419f65ed3cd2ad288507` |
| Simulador de referência | https://github.com/LaraLLC/Hackathon-Nasa-SpaceApps | `76aaf46f8d02c8834de266dc6f6cfb2c641caf0f` |

Checkout do produto inspecionado: `C:\Users\leand\Documents\Gaiapus-APP`.

Checkout científico: `C:\Users\leand\OneDrive - Universidade Federal de Uberlândia\Área de Trabalho\ideias_nasa`.

O produto possui mudanças locais de outra sessão, incluindo geografia dos Estados Unidos. Antes de editar, faça `git status`, leia as instruções locais e atualize o inventário. **Não dê reset, não substitua diretórios e não sobrescreva o trabalho concorrente.** Os HEADs acima são contexto de auditoria, não uma ordem para voltar a essas versões.

Os arquivos do Lara foram obtidos pelo GitHub durante a inspeção de `main`; o HEAD observado está registrado acima e os hashes dos conteúdos estão no manifesto. Antes de incorporar código, confira os arquivos contra o commit imutável. Preserve origem e autoria. Não copie `.env`, credenciais ou dados privados.

## Decisões centrais

- Gaiapus-APP continua sendo a aplicação principal; não incorporar uma segunda aplicação por iframe.
- Primeiro aprimorar a visualização usando os dados existentes. Depois habilitar o novo cálculo, condicionado aos testes de integridade e às capacidades de cada região/cultura.
- O motor Python é a autoridade numérica. TypeScript apresenta os resultados e transforma unidades; não mantém uma segunda implementação da física.
- Manter a referência científica atual congelada e criar versões explícitas para os novos parâmetros e o novo motor.
- Não promover MLP/HGB/Ridge por estética, disponibilidade ou erro de desenvolvimento. A integração não substitui validação científica.
- Não tratar alterações de chuva ou irrigação como efeitos causais estimados pelo MLP. O efeito físico simplificado deve aparecer separado da estimativa estatística municipal.
- Manter mapa global pesquisável, países, estados e municípios/condados, com avisos de falta de dados. Preservar português, inglês, espanhol, francês e alemão.
- Prioridade: soja em Sorriso e Uberlândia; milho safrinha e sequência soja–milho; café arábica em MG; expansão por capacidades comprovadas.
- Não apagar dados, alterar tarefas prospectivas ou refazer testes científicos já abertos durante esta integração.

## Prompt curto para iniciar

```text
Leia LEIA-PRIMEIRO.md, AUDITORIA.md, ARQUITETURA.md e PLANO.md desta pasta. Trabalhe no repositório LuksbellN/Gaiapus-APP, conferindo o estado atual antes de editar. Implemente a integração Gaiapus + simulador do Lara por etapas, usando superpowers:executing-plans e testes de regressão. Preserve funcionalidades, alterações concorrentes, cinco idiomas e navegação global. Reaproveite a visualização do Lara, mas corrija e teste o motor antes de habilitar novos cálculos. Separe simulação física, previsão estatística e 3D ilustrativo; respeite capacidades e fontes reais. Não altere modelos congelados nem reabra testes de rendimento. Registre o que foi entregue, os testes executados e as limitações de cada etapa.
```

## Critério de conclusão

A integração estará pronta quando uma pessoa conseguir escolher uma região coberta, configurar uma cultura, executar um cenário auditável, percorrer os mesmos dias no gráfico e no 3D, comparar alternativas pareadas e salvar um resultado reproduzível. Regiões sem suporte continuam visíveis e explicam qual dado ou capacidade falta. Uma animação bonita, isoladamente, não conclui a integração.
