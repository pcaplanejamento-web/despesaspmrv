/**
 * filters.js
 * Responsável por:
 *  1. Popular os <select> do header com os valores vindos da API
 *  2. Capturar mudanças nos seletores e atualizar o State
 *  3. Botão de reset
 *
 * Não realiza chamadas à API — recebe os dados já prontos do app.js.
 */

const Filters = (() => {

  // IDs dos seletores no HTML (devem existir no index.html)
  const SELECTORS = {
    ano:           '#filtro-ano',
    despesa:       '#filtro-despesa',
    tipo:          '#filtro-tipo',
    sigla:         '#filtro-sigla',
  };

  /**
   * Popula todos os seletores com os valores retornados pela API.
   * Chamado pelo app.js após carregar os filtros disponíveis.
   *
   * @param {Object} filtrosDisponiveis - dados da rota ?rota=filtros
   */
  function popular(filtrosDisponiveis) {
    if (!filtrosDisponiveis) return;

    _popularSelect('#filtro-ano',     filtrosDisponiveis.anos,    v => v);
    _popularSelect('#filtro-despesa', filtrosDisponiveis.despesas, v => v);
    _popularSelect('#filtro-tipo',    filtrosDisponiveis.tipos,    v => v);
    _popularSelect('#filtro-sigla',   filtrosDisponiveis.siglas,   v => v);

    // Restaura os valores que já estão no State (mantém seleção ao trocar de aba)
    _sincronizarComState();
  }

  /**
   * Registra os listeners de mudança em todos os seletores.
   * Chamado uma única vez pelo app.js na inicialização.
   */
  function registrarListeners() {
    // Seletores dinâmicos
    Object.entries(SELECTORS).forEach(([campo, seletor]) => {
      const el = document.querySelector(seletor);
      if (!el) return;
      el.addEventListener('change', () => {
        State.setFiltro(campo, el.value);
      });
    });

    // Botão de reset
    const btnReset = document.getElementById('btn-reset-filtros');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        State.resetFiltros();
        _sincronizarComState();
      });
    }
  }

  /**
   * Sincroniza os valores dos <select> com o State atual.
   * Útil após resetar filtros ou restaurar estado salvo.
   */
  function _sincronizarComState() {
    const filtros = State.getFiltros();
    Object.entries(SELECTORS).forEach(([campo, seletor]) => {
      const el = document.querySelector(seletor);
      if (el && filtros[campo] !== undefined) {
        el.value = filtros[campo];
      }
    });
  }

  /**
   * Popula um <select> com um array de valores.
   * Preserva a opção "todos" (primeira opção do HTML).
   *
   * @param {string} seletor - CSS selector do <select>
   * @param {Array}  valores  - array de strings ou números
   * @param {Function} [formatarLabel] - transforma o valor em rótulo legível
   */
  function _popularSelect(seletor, valores, formatarLabel) {
    const el = document.querySelector(seletor);
    if (!el || !Array.isArray(valores)) return;

    // Remove opções anteriores (exceto a primeira — "Todos")
    while (el.options.length > 1) el.remove(1);

    valores.forEach(v => {
      const opt    = document.createElement('option');
      opt.value    = String(v);
      opt.textContent = formatarLabel ? formatarLabel(v) : String(v);
      el.appendChild(opt);
    });
  }

  /**
   * Retorna um texto descritivo dos filtros ativos (para títulos e exports).
   * Ex: "Ano: 2025 · Despesa: Combustível"
   */
  function descricaoFiltrosAtivos() {
    const filtros = State.getFiltros();
    const partes  = [];

    const rotulos = {
      ano:     'Ano',
      mes:     'Mês',
      sigla:   'Secretaria',
      despesa: 'Despesa',
      tipo:    'Tipo',
    };

    Object.entries(rotulos).forEach(([campo, rotulo]) => {
      if (filtros[campo] && filtros[campo] !== 'todos') {
        partes.push(`${rotulo}: ${filtros[campo]}`);
      }
    });

    return partes.length > 0 ? partes.join(' · ') : 'Todos os dados';
  }

  return {
    popular,
    registrarListeners,
    descricaoFiltrosAtivos,
  };

})();
