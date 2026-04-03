/**
 * charts.js — v3.0
 * Gráficos com click-to-expand modal.
 * Evolução mensal com click em ponto para detalhes.
 */
const Charts = (() => {
  const _inst = {};
  let _evolucaoData = null; // dados por ano/mês para o modal de ponto

  function isDark()    { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function textColor() { return isDark() ? 'rgba(232,237,245,0.75)' : 'rgba(26,31,54,0.70)'; }
  function gridColor() { return isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(67,97,238,0.07)'; }

  const PAL = CONFIG.PALETA_GRAFICOS;

  const BASE_TOOLTIP = () => ({
    backgroundColor: isDark() ? '#1a1f36' : '#fff',
    titleColor:      isDark() ? '#e8edf5' : '#1a1f36',
    bodyColor:       isDark() ? '#9ca3af' : '#6b7280',
    borderColor:     isDark() ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)',
    borderWidth:1, padding:12, cornerRadius:10,
    titleFont:{weight:'700',size:13}, bodyFont:{size:12},
  });

  const BASE = {
    animation: {duration:350, easing:'easeOutQuart'},
    responsive: true,
    maintainAspectRatio: true,
  };

  function destroy(id) { if (_inst[id]) { _inst[id].destroy(); delete _inst[id]; } }

  function kFmt(v) {
    if (v >= 1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M';
    if (v >= 1e3) return 'R$'+(v/1e3).toFixed(0)+'k';
    return 'R$'+v;
  }

  function noData(canvasId) {
    const el = document.getElementById(canvasId);
    if (el) el.parentElement.innerHTML = '<p class="chart-no-data">Sem dados para o período selecionado</p>';
  }

  function hideSkeleton(id) {
    const sk = document.getElementById('skeleton'+id.charAt(0).toUpperCase()+id.slice(1));
    if (sk) sk.style.display = 'none';
    const cv = document.getElementById('chart'+id.charAt(0).toUpperCase()+id.slice(1));
    if (cv) cv.style.opacity = '1';
  }

  function showSkeletons() {
    ['Siglas','Classificacao','Evolucao'].forEach(n => {
      const sk = document.getElementById('skeleton'+n); if(sk) sk.style.display='block';
      const cv = document.getElementById('chart'+n);    if(cv) cv.style.opacity='0';
    });
  }

  // ── Gráfico 1: Por Local (Sigla) ─────────────────────────────────────────

  function renderSiglas(data) {
    hideSkeleton('siglas');
    destroy('chartSiglas');
    const canvas = document.getElementById('chartSiglas');
    if (!canvas) return;

    const agg = {};
    data.forEach(r => { const k = r.Sigla||'--'; agg[k]=(agg[k]||0)+r.Valor; });
    const sorted = Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,10);
    if (!sorted.length) { noData('chartSiglas'); return; }

    _inst['chartSiglas'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(s=>s[0]),
        datasets: [{
          data: sorted.map(s=>s[1]),
          backgroundColor: sorted.map((_,i)=>PAL[i%PAL.length]+'BB'),
          borderColor:     sorted.map((_,i)=>PAL[i%PAL.length]),
          borderWidth:0, borderRadius:8, borderSkipped:false,
        }],
      },
      options: {
        ...BASE, indexAxis:'y',
        plugins: {
          legend:{ display:false },
          tooltip:{ ...BASE_TOOLTIP(), callbacks:{ label:ctx=>' '+ctx.parsed.x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) } },
        },
        scales: {
          x: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11},callback:kFmt} },
          y: { grid:{display:false}, border:{display:false}, ticks:{color:textColor(),font:{size:12,weight:'600'}} },
        },
        onClick(e, elems) {
          if (!elems.length) return;
          const label = sorted[elems[0].index]?.[0];
          const val   = sorted[elems[0].index]?.[1];
          if (label) _openChartModal('local', label, val, data, sorted);
        },
      },
    });
  }

  // ── Gráfico 2: Por Classificação ─────────────────────────────────────────

  function renderClassificacao(data) {
    hideSkeleton('classificacao');
    destroy('chartClassificacao');
    const canvas = document.getElementById('chartClassificacao');
    if (!canvas) return;

    const agg = {};
    data.forEach(r => { const k = (r.Classificacao||'--').substring(0,30); agg[k]=(agg[k]||0)+r.Valor; });
    const sorted = Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,8);
    if (!sorted.length) { noData('chartClassificacao'); return; }

    _inst['chartClassificacao'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(s=>s[0]),
        datasets: [{
          data: sorted.map(s=>s[1]),
          backgroundColor: sorted.map((_,i)=>PAL[i%PAL.length]+'BB'),
          borderColor:     sorted.map((_,i)=>PAL[i%PAL.length]),
          borderWidth:0, borderRadius:8, borderSkipped:false,
        }],
      },
      options: {
        ...BASE, indexAxis:'y',
        plugins: {
          legend:{ display:false },
          tooltip:{ ...BASE_TOOLTIP(), callbacks:{ label:ctx=>' '+ctx.parsed.x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) } },
        },
        scales: {
          x: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11},callback:kFmt} },
          y: { grid:{display:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11},maxTicksLimit:8} },
        },
        onClick(e, elems) {
          if (!elems.length) return;
          _openChartModal('classificacao', sorted[elems[0].index]?.[0], sorted[elems[0].index]?.[1], data, sorted);
        },
      },
    });
  }

  // ── Gráfico 3: Evolução Mensal ────────────────────────────────────────────

  function renderEvolucao(data) {
    hideSkeleton('evolucao');
    destroy('chartEvolucao');
    const canvas = document.getElementById('chartEvolucao');
    const legEl  = document.getElementById('evolucaoLegenda');
    if (!canvas) return;

    const porAno = {};
    data.forEach(r => {
      if (!r.Mes || !r.Ano) return;
      const ano = String(r.Ano);
      if (!porAno[ano]) porAno[ano] = {};
      const m = r.Mes;
      porAno[ano][m] = (porAno[ano][m]||0) + r.Valor;
    });
    _evolucaoData = { porAno, rawData: data };

    const anos = Object.keys(porAno).sort();
    if (!anos.length) { noData('chartEvolucao'); if(legEl) legEl.innerHTML=''; return; }

    const mesesPresentes = new Set();
    anos.forEach(a => Object.keys(porAno[a]).forEach(m => mesesPresentes.add(parseInt(m))));
    const labels = [...mesesPresentes].sort((a,b)=>a-b);

    const datasets = anos.map((ano, i) => {
      const cor = PAL[i%PAL.length];
      return {
        label: ano,
        data: labels.map(m => porAno[ano][m] || null),
        borderColor: cor, backgroundColor: cor+'22',
        fill: anos.length===1, tension:0.35,
        pointBackgroundColor: cor, pointBorderColor:'#fff', pointBorderWidth:2,
        pointRadius:5, pointHoverRadius:8, borderWidth:2.5, spanGaps:false,
      };
    });

    _inst['chartEvolucao'] = new Chart(canvas, {
      type: 'line',
      data: { labels: labels.map(m=>CONFIG.MESES[m]||m), datasets },
      options: {
        ...BASE,
        plugins: {
          legend:{ display: anos.length>1, position:'top', labels:{ color:textColor(), font:{size:12,weight:'600'}, boxWidth:12, borderRadius:6, padding:16 } },
          tooltip:{ ...BASE_TOOLTIP(), mode:'index', intersect:false,
            callbacks:{ label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})||'—'}` } },
        },
        interaction:{ mode:'index', intersect:false },
        scales: {
          x: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11}} },
          y: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11},callback:kFmt} },
        },
        onClick(e, elems) {
          if (!elems.length) return;
          const el  = elems[0];
          const mes = labels[el.index];
          const ano = anos[el.datasetIndex];
          if (!mes || !ano) return;
          _openEvolucaoModal(mes, ano);
        },
      },
    });

    if (legEl) {
      legEl.innerHTML = anos.length>1
        ? anos.map((a,i)=>`<span class="evolucao-leg-pill"><span style="background:${PAL[i%PAL.length]}"></span>${a}</span>`).join('')
        : '';
    }
  }

  // ── Modal ao clicar no gráfico ────────────────────────────────────────────

  function _openChartModal(tipo, label, total, data, sorted) {
    const titulo = tipo === 'local' ? `Local: ${label}` : `Classificação: ${label}`;
    const registros = data.filter(r =>
      tipo === 'local' ? r.Sigla === label : (r.Classificacao||'').substring(0,30) === label
    );
    Modal.open('chartDetalhe', { titulo, label, total, registros, sorted, tipo });
  }

  function _openEvolucaoModal(mes, ano) {
    if (!_evolucaoData) return;
    const { porAno, rawData } = _evolucaoData;
    const total = porAno[ano]?.[mes] || 0;
    const regs  = rawData.filter(r => String(r.Ano)===String(ano) && r.Mes===mes);
    Modal.open('evolucaoDetalhe', { mes, ano, total, registros: regs });
  }

  function renderAll() {
    const data = State.getFilteredData();
    renderSiglas(data);
    renderClassificacao(data);
    renderEvolucao(data);
  }

  function updateTheme() { renderAll(); }

  return { renderAll, showSkeletons, updateTheme };
})();