# Changelog

## v2.0.0 — Redesign completo — 2026-04-03

### Adicionado
- `main.css` — Design system Liquid Glass completo portado do PCA: tokens de cor (light/dark), blur, sombras, superfícies translúcidas, gradiente de fundo
- `layout.css` — Header pill sticky com compactação ao rolar, sidebar drawer dark-glass com animação stagger, botão de tema claro/escuro com persistência localStorage
- `components.css` — KPI cards com 6 variantes de gradiente, painel de filtros ci-banner, tabela tabela-moderna-wrap, toast Liquid Glass, loading banner flutuante detalhado com steps de progresso
- `index.html` — Layout completo: header pill, sidebar com link de retorno ao PCA, KPI grid 3×2, grid de gráficos 2×2, seção de registros com banner gradiente + busca sticky + tabela
- `app.js` — Toast system com ícones, barra de progresso e auto-dismiss; loading banner flutuante com 4 steps animados; compactação de header no scroll; tema persistido
- `kpis.js` — 6 cards PCA-style: Total Geral, Liquidado, Manutenção, Combustível, Média Mensal, Maior Secretaria; variação vs mês anterior; badge na sidebar
- `filters.js` — Chips de tipo (Todos/Combustível/Manutenção/Veículos/Máquinas); resumo de filtros ativos com tags removíveis; destaque visual nos filtro-items ativos; filtros rápidos na sidebar
- `tables.js` — Busca inline (placa, modelo, departamento, classificação, sigla); ordenação por todos os cabeçalhos; paginação com janela deslizante; exportação CSV com BOM UTF-8; badges coloridos por tipo e despesa
- `charts.js` — 4 gráficos: donut Tipo Despesa, barras horizontais Top Secretarias, donut Tipo Frota, linha Evolução Mensal; skeletons de carregamento; suporte a tema dark/light

### Alterado
- Todos os arquivos frontend redesenhados com identidade visual do PCA
- Sidebar agora inclui filtros rápidos por entidade (SMIDU, FMS, FMAS, FME) e link de retorno ao PCA
- Loading banner substituído por painel flutuante detalhado com 4 etapas visíveis

---

## v1.3.0 — Carregamento completo sem paginação — 2026-04-03

### Alterado
- `Router.js` — sem porPagina retorna todos os registros
- `api.js` — removidos logs de diagnóstico

---

## v1.2.1 — Correção de carregamento de dados — 2026-04-03

### Corrigido
- `DadosService.js` — NOME_ABA = DADOSGERAL
- `api.js` — extractRows trata resposta paginada; Liquidado mapeia valorLiquidado

---

## v1.1.0 — Metodologia — 2026-04-03

### Documentação
- `metodologia.md` criado

---

## v1.0.0 — Etapa 1

### Adicionado
- Estrutura inicial do projeto