/**
 * filters.js — Lógica de filtragem e população dos controles de filtro
 *
 * Responsabilidades:
 * - Popular os selects com valores únicos do dataset
 * - Aplicar filtros ao dataset bruto e atualizar State.filteredData
 * - Controlar visibilidade do botão "Limpar"
 * - Debounce da aplicação de filtros para melhor desempenho
 */

const Filters = (() => {
  let _debounceTimer = null;

  // ----- Formatação -----

  function labelMes(num) {
    return CONFIG.MESES[num] || String(num);
  }

  // ----- População dos selects -----

  function populateSelect(id, values, labelFn) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    // Mantém apenas a primeira option (placeholder)
    while (select.options.length > 1) select.remove(1);
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = labelFn ? labelFn(v) : String(v);
      select.appendChild(opt);
    });
    // Restaura seleção prévia se ainda disponível
    if ([...select.options].some(o => o.value === current)) {
      select.value = current;
    }
  }

  function populateAll() {
    const opts = Api.getFilterOptions();
    populateSelect('filterAno',       opts.anos);
    populateSelect('filterMes',       opts.meses, labelMes);
    populateSelect('filterDespesa',   opts.despesas);
    populateSelect('filterTipo',      opts.tipos);
    populateSelect('filterSecretaria', opts.secretarias);
    populateSelect('filterEmpresa',   opts.empresas);
  }

  // ----- Aplicação dos filtros -----

  function applyFilters() {
    const f = State.getFilters();
    const raw = State.getRawData();

    const result = raw.filter(row => {
      if (f.ano        && String(row.Ano)    !== f.ano)        return false;
      if (f.mes        && String(row.Mes)    !== f.mes)        return false;
      if (f.despesa    && row.Despesa        !== f.despesa)    return false;
      if (f.tipo       && row.Tipo           !== f.tipo)       return false;
      if (f.secretaria && row.Sigla          !== f.secretaria) return false;
      if (f.empresa    && row.Empresa        !== f.empresa)    return false;
      return true;
    });

    State.setFilteredData(result);
    updateRecordCount(result.length, raw.length);
    updateClearButton();
  }

  function applyFiltersDebounced() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      applyFilters();
      App.refresh();
    }, CONFIG.FILTER_DEBOUNCE_MS);
  }

  // ----- Contagem de registros -----

  function updateRecordCount(filtered, total) {
    const el = document.getElementById('filterRecordCount');
    if (!el) return;
    if (filtered === total) {
      el.textContent = `${total.toLocaleString('pt-BR')} registros`;
    } else {
      el.textContent = `${filtered.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} registros`;
    }
  }

  // ----- Botão Limpar -----

  function updateClearButton() {
    const btn = document.getElementById('btnClearFilters');
    if (!btn) return;
    if (State.hasActiveFilters()) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }

  // ----- Event Listeners -----

  function bindEvents() {
    const filterIds = ['filterAno', 'filterMes', 'filterDespesa', 'filterTipo', 'filterSecretaria', 'filterEmpresa'];
    const keyMap = {
      filterAno: 'ano', filterMes: 'mes', filterDespesa: 'despesa',
      filterTipo: 'tipo', filterSecretaria: 'secretaria', filterEmpresa: 'empresa',
    };

    filterIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        State.setFilter(keyMap[id], el.value);
        applyFiltersDebounced();
      });
    });

    const btnClear = document.getElementById('btnClearFilters');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        State.clearFilters();
        // Resetar os selects visualmente
        filterIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        applyFilters();
        App.refresh();
      });
    }
  }

  return {
    populateAll,
    applyFilters,
    bindEvents,
    updateRecordCount,
  };
})();
