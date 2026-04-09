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
| `assets/js/config.js` | URL da API, constantes, meses, cores, paleta; utilitários globais de formatação e tema |
| `assets/js/state.js` | Estado global: filtros multi-select, filtros de coluna, sort, paginação |
| `assets/js/api.js` | Fetch com timeout, normalização, cache, getFilterOptions |
| `assets/js/filters.js` | Multi-select component, applyFilters, resumo de filtros ativos |
| `assets/js/kpis.js` | 4 KPI cards, modal ao clicar em Maior Despesa |
| `assets/js/charts.js` | Gráficos Chart.js, click-to-expand modal, evolução multi-ano |
| `assets/js/tables.js` | Tabela detalhada, tabelas resumo (sem paginação), CSV export, ResumoPainel lateral |
| `assets/js/app.js` | Modal utility, toast, loading banner, sidebar, tema, bootstrap |
| `assets/js/alertas.js` | Dashboard de alertas: detecta anomalias (custo elevado, múltiplas manutenções, variação de secretaria, inatividade) |
| `assets/js/comparativo.js` | Comparativo de dois períodos quaisquer: KPIs lado a lado, gráfico de barras agrupadas, tabela por secretaria |
| `assets/js/exportacao.js` | Exportação XLSX (3 abas) e geração de Relatório PDF (wizard 3 etapas, SVG builders inline) |
| `assets/js/urlhash.js` | Persistência dos filtros ativos na URL via hash; suporte a bookmark e compartilhamento |
| `assets/js/veiculo.js` | Ficha completa do veículo: análise por despesa, YoY, desvio padrão, contratos, histórico de siglas, PDF |

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
      → Alertas.renderizar()      — calcula e exibe alertas de anomalia
      → UrlHash.push()            — sincroniza filtros ativos na URL
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
- `Modal.openRaw(html, panelClass)` — modal genérico de conteúdo livre (usado por `comparativo.js` e `charts.js::expandChart`)

Modais próprios do módulo `veiculo.js` (não passam pelo utilitário `Modal`):
- `Veiculo.abrirBusca()` — modal de busca de placa
- `Veiculo.abrirFicha(placa)` — ficha completa do veículo com análise, gráficos e PDF

## Dependências entre módulos

```
config.js   → todos os módulos (globals: fmtBRL, fmtMes, kFmt, isDark, textColor, gridColor, isComb, isManut, escHTML)
state.js    → api.js, filters.js, kpis.js, charts.js, tables.js, app.js, urlhash.js, veiculo.js, comparativo.js
api.js      → filters.js, app.js
filters.js  → tables.js, charts.js, app.js, exportacao.js, veiculo.js, alertas.js, comparativo.js
exportacao.js → filters.js (siglaLabel)
veiculo.js  → filters.js (siglaLabel), app.js (Modal, showToast)
```

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