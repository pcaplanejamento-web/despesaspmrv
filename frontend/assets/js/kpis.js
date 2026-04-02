/**
 * kpis.js
 * Recebe o objeto de KPIs da API e renderiza os cards no DOM.
 * Não calcula nada — apenas formata e exibe o que veio do KpiService.
 */

const Kpis = (() => {

  /**
   * Renderiza todos os KPI cards no container do dashboard.
   * @param {Object} kpis - objeto retornado pela rota ?rota=kpis
   */
  function renderizar(kpis) {
    const container = document.getElementById('kpis-container');
    if (!container || !kpis) return;

    const cards = _definirCards(kpis);
    container.innerHTML = cards.map(_renderCard).join('');
  }

  /**
   * Define quais cards exibir e com quais dados.
   * Altere aqui para adicionar, remover ou reordenar KPIs.
   */
  function _definirCards(k) {
    const variacaoMensal = _calcularVariacaoExibicao(k);

    return [
      {
        id:        'total-geral',
        cor:       '',
        label:     'Total Geral',
        valor:     _fmtMoeda(k.totalGeral),
        sub:       `${_fmtNum(k.qtdRegistros)} registros`,
        variacao:  null,
        icone:     'trending-up',
      },
      {
        id:        'manutencao',
        cor:       '',
        label:     'Manutenção',
        valor:     _fmtMoeda(k.totalManutencao),
        sub:       `${_fmtPct(k.pctManutencao)} do total`,
        variacao:  null,
        icone:     'wrench',
      },
      {
        id:        'combustivel',
        cor:       'verde',
        label:     'Combustível',
        valor:     _fmtMoeda(k.totalCombustivel),
        sub:       `${_fmtPct(k.pctCombustivel)} do total`,
        variacao:  null,
        icone:     'fuel',
      },
      {
        id:        'media-mensal',
        cor:       '',
        label:     'Média Mensal',
        valor:     _fmtMoeda(k.mediaMensal),
        sub:       'por mês com dados',
        variacao:  variacaoMensal,
        icone:     'bar-chart-2',
      },
      {
        id:        'maior-secretaria',
        cor:       'roxo',
        label:     'Maior Secretaria',
        valor:     k.maiorSigla || '-',
        sub:       `${_fmtMoeda(k.maiorSiglaValor)} · ${_fmtPct(k.maiorSiglaPct)}`,
        variacao:  null,
        icone:     'building-2',
      },
      {
        id:        'liquidado',
        cor:       '',
        label:     'Total Liquidado',
        valor:     _fmtMoeda(k.totalLiquidado),
        sub:       `Desconto aplicado: ${_fmtPct(k.pctDesconto)}`,
        variacao:  null,
        icone:     'check-circle',
      },
    ];
  }

  /**
   * Gera o HTML de um card de KPI.
   */
  function _renderCard(card) {
    const varHtml = card.variacao
      ? `<span class="kpi-variacao ${card.variacao.positivo ? 'negativo' : 'positivo'}">
           ${card.variacao.positivo ? '▲' : '▼'} ${card.variacao.texto}
         </span>`
      : '';

    return `
      <div class="kpi-card ${card.cor}" id="kpi-${card.id}">
        <div class="kpi-label">${card.label}</div>
        <div class="kpi-valor">${card.valor}</div>
        <div class="kpi-sub">${card.sub} ${varHtml}</div>
      </div>
    `;
  }

  /**
   * Tenta calcular a variação entre o primeiro e o último período disponível.
   * Retorna null se não houver dados suficientes.
   */
  function _calcularVariacaoExibicao(kpis) {
    if (!kpis.porMes) return null;

    const periodos = Object.keys(kpis.porMes).sort();
    if (periodos.length < 2) return null;

    const primeiro = kpis.porMes[periodos[0]];
    const ultimo   = kpis.porMes[periodos[periodos.length - 1]];

    if (!primeiro || primeiro === 0) return null;

    const pct      = ((ultimo - primeiro) / primeiro) * 100;
    const positivo = pct > 0;

    return {
      positivo,
      texto: `${Math.abs(pct).toFixed(1)}% vs ${periodos[0]}`,
    };
  }

  // ── Formatadores ─────────────────────────────────────────────────

  function _fmtMoeda(v) {
    if (v === null || v === undefined) return 'R$ 0';
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
    return `R$ ${v.toFixed(0)}`;
  }

  function _fmtNum(v) {
    if (!v) return '0';
    return Number(v).toLocaleString('pt-BR');
  }

  function _fmtPct(v) {
    if (v === null || v === undefined) return '0%';
    return `${Number(v).toFixed(1)}%`;
  }

  return { renderizar };

})();
