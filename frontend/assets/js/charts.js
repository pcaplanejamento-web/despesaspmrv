/**
 * charts.js — v2.1
 * Gráfico Siglas, Classificação, Evolução Mensal multi-ano.
 */
const Charts = (() => {
  const _inst = {};

  function isDark()    { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function textColor() { return isDark() ? 'rgba(232,237,245,0.75)' : 'rgba(26,31,54,0.70)'; }
  function gridColor() { return isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(67,97,238,0.07)'; }

  const PALETTE = (typeof CONFIG !== 'undefined' ? CONFIG.PALETA_GRAFICOS : ['#4f6ef5','#0ea872','#f09b0a','#7c3aed','#e11d48','#0ea5e9','#3bc4c4','#b45309']);

  const tooltipBRL = ctx => ' ' + Number(ctx.parsed.x ?? ctx.parsed.y ?? ctx.parsed).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});

  const BASE = {
    animation:  { duration:350, easing:'easeOutQuart' },
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display:false },
      tooltip: {
        callbacks:       { label: tooltipBRL },
        backgroundColor: () => isDark() ? '#1a1f36' : '#fff',
        titleColor:      () => isDark() ? '#e8edf5' : '#1a1f36',
        bodyColor:       () => isDark() ? '#9ca3af' : '#6b7280',
        borderColor:     () => isDark() ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)',
        borderWidth:1, padding:12, cornerRadius:10,
        titleFont:{weight:'700',size:13}, bodyFont:{size:12},
      },
    },
  };

  function destroy(id) { if (_inst[id]) { _inst[id].destroy(); delete _inst[id]; } }

  function hideSkeletons() {
    ['skeletonSiglas','skeletonClassificacao','skeletonEvolucao'].forEach(id => {
      const el = document.getElementById(id); if(el) el.style.display='none';
    });
    ['chartSiglas','chartClassificacao','chartEvolucao'].forEach(id => {
      const el = document.getElementById(id); if(el) el.style.opacity='1';
    });
  }

  function showSkeletons() {
    ['skeletonSiglas','skeletonClassificacao','skeletonEvolucao'].forEach(id => {
      const el = document.getElementById(id); if(el) el.style.display='block';
    });
    ['chartSiglas','chartClassificacao','chartEvolucao'].forEach(id => {
      const el = document.getElementById(id); if(el) el.style.opacity='0';
    });
  }

  // ── Gráfico 1: Por Local (Sigla) ─────────────────────

  function renderSiglas(data) {
    const id = 'chartSiglas';
    destroy(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const agg = {};
    data.forEach(r => { const k = r.Sigla||'--'; agg[k]=(agg[k]||0)+r.Valor; });
    const sorted = Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,10);

    if (!sorted.length) { _noData(canvas); return; }

    _inst[id] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(s => s[0]),
        datasets: [{
          data: sorted.map(s => s[1]),
          backgroundColor: sorted.map((_,i) => PALETTE[i%PALETTE.length]+'BB'),
          borderColor:     sorted.map((_,i) => PALETTE[i%PALETTE.length]),
          borderWidth:0, borderRadius:8, borderSkipped:false,
        }],
      },
      options: {
        ...BASE,
        indexAxis: 'y',
        scales: {
          x: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11},callback:v=>_kFmt(v)} },
          y: { grid:{display:false}, border:{display:false}, ticks:{color:textColor(),font:{size:12,weight:'600'}} },
        },
        plugins: { ...BASE.plugins, tooltip:{ ...BASE.plugins.tooltip, callbacks:{ label:ctx=>' '+ctx.parsed.x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) } } },
      },
    });
  }

  // ── Gráfico 2: Por Classificação ──────────────────────

  function renderClassificacao(data) {
    const id = 'chartClassificacao';
    destroy(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const agg = {};
    data.forEach(r => { const k = (r.Classificacao||'--').substring(0,25); agg[k]=(agg[k]||0)+r.Valor; });
    const sorted = Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,8);

    if (!sorted.length) { _noData(canvas); return; }

    _inst[id] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(s => s[0]),
        datasets: [{
          data: sorted.map(s => s[1]),
          backgroundColor: sorted.map((_,i) => PALETTE[i%PALETTE.length]+'BB'),
          borderColor:     sorted.map((_,i) => PALETTE[i%PALETTE.length]),
          borderWidth:0, borderRadius:8, borderSkipped:false,
        }],
      },
      options: {
        ...BASE,
        indexAxis: 'y',
        scales: {
          x: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11},callback:v=>_kFmt(v)} },
          y: { grid:{display:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11},maxTicksLimit:8} },
        },
        plugins: { ...BASE.plugins, tooltip:{ ...BASE.plugins.tooltip, callbacks:{ label:ctx=>' '+ctx.parsed.x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) } } },
      },
    });
  }

  // ── Gráfico 3: Evolução Mensal (multi-ano) ────────────

  function renderEvolucao(data) {
    const id = 'chartEvolucao';
    destroy(id);
    const canvas   = document.getElementById(id);
    const legEl    = document.getElementById('evolucaoLegenda');
    if (!canvas) return;

    // Agrupa por ano → mês
    const porAno = {};
    data.forEach(r => {
      if (!r.Mes || !r.Ano) return;
      const ano = String(r.Ano);
      if (!porAno[ano]) porAno[ano] = {};
      const m = r.Mes;
      porAno[ano][m] = (porAno[ano][m]||0) + r.Valor;
    });

    const anos = Object.keys(porAno).sort();
    if (!anos.length) { _noData(canvas); if(legEl) legEl.innerHTML=''; return; }

    // Labels = todos os meses de 1 a 12 que aparecem no dataset
    const mesesPresentes = new Set();
    anos.forEach(a => Object.keys(porAno[a]).forEach(m => mesesPresentes.add(parseInt(m))));
    const labels = [...mesesPresentes].sort((a,b)=>a-b);
    const labelTexts = labels.map(m => CONFIG.MESES[m]||m);

    const datasets = anos.map((ano, i) => {
      const cor = PALETTE[i % PALETTE.length];
      return {
        label: ano,
        data: labels.map(m => porAno[ano][m] || null),  // null = sem dado naquele mês
        borderColor: cor,
        backgroundColor: cor + '22',
        fill: anos.length === 1,  // preenche só quando há 1 ano
        tension: 0.35,
        pointBackgroundColor: cor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        spanGaps: false,
      };
    });

    _inst[id] = new Chart(canvas, {
      type: 'line',
      data: { labels: labelTexts, datasets },
      options: {
        ...BASE,
        scales: {
          x: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11}} },
          y: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:11},callback:v=>_kFmt(v)} },
        },
        plugins: {
          ...BASE.plugins,
          legend: { display: anos.length > 1, position:'top', labels:{ color:textColor(), font:{size:12,weight:'600'}, boxWidth:12, borderRadius:6, padding:16 } },
          tooltip: { ...BASE.plugins.tooltip, mode:'index', intersect:false, callbacks:{ label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})||'—'}` } },
        },
        interaction: { mode:'index', intersect:false },
      },
    });

    // Legenda customizada (pills) — só quando múltiplos anos
    if (legEl) {
      if (anos.length > 1) {
        legEl.innerHTML = anos.map((a,i) => `<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--text-muted);"><span style="width:10px;height:10px;border-radius:50%;background:${PALETTE[i%PALETTE.length]};display:inline-block;"></span>${a}</span>`).join('');
      } else {
        legEl.innerHTML = '';
      }
    }
  }

  function _kFmt(v) {
    if (v >= 1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M';
    if (v >= 1e3) return 'R$'+(v/1e3).toFixed(0)+'k';
    return 'R$'+v;
  }

  function _noData(canvas) {
    canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:48px 20px;font-size:13px;">Sem dados para o periodo selecionado</p>';
  }

  function renderAll() {
    const data = State.getFilteredData();
    hideSkeletons();
    renderSiglas(data);
    renderClassificacao(data);
    renderEvolucao(data);
  }

  function updateTheme() { renderAll(); }

  return { renderAll, showSkeletons, updateTheme };
})();