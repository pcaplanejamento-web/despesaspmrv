/**
 * kpis.js — v3.0
 * 4 KPIs: Total, Quantidade, Média Mensal, Maior Despesa.
 * Click em Maior Despesa abre modal de detalhe.
 */
const Kpis = (() => {

  function set(vid, sid, val, sub) {
    const v = document.getElementById(vid);
    const s = document.getElementById(sid);
    if (v) v.textContent = val;
    if (s) s.textContent = sub;
  }

  let _maiorRegistro = null;

  function render() {
    const data  = State.getFilteredData();
    const badge = document.getElementById('sidebarRecordCount');
    if (badge) badge.textContent = data.length.toLocaleString('pt-BR');

    if (!data.length) {
      set('kpiTotalGeralValue', 'kpiTotalGeralSub', 'R$ 0,00', '0 registros');
      set('kpiQtdeValue',       'kpiQtdeSub',       '0',       'sem dados no período');
      set('kpiMediaValue',      'kpiMediaSub',       'R$ 0,00', 'por mês com dados');
      set('kpiMaiorValue',      'kpiMaiorSub',       'R$ 0,00', 'item mais caro');
      _maiorRegistro = null;
      return;
    }

    const total  = data.reduce((s,r) => s + r.Valor, 0);
    const qtde   = data.length;
    const meses  = new Set(data.map(r => `${r.Ano}-${r.Mes}`));
    const media  = meses.size ? total / meses.size : 0;
    const maior  = data.reduce((m, r) => r.Valor > m ? r.Valor : m, 0);
    _maiorRegistro = data.reduce((acc,r) => (!acc || r.Valor > acc.Valor) ? r : acc, null);

    // Variação vs ano anterior (quando 1 ano selecionado)
    const f   = State.getFilters();
    let varLabel = '';
    if (f.anos.length === 1) {
      const anoSel  = parseInt(f.anos[0]);
      const anterior = State.getRawData().filter(r => r.Ano === anoSel-1).reduce((s,r)=>s+r.Valor,0);
      if (anterior > 0) {
        const delta = ((total - anterior) / anterior) * 100;
        varLabel = ` · ${delta>=0?'+':''}${delta.toFixed(1).replace('.',',')}% vs ${anoSel-1}`;
      }
    }

    set('kpiTotalGeralValue', 'kpiTotalGeralSub',
      fmtBRLAbrev(total),
      `${qtde.toLocaleString('pt-BR')} registros${varLabel}`
    );
    set('kpiQtdeValue', 'kpiQtdeSub',
      qtde.toLocaleString('pt-BR'),
      `em ${meses.size} mês(es) com dados`
    );
    set('kpiMediaValue', 'kpiMediaSub',
      fmtBRLAbrev(media),
      `média de ${meses.size} mês(es)`
    );
    set('kpiMaiorValue', 'kpiMaiorSub',
      fmtBRLAbrev(maior),
      _maiorRegistro
        ? `${_maiorRegistro.Placa || _maiorRegistro.Modelo || '--'} · ${_maiorRegistro.Sigla||''}`
        : 'item mais caro'
    );

    // KPI Maior Despesa — cursor pointer
    const kpiMaior = document.getElementById('kpiMaiorCard');
    if (kpiMaior) kpiMaior.style.cursor = _maiorRegistro ? 'pointer' : '';
  }

  function openMaiorDespesaModal() {
    if (!_maiorRegistro) return;
    Modal.open('detalheRegistro', _maiorRegistro);
  }

  return { render, openMaiorDespesaModal };
})();