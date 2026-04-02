/**
 * state.js
 * Estado global da aplicação.
 * Centraliza os filtros ativos e os dados carregados da API.
 * Nenhum outro módulo deve armazenar estado — tudo passa por aqui.
 */

const State = (() => {

  // Estado interno (privado)
  let _estado = {

    // Filtros ativos (alterados pelos seletores do usuário)
    filtros: {
      ano:           'todos',
      mes:           'todos',
      sigla:         'todos',
      despesa:       'todos',
      tipo:          'todos',
      classificacao: 'todos',
      contrato:      'todos',
    },

    // Dados retornados pela API (atualizados a cada requisição)
    dados:    null,
    kpis:     null,
    filtrosDisponiveis: null,
    timeline: null,
    comparacao: null,

    // Estado da interface
    carregando: false,
    erro: null,
    abaAtiva: 'visao-geral',

  };

  // Listeners registrados para reagir a mudanças de estado
  const _listeners = [];

  /**
   * Notifica todos os listeners registrados.
   * @param {string} chave - qual parte do estado mudou
   */
  function _notificar(chave) {
    _listeners.forEach(fn => fn(chave, _estado));
  }

  return {

    /**
     * Retorna o estado atual (ou uma chave específica).
     * @param {string} [chave]
     */
    get(chave) {
      return chave ? _estado[chave] : { ..._estado };
    },

    /**
     * Retorna os filtros ativos.
     */
    getFiltros() {
      return { ..._estado.filtros };
    },

    /**
     * Atualiza um filtro e notifica os listeners.
     * @param {string} chave - nome do filtro
     * @param {string} valor
     */
    setFiltro(chave, valor) {
      _estado.filtros[chave] = valor;
      _notificar('filtros');
    },

    /**
     * Redefine todos os filtros para o valor padrão.
     */
    resetFiltros() {
      Object.keys(_estado.filtros).forEach(k => {
        _estado.filtros[k] = 'todos';
      });
      _notificar('filtros');
    },

    /**
     * Atualiza dados da API.
     * @param {string} chave - 'dados', 'kpis', 'timeline', etc.
     * @param {*} valor
     */
    setDados(chave, valor) {
      _estado[chave] = valor;
      _notificar(chave);
    },

    /**
     * Define o estado de carregamento.
     * @param {boolean} valor
     */
    setCarregando(valor) {
      _estado.carregando = valor;
      _notificar('carregando');
    },

    /**
     * Define uma mensagem de erro (null para limpar).
     * @param {string|null} mensagem
     */
    setErro(mensagem) {
      _estado.erro = mensagem;
      _notificar('erro');
    },

    /**
     * Define a aba ativa da interface.
     * @param {string} aba
     */
    setAba(aba) {
      _estado.abaAtiva = aba;
      _notificar('abaAtiva');
    },

    /**
     * Registra um listener para reagir a mudanças.
     * @param {Function} fn - recebe (chave, estado)
     */
    subscribe(fn) {
      _listeners.push(fn);
    },

  };

})();
