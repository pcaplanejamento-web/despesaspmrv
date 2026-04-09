# Mapeamento de Colunas — Planilha GERAL

## Planilha

**ID:** `1QUbIMNx0_qtLFFyRCE24f7crSs4BsL3j93TMRZ1Gazg`  
**Aba:** `GERAL`

## Colunas (ordem obrigatória)

| # | Coluna na planilha | Campo interno (JS) | Tipo |
|---|---|---|---|
| 1 | Empresa | `Empresa` | string |
| 2 | Sigla | `Sigla` | string |
| 3 | Centro de Custo | `CentroCusto` | string |
| 4 | Departamento | `Departamento` | string |
| 5 | Despesa | `Despesa` | enum: Combustível, Manutenção |
| 6 | Modelo | `Modelo` | string |
| 7 | Classificação | `Classificacao` | string |
| 8 | Tipo | `Tipo` | enum: Veículo, Máquina |
| 9 | Placa | `Placa` | string (uppercase) |
| 10 | Valor | `Valor` | float (R$ → float) |
| 11 | Liquidado | `Liquidado` | float (Combustível: desconto 5,01%; Manutenção: desconto 4,32%) |
| 12 | Mês | `Mes` | integer 1–12 |
| 13 | Ano | `Ano` | integer |
| 14 | Contrato | `Contrato` | string |

## Regras de Normalização

- `Placa` → `toUpperCase()`
- `Valor` / `Liquidado` → `parseBRFloat()` suporta "R$ 1.234,56" e "1234.56"
- `Classificacao` → aceita "Classificação" (com acento) ou "Classificacao"
- `Mes` → aceita "Mês", "Mês", "Mes", "mes"
- `Liquidado` → aceita "Liquidado", "liquidado", "valorLiquidado"

## Filtros disponíveis (getFilterOptions)

- `anos` — valores únicos de Ano
- `meses` — valores únicos de Mes (ordenados numericamente)
- `despesas` — valores únicos de Despesa
- `tipos` — valores únicos de Tipo
- `secretarias` — valores únicos de Sigla
- `classificacoes` — valores únicos de Classificacao
- `empresas` — valores únicos de Empresa