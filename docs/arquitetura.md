# Arquitetura Técnica — Sistema de Gastos RV v3.0

## Visão Geral

Sistema frontend estático hospedado no GitHub Pages, integrado ao Google Sheets via Google Apps Script (Web App). Não há servidor próprio.

```
GitHub Pages (frontend)  ←──fetch──→  Apps Script (backend/API)  ←──read──→  Google Sheets
```

## Estrutura de Arquivos Frontend

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Estrutura HTML completa da SPA |
| `assets/css/main.css` | Tokens de design, variáveis CSS, animações globais |
| `assets/css/layout.css` | Header pill, sidebar drawer, page container, botões |
| `assets/css/components.css` | KPIs, filtros, multi-select, modal, charts, tabelas, toast, loading banner |
| `assets/js/config.js` | URL da API, constantes, meses, cores, paleta |
| `assets/js/state.js` | Estado global: filtros multi-select, filtros de coluna, sort, paginação |
| `assets/js/api.js` | Fetch com timeout, normalização, cache, getFilterOptions |
| `assets/js/filters.js` | Multi-select component, applyFilters, resumo de filtros ativos |
| `assets/js/kpis.js` | 4 KPI cards, modal ao clicar em Maior Despesa |
| `assets/js/charts.js` | Gráficos Chart.js, click-to-expand modal, evolução multi-ano |
| `assets/js/tables.js` | Tabela detalhada, tabelas resumo (sem paginação), CSV export |
| `assets/js/app.js` | Modal utility, toast, loading banner, sidebar, tema, bootstrap |

## Estrutura de Dados (Planilha GERAL)

| Coluna | Campo interno | Tipo |
|---|---|---|
| Empresa | Empresa | string |
| Sigla | Sigla | string |
| Centro de Custo | CentroCusto | string |
| Departamento | Departamento | string |
| Despesa | Despesa | string enum: Combustível, Manutenção |
| Modelo | Modelo | string |
| Classificação | Classificacao | string |
| Tipo | Tipo | string enum: Veículo, Máquina |
| Placa | Placa | string |
| Valor | Valor | number |
| Liquidado | Liquidado | number |
| Mês | Mes | integer 1-12 |
| Ano | Ano | integer |
| Contrato | Contrato | string |

## Fluxo de Dados

```
loadData()
  → Api.fetchFromApi()        — fetch ?rota=dados ao Apps Script
  → extractRows()             — desempacota resposta (paginada ou direta)
  → normalizeRow()            — padroniza campos e tipos
  → State.setRawData()        — armazena dataset bruto
  → Filters.populateAll()     — constrói opções dos multi-selects
  → Filters.applyFilters()    — filtra rawData → filteredData
  → App.refresh()
      → Kpis.render()             — atualiza 4 cards
      → Charts.renderAll()        — reconstrói 3 gráficos
      → Tables.renderTable()      — pagina + renderiza tabela detalhada
      → Tables.renderSummaryTables() — 5 tabelas resumo sem paginação
```

## Filtros

### Principais (afetam KPIs, gráficos, tabelas resumo)
- `anos[]` — multi-select
- `despesas[]` — multi-select
- `tipos[]` — multi-select (Veículo / Máquina)
- `secretarias[]` — multi-select com nome completo
- `classificacoes[]` — multi-select

### Coluna (afetam apenas Registros Detalhados)
Inputs individuais por coluna: Sigla, Departamento, Despesa, Tipo, Placa, Modelo, Classificacao, Mes, Ano, ValorMin

## Modais

Utilitário `Modal` em `app.js`:
- `Modal.open('detalheRegistro', registro)` — detalhes de qualquer registro
- `Modal.open('chartDetalhe', {titulo, registros, tipo})` — clique em barra do gráfico
- `Modal.open('evolucaoDetalhe', {mes, ano, total, registros})` — clique em ponto da linha

## Responsividade

| Breakpoint | Comportamento |
|---|---|
| ≥ 1280px | Sidebar externa, 4 KPIs, gráficos 2×1, resumos 2×2 |
| 768–1279px | Sidebar drawer, 2 KPIs, gráficos 1 col, resumos 1 col |
| < 768px | Layout coluna única, KPIs 2×2, tudo empilhado |

## Apps Script

Endpoint: `CONFIG.API_URL?rota=dados`
Resposta aceita: array direto, `{dados:[...]}`, `{dados:{registros:[...]}}`, `{registros:[...]}`, `{data:[...]}`

## Dependências Externas

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

Nenhuma outra dependência. Sem npm, sem build, sem node_modules.
## Módulos Adicionados — v4.0

### analise.js — Análise Avançada
Módulo completamente independente. Lê dados de `State.getRawData()` (não de `getFilteredData()`).
Não compartilha estado com `Filters`, `Tables` ou qualquer outro módulo principal.

**Filtros próprios:**
- `aaMesIni`, `aaAnoIni`, `aaMesFim`, `aaAnoFim` — período
- `aaSecretaria` — sigla
- `aaDespesa` — Combustível / Manutenção
- `aaPlacaInput` — placa com autocomplete

**API pública:**
- `Analise.init()` — inicializa os filtros com opções disponíveis
- `Analise.onDataReady()` — chamado após dados carregados para popular selects
- `Analise.aplicar()` — filtra e renderiza análise
- `Analise.limpar()` — limpa estado e resultado
- `Analise.preencherFiltros(opts)` — preenche filtros a partir de contexto externo (ex: clique no modal de evolução)

### Painel de Alertas Flutuante
Slide-in pelo lado direito (`#alertsPanel`), acessível pelo botão `#btnAlertsHeader` no header.
Categorias: Todos / Críticos / Atenção / Info.
Consome `Alertas.getUltimosAlertas()` (adicionado em `alertas.js`).
Não substitui a lógica existente de `alertas.js`; apenas a expõe de forma diferente.

## Separação de Filtros — v4.0 (OBRIGATÓRIO manter)

```
Grupo 1 — Filtros Principais (State.getFilters())
  → anos[], despesas[], tipos[], secretarias[], classificacoes[]
  → Afetam: KPIs, Gráficos, Resumos, Registros Detalhados

Grupo 2 — Filtros de Coluna (State.getColFilters())
  → Sigla, Departamento, Despesa, Tipo, Placa, Modelo, Classificacao, Mes, Ano
  → Afetam: apenas Registros Detalhados

Grupo 3 — Filtros da Análise Avançada (_estado em analise.js)
  → mesIni, anoIni, mesFim, anoFim, secretaria, despesa, placa
  → Afetam: apenas secaoAnaliseAvancada
  → Lê: State.getRawData() diretamente
```

