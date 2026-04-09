# Changelog

## v3.6.0 — Auditoria Técnica Completa — 2026-04-08

### Corrigido
- **`config.js`** — `VERSAO` atualizado de `'1.2.0'` para `'3.6.0'`; valor exibido na sidebar agora reflete a versão real do sistema
- **`kpis.js`** — `Math.max(...data.map(...))` substituído por `data.reduce(...)`, eliminando risco de `RangeError` em datasets grandes
- **`charts.js` — `expandChart`** — removido `JSON.parse(JSON.stringify(source.options))` que destruía todos os callbacks de tooltip; substituído por spread com referência direta a `source.config.options`; adicionado `Chart.getChart(expCanvas)?.destroy()` antes de criar nova instância; removida atribuição `indexAxis='y'` que era no-op
- **`charts.js` — `renderSiglas` / `renderClassificacao`** — adicionado guard `if(!r.Mes||!r.Ano||!r.Valor) return` para excluir registros com campos nulos das agregações, evitando distorção de dados
- **`charts.js`** — `layout.padding.right` removido da opção hard-coded com `window.innerWidth` (breakpoint capturado em runtime); substituído por valor fixo `20` gerenciado por CSS
- **`filters.js`** — removidas 5 chamadas mortas `_msRefs[key]?._refresh?.()` (chave `_refresh` nunca existiu; `.refresh` já cobria o rebuild via loop na linha seguinte)
- **`filters.js`** — removida variável morta `const opts = Api.getFilterOptions` sem invocação e sem uso
- **`filters.js`** — placeholder de `msDespesas` corrigido de `'Todos os tipos'` para `'Todas as despesas'`
- **`filters.js`** — 10 listeners globais de documento (2 por multi-select × 5) consolidados em 2 listeners únicos via `_bindGlobalListeners()`; `close` exposto em cada entrada de `_msRefs`
- **`tables.js`** — cabeçalho CSV corrigido: `'Classificacao'` → `'Classificação'` (com acento, alinhado ao `mapeamento-colunas.md`)
- **`alertas.js`** — padrão de invocação dupla `sl()(sigla)` corrigido para `sl(sigla)` após simplificação da função `sl`
- **`api.js`** — filtro de linha de cabeçalho estendido para formato objeto: agora rejeita registros onde `Empresa === 'Empresa'` mesmo quando a resposta do Apps Script vem como array de objetos
- **`api.js`** — `console.warn` sanitizado: removida exposição da resposta JSON completa (que incluía a URL do endpoint); mensagem reduzida a `'[API] Nenhum registro normalizado.'`
- **`apps-script-deploy.md`** — `NOME_ABA` corrigido de `'Página1'` para `'GERAL'`; adicionada nota explicando a correção feita em v1.2.1
- **`mapeamento-colunas.md`** — campo `Liquidado` corrigido: incluído desconto de 4,32% para Manutenção (anteriormente documentado apenas o de 5,01% para Combustível)
- **`arquitetura.md`** — adicionados 5 módulos ausentes: `alertas.js`, `comparativo.js`, `exportacao.js`, `urlhash.js`, `veiculo.js`; fluxo de dados atualizado com `Alertas.renderizar()` e `UrlHash.push()`; seção Modais expandida com `Modal.openRaw` e modais próprios de `veiculo.js`; seção de dependências entre módulos adicionada

### Adicionado
- **`config.js`** — 11 funções utilitárias globais centralizadas: `fmtBRL`, `fmtBRLAbrev`, `kFmt`, `fmtMes`, `isDark`, `textColor`, `gridColor`, `isComb`, `isManut`, `escHTML`; eliminam 7–8 implementações duplicadas espalhadas pelos módulos

### Removido (redundâncias eliminadas)
- `fmtBRL` local de: `kpis.js`, `tables.js` (Tables + ResumoPainel), `app.js` (Modal), `comparativo.js`, `alertas.js`, `veiculo.js`, `exportacao.js`
- `fmtMes` local de: `charts.js`, `tables.js` (Tables + ResumoPainel), `app.js` (Modal), `comparativo.js`, `alertas.js`, `veiculo.js`, `exportacao.js`
- `isDark` / `textColor` / `gridColor` local de: `charts.js`, `comparativo.js`, `veiculo.js`
- `kFmt` local de: `charts.js`, `comparativo.js`, `veiculo.js`, `exportacao.js` (via alias `fmtBRLk`)
- `isComb` / `isManut` local de: `exportacao.js`
- `esc` / `escHTML` local de: `exportacao.js`, `veiculo.js` (via alias)

### Documentação
- `changelog.md` atualizado
- `arquitetura.md` atualizado
- `mapeamento-colunas.md` atualizado
- `apps-script-deploy.md` atualizado

### Pendente (requer acesso a `index.html`)
- **FOUC de tema escuro** — adicionar script inline bloqueante no `<head>` antes do primeiro render para aplicar `data-theme="dark"` sem flash visual
- **Lazy loading de `exportacao.js`** — adicionar atributo `defer` à tag `<script>` do módulo para diferir parse dos 187KB até após o render inicial da página



## v3.5.0 — Índice de Siglas, Resumo por Secretaria com Locação, Análise Detalhada Expandida — 2026-04-07

### Adicionado
- **Página "Índice de Siglas"** — aparece após o Sumário; grid 2 colunas com todas as 34 siglas do dicionário + quaisquer siglas extras presentes nos dados; exibe código monospace (azul) + nome por extenso; siglas não mapeadas marcadas como "Unidade não catalogada"; entrada adicionada ao Sumário como item 1
- **CSS** — `.siglas-page`, `.siglas-header`, `.siglas-pre`, `.siglas-titulo`, `.siglas-sub`, `.siglas-grid`, `.sigla-item`, `.sigla-cod`, `.sigla-nome`, `.siglas-nota`

### Alterado
- **Resumo por Secretaria** — coluna "Secretaria / Fundo" removida; adicionadas colunas: `Locação`, `Veíc. Próprios`, `Veíc. Locados`; rodapé ajustado (colspan 2→1); nota de rodapé explicando critérios de locação
- **Análise Detalhada por Secretaria** — expandida de top-5 para **top-10** unidades; para cada card:
  - KPI adicional de Locação (quando houver veículos locados na unidade): valor, %, nº de veículos — grid 5 colunas dinâmico (4 sem locação, 5 com)
  - Pizza de composição agora inclui 3 fatias: Combustível / Manutenção / Locação
  - Gráfico de evolução mensal por unidade (barras empilhadas Comb/Manut) com legenda de cores
  - Tabela "Top 10 veículos — Combustível" com coluna Contrato (badge Próprio/Locado/Indefinido) + sparkline de evolução
  - Tabela "Top 10 veículos — Manutenção" com mesma estrutura + mini-barra de %
  - Tabela "Veículos locados" exibida apenas quando a unidade tiver registros locados: placa, modelo, contrato, total, comb, manut, sparkline
- **Sumário** — numeração reajustada (1–16); tag do item Análise Detalhada atualizada para "Top 10"

### Verificação
- `node --check`: ✅ zero erros de sintaxe

### Documentação
- `changelog.md` atualizado



### Adicionado
- **`_aggByContrato(records)`** — nova função de agregação que agrupa registros por código de contrato: total, combustível, manutenção, qtde, placas únicas, siglas, entries
- **`_estimarAnual(byMes)`** — projeta gasto anual usando média dos últimos 3 meses × 12
- **`_isProprio(r)`** / **`_isLocado(r)`** / **`_isIndefinido(r)`** — classificadores de vínculo contratual por registro
- **Seção "Análise de Locação e Contratos"** (`analiseLocacao: true`) com:
  - 4 KPIs gerais: total locado, total próprio, total indefinido, estimativa anual da locação
  - 2 pizzas lado a lado: gastos por tipo de frota (locado/próprio/indefinido) e unidades por tipo
  - Evolução mensal da frota locada com gráfico de barras + tabela de variação
  - Tabela resumo de contratos: código, veículos, registros, total, comb, manut, % da locação, estimativa anual
  - Pizza de distribuição entre contratos (top 6)
  - Cards individuais por contrato (top 3 em modo executivo, todos em modo completo): KPIs, pizza comb/manut, lista de veículos com sparkline, evolução mensal
  - Bloco "Frota Própria PMRV": KPIs + tabela top-10 veículos com sparkline
  - Bloco "Máquinas INDEFINIDO": callout de alerta explicativo + tabela completa de máquinas com vínculo não identificado
- **`_aggByPlaca`** — campo `contrato` adicionado ao mapa de agregação
- **CSS** — novos seletores: `.loc-*` (15 seletores), `.badge-proprio`, `.badge-locado`, `.badge-indef`
- **Nota metodológica** — atualizada para explicar os três status (PRÓPRIO, código de contrato, INDEFINIDO)
- **Índice** — entrada 10 adicionada para a seção de Locação; demais numerações ajustadas (11–15)
- **Wizard Step 3** — nova opção `analiseLocacao` com descrição clara
- **Memória registrada**: máquinas com status INDEFINIDO não tiveram seu vínculo identificado e são tratadas como categoria separada nas análises

### Corrigido
- Verificação de sintaxe confirmada via `node --check`: ✅ zero erros

### Documentação
- `changelog.md` atualizado



### Adicionado
- **`buildSVGPie()`** — nova função SVG de pizza/donut multi-fatias com legenda lateral inline, reutilizável em qualquer seção; parâmetros: slices[], size, centerLabel, centerSub, showLegend
- **Capa redesenhada** — faixa em gradiente azul escuro com logo, título, subtítulo + período; 3 cards de destaque (Total, Combustível, Manutenção); meta-grid 3×2; caixa de aviso metodológico; rodapé institucional
- **Índice / Sumário** — página separada com 14 seções numeradas, linha pontilhada decorativa, tags de contexto (Top N, Comb · Manut), categorias separadoras
- **Introdução e Contexto** — bloco com 2 parágrafos de contextualização com dados reais do período (registros, veículos, unidades, totais)
- **Objetivos do Relatório** — 6 objetivos numerados com bullets coloridos
- **Nota metodológica** — explicação sobre Valor vs Liquidado, veículos PRÓPRIO vs locados, coluna Classificação
- **Análise Detalhada por Secretaria** (seção `analiseSec`) — cards individuais das top-5 unidades, cada um com: 4 KPIs (Combustível, Manutenção, Ticket médio, Liquidado estimado), pizza de composição via `buildSVGPie`, tabela top-5 veículos da unidade
- **Análise Detalhada por Despesa: Combustível** (seção `analiseDesp`) — 4 KPIs (total, liquidado, registros, ticket médio), callout do mês de pico, pizza de classificações, tabela top-8 veículos com mini-barra %, evolução mensal isolada com tabela de variação
- **Análise Detalhada por Despesa: Manutenção** (seção `analiseDesp`) — 4 KPIs (total, liquidado, registros, veículos com alta manutenção), callout de alerta, pizza de tipos de manutenção, tabela top-8 com ⚠ alert, evolução mensal isolada

### Alterado
- **Wizard state** — adicionados `analiseSec: true` e `analiseDesp: true` ao objeto `_wiz.secoes`
- **`_buildStep3()`** — adicionadas as 2 novas seções com descrições claras; total de 9 opções de seção
- **CSS do relatório** — removida a `.capa` simples; adicionados: `.capa-band`, `.capa-band-top`, `.capa-logo-row`, `.capa-badge`, `.capa-stats-grid`, `.capa-stat-card`, `.capa-body`, `.capa-aviso`, `.indice-*` (8 seletores), `.intro-sec`, `.obj-*` (5 seletores), `.metod-box`, `.asec-*` (8 seletores), `.adesp-*` (10 seletores)

### Documentação
- `changelog.md` atualizado



### Corrigido
- **Liquidado**: corrigida a definição em toda a documentação — Combustível: 5,01% de desconto; Manutenção: 4,32% de desconto. Ambas as categorias possuem desconto de liquidação (anteriormente estava incorreto: "Manutenção não possui liquidado")
- **Nota KPI**: reescrita para incluir ambos os descontos corretamente

### Adicionado
- **Bloco "Como interpretar este relatório"** — caixa em grid 3×2 exibida logo antes do Resumo Executivo; explica fonte dos dados, diferença Valor × Liquidado, leitura dos gráficos, siglas, variação % e ticket médio
- **KPI "Total Liquidado"** (7º card, verde) — exibe o valor efetivamente pago após descontos contratuais e a economia total gerada no período
- **Cálculos de liquidado** — `totalLiquidadoC`, `totalLiquidadoM`, `totalLiquidado`, `economiaTotal` computados em tempo real com os percentuais corretos (5,01% e 4,32%)
- **Seção "Pontos de Atenção"** — bloco auto-gerado antes do Glossário com até 6 observações contextuais: veículos com alta % de manutenção (>70%), concentração de unidade (>50%), variação expressiva (>20%), confirmação de desconto de liquidação com valores reais, concentração de frota (top-5 >60%), pico de gastos (>30% acima da média)
- **Glossário expandido**: 10 termos, incluindo "Valor (empenhado)", "Economia de liquidação", "Evolução mensal (sparkline)"; legenda de cores agora inclui verde para Liquidado/Economia
- **CSS novos**: `.orientacao-box`, `.orientacao-grid`, `.orientacao-item`, `.orientacao-icone`, `.orientacao-texto`, `.ponto-item`, `.ponto-num`, `.cor-amber/blue/green`, `.pontos-titulo`, `.kpi-liq`, `.kpi-val.liq`, `.kpi-badge-green`

### Alterado
- Último bullet do Resumo Executivo: substituído "atenção especial" por linguagem neutra "acompanhamento individualizado"
- Seção Pontos de Atenção: utiliza estilo visual inspirado na "Análise Administrativa" do Relatório Institucional de Despesas com Entes Estaduais (PDF de referência)

### Documentação
- `changelog.md` atualizado



### Adicionado
- **Resumo Executivo automático** — novo bloco no relatório PDF que gera até 6 bullets de insight extraídos diretamente dos dados filtrados (total, composição comb/manut, mês de pico, maior secretaria, variação do último período, concentração dos top 5 veículos)
- **Subtítulos descritivos em cada seção** — cada bloco do relatório agora tem uma linha explicando o que o usuário está vendo e como interpretar os dados
- **Callout boxes de destaque** — caixa de alerta contextual em Evolução Mensal, Secretaria, Classificação e Ranking com o principal achado de cada seção
- **Mini-barras de proporção (%)** — nas tabelas de Secretaria e Classificação, a coluna % passou a exibir uma barra visual inline proporcional ao valor
- **Legenda de cores** — caixa com legenda ■ Combustível (azul) ■ Manutenção (laranja) ─ Média mensal exibida antes dos gráficos de barra
- **Glossário / Legenda final** — seção permanente no final do relatório com definições de: Combustível, Manutenção, Liquidado, Ticket médio, Sigla, Classificação, Var.%, Evolução Mensal + legenda visual de cores e nota de fonte dos dados
- **Alerta de manutenção elevada no Ranking** — veículos com >70% dos gastos em manutenção recebem ícone ⚠ e fundo levemente diferenciado
- **Indicadores contextuais nos KPI cards** — badge com % do total em Combustível e Manutenção; média mensal no Total; desvio da média no Mês de Pico
- **Notas de rodapé nas seções** — nota explicativa abaixo das tabelas de Evolução, Classificação e Ranking

### Alterado
- **CSS do relatório** — refatorado com novos seletores: `.exec-box`, `.exec-list`, `.callout`, `.secao-header-wrap`, `.secao-desc`, `.kpi-badge`, `.pct-bar-wrap`, `.legenda-cores`, `.nota`, `.glossario`, `.fonte-nota`
- **Seção de Secretaria** — coluna "Proporção" (barra dupla comb/manut) substituída por coluna "% do Total" com mini-barra proporcional ao total geral
- **Ranking de Veículos** — colunas reorganizadas para melhor leitura; modelo e tipo condensados em uma coluna; secretarias na coluna seguinte
- **Detalhamento por Veículo** — label "Secretarias / Unidades vinculadas" adicionada; cabeçalho das tabelas internas com nomes mais descritivos; número de registros e siglas exibidos no subtotal do card
- **Wizard Step 3** — descrições das seções reescritas para explicar o conteúdo gerado por cada bloco
- **Tabelas de Evolução** — variação agora exibe ▲/▼ antes do valor para clareza visual

### Documentação
- `changelog.md` atualizado



### Adicionado
- **Modal utility** (`app.js`) — `Modal.open()` centralizado para: detalhe de registro, expansão de gráfico, detalhe de ponto na evolução mensal
- **Multi-select completo** (`filters.js`) — anos, despesas, tipos, secretarias, classificações; todos com checkboxes, label dinâmico e botão "Limpar seleção"
- **Siglas com nome completo** — mapa completo de 34 secretarias/fundos de Rio Verde
- **Filtros de coluna** na tabela Registros Detalhados (9 inputs + selects por coluna), independentes dos filtros principais
- **Sticky search bar** — barra de busca global do Registros Detalhados fixa abaixo do header ao rolar
- **Click em KPI** — KPI "Maior Despesa" abre modal com todos os dados do registro mais caro
- **Click em gráfico** — clique em barra (Siglas ou Classificação) abre modal com top 10 itens da categoria
- **Click em ponto de evolução** — clique em ponto da linha abre modal com detalhes do mês: total, qtde, principais secretarias, principais categorias
- **Tabelas resumo sem paginação** — todas as 5 tabelas (Classificação, Mês, Tipo, Despesa, Local) exibem todas as linhas com linha de total
- **Status + Sync movidos para sidebar** — header limpo com apenas brand + tema
- **api.js** — `getFilterOptions()` agora retorna `classificacoes[]`
- **state.js** — filtros expandidos: `tipos[]`, `secretarias[]`, `classificacoes[]`

### Alterado
- **index.html** — ordem: KPIs → Filtros → Gráficos → Resumos → Registros Detalhados
- **Header** — removidos status, "Atualizado", botão Sincronizar
- **Sidebar** — removida listagem de secretarias; adicionados status + botão Sincronizar
- **Registros Detalhados** — filtros reorganizados no padrão `ci-filtros-painel` do PCA
- **Font-family** — `system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif` em todo o sistema
- **Gráficos** — cursor pointer, dica visual "Clique para ver detalhes"
- **components.css** — 5 dimensões de `resumo-grid`, `ci-filtros-painel` completo, modal styles

---

## v2.0.0 — Redesign Liquid Glass — 2026-04-03

### Adicionado
- Design system Liquid Glass portado do PCA
- KPI grid 4 colunas com gradientes
- Sidebar dark-glass com stagger de entrada
- Loading banner flutuante com 4 steps
- Toast Liquid Glass com ícone e barra de progresso
- Tema claro/escuro persistido em localStorage
- Header pill sticky com compactação no scroll

---

## v1.3.0 — Carregamento completo — 2026-04-03
- Router.js retorna todos os registros sem paginação padrão

## v1.2.1 — Correções críticas — 2026-04-03
- DadosService.js: NOME_ABA corrigido para 'GERAL'
- api.js: extractRows trata resposta paginada
- api.js: Liquidado mapeia valorLiquidado

## v1.1.0 — Metodologia — 2026-04-03
- metodologia.md criado

## v1.0.0 — Estrutura inicial