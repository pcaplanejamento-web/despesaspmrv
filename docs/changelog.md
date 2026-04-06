## v4.0.0 — Análise Avançada + Painel de Alertas + Melhorias — 2026-04-05

### Adicionado
- **Página Análise Avançada** (`secaoAnaliseAvancada`) — nova seção no sistema com filtros próprios e completamente independentes dos filtros principais; permite análise por veículo, secretaria, período e tipo de despesa
- **`analise.js`** — novo módulo responsável por toda a lógica da Análise Avançada (filtros, aggreaação, gráficos, tabela de registros); sem dependência dos filtros principais nem dos filtros de Registros Detalhados
- **Item "Análise Avançada" no menu lateral** — substitui o item "Alertas" que foi movido para painel flutuante
- **Painel flutuante de Alertas** (`#alertsPanel`) — slide-in pelo lado direito com categorias (Todos / Críticos / Atenção / Info), botão no header pill ao lado do tema
- **Botão de alertas no header** (`btn-alerts-header`) com badge indicando alertas críticos
- **Tabela "Por Mês" com Mês e Ano em colunas separadas** — nova estrutura com `aggMes()` em `tables.js`
- **Click em tabelas resumo** — todas as tabelas de resumo (Classificação, Mês, Tipo, Despesa, Local) abrem modal detalhado ao clicar em qualquer linha
- **Botão "Análise Avançada" no modal de Evolução Mensal** — navega e pré-preenche filtros da nova página
- **Auto-fechar dropdowns ao tirar mouse** — comportamento consistente em todos os multi-selects
- **ResizeObserver no gráfico de Evolução Mensal** — corrige perda de proporção ao redimensionar
- **`getUltimosAlertas()`** em `alertas.js` — expõe cache de alertas para o painel flutuante

### Alterado
- **Menu lateral** — item "Alertas" removido da navegação; substituído por "Análise Avançada"; painel de alertas acessível pelo botão no header
- **`components.css`** — novos estilos para: painel de alertas, botão header, Análise Avançada, tabelas resumo clicáveis, fix overflow de títulos em banners de gráficos
- **`app.js`** — integração com Analise.init(), Analise.onDataReady(), Tables.bindResumoClickable(), painel flutuante de alertas
- **`filters.js`** — adicionado auto-close com delay de 280ms ao tirar mouse do dropdown
- **`charts.js`** — ResizeObserver no wrapper do gráfico de evolução para redimensionamento correto
- **`tables.js`** — função `aggMes()` separada, `_fillMes()` com colunas Mês/Ano distintas, `_bindResumoClickable()` para click nas tabelas resumo

### Documentação
- `changelog.md` atualizado
- `arquitetura.md` atualizado

---

# Changelog

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