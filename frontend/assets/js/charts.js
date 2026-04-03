/**
 * charts.js — Graficos v2.0
 * Chart.js com paleta PCA, animacoes suaves, skeletons.
 */

const Charts = (() => {
  const _instances = {};

  // ── Helpers de cor ────────────────────────────────────

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function textColor()   { return isDark() ? 'rgba(232,237,245,0.75)' : 'rgba(26,31,54,0.70)'; }
  function gridColor()   { return isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(67,97,238,0.07)'; }
  function bgPlugin()    { return { id:'bg', beforeDraw(c){ const ctx=c.ctx; ctx.save(); ctx.fillStyle='transparent'; ctx.fillRect(0,0,c.width,c.height); ctx.restore(); } }; }

  const PALETTE = CONFIG.PALETA_GRAFICOS;

  function tooltipBRL(ctx) {
    const v = ctx.parsed;
    const value = typeof v === 'number' ? v : (v.y ?? v);
    return ' ' + Number(value).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }

  const BASE_OPTIONS = {
    animation:  { duration: 350, easing:'easeOutQuart' },
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: tooltipBRL },
        backgroundColor: isDark() ? '#1a1f36' : '#fff',
        titleColor:      isDark() ? '#e8edf5' : '#1a1f36',
        bodyColor:       isDark() ? '#9ca3af' : '#6b7280',
        borderColor:     isDark() ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 12, cornerRadius: 10,
        titleFont: { weight:'700', size:13 },
        bodyFont:  { size:12 },
      },
    },
  };

  // ── Skeletons ─────────────────────────────────────────

  function showSkeletons() {
    ['skeletonTipoDespesa','skeletonSecretarias','skeletonTipoFrota','skeletonEvolucao'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'block'; }
    });
    ['chartTipoDespesa','chartSecretarias','chartTipoFrota','chartEvolucao'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.opacity = '0'; }
    });
  }

  function hideSkeletons() {
    ['skeletonTipoDespesa','skeletonSecretarias','skeletonTipoFrota','skeletonEvolucao'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    ['chartTipoDespesa','chartSecretarias','chartTipoFrota','chartEvolucao'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = '1';
    });
  }

  function destroyChart(id) {
    if (_instances[id]) {
      _instances[id].destroy();
      delete _instances[id];
    }
  }

  // ── Grafico 1: Donut Tipo de Despesa ─────────────────

  function renderTipoDespesa(data) {
    const canvasId = 'chartTipoDespesa';
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const comb = data.filter(r => r.Despesa === 'Combustivel' || r.Despesa === 'Combustível').reduce((s,r)=>s+r.Valor,0);
    const manu = data.filter(r => r.Despesa === 'Manutencao'  || r.Despesa === 'Manutenção').reduce((s,r)=>s+r.Valor,0);

    if (!comb && !manu) { canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">Sem dados</p>'; return; }

    _instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Combustivel', 'Manutencao'],
        datasets: [{
          data: [comb, manu],
          backgroundColor: [CONFIG.CORES.combustivel, CONFIG.CORES.manutencao],
          borderColor:     [CONFIG.CORES.combustivel, CONFIG.CORES.manutencao],
          borderWidth: 0,
          hoverOffset: 12,
          borderRadius: 6,
        }],
      },
      options: {
        ...BASE_OPTIONS,
        cutout: '68%',
        plugins: {
          ...BASE_OPTIONS.plugins,
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: textColor(), padding:16, boxWidth:12, borderRadius:6,
              font: { size:12, weight:'600' },
            },
          },
          tooltip: { ...BASE_OPTIONS.plugins.tooltip },
        },
      },
      plugins: [bgPlugin()],
    });
  }

  // ── Grafico 2: Barras Horizontais Top Secretarias ─────

  function renderSecretarias(data) {
    const canvasId = 'chartSecretarias';
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const agg = data.reduce((acc, r) => { acc[r.Sigla]=(acc[r.Sigla]||0)+r.Valor; return acc; }, {});
    const sorted = Object.entries(agg).sort((a,b) => b[1]-a[1]).slice(0,8);
    if (!sorted.length) { canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">Sem dados</p>'; return; }

    _instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(s => s[0]),
        datasets: [{
          data: sorted.map(s => s[1]),
          backgroundColor: sorted.map((_,i) => PALETTE[i % PALETTE.length] + 'CC'),
          borderColor:     sorted.map((_,i) => PALETTE[i % PALETTE.length]),
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        ...BASE_OPTIONS,
        indexAxis: 'y',
        scales: {
          x: {
            grid: { color: gridColor(), drawTicks:false },
            border: { display:false },
            ticks: { color:textColor(), font:{size:11}, callback: v => { if(v>=1000000) return 'R$'+(v/1000000).toFixed(1)+'M'; if(v>=1000) return 'R$'+(v/1000).toFixed(0)+'k'; return 'R$'+v; } },
          },
          y: {
            grid: { display:false },
            border: { display:false },
            ticks: { color:textColor(), font:{size:12,weight:'600'} },
          },
        },
        plugins: {
          ...BASE_OPTIONS.plugins,
          tooltip: {
            ...BASE_OPTIONS.plugins.tooltip,
            callbacks: {
              label: ctx => ' ' + ctx.parsed.x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
            },
          },
        },
      },
      plugins: [bgPlugin()],
    });
  }

  // ── Grafico 3: Donut Tipo de Frota ────────────────────

  function renderTipoFrota(data) {
    const canvasId = 'chartTipoFrota';
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const veic = data.filter(r => (r.Tipo||'').toLowerCase().startsWith('ve')).reduce((s,r)=>s+r.Valor,0);
    const maq  = data.filter(r => (r.Tipo||'').toLowerCase().startsWith('m')).reduce((s,r)=>s+r.Valor,0);

    if (!veic && !maq) { canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">Sem dados</p>'; return; }

    _instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Veiculos', 'Maquinas'],
        datasets: [{
          data: [veic, maq],
          backgroundColor: [CONFIG.CORES.veiculo, CONFIG.CORES.maquina],
          borderColor:     [CONFIG.CORES.veiculo, CONFIG.CORES.maquina],
          borderWidth: 0,
          hoverOffset: 12,
          borderRadius: 6,
        }],
      },
      options: {
        ...BASE_OPTIONS,
        cutout: '68%',
        plugins: {
          ...BASE_OPTIONS.plugins,
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: textColor(), padding:16, boxWidth:12, borderRadius:6,
              font: { size:12, weight:'600' },
            },
          },
          tooltip: { ...BASE_OPTIONS.plugins.tooltip },
        },
      },
      plugins: [bgPlugin()],
    });
  }

  // ── Grafico 4: Linha Evolucao Mensal ──────────────────

  function renderEvolucao(data) {
    const canvasId = 'chartEvolucao';
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const periodos = {};
    data.forEach(r => {
      if (!r.Mes || !r.Ano) return;
      const k = `${r.Ano}-${String(r.Mes).padStart(2,'0')}`;
      periodos[k] = (periodos[k]||0) + r.Valor;
    });
    const sorted = Object.entries(periodos).sort((a,b) => a[0].localeCompare(b[0]));
    if (!sorted.length) { canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;font-size:13px;">Sem dados</p>'; return; }

    const labels  = sorted.map(([k]) => {
      const [ano, mes] = k.split('-');
      return `${CONFIG.MESES[parseInt(mes)]||mes}/${ano}`;
    });
    const values  = sorted.map(([,v]) => v);
    const accent  = CONFIG.CORES.primaria;
    const accentA = accent + '22';

    _instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: accent,
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0,0,0,ctx.chart.height);
            g.addColorStop(0, accent+'55');
            g.addColorStop(1, accent+'00');
            return g;
          },
          fill: true,
          tension: 0.35,
          pointBackgroundColor: accent,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          borderWidth: 2.5,
        }],
      },
      options: {
        ...BASE_OPTIONS,
        scales: {
          x: {
            grid: { color: gridColor(), drawTicks:false },
            border: { display:false },
            ticks: { color:textColor(), font:{size:11}, maxRotation:45 },
          },
          y: {
            grid: { color: gridColor(), drawTicks:false },
            border: { display:false },
            ticks: { color:textColor(), font:{size:11}, callback: v => { if(v>=1000000) return 'R$'+(v/1000000).toFixed(1)+'M'; if(v>=1000) return 'R$'+(v/1000).toFixed(0)+'k'; return 'R$'+v; } },
          },
        },
        plugins: {
          ...BASE_OPTIONS.plugins,
          tooltip: {
            ...BASE_OPTIONS.plugins.tooltip,
            callbacks: {
              label: ctx => ' ' + ctx.parsed.y.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
            },
          },
        },
      },
      plugins: [bgPlugin()],
    });
  }

  // ── Render all ────────────────────────────────────────

  function renderAll() {
    const data = State.getFilteredData();
    hideSkeletons();
    renderTipoDespesa(data);
    renderSecretarias(data);
    renderTipoFrota(data);
    renderEvolucao(data);
  }

  // ── Atualiza tema ─────────────────────────────────────

  function updateTheme() {
    renderAll();
  }

  return { renderAll, showSkeletons, updateTheme };
})();