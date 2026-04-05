# Changelog

## v3.1.0 — Correções e Novas Funcionalidades — 2026-04-05

### Corrigido
- **`analise.js`** — erro `split is not a function` em `renderizarScoreSaude` e `renderizarRastreamento`: adicionados helpers `_sl()` e `_slShort()` que garantem conversão segura para string antes de qualquer `.split()`
- **`analise.html`** — mesma correção nas funções inline `_renderScore` e `_renderRastreamento`
- **`veiculo.js`** — cadeia `siglas.map(sl).map(s=>s.split(...))` substituída por `siglas.map(_slShort)` com helper defensivo
- **`visualizacoes.js`** — tooltip do gráfico de dispersão corrigido com `_slShort()`

### Adicionado
- **`impressao.js`** — módulo de relatório de impressão com filtros (Ano, Despesa, Tipo, Secretaria, Classificação), KPIs, tabelas por mês/secretaria, top 20 registros e suporte a `window.print()`
- **Botão "Imprimir"** no painel de filtros de `index.html` e botão "Relatório / Imprimir" na sidebar
- **Botão "Ir para Análise Avançada"** nos modais de detalhe de Registro de Despesa — passa filtros pré-preenchidos via URL (sigla, despesa, tipo, classificação, ano, mês)
- **Botão removido** de todos os outros modais (gráfico, evolução, resumos) — apenas em Registro de Despesa
- **Navegação entre meses** no modal "Por Mês" — botões ← → para navegar entre os períodos sem fechar o modal
- **Colunas Mês e Ano separadas** na tabela interna do modal de Mês (antes era "Mês/Ano" em coluna única)
- **`#uiBlocker`** — div que bloqueia interação com a UI enquanto o carregamento inicial está em andamento; liberado automaticamente em `lbSuccess` e `lbError`

### Alterado
- **`app.js`** — `lbShow()` ativa o bloqueador de UI; `lbSuccess()` e `lbError()` desativam; botões de impressão registrados em `_initFerramentas()`; `btnExport` vinculado a `Tables.exportCSV()` em `init()`
- **`tables.js`** — `_openResumoModal()` reformulado com navegação prev/next entre meses; coluna "Mês" e "Ano" separadas na tabela interna
- **`extras.css`** — estilos adicionados para: `.modal-nav-btn`, `#uiBlocker`, `#btnPrint`, `#printPreview`, `.print-*`, `.analise-filtros`, regras de `@media print`

### Documentação
- `changelog.md` atualizado

---

## v3.0.1 — Correção crítica: split is not a function — 2026-04-05

### Corrigido
- **`analise.js`** — erro `a.label.split is not a function` na tela "Análise Avançada de Frota": `Filters.siglaLabel()` retornava `undefined` quando a sigla era `null`, `undefined` ou não mapeada, e a chamada subsequente a `.split('—')` lançava exceção. Adicionados helpers `_sl()` e `_slShort()` com proteção completa (null-check, conversão para string, try/catch, fallback).
- **`analise.html`** — mesma correção aplicada inline nas funções `_renderScore` e `_renderRastreamento`.
- **`veiculo.js`** — padrão `siglas.map(sl).map(s=>s.split('—')[0].trim())` substituído por `siglas.map(_slShort)` com helper defensivo local.
- **`visualizacoes.js`** — tooltip do gráfico de dispersão usava `sl(h.v.sigla).split('—')[0].trim()`; substituído por `_slShort()` com helper defensivo local.

### Documentação
- `changelog.md` atualizado

---

## v3.0.0 — Redesign completo — 2026-04-03

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