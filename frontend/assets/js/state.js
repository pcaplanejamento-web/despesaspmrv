/**
 * state.js — Gerenciamento de estado global e cache de dados
 *
 * Responsabilidades:
 * - Manter o dataset bruto carregado da API
 * - Controlar TTL do cache para evitar requisições desnecessárias
 * - Expor os dados filtrados derivados do estado atual dos filtros
 */

const State = (() => {
  // Dataset bruto retornado pela API
  let _rawData = [];

  // Timestamp da última sincronização bem-sucedida
  let _lastSyncAt = null;

  // Dados após aplicação dos filtros ativos
  let _filteredData = [];

  // Estado atual dos filtros
  let _filters = {
    ano:        '',
    mes:        '',
    despesa:    '',
    tipo:       '',
    secretaria: '',
    empresa:    '',
  };

  // Ordenação da tabela
  let _tableSort = { col: null, dir: 'asc' };

  // Paginação da tabela
  let _tablePage = 1;
  let _tablePageSize = CONFIG.DEFAULT_PAGE_SIZE;

  // Texto de busca da tabela
  let _tableSearch = '';

  return {
    // ----- Raw data -----

    getRawData() {
      return _rawData;
    },

    setRawData(data) {
      _rawData = Array.isArray(data) ? data : [];
      _lastSyncAt = Date.now();
    },

    hasData() {
      return _rawData.length > 0;
    },

    /**
     * Verifica se o cache ainda é válido com base no TTL configurado.
     * @returns {boolean}
     */
    isCacheValid() {
      if (!_lastSyncAt) return false;
      return (Date.now() - _lastSyncAt) < CONFIG.CACHE_TTL_MS;
    },

    getLastSyncAt() {
      return _lastSyncAt;
    },

    // ----- Filtered data -----

    getFilteredData() {
      return _filteredData;
    },

    setFilteredData(data) {
      _filteredData = Array.isArray(data) ? data : [];
    },

    // ----- Filters -----

    getFilters() {
      return { ..._filters };
    },

    setFilter(key, value) {
      if (key in _filters) {
        _filters[key] = value;
        _tablePage = 1; // resetar paginação ao mudar filtro
      }
    },

    clearFilters() {
      Object.keys(_filters).forEach(k => (_filters[k] = ''));
      _tablePage = 1;
    },

    hasActiveFilters() {
      return Object.values(_filters).some(v => v !== '');
    },

    // ----- Table sort -----

    getTableSort() {
      return { ..._tableSort };
    },

    setTableSort(col) {
      if (_tableSort.col === col) {
        _tableSort.dir = _tableSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        _tableSort.col = col;
        _tableSort.dir = 'asc';
      }
      _tablePage = 1;
    },

    // ----- Pagination -----

    getTablePage() {
      return _tablePage;
    },

    setTablePage(page) {
      _tablePage = page;
    },

    getTablePageSize() {
      return _tablePageSize;
    },

    setTablePageSize(size) {
      _tablePageSize = Number(size) || CONFIG.DEFAULT_PAGE_SIZE;
      _tablePage = 1;
    },

    // ----- Search -----

    getTableSearch() {
      return _tableSearch;
    },

    setTableSearch(text) {
      _tableSearch = text.trim().toLowerCase();
      _tablePage = 1;
    },
  };
})();
