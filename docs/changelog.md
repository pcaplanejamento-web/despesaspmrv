# Changelog

## v3.2.0 — Relatórios: Liquidado, Pontos de Atenção, Como Interpretar — 2026-04-07

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