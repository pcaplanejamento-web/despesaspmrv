# Mapeamento de Colunas da Planilha

## Planilha: Geral - gastos.xlsx → Aba: Página1

| Coluna (planilha) | Campo interno (JS/GS) | Tipo | Exemplo |
|---|---|---|---|
| Empresa | empresa | string | MUNICIPIO DE RIO VERDE |
| Sigla | sigla | string | FMP |
| Centro de Custo | centroCusto | string | FUNDO MUNICIPAL DE POSTURAS |
| Departamento | departamento | string | FUNDO MUNICIPAL DE POSTURAS |
| Despesa | despesa | enum | Combustível, Manutenção |
| Modelo | modelo | string | POLO TRACK MA |
| Classificação | classificacao | enum | VEÍCULO PASSEIO, CAMINHONETE(A)... |
| Tipo | tipo | enum | Veículo, Máquina |
| Placa | placa | string | TFI4F81 |
| Valor | valor | number | R$ 780,16 → 780.16 |
| Liquidado (-5,01%) | valorLiquidado | number | R$ 741,07 → 741.07 |
| Mês | mes | integer | 3 (março) |
| Ano | ano | integer | 2026 |
| Contrato | contrato | enum | PROPRIO, ... |

## Enumerações conhecidas

### Despesa
- Combustível
- Manutenção

### Tipo
- Veículo
- Máquina

### Classificação
- CAMINHONETE(A)
- CAMINHÃO
- FURGÃO
- GRUPO GERADORES
- MAQUINÁRIO/IMPL. AGRÍCOLAS
- MICROÔNIBUS
- MOTOCICLETA
- RETROESCAVADEIRA
- ROCADEIRA
- TRAILER/REBOQUE
- VEÍCULO PASSEIO
- (outras)

### Siglas das Secretarias
- AMAE, AMMT, FMAS, FMC, FMDES, FME, FMP, FMS, GCM, GP
- LAGOA DO BAUZINHO, OUROANA, PGM, PROCON, RIVERLÂNDIA
- SEFAZ, SMAPA, SMAUSP, SMC, SMCTI, SMDES, SMDMU, SME
- SMEL, SMHRF, SMIDU, SMIR, SMMA, SMPG, SMTUR

## Tratamento de valores monetários

Os valores na planilha estão no formato brasileiro com prefixo:
```
R$ 3.751,98
```

O Apps Script deve converter para float usando:
```javascript
function parseMoeda(str) {
  return parseFloat(
    String(str).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
  );
}
```

## Período dos dados

- 2025: janeiro a dezembro (10.806 registros)
- 2026: janeiro a março (2.595 registros)
- Total: 13.401 registros
