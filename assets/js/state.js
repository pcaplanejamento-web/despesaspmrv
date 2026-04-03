/**
 * state.js — Estado global v2.1 — multi-select + col-filters
 */
const State = (() => {
  let _rawData = [], _lastSyncAt = null, _filteredData = [];
  let _filters = { anos:[], despesas:[], tipo:'', secretaria:'' };
  let _colFilters = { Sigla:'', Departamento:'', Despesa:'', Tipo:'', Placa:'', Modelo:'', Classificacao:'', Mes:'', Ano:'' };
  let _tableSort = { col:null, dir:'asc' };
  let _tablePage = 1, _tablePageSize = 25, _tableSearch = '';

  return {
    getRawData()    { return _rawData; },
    setRawData(d)   { _rawData = Array.isArray(d)?d:[]; _lastSyncAt = Date.now(); },
    hasData()       { return _rawData.length > 0; },
    isCacheValid()  { if(!_lastSyncAt) return false; return (Date.now()-_lastSyncAt) < (typeof CONFIG!=='undefined'?CONFIG.CACHE_TTL_MS:300000); },
    getLastSyncAt() { return _lastSyncAt; },

    getFilteredData()   { return _filteredData; },
    setFilteredData(d)  { _filteredData = Array.isArray(d)?d:[]; },

    getFilters()         { return {..._filters}; },
    setFilter(key, val)  { if(key in _filters){ _filters[key]=val; _tablePage=1; } },
    setMultiFilter(key,vals){ if(key in _filters){ _filters[key]=Array.isArray(vals)?[...vals]:[]; _tablePage=1; } },
    toggleMultiFilter(key,val){ if(!Array.isArray(_filters[key])) return; const i=_filters[key].indexOf(val); _filters[key]=i===-1?[..._filters[key],val]:_filters[key].filter(v=>v!==val); _tablePage=1; },

    clearFilters(){ _filters={anos:[],despesas:[],tipo:'',secretaria:''}; _colFilters={Sigla:'',Departamento:'',Despesa:'',Tipo:'',Placa:'',Modelo:'',Classificacao:'',Mes:'',Ano:''}; _tablePage=1; },
    hasActiveFilters(){ return _filters.anos.length>0||_filters.despesas.length>0||!!_filters.tipo||!!_filters.secretaria||Object.values(_colFilters).some(v=>!!v); },

    getColFilters()       { return {..._colFilters}; },
    setColFilter(col,v)   { if(col in _colFilters){ _colFilters[col]=v; _tablePage=1; } },
    clearColFilters()     { Object.keys(_colFilters).forEach(k=>_colFilters[k]=''); _tablePage=1; },
    hasActiveColFilters() { return Object.values(_colFilters).some(v=>!!v); },

    getTableSort() { return {..._tableSort}; },
    setTableSort(col){ if(_tableSort.col===col){ _tableSort.dir=_tableSort.dir==='asc'?'desc':'asc'; } else{ _tableSort.col=col; _tableSort.dir='asc'; } _tablePage=1; },

    getTablePage()      { return _tablePage; },
    setTablePage(p)     { _tablePage=p; },
    getTablePageSize()  { return _tablePageSize; },
    setTablePageSize(s) { _tablePageSize=Number(s)||25; _tablePage=1; },

    getTableSearch()  { return _tableSearch; },
    setTableSearch(t) { _tableSearch=t.trim().toLowerCase(); _tablePage=1; },
  };
})();