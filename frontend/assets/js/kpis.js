/**
 * kpis.js — Cálculo e renderização dos cards de KPI
 * v1.2.0
 *
 * BUGS CORRIGIDOS NESTA VERSÃO:
 *
 * [B8] KPI "Total Liquidado" — sub-label exibia o desconto calculado sobre
 *      o totalGeral (combustível + manutenção), quando o desconto de 5,01%
 *      se aplica APENAS sobre o valor de combustível. A base correta é
 *      totalComb. Corrigido: pct(totalComb - totalLiquid, totalComb).
 *      Também adicionada guarda para quando totalComb = 0 (evita "NaN%").
 */

const Kpis = (() => {
  // ----- Formatação -----

  function formatBRL(value) {
    if (value >= 1_000_000_000) {
      return `R$ ${(value / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
    }
    if (value >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatBRLFull(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function pct(part, total) {
    if (!total) return '0,0%';
    return `${((part / total) * 100).toFixed(1).replace('.', ',')}%`;
  }

  // ----- Atualização de um card -----

  function setKpi(valueId, subId, value, sub) {
    const valEl = document.getElementById(valueId);
    const subEl = document.getElementById(subId);
    if (valEl) valEl.textContent = value;
    if (subEl) subEl.textContent = sub;
  }

  // ----- Renderização principal -----

  function render() {
    const data = State.getFilteredData();
    const raw  = State.getRawData();

    if (!data.length) {
      setKpi('kpiTotalGeralValue',      'kpiTotalGeralSub',      'R$ 0', '0 registros');
      setKpi('kpiManutencaoValue',      'kpiManutencaoSub',      'R$ 0', '0,0% do total');
      setKpi('kpiCombustivelValue',     'kpiCombustivelSub',     'R$ 0', '0,0% do total');
      setKpi('kpiMediaValue',           'kpiMediaSub',           'R$ 0', 'por mês com dados');
      setKpi('kpiMaiorSecretariaValue', 'kpiMaiorSecretariaSub', '—',    '—');
      setKpi('kpiLiquidadoValue',       'kpiLiquidadoSub',       'R$ 0', 'Desconto: 5,01%');
      return;
    }

    const totalGeral  = data.reduce((s, r) => s + r.Valor, 0);
    const totalManut  = data.filter(r => r.Despesa === 'Manutenção').reduce((s, r) => s + r.Valor, 0);
    const totalComb   = data.filter(r => r.Despesa === 'Combustível').reduce((s, r) => s + r.Valor, 0);
    const totalLiquid = data.filter(r => r.Despesa === 'Combustível').reduce((s, r) => s + r.Liquidado, 0);

    // Média mensal
    const mesesComDados = new Set(data.map(r => `${r.Ano}-${r.Mes}`));
    const mediaMensal   = mesesComDados.size ? totalGeral / mesesComDados.size : 0;

    // Maior secretaria
    const porSigla = data.reduce((acc, r) => {
      acc[r.Sigla] = (acc[r.Sigla] || 0) + r.Valor;
      return acc;
    }, {});
    const maiorSigla = Object.entries(porSigla).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
    const maiorPct   = pct(maiorSigla[1], totalGeral);

    // Variação vs mês anterior
    const filtros = State.getFilters();
    let variacaoLabel = '';
    if (filtros.mes && filtros.ano) {
      const mesAnt = parseInt(filtros.mes) - 1;
      const anoAnt = mesAnt === 0 ? parseInt(filtros.ano) - 1 : parseInt(filtros.ano);
      const mesRef = mesAnt === 0 ? 12 : mesAnt;
      const anterior = raw
        .filter(r => r.Mes === mesRef && r.Ano === anoAnt)
        .reduce((s, r) => s + r.Valor, 0);
      if (anterior > 0) {
        const delta = ((totalGeral - anterior) / anterior) * 100;
        const sinal = delta >= 0 ? '+' : '';
        variacaoLabel = `${sinal}${delta.toFixed(1).replace('.', ',')}% vs ${CONFIG.MESES[mesRef]}/${anoAnt}`;
      }
    }

    setKpi('kpiTotalGeralValue', 'kpiTotalGeralSub',
      formatBRL(totalGeral),
      `${data.length.toLocaleString('pt-BR')} registros${variacaoLabel ? ' · ' + variacaoLabel : ''}`
    );

    setKpi('kpiManutencaoValue', 'kpiManutencaoSub',
      formatBRL(totalManut),
      `${pct(totalManut, totalGeral)} do total`
    );

    setKpi('kpiCombustivelValue', 'kpiCombustivelSub',
      formatBRL(totalComb),
      `${pct(totalComb, totalGeral)} do total`
    );

    setKpi('kpiMediaValue', 'kpiMediaSub',
      formatBRL(mediaMensal),
      `por mês com dados (${mesesComDados.size})`
    );

    setKpi('kpiMaiorSecretariaValue', 'kpiMaiorSecretariaSub',
      maiorSigla[0],
      `${formatBRL(maiorSigla[1])} · ${maiorPct}`
    );

    // [B8] Base do desconto corrigida: usa totalComb (não totalGeral),
    // pois o desconto de 5,01% é aplicado apenas sobre combustível.
    const descontoLabel = totalComb > 0
      ? `Desconto aplicado: ${pct(totalComb - totalLiquid, totalComb)}`
      : 'Sem registros de combustível';

    setKpi('kpiLiquidadoValue', 'kpiLiquidadoSub',
      formatBRL(totalLiquid),
      descontoLabel
    );
  }

  return { render, formatBRL, formatBRLFull };
})();