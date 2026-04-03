# Changelog

## v1.3.0 — Carregamento completo sem paginação — 2026-04-03

### Alterado
- **`Router.js` — `_rotaDados()`** — quando `porPagina` não é informado na requisição, retorna todos os registros da planilha de uma vez, sem fatiar. Paginação permanece funcional quando `porPagina` é passado explicitamente como parâmetro.
- **`api.js` — `fetchFromApi()`** — removidos os logs de diagnóstico temporários `[DIAG-1/2/3]`. URL mantida como `?rota=dados` sem parâmetro de paginação, garantindo que o Router sirva o dataset completo.

### Corrigido
- Tela inicial exibia 0 registros porque o Router paginava em 100 por padrão e o frontend não solicitava páginas subsequentes. Agora todos os registros são carregados na primeira e única requisição.

---

# Changelog

## v1.2.1 — Correção de carregamento de dados — 2026-04-03

### Corrigido
- **[B8] `DadosService.js` linha 15** — `NOME_ABA` estava definido como `'DADOSGERAL'` em vez de `'GERAL'`. O Apps Script lançava erro ao tentar abrir a aba, impedindo qualquer leitura da planilha. Causa raiz do tela em branco.
- **[B8] `api.js` — `extractRows()`** — a função não tratava a estrutura paginada retornada pelo `Router.js` na rota `dados`. A resposta real é `{ dados: { registros: [...], paginacao: {...} } }`, mas o código verificava `Array.isArray(json.dados)`, que é `false` para um objeto. Adicionada verificação `json.dados.registros` antes das demais, garantindo extração correta dos registros.
- **[B9] `api.js` — `normalizeRow()`** — campo `Liquidado` buscava `row.Liquidado || row.liquidado`, mas o `DadosService.js` serializa o campo como `valorLiquidado`. Adicionado `|| row.valorLiquidado` no fallback. Todos os KPIs de liquidação estavam retornando 0.

### Arquivos alterados
- `DadosService.js` — linha 15
- `api.js` — `extractRows()` e `normalizeRow()`

---

## v1.1.0 — Metodologia — 2026-04-03

### Documentação
- `metodologia.md` criado — define fluxo de trabalho obrigatório: leitura dos arquivos do projeto antes de qualquer ação, atualização de `.md` a cada entrega, hierarquia de decisão entre arquivo do projeto, instrução do usuário e memória de contexto

---

## v1.0.0 — Etapa 1 (em andamento)

### Adicionado
- Estrutura completa de pastas do projeto
- `README.md` com visão geral e instruções
- `docs/arquitetura.md` — arquitetura técnica detalhada
- `docs/apps-script-deploy.md` — guia de publicação do Apps Script
- `docs/mapeamento-colunas.md` — mapeamento da planilha
- `frontend/index.html` — página principal do dashboard
- `frontend/assets/css/main.css` — variáveis e estilos globais
- `frontend/assets/css/layout.css` — sidebar, header e grid
- `frontend/assets/css/components.css` — cards, KPIs, tabelas, botões
- `frontend/assets/js/config.js` — configuração e constantes
- `frontend/assets/js/state.js` — gerenciamento de estado global
- `frontend/assets/js/api.js` — comunicação com o Apps Script
- `frontend/assets/js/app.js` — orquestração e inicialização
- `.github/workflows/deploy.yml` — deploy automático no GitHub Pages

### Próximas etapas
- Etapa 2: Apps Script completo (Code.gs + services)
- Etapa 3: kpis.js, charts.js, filters.js, tables.js
- Etapa 4: Páginas secundárias
- Etapa 5: Exportação e deploy