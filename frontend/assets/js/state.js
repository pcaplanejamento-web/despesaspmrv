/**
 * state.js — v3.0
 * Estado global com multi-select completo para todos os filtros principais.
 * Filtros de coluna independentes para Registros Detalhados.
 */
const State = (() => {
  let _rawData = [], _lastSyncAt = null, _filteredData = [];

  // Filtros principais (afetam KPIs, gráficos, tabelas resumo)
  let _filters = {
    anos:           [],  // string[]
    despesas:       [],  // string[]
    tipos:          [],  // string[] — 'Veiculo' | 'Maquina'
    secretarias:    [],  // string[] — siglas
    classificacoes: [],  // string[]
  };

  // Filtros de coluna independentes (afetam apenas Registros Detalhados)
  let _colFilters = {
    Sigla:'', Departamento:'', Despesa:'', Tipo:'',
    Placa:'', Modelo:'', Classificacao:'', Mes:'', Ano:'', ValorMin:'',
  };

  let _tableSort   = { col: null, dir: 'asc' };
  let _tablePage   = 1;
  let _tablePageSize = 25;
  let _tableSearch = '';

  const TTL = () => typeof CONFIG !== 'undefined' ? CONFIG.CACHE_TTL_MS : 300000;

  return {
    // Raw data
    getRawData()    { return _rawData; },
    setRawData(d)   { _rawData = Array.isArray(d) ? d : []; _lastSyncAt = Date.now(); },
    hasData()       { return _rawData.length > 0; },
    isCacheValid()  { return !!_lastSyncAt && (Date.now() - _lastSyncAt) < TTL(); },
    getLastSyncAt() { return _lastSyncAt; },

    // Filtered data
    getFilteredData()   { return _filteredData; },
    setFilteredData(d)  { _filteredData = Array.isArray(d) ? d : []; },

    // Main filters
    getFilters() { return { ..._filters }; },
    setMultiFilter(key, vals) {
      if (key in _filters) { _filters[key] = Array.isArray(vals) ? [...vals] : []; _tablePage = 1; }
    },
    toggleMultiFilter(key, val) {
      if (!Array.isArray(_filters[key])) return;
      const i = _filters[key].indexOf(val);
      _filters[key] = i === -1 ? [..._filters[key], val] : _filters[key].filter(v => v !== val);
      _tablePage = 1;
    },
    clearFilters() {
      _filters = { anos:[], despesas:[], tipos:[], secretarias:[], classificacoes:[] };
      _tablePage = 1;
    },
    hasActiveFilters() {
      return Object.values(_filters).some(v => Array.isArray(v) ? v.length > 0 : !!v);
    },

    // Column filters (Registros Detalhados only)
    getColFilters()       { return { ..._colFilters }; },
    setColFilter(col, v)  { if (col in _colFilters) { _colFilters[col] = v; _tablePage = 1; } },
    clearColFilters()     { Object.keys(_colFilters).forEach(k => _colFilters[k] = ''); _tablePage = 1; },
    hasActiveColFilters() { return Object.values(_colFilters).some(v => !!v); },

    // Table sort
    getTableSort() { return { ..._tableSort }; },
    setTableSort(col) {
      _tableSort = _tableSort.col === col
        ? { col, dir: _tableSort.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' };
      _tablePage = 1;
    },

    // Pagination
    getTablePage()      { return _tablePage; },
    setTablePage(p)     { _tablePage = p; },
    getTablePageSize()  { return _tablePageSize; },
    setTablePageSize(s) { _tablePageSize = Number(s) || 25; _tablePage = 1; },

    // Search
    getTableSearch()  { return _tableSearch; },
    setTableSearch(t) { _tableSearch = t.trim().toLowerCase(); _tablePage = 1; },
  };
})();