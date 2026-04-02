/**
 * api.js
 * Camada de comunicação com o Google Apps Script.
 * Toda chamada à API passa por aqui — nunca diretamente do HTML ou outros módulos.
 */

const Api = (() => {

  /**
   * Monta a URL com os parâmetros fornecidos.
   * @param {string} rota
   * @param {Object} params
   * @returns {string}
   */
  function _buildUrl(rota, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('rota', rota);
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'todos') url.searchParams.set(k, v);
    });
    return url.toString();
  }

  /**
   * Executa uma requisição GET com timeout.
   * @param {string} url
   * @returns {Promise<Object>}
   */
  async function _get(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const json = await response.json();

      if (json.status === 'erro') {
        throw new Error(json.mensagem || 'Erro desconhecido na API');
      }

      return json.dados;

    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('A requisição excedeu o tempo limite. Verifique a conexão.');
      }
      throw err;
    }
  }

  return {

    /**
     * Busca os valores únicos para popular os filtros.
     * @returns {Promise<Object>}
     */
    async getFiltros() {
      const url = _buildUrl('filtros');
      return _get(url);
    },

    /**
     * Busca os KPIs calculados com os filtros ativos.
     * @param {Object} filtros
     * @returns {Promise<Object>}
     */
    async getKpis(filtros = {}) {
      const url = _buildUrl('kpis', filtros);
      return _get(url);
    },

    /**
     * Busca os registros de dados com os filtros ativos.
     * @param {Object} filtros
     * @returns {Promise<Array>}
     */
    async getDados(filtros = {}) {
      const url = _buildUrl('dados', filtros);
      return _get(url);
    },

    /**
     * Busca os dados agrupados por período para a linha do tempo.
     * @param {Object} filtros - deve incluir 'inicio' e 'fim' (YYYY-MM)
     * @returns {Promise<Object>}
     */
    async getTimeline(filtros = {}) {
      const url = _buildUrl('timeline', filtros);
      return _get(url);
    },

    /**
     * Busca dois conjuntos de dados para comparação de cenários.
     * @param {string} cenario1 - ex: 'ano_2025'
     * @param {string} cenario2 - ex: 'ano_2026'
     * @param {Object} filtrosBase - filtros comuns aos dois cenários
     * @returns {Promise<Object>}
     */
    async getComparacao(cenario1, cenario2, filtrosBase = {}) {
      const url = _buildUrl('comparacao', { ...filtrosBase, cenario1, cenario2 });
      return _get(url);
    },

  };

})();
