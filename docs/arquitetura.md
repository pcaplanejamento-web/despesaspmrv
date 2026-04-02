# Arquitetura Técnica — Sistema de Gastos

## Visão Geral

O sistema é composto por duas partes independentes que se comunicam via HTTP:

1. **Google Apps Script** — funciona como API/backend, lê a planilha e expõe os dados
2. **Frontend estático** — consome a API e renderiza os painéis

Não há servidor próprio. Toda a infraestrutura usa serviços gratuitos do Google e GitHub.

---

## Camadas e Responsabilidades

### Frontend

| Arquivo | Responsabilidade | NÃO deve conter |
|---|---|---|
| `config.js` | URL da API, constantes globais, mapeamento de colunas | Lógica de negócio |
| `api.js` | fetch, tratamento de erros HTTP, timeout | Formatação visual |
| `state.js` | Estado global (filtros ativos, dados carregados) | Chamadas HTTP |
| `filters.js` | Popular seletores, capturar mudanças, disparar re-render | Cálculos de KPI |
| `kpis.js` | Renderizar cards de KPI no DOM | Busca de dados |
| `charts.js` | Instanciar e atualizar gráficos Chart.js | Estado global |
| `tables.js` | Renderizar tabela, paginação, ordenação | Gráficos |
| `timeline.js` | Gráficos e lógica de linha do tempo | Filtros |
| `comparison.js` | Lógica de comparação de dois cenários | Dados brutos |
| `app.js` | Inicializar tudo, orquestrar chamadas | Regras de negócio |

### Apps Script

| Arquivo | Responsabilidade |
|---|---|
| `Code.gs` | `doGet()` — recebe requisição, chama Router, retorna JSON |
| `Router.gs` | Lê parâmetro `rota`, direciona para o controller correto |
| `DadosService.gs` | Lê planilha, aplica filtros, usa cache |
| `KpiService.gs` | Recebe dados filtrados, calcula todos os KPIs |
| `FiltroService.gs` | Retorna valores únicos de cada coluna para os seletores |
| `TimelineService.gs` | Agrupa dados por mês/ano para o gráfico de linha do tempo |
| `ComparacaoService.gs` | Monta dois datasets para comparação lado a lado |
| `CacheUtil.gs` | Abstrai `CacheService.getScriptCache()` com TTL configurável |
| `CorsUtil.gs` | Adiciona headers `Access-Control-Allow-Origin` |
| `ErroUtil.gs` | Formata erros em JSON padronizado |
| `LogUtil.gs` | Loga erros e eventos no Stackdriver |

---

## Mapeamento de Colunas da Planilha

| Coluna da planilha | Campo interno | Tipo |
|---|---|---|
| Empresa | empresa | string |
| Sigla | sigla | string |
| Centro de Custo | centroCusto | string |
| Departamento | departamento | string |
| Despesa | despesa | string (enum: Combustível, Manutenção) |
| Modelo | modelo | string |
| Classificação | classificacao | string |
| Tipo | tipo | string (enum: Veículo, Máquina) |
| Placa | placa | string |
| Valor | valor | number (R$ formatado → float) |
| Liquidado (-5,01%) | valorLiquidado | number |
| Mês | mes | integer (1–12) |
| Ano | ano | integer |
| Contrato | contrato | string |

---

## Formato da Resposta da API

Todas as rotas retornam JSON no formato:

```json
{
  "status": "ok",
  "rota": "kpis",
  "timestamp": "2026-04-02T10:30:00Z",
  "dados": { ... }
}
```

Em caso de erro:

```json
{
  "status": "erro",
  "codigo": 400,
  "mensagem": "Parâmetro inválido: ano deve ser numérico"
}
```

---

## Estratégia de Cache

| Rota | TTL | Motivo |
|---|---|---|
| `/filtros` | 1 hora | Valores únicos raramente mudam |
| `/dados` sem filtro | 15 min | Dataset completo, pesado |
| `/dados` com filtros | 5 min | Combinações variadas |
| `/kpis` | 10 min | Dependem dos dados |
| `/timeline` | 15 min | Agrupamento estável |
| `/comparacao` | 5 min | Parâmetros variáveis |

Chave de cache: `rota_param1_valor1_param2_valor2` (ex: `dados_ano_2025_sigla_SMIR`)

---

## Estratégia de Versionamento no GitHub

```
main          ← produção (GitHub Pages serve daqui)
  └── develop ← integração contínua
        ├── etapa/2-apps-script
        ├── etapa/3-frontend-base
        ├── etapa/4-kpis-graficos
        └── etapa/5-paginas
```

Padrão de commit:
```
[etapa] tipo: descrição curta

Exemplos:
[apps-script] feat: adiciona rota /comparacao
[frontend] fix: corrige filtro de ano no gráfico de barras
[docs] chore: atualiza mapeamento de colunas
```

---

## Estratégia de Deploy

1. Push para `main` dispara o workflow `.github/workflows/deploy.yml`
2. O workflow copia a pasta `frontend/` para o branch `gh-pages`
3. GitHub Pages serve o conteúdo em `https://<usuario>.github.io/<repositorio>/`
4. Nenhum build é necessário — HTML/CSS/JS puro

---

## Responsividade

| Breakpoint | Layout |
|---|---|
| `>= 1280px` | Sidebar expandida + 2–3 colunas de gráficos |
| `768px – 1279px` | Sidebar colapsável + 2 colunas |
| `< 768px` | Sidebar oculta (menu hamburger) + 1 coluna |

---

## Dependências Externas (CDN — sem instalação)

```html
<!-- Chart.js para gráficos -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>

<!-- Lucide para ícones (mesma lib do PCA) -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
```

Nenhuma outra dependência. Sem npm, sem build, sem node_modules.
