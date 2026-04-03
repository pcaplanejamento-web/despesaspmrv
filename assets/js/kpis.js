/**
 * kpis.js — 4 KPIs v2.1
 * Total Despesas, Quantidade, Média Mensal, Maior Despesa
 */
const Kpis = (() => {
  function fmt(v) {
    if (v >= 1_000_000_000) return `R$ ${(v/1e9).toFixed(1).replace('.',',')}B`;
    if (v >= 1_000_000)     return `R$ ${(v/1e6).toFixed(1).replace('.',',')}M`;
    return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }

  function set(vid, sid, val, sub) {
    const v = document.getElementById(vid);
    const s = document.getElementById(sid);
    if (v) v.textContent = val;
    if (s) s.textContent = sub;
  }

  function render() {
    const data = State.getFilteredData();
    const badge = document.getElementById('sidebarRecordCount');
    if (badge) badge.textContent = data.length.toLocaleString('pt-BR');

    if (!data.length) {
      set('kpiTotalGeralValue','kpiTotalGeralSub', 'R$ 0',   '0 registros');
      set('kpiQtdeValue',      'kpiQtdeSub',       '0',      'ocorrencias no periodo');
      set('kpiMediaValue',     'kpiMediaSub',       'R$ 0',  'por mes com dados');
      set('kpiMaiorValue',     'kpiMaiorSub',       'R$ 0',  'item mais caro');
      return;
    }

    const total  = data.reduce((s,r) => s + r.Valor, 0);
    const qtde   = data.length;
    const meses  = new Set(data.map(r => `${r.Ano}-${r.Mes}`));
    const media  = meses.size ? total / meses.size : 0;
    const maior  = Math.max(...data.map(r => r.Valor));
    const maiorR = data.find(r => r.Valor === maior);

    const f = State.getFilters();
    let varLabel = '';
    const raw = State.getRawData();
    if (f.anos.length === 1 && !f.anos.includes('todos')) {
      // compara com mesmo período do ano anterior
      const anoSel = parseInt(f.anos[0]);
      const anterior = raw.filter(r => r.Ano === anoSel - 1).reduce((s,r) => s + r.Valor, 0);
      if (anterior > 0) {
        const delta = ((total - anterior) / anterior) * 100;
        varLabel = ` · ${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.',',')}% vs ${anoSel-1}`;
      }
    }

    set('kpiTotalGeralValue','kpiTotalGeralSub',
      fmt(total),
      `${qtde.toLocaleString('pt-BR')} registros${varLabel}`
    );
    set('kpiQtdeValue','kpiQtdeSub',
      qtde.toLocaleString('pt-BR'),
      `em ${meses.size} mes(es) com dados`
    );
    set('kpiMediaValue','kpiMediaSub',
      fmt(media),
      `media de ${meses.size} mes(es)`
    );
    set('kpiMaiorValue','kpiMaiorSub',
      fmt(maior),
      maiorR ? `${maiorR.Placa || maiorR.Modelo || '--'} · ${maiorR.Sigla || ''}` : 'item mais caro'
    );
  }

  return { render, fmt };
})();