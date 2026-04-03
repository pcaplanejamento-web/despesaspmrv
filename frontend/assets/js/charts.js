/**
 * charts.js — Renderização e atualização dos gráficos via Chart.js
 */

const Charts = (() => {
  const _instances = {};

  // ----- Utilitários -----

  function destroyChart(id) {
    if (_instances[id]) {
      _instances[id].destroy();
      delete _instances[id];
    }
  }

  function showSkeleton(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  }

  function hideSkeleton(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function tooltipBRL(ctx) {
    const v = ctx.parsed;
    const value = typeof v === 'number' ? v : (v.y ?? v);
    return ' ' + Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const baseOptions = {
    animation: { duration: 300, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: tooltipBRL },
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor:  '#cbd5e1',
        padding: 10,
        cornerRadius: 6,
      },
    },
  };

  // ----- Gráfico: Tipo de Despesa (Donut) -----

  function renderTipoDespesa(data) {
    hideSkeleton('skeletonTipoDespesa');
    destroyChart('tipoDespesa');

    const combustivel = data.filter(r => r.Despesa === 'Combustível').reduce((s, r) => s + r.Valor, 0);
    const manutencao  = data.filter(r => r.Despesa === 'Manutenção').reduce((s, r) => s + r.Valor, 0);
    const outros      = data.filter(r => r.Despesa !== 'Combustível' && r.Despesa !== 'Manutenção').reduce((s, r) => s + r.Valor, 0);

    const labels  = [];
    const valores = [];
    const cores   = [];

    if (combustivel > 0) { labels.push('Combustível'); valores.push(combustivel); cores.push(CONFIG.CORES.combustivel); }
    if (manutencao  > 0) { labels.push('Manutenção');  valores.push(manutencao);  cores.push(CONFIG.CORES.manutencao); }
    if (outros      > 0) { labels.push('Outros');       valores.push(outros);       cores.push(CONFIG.CORES.neutro); }

    const ctx = document.getElementById('chartTipoDespesa');
    if (!ctx) return;

    _instances.tipoDespesa = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 0, hoverOffset: 8 }] },
      options: {
        ...baseOptions,
        cutout: '68%',
        plugins: { ...baseOptions.plugins, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: ctx => ' ' + ctx.label + ': ' + tooltipBRL(ctx) } } },
      },
    });

    // Legenda manual
    const legendEl = document.getElementById('legendTipoDespesa');
    if (legendEl) {
      legendEl.innerHTML = labels.map((l, i) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${cores[i]}"></span>${l} — ${Number(valores[i]).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>`
      ).join('');
    }
  }

  // ----- Gráfico: Top 8 Secretarias (Barras Horizontais) -----

  function renderSecretarias(data) {
    hideSkeleton('skeletonSecretarias');
    destroyChart('secretarias');

    const porSigla = data.reduce((acc, r) => {
      acc[r.Sigla] = (acc[r.Sigla] || 0) + r.Valor;
      return acc;
    }, {});

    const sorted = Object.entries(porSigla)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const labels = sorted.map(([s]) => s);
    const values = sorted.map(([, v]) => v);

    const ctx = document.getElementById('chartSecretarias');
    if (!ctx) return;

    _instances.secretarias = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: CONFIG.PALETA_GRAFICOS.slice(0, labels.length),
          borderRadius: 4,
          barThickness: 22,
        }],
      },
      options: {
        ...baseOptions,
        indexAxis: 'y',
        scales: {
          x: {
            ticks: { callback: v => Kpis.formatBRL(v), color: '#6b7280', font: { size: 11 } },
            grid: { color: '#f1f5f9' },
          },
          y: { ticks: { color: '#374151', font: { size: 12 } }, grid: { display: false } },
        },
      },
    });
  }

  // ----- Gráfico: Tipo de Frota (Donut) -----

  function renderTipoFrota(data) {
    hideSkeleton('skeletonTipoFrota');
    destroyChart('tipoFrota');

    const veiculo = data.filter(r => r.Tipo === 'Veículo').reduce((s, r) => s + r.Valor, 0);
    const maquina = data.filter(r => r.Tipo === 'Máquina').reduce((s, r) => s + r.Valor, 0);

    const labels  = [];
    const valores = [];
    const cores   = [];

    if (veiculo > 0) { labels.push('Veículo'); valores.push(veiculo); cores.push(CONFIG.CORES.veiculo); }
    if (maquina > 0) { labels.push('Máquina'); valores.push(maquina); cores.push(CONFIG.CORES.maquina); }

    const ctx = document.getElementById('chartTipoFrota');
    if (!ctx) return;

    _instances.tipoFrota = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 0, hoverOffset: 8 }] },
      options: { ...baseOptions, cutout: '68%' },
    });

    const legendEl = document.getElementById('legendTipoFrota');
    if (legendEl) {
      const total = veiculo + maquina;
      legendEl.innerHTML = labels.map((l, i) => {
        const pct = total ? ((valores[i] / total) * 100).toFixed(1).replace('.', ',') : '0,0';
        return `<span class="legend-item"><span class="legend-dot" style="background:${cores[i]}"></span>${l} — ${pct}%</span>`;
      }).join('');
    }
  }

  // ----- Gráfico: Evolução Mensal (Linha) -----

  function renderEvolucao(data) {
    hideSkeleton('skeletonEvolucao');
    destroyChart('evolucao');

    // Agrupa por Ano-Mês
    const porMes = data.reduce((acc, r) => {
      const key = `${r.Ano}-${String(r.Mes).padStart(2, '0')}`;
      acc[key] = (acc[key] || 0) + r.Valor;
      return acc;
    }, {});

    const sorted = Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b));
    const labels = sorted.map(([k]) => {
      const [ano, mes] = k.split('-');
      return `${CONFIG.MESES[parseInt(mes, 10)].slice(0, 3)}/${ano}`;
    });
    const values = sorted.map(([, v]) => v);

    const ctx = document.getElementById('chartEvolucao');
    if (!ctx) return;

    _instances.evolucao = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor:     CONFIG.CORES.primaria,
          backgroundColor: CONFIG.CORES.primaria + '18',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.35,
        }],
      },
      options: {
        ...baseOptions,
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { display: false } },
          y: {
            ticks: { callback: v => Kpis.formatBRL(v), color: '#6b7280', font: { size: 11 } },
            grid: { color: '#f1f5f9' },
          },
        },
      },
    });
  }

  // ----- Render all -----

  function renderAll() {
    const data = State.getFilteredData();
    renderTipoDespesa(data);
    renderSecretarias(data);
    renderTipoFrota(data);
    renderEvolucao(data);
  }

  function showSkeletons() {
    ['skeletonTipoDespesa', 'skeletonSecretarias', 'skeletonTipoFrota', 'skeletonEvolucao'].forEach(showSkeleton);
  }

  return { renderAll, showSkeletons };
})();
