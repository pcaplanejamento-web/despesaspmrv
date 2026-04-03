/**
 * kpis.js — KPI cards estilo PCA v2.0
 * Cards gradiente com ícone, label, valor e sub-label.
 */

const Kpis = (() => {

  function fmt(v) {
    if (v >= 1_000_000_000) return `R$ ${(v/1_000_000_000).toFixed(1).replace('.',',')}B`;
    if (v >= 1_000_000)     return `R$ ${(v/1_000_000).toFixed(1).replace('.',',')}M`;
    return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }

  function pct(part, total) {
    if (!total) return '0,0%';
    return `${((part/total)*100).toFixed(1).replace('.',',')}%`;
  }

  function set(valueId, subId, value, sub) {
    const v = document.getElementById(valueId);
    const s = document.getElementById(subId);
    if (v) v.textContent = value;
    if (s) s.textContent = sub;
  }

  function render() {
    const data = State.getFilteredData();
    const raw  = State.getRawData();

    // Atualiza badge da sidebar
    const badge = document.getElementById('sidebarRecordCount');
    if (badge) badge.textContent = data.length.toLocaleString('pt-BR');

    if (!data.length) {
      set('kpiTotalGeralValue',      'kpiTotalGeralSub',      'R$ 0',  '0 registros');
      set('kpiLiquidadoValue',       'kpiLiquidadoSub',       'R$ 0',  'Desconto: 5,01%');
      set('kpiManutencaoValue',      'kpiManutencaoSub',      'R$ 0',  '0,0% do total');
      set('kpiCombustivelValue',     'kpiCombustivelSub',     'R$ 0',  '0,0% do total');
      set('kpiMediaValue',           'kpiMediaSub',           'R$ 0',  'por mes com dados');
      set('kpiMaiorSecretariaValue', 'kpiMaiorSecretariaSub', '--',    '--');
      return;
    }

    const totalGeral  = data.reduce((s,r) => s + r.Valor, 0);
    const totalManut  = data.filter(r => r.Despesa === 'Manutencao').reduce((s,r) => s + r.Valor, 0);
    const totalComb   = data.filter(r => r.Despesa === 'Combustivel').reduce((s,r) => s + r.Valor, 0);
    const totalLiquid = data.filter(r => r.Despesa === 'Combustivel').reduce((s,r) => s + r.Liquidado, 0);

    // Suporte a grafias com acento
    const totalManutA  = totalManut  || data.filter(r => r.Despesa === 'Manutenção').reduce((s,r) => s + r.Valor, 0);
    const totalCombA   = totalComb   || data.filter(r => r.Despesa === 'Combustível').reduce((s,r) => s + r.Valor, 0);
    const totalLiquidA = totalLiquid || data.filter(r => r.Despesa === 'Combustível').reduce((s,r) => s + r.Liquidado, 0);

    const totalManutFinal  = totalManutA;
    const totalCombFinal   = totalCombA;
    const totalLiquidFinal = totalLiquidA;

    // Media mensal
    const meses       = new Set(data.map(r => `${r.Ano}-${r.Mes}`));
    const mediaMensal = meses.size ? totalGeral / meses.size : 0;

    // Maior secretaria
    const porSigla   = data.reduce((acc,r) => { acc[r.Sigla]=(acc[r.Sigla]||0)+r.Valor; return acc; }, {});
    const maiorSigla = Object.entries(porSigla).sort((a,b) => b[1]-a[1])[0] || ['--', 0];

    // Variacao vs mes anterior
    const filtros = State.getFilters();
    let varLabel = '';
    if (filtros.mes && filtros.ano) {
      const mesAnt = parseInt(filtros.mes) - 1;
      const anoAnt = mesAnt === 0 ? parseInt(filtros.ano)-1 : parseInt(filtros.ano);
      const mesRef = mesAnt === 0 ? 12 : mesAnt;
      const anterior = raw.filter(r => r.Mes===mesRef && r.Ano===anoAnt).reduce((s,r)=>s+r.Valor,0);
      if (anterior > 0) {
        const delta = ((totalGeral - anterior) / anterior) * 100;
        const sinal = delta >= 0 ? '+' : '';
        varLabel = ` · ${sinal}${delta.toFixed(1).replace('.',',')}% vs ${CONFIG.MESES[mesRef]}/${anoAnt}`;
      }
    }

    set('kpiTotalGeralValue', 'kpiTotalGeralSub',
      fmt(totalGeral),
      `${data.length.toLocaleString('pt-BR')} registros${varLabel}`
    );

    const descontoLabel = totalCombFinal > 0
      ? `Desconto: ${pct(totalCombFinal - totalLiquidFinal, totalCombFinal)}`
      : 'Sem combustivel no periodo';
    set('kpiLiquidadoValue', 'kpiLiquidadoSub', fmt(totalLiquidFinal), descontoLabel);

    set('kpiManutencaoValue', 'kpiManutencaoSub',
      fmt(totalManutFinal),
      `${pct(totalManutFinal, totalGeral)} do total`
    );

    set('kpiCombustivelValue', 'kpiCombustivelSub',
      fmt(totalCombFinal),
      `${pct(totalCombFinal, totalGeral)} do total`
    );

    set('kpiMediaValue', 'kpiMediaSub',
      fmt(mediaMensal),
      `por mes com dados (${meses.size})`
    );

    set('kpiMaiorSecretariaValue', 'kpiMaiorSecretariaSub',
      maiorSigla[0],
      `${fmt(maiorSigla[1])} · ${pct(maiorSigla[1], totalGeral)}`
    );
  }

  return { render, fmt };
})();