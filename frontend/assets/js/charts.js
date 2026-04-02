/**
 * charts.js
 * Instancia e atualiza todos os gráficos do dashboard usando Chart.js.
 *
 * Regras:
 *  - Nunca acessa a API diretamente — recebe dados já processados
 *  - Sempre destrói o gráfico anterior antes de recriar
 *  - Toda formatação de valores passa por _fmt*
 *  - Legendas são sempre HTML customizado (nunca o padrão do Chart.js)
 */

const Charts = (() => {

  // Registro dos gráficos ativos — necessário para destruir antes de recriar
  const _instancias = {};

  // Paleta de cores alinhada ao sistema
  const COR = {
    azul:        '#185FA5',
    azulClaro:   'rgba(24, 95, 165, 0.15)',
    verde:       '#1D9E75',
    verdeClaro:  'rgba(29, 158, 117, 0.15)',
    laranja:     '#D85A30',
    laranjaClaro:'rgba(216, 90, 48, 0.15)',
    amarelo:     '#BA7517',
    roxo:        '#534AB7',
    cinza:       '#73726c',
    cinzaClaro:  'rgba(115, 114, 108, 0.15)',
    serie: ['#185FA5','#1D9E75','#D85A30','#BA7517','#534AB7','#993556','#3B6D11','#73726c'],
  };

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // ── API pública ───────────────────────────────────────────────────

  /**
   * Renderiza (ou atualiza) todos os gráficos com os dados recebidos.
   * @param {Array} dados - registros da API (rota /dados)
   */
  function renderizar(dados) {
    if (!dados || !Array.isArray(dados)) return;

    const agregados = _agregar(dados);

    _graficoRoscaDespesa(agregados.porDespesa);
    _graficoRoscaTipo(agregados.porTipo);
    _graficoEvolucaoMensal(agregados.porMesAno);
    _rankingSecretarias(agregados.porSigla);
  }

  /**
   * Destrói todos os gráficos ativos.
   * Útil ao trocar de página.
   */
  function destruirTodos() {
    Object.keys(_instancias).forEach(_destruir);
  }

  // ── Gráficos individuais ──────────────────────────────────────────

  /**
   * Rosca — distribuição Combustível vs Manutenção
   */
  function _graficoRoscaDespesa(porDespesa) {
    const canvas = document.getElementById('chart-despesa');
    if (!canvas) return;
    _destruir('despesa');

    const labels = Object.keys(porDespesa);
    const valores = Object.values(porDespesa);
    const total   = valores.reduce((a, b) => a + b, 0);

    // Legenda HTML customizada
    const legEl = document.getElementById('leg-despesa');
    if (legEl) {
      legEl.innerHTML = labels.map((l, i) => `
        <span class="legenda-item">
          <span class="legenda-cor" style="background:${COR.serie[i]}"></span>
          ${l} — ${_fmtMoeda(valores[i])} (${_fmtPct(valores[i] / total * 100)})
        </span>
      `).join('');
    }

    _instancias['despesa'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            valores,
          backgroundColor: labels.map((_, i) => COR.serie[i]),
          borderWidth:     0,
          hoverOffset:     6,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${_fmtMoeda(ctx.raw)} (${_fmtPct(ctx.raw / total * 100)})`,
            },
          },
        },
      },
    });
  }

  /**
   * Rosca — distribuição Veículo vs Máquina
   */
  function _graficoRoscaTipo(porTipo) {
    const canvas = document.getElementById('chart-tipo');
    if (!canvas) return;
    _destruir('tipo');

    const labels = Object.keys(porTipo);
    const valores = Object.values(porTipo);
    const total   = valores.reduce((a, b) => a + b, 0);

    const legEl = document.getElementById('leg-tipo');
    if (legEl) {
      legEl.innerHTML = labels.map((l, i) => `
        <span class="legenda-item">
          <span class="legenda-cor" style="background:${[COR.azul, COR.cinza][i] || COR.serie[i]}"></span>
          ${l} — ${_fmtMoeda(valores[i])} (${_fmtPct(valores[i] / total * 100)})
        </span>
      `).join('');
    }

    _instancias['tipo'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            valores,
          backgroundColor: [COR.azul, COR.cinza],
          borderWidth:     0,
          hoverOffset:     6,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${_fmtMoeda(ctx.raw)} (${_fmtPct(ctx.raw / total * 100)})`,
            },
          },
        },
      },
    });
  }

  /**
   * Linha + área — evolução mensal total
   * Suporta múltiplos anos (uma série por ano)
   */
  function _graficoEvolucaoMensal(porMesAno) {
    const canvas = document.getElementById('chart-evolucao');
    if (!canvas) return;
    _destruir('evolucao');

    // Organiza: { 2025: [jan..dez], 2026: [jan..dez] }
    const anos = [...new Set(Object.keys(porMesAno).map(k => k.split('-')[0]))].sort();

    const datasets = anos.map((ano, idx) => {
      const data = MESES.map((_, i) => {
        const chave = `${ano}-${String(i + 1).padStart(2, '0')}`;
        return porMesAno[chave] || 0;
      });
      return {
        label:           ano,
        data,
        borderColor:     COR.serie[idx],
        backgroundColor: idx === 0 ? COR.azulClaro : COR.verdeClaro,
        fill:            true,
        tension:         0.35,
        pointRadius:     3,
        pointHoverRadius: 6,
      };
    });

    _instancias['evolucao'] = new Chart(canvas, {
      type: 'line',
      data: { labels: MESES, datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction:         { mode: 'index', intersect: false },
        plugins: {
          legend: { display: anos.length > 1, position: 'top',
            labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${_fmtMoeda(ctx.raw)}`,
            },
          },
        },
        scales: {
          x: { ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 0 } },
          y: { ticks: { callback: v => _fmtMoeda(v), font: { size: 10 } }, beginAtZero: true },
        },
      },
    });
  }

  /**
   * Barras horizontais — ranking de secretarias (renderizado como HTML, não Chart.js)
   * Mais legível para labels longos e responsivo por padrão.
   */
  function _rankingSecretarias(porSigla) {
    const container = document.getElementById('ranking-secretarias');
    if (!container) return;

    const ranking = Object.entries(porSigla)
      .map(([sigla, valor]) => ({ sigla, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    if (ranking.length === 0) {
      container.innerHTML = '<div class="estado-vazio">Sem dados para exibir</div>';
      return;
    }

    const max = ranking[0].valor;

    container.innerHTML = ranking.map(({ sigla, valor }) => `
      <div class="rank-row">
        <div class="rank-label">${sigla}</div>
        <div class="rank-track">
          <div class="rank-fill" style="width:${(valor / max * 100).toFixed(1)}%"></div>
        </div>
        <div class="rank-valor">${_fmtMoeda(valor)}</div>
      </div>
    `).join('');
  }

  // ── Gráficos extras (usados nas páginas secundárias) ─────────────

  /**
   * Barras verticais agrupadas — comparação de dois cenários por mês.
   * @param {string} canvasId
   * @param {Object} cenario1 - { label, data: { porMes } }
   * @param {Object} cenario2
   */
  function renderizarComparacao(canvasId, cenario1, cenario2) {
    _destruir(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const labels = MESES;

    const toSerie = (mesAno) => MESES.map((_, i) => {
      const chave = `${String(i + 1).padStart(2, '0')}`;
      // Localiza por sufixo de mês independente do ano
      const match = Object.entries(mesAno).find(([k]) => k.endsWith('-' + chave));
      return match ? match[1] : 0;
    });

    _instancias[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label:           cenario1.label,
            data:            toSerie(cenario1.kpis?.porMes || {}),
            backgroundColor: COR.azul,
          },
          {
            label:           cenario2.label,
            data:            toSerie(cenario2.kpis?.porMes || {}),
            backgroundColor: COR.laranja,
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${_fmtMoeda(ctx.raw)}` } },
        },
        scales: {
          x: { ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 0 } },
          y: { ticks: { callback: v => _fmtMoeda(v), font: { size: 10 } }, beginAtZero: true },
        },
      },
    });
  }

  /**
   * Barras horizontais — top N por campo (secretaria, classificação, modelo).
   * @param {string} canvasId
   * @param {Object} agrupado - { chave: valor }
   * @param {number} limite
   * @param {string} cor
   */
  function renderizarBarrasHorizontais(canvasId, agrupado, limite = 10, cor = null) {
    _destruir(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ranking = Object.entries(agrupado)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite);

    const alturaWrapper = canvas.parentElement;
    if (alturaWrapper) {
      alturaWrapper.style.height = Math.max(200, ranking.length * 42 + 60) + 'px';
    }

    _instancias[canvasId] = new Chart(canvas, {
      type:     'bar',
      indexAxis: 'y',
      data: {
        labels:   ranking.map(([k]) => k),
        datasets: [{
          data:            ranking.map(([, v]) => v),
          backgroundColor: cor || ranking.map((_, i) => COR.serie[i % COR.serie.length]),
          borderRadius:    4,
          borderSkipped:   false,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${_fmtMoeda(ctx.raw)}` } },
        },
        scales: {
          x: { ticks: { callback: v => _fmtMoeda(v), font: { size: 10 } }, beginAtZero: true },
          y: { ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  /**
   * Linha do tempo com múltiplas séries (Combustível e Manutenção separados).
   * @param {string} canvasId
   * @param {Object} timelineData - resposta da rota /timeline
   */
  function renderizarTimeline(canvasId, timelineData) {
    _destruir(canvasId);

    const canvas = document.getElementById(canvasId);
    if (!canvas || !timelineData) return;

    const cores    = [COR.azul, COR.verde, COR.laranja, COR.amarelo];
    const datasets = (timelineData.seriesDespesa || []).map((serie, i) => ({
      label:           serie.label,
      data:            serie.data,
      borderColor:     cores[i] || COR.cinza,
      backgroundColor: 'transparent',
      tension:         0.35,
      pointRadius:     3,
      pointHoverRadius: 6,
    }));

    // Adiciona série total
    datasets.unshift({
      label:           'Total',
      data:            timelineData.serieTotal,
      borderColor:     COR.cinza,
      backgroundColor: COR.cinzaClaro,
      fill:            true,
      tension:         0.35,
      pointRadius:     2,
      borderDash:      [4, 3],
    });

    _instancias[canvasId] = new Chart(canvas, {
      type: 'line',
      data: { labels: timelineData.labels, datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction:         { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${_fmtMoeda(ctx.raw)}` } },
        },
        scales: {
          x: { ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 45 } },
          y: { ticks: { callback: v => _fmtMoeda(v), font: { size: 10 } }, beginAtZero: true },
        },
      },
    });
  }

  // ── Agregação local (quando os dados vêm como array de registros) ─

  /**
   * Agrega os registros brutos nos grupos necessários para os gráficos.
   * Usado quando a API retorna /dados em vez dos KPIs já calculados.
   */
  function _agregar(dados) {
    const porDespesa = {};
    const porTipo    = {};
    const porSigla   = {};
    const porMesAno  = {};

    dados.forEach(r => {
      const val = r.valor || 0;

      porDespesa[r.despesa || 'Outros'] = (porDespesa[r.despesa || 'Outros'] || 0) + val;
      porTipo[r.tipo       || 'Outros'] = (porTipo[r.tipo       || 'Outros'] || 0) + val;
      porSigla[r.sigla     || 'Outros'] = (porSigla[r.sigla     || 'Outros'] || 0) + val;

      if (r.ano && r.mes) {
        const chave = `${r.ano}-${String(r.mes).padStart(2, '0')}`;
        porMesAno[chave] = (porMesAno[chave] || 0) + val;
      }
    });

    return { porDespesa, porTipo, porSigla, porMesAno };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  function _destruir(id) {
    if (_instancias[id]) {
      _instancias[id].destroy();
      delete _instancias[id];
    }
  }

  function _fmtMoeda(v) {
    if (!v && v !== 0) return 'R$ 0';
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
    return `R$ ${Number(v).toFixed(0)}`;
  }

  function _fmtPct(v) {
    return `${Number(v || 0).toFixed(1)}%`;
  }

  return {
    renderizar,
    destruirTodos,
    renderizarComparacao,
    renderizarBarrasHorizontais,
    renderizarTimeline,
  };

})();
