/**
 * filters.js — Filtros v2.0
 * Chips de tipo, selects, resumo, contagem.
 */

const Filters = (() => {
  let _debounceTimer = null;

  // ── Populacao dos selects ─────────────────────────────

  function populateSelect(id, values, labelFn) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = labelFn ? labelFn(v) : String(v);
      sel.appendChild(opt);
    });
    if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  }

  function populateAll() {
    const opts = Api.getFilterOptions();
    populateSelect('filterAno',       opts.anos);
    populateSelect('filterMes',       opts.meses, m => CONFIG.MESES[m] || m);
    populateSelect('filterSecretaria', opts.secretarias);
    populateSelect('filterEmpresa',   opts.empresas);
  }

  // ── Aplicacao dos filtros ─────────────────────────────

  function applyFilters() {
    const f   = State.getFilters();
    const raw = State.getRawData();

    const result = raw.filter(row => {
      if (f.ano        && String(row.Ano)  !== f.ano)        return false;
      if (f.mes        && String(row.Mes)  !== f.mes)        return false;
      if (f.despesa    && row.Despesa      !== f.despesa)    return false;
      if (f.tipo       && row.Tipo         !== f.tipo)       return false;
      if (f.secretaria && row.Sigla        !== f.secretaria) return false;
      if (f.empresa    && row.Empresa      !== f.empresa)    return false;
      return true;
    });

    State.setFilteredData(result);
    updateRecordCount(result.length, raw.length);
    updateClearButton();
    updateFiltrosResumo();
    updateFilterItemStates();
    updateTabelaCount(result.length);
  }

  function applyFiltersDebounced() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      applyFilters();
      App.refresh();
    }, CONFIG.FILTER_DEBOUNCE_MS);
  }

  // ── Contagem ──────────────────────────────────────────

  function updateRecordCount(filtered, total) {
    const el = document.getElementById('filterRecordCount');
    if (!el) return;
    if (filtered === total) {
      el.textContent = `${total.toLocaleString('pt-BR')} registros`;
    } else {
      el.textContent = `${filtered.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} registros`;
    }
  }

  function updateTabelaCount(n) {
    const el = document.getElementById('tabelaCountPill');
    if (el) el.textContent = `${n.toLocaleString('pt-BR')} registros`;
  }

  // ── Botao limpar ──────────────────────────────────────

  function updateClearButton() {
    const btn = document.getElementById('btnClearFilters');
    if (!btn) return;
    State.hasActiveFilters() ? btn.classList.remove('hidden') : btn.classList.add('hidden');
  }

  // ── Destaque dos filtro-items ativos ──────────────────

  function updateFilterItemStates() {
    const f = State.getFilters();
    const map = { filterAno:'ano', filterMes:'mes', filterSecretaria:'secretaria', filterEmpresa:'empresa' };
    Object.entries(map).forEach(([elId, key]) => {
      const item = document.getElementById(elId)?.closest('.filtro-item');
      if (item) item.classList.toggle('ativo', !!f[key]);
    });
  }

  // ── Resumo de filtros ativos ──────────────────────────

  function updateFiltrosResumo() {
    const el = document.getElementById('filtrosResumo');
    if (!el) return;
    const f = State.getFilters();
    const tags = [];
    if (f.ano)        tags.push({ key:'ano',        label:`Ano: ${f.ano}` });
    if (f.mes)        tags.push({ key:'mes',         label:`Mes: ${CONFIG.MESES[f.mes] || f.mes}` });
    if (f.despesa)    tags.push({ key:'despesa',     label:`Despesa: ${f.despesa}` });
    if (f.tipo)       tags.push({ key:'tipo',        label:`Tipo: ${f.tipo}` });
    if (f.secretaria) tags.push({ key:'secretaria',  label:`Secretaria: ${f.secretaria}` });
    if (f.empresa)    tags.push({ key:'empresa',     label:`Entidade: ${f.empresa}` });

    if (!tags.length) {
      el.classList.remove('visivel');
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
      <span style="font-size:12px;font-weight:600;">Filtros ativos:</span>
      ${tags.map(t => `
        <span class="filtro-tag">
          ${t.label}
          <button aria-label="Remover filtro ${t.label}" onclick="Filters._removeFilter('${t.key}')">x</button>
        </span>`).join('')}
      <button id="btnLimparFiltros" style="margin-left:auto;background:none;border:none;color:var(--accent);font-size:12px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:6px;" onclick="Filters.clearAll()">Limpar tudo</button>
    `;
    el.classList.add('visivel');
  }

  // ── Chips de tipo ─────────────────────────────────────

  function initChips() {
    document.querySelectorAll('.filtro-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filtro-chip').forEach(c => c.classList.remove('ativo'));
        chip.classList.add('ativo');
        const val = chip.dataset.chip;
        const isDespesa = val === 'Combustivel' || val === 'Manutencao';
        const isTipo    = val === 'Veiculo' || val === 'Maquina';

        if (val === 'todos') {
          State.setFilter('despesa', '');
          State.setFilter('tipo',    '');
        } else if (isDespesa) {
          State.setFilter('despesa', val);
          State.setFilter('tipo',    '');
        } else if (isTipo) {
          State.setFilter('tipo',    val);
          State.setFilter('despesa', '');
        }
        applyFilters();
        App.refresh();
      });
    });
  }

  // ── API publica ───────────────────────────────────────

  function _removeFilter(key) {
    State.setFilter(key, '');
    const selMap = { ano:'filterAno', mes:'filterMes', secretaria:'filterSecretaria', empresa:'filterEmpresa' };
    if (selMap[key]) {
      const sel = document.getElementById(selMap[key]);
      if (sel) sel.value = '';
    }
    applyFilters();
    App.refresh();
  }

  function clearAll() {
    State.clearFilters();
    ['filterAno','filterMes','filterSecretaria','filterEmpresa'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.querySelectorAll('.filtro-chip').forEach(c => c.classList.remove('ativo'));
    const todos = document.querySelector('.filtro-chip[data-chip="todos"]');
    if (todos) todos.classList.add('ativo');
    applyFilters();
    App.refresh();
  }

  // ── Event bindings ────────────────────────────────────

  function bindEvents() {
    const ids = ['filterAno','filterMes','filterSecretaria','filterEmpresa'];
    const map = { filterAno:'ano', filterMes:'mes', filterSecretaria:'secretaria', filterEmpresa:'empresa' };

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        State.setFilter(map[id], el.value);
        applyFiltersDebounced();
      });
    });

    document.getElementById('btnClearFilters')?.addEventListener('click', clearAll);
    document.getElementById('btnExport')?.addEventListener('click', () => Tables.exportCSV());

    initChips();
  }

  return { populateAll, applyFilters, bindEvents, updateRecordCount, updateClearButton, clearAll, _removeFilter };
})();