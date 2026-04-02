# Sistema de Gastos — Município de Rio Verde

Painel analítico de Combustível e Manutenção de frota, integrado ao Google Planilhas via Apps Script.

Desenvolvido para complementar o sistema do PCA, utilizando o mesmo stack (HTML + CSS + JS puro), sem dependências de build ou frameworks.

---

## Estrutura do Projeto

```
gastos-sistema/
│
├── frontend/                        # Interface web (HTML/CSS/JS puro)
│   ├── index.html                   # Dashboard principal (ponto de entrada)
│   ├── assets/
│   │   ├── css/
│   │   │   ├── main.css             # Estilos globais, variáveis e reset
│   │   │   ├── layout.css           # Sidebar, header, grid responsivo
│   │   │   └── components.css       # Cards, botões, tabelas, filtros
│   │   ├── js/
│   │   │   ├── config.js            # URL do Apps Script e constantes globais
│   │   │   ├── api.js               # Comunicação com o Apps Script
│   │   │   ├── state.js             # Estado global da aplicação (filtros ativos)
│   │   │   ├── filters.js           # Lógica de filtros e seletores
│   │   │   ├── kpis.js              # Renderização dos KPIs
│   │   │   ├── charts.js            # Todos os gráficos (Chart.js)
│   │   │   ├── tables.js            # Tabelas com ordenação e paginação
│   │   │   ├── timeline.js          # Linha do tempo e evolução mensal
│   │   │   ├── comparison.js        # Comparação de cenários
│   │   │   └── app.js               # Inicialização e orquestração geral
│   │   └── icons/                   # Ícones SVG locais (Lucide exportados)
│   ├── pages/
│   │   ├── secretarias.html         # Visão por secretaria
│   │   ├── evolucao.html            # Linha do tempo e evolução
│   │   ├── comparacao.html          # Comparação de cenários
│   │   ├── classificacao.html       # Por tipo de veículo/máquina
│   │   └── exportacao.html          # Exportação de relatórios
│   └── components/                  # Fragmentos HTML reutilizáveis (carregados via JS)
│       ├── layout/
│       │   ├── sidebar.html         # Menu lateral
│       │   └── header.html          # Cabeçalho com filtros globais
│       ├── kpis/
│       │   └── kpi-card.html        # Template de card de KPI
│       ├── charts/
│       │   └── chart-card.html      # Template de card de gráfico
│       ├── filters/
│       │   └── filter-bar.html      # Barra de filtros reutilizável
│       └── tables/
│           └── data-table.html      # Tabela com paginação
│
├── apps-script/                     # Código do Google Apps Script
│   ├── Code.gs                      # Ponto de entrada (doGet / doPost)
│   ├── appsscript.json              # Configurações e permissões do projeto
│   ├── services/
│   │   ├── DadosService.gs          # Leitura e cache dos dados da planilha
│   │   ├── KpiService.gs            # Cálculo dos KPIs
│   │   ├── FiltroService.gs         # Lógica de filtros dinâmicos
│   │   ├── TimelineService.gs       # Agrupamento por período
│   │   └── ComparacaoService.gs     # Comparação entre cenários
│   ├── controllers/
│   │   └── Router.gs                # Roteamento das requisições HTTP
│   └── utils/
│       ├── CacheUtil.gs             # Wrapper do CacheService
│       ├── CorsUtil.gs              # Headers de CORS
│       ├── ErroUtil.gs              # Tratamento padronizado de erros
│       └── LogUtil.gs               # Logs estruturados
│
├── docs/
│   ├── arquitetura.md               # Este documento
│   ├── apps-script-deploy.md        # Como publicar o Apps Script
│   ├── mapeamento-colunas.md        # Mapeamento das colunas da planilha
│   └── changelog.md                 # Histórico de versões
│
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions (deploy automático)
│
└── README.md                        # Este arquivo
```

---

## Stack Tecnológico

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend | HTML5 + CSS3 + JS puro | Compatibilidade com o sistema PCA existente |
| Gráficos | Chart.js (CDN) | Leve, sem build, mesma lib do PCA |
| Ícones | Lucide (CDN) | Consistência visual com o PCA |
| Backend | Google Apps Script | Sem servidor, integrado à planilha |
| Dados | Google Planilhas | Fonte oficial dos dados de gastos |
| Repositório | GitHub | Versionamento e histórico |
| Deploy | GitHub Pages | Hospedagem gratuita e automática |

---

## Fluxo de Dados

```
Google Planilhas
      |
      | (leitura automática)
      v
Google Apps Script (Web App publicado)
      |
      | (HTTP GET — JSONP ou fetch com CORS)
      v
frontend/assets/js/api.js
      |
      | (dados normalizados)
      v
state.js  →  filters.js
      |
      +——→ kpis.js
      +——→ charts.js
      +——→ tables.js
      +——→ timeline.js
      +——→ comparison.js
```

---

## Rotas da API (Apps Script)

| Rota | Descrição |
|---|---|
| `?rota=dados` | Retorna todos os registros (com filtros opcionais) |
| `?rota=kpis` | Retorna os KPIs calculados |
| `?rota=filtros` | Retorna os valores únicos para popular os seletores |
| `?rota=timeline` | Retorna agrupamento por mês/ano |
| `?rota=comparacao` | Retorna dois conjuntos de dados para comparar |

Parâmetros suportados: `ano`, `mes`, `sigla`, `despesa`, `tipo`, `classificacao`, `contrato`, `inicio`, `fim`, `cenario1`, `cenario2`

---

## Como Iniciar

### 1. Configurar o Apps Script
Veja `docs/apps-script-deploy.md`

### 2. Configurar a URL no Frontend
Edite `frontend/assets/js/config.js` e insira a URL publicada do seu Web App.

### 3. Rodar localmente
Basta abrir `frontend/index.html` no navegador (ou usar Live Server no VS Code).

### 4. Deploy no GitHub Pages
Faça push para a branch `main`. O workflow `.github/workflows/deploy.yml` publica automaticamente.

---

## Padrões de Código

- Nenhuma regra de negócio dentro do HTML
- Todo gráfico consome dados de `charts.js`, nunca diretamente do HTML
- Todos os filtros passam pelo `state.js` antes de qualquer renderização
- Toda chamada à API passa por `api.js` com tratamento de erro
- Comentários em português, código em inglês

---

## Etapas de Entrega

| Etapa | Status | Descrição |
|---|---|---|
| 1 | Concluída | Arquitetura e estrutura de pastas |
| 2 | Pendente | Apps Script completo (Code.gs + services) |
| 3 | Pendente | Frontend base (index.html + CSS + config.js + api.js) |
| 4 | Pendente | KPIs, gráficos e filtros |
| 5 | Pendente | Páginas secundárias (secretarias, evolução, comparação) |
| 6 | Pendente | Exportação e deploy |
