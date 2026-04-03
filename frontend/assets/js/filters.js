/**
 * filters.js — v2.1
 * Multi-select Ano e Despesa, chips de tipo, secretaria com nome.
 */
const Filters = (() => {
  let _debounceTimer = null;

  // Mapa sigla → nome da secretaria (expandir conforme necessário)
  const NOMES_SECRETARIA = {
    'SMIDU': 'SMIDU — Infra e Des. Urbano',
    'FMS':   'FMS — Saude',
    'FMAS':  'FMAS — Assist. Social',
    'FME':   'FME — Educacao',
    'GP':    'GP — Gabinete do Prefeito',
    'GCM':   'GCM — Guarda Civil',
    'SMS':   'SMS — Sec. Saude',
    'SEMED': 'SEMED — Sec. Educacao',
    'SEMAD': 'SEMAD — Meio Ambiente',
    'SEMAS': 'SEMAS — Assist. Social',
    'SEMA':  'SEMA — Agricultura',
  };

  function siglaLabel(sigla) {
    return NOMES_SECRETARIA[sigla] || sigla;
  }

  // ── Multi-select component ────────────────────────────

  function buildMultiSelect(wrapId, stateKey, placeholder) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const btn      = wrap.querySelector('.ms-btn');
    const dropdown = wrap.querySelector('.ms-dropdown');
    if (!btn || !dropdown) return;

    function getSelected() { return State.getFilters()[stateKey] || []; }

    function updateLabel() {
      const sel = getSelected();
      const labelEl = btn.querySelector('.ms-label');
      if (!labelEl) return;
      if (!sel.length) {
        labelEl.textContent = placeholder;
      } else if (sel.length === 1) {
        labelEl.textContent = sel[0];
      } else {
        labelEl.textContent = `${sel.length} selecionados`;
      }
    }

    function buildOptions() {
      const opts = Api.getFilterOptions();
      const values = stateKey === 'anos' ? opts.anos : opts.despesas;
      const sel = getSelected();
      dropdown.innerHTML = '';
      values.forEach(val => {
        const isSelected = sel.includes(String(val));
        const opt = document.createElement('div');
        opt.className = 'ms-option' + (isSelected ? ' selected' : '');
        opt.setAttribute('role', 'option');
        opt.setAttribute('aria-selected', isSelected);
        opt.dataset.value = String(val);
        opt.innerHTML = `
          <span class="ms-checkbox">
            <svg class="ms-checkbox-tick" viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg>
          </span>
          <span>${val}</span>`;
        opt.addEventListener('click', e => {
          e.stopPropagation();
          State.toggleMultiFilter(stateKey, String(val));
          buildOptions();
          updateLabel();
          applyFiltersDebounced();
        });
        dropdown.appendChild(opt);
      });
    }

    function open()  { dropdown.classList.add('open'); btn.classList.add('open'); btn.setAttribute('aria-expanded','true'); buildOptions(); }
    function close() { dropdown.classList.remove('open'); btn.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
    function toggle(){ dropdown.classList.contains('open') ? close() : open(); }

    btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) close();
    });

    // Expor para rebuild externo
    wrap._refresh = () => { buildOptions(); updateLabel(); };
    updateLabel();
  }

  // ── Populate select secretaria ────────────────────────

  function populateSecretaria() {
    const sel = document.getElementById('filterSecretaria');
    if (!sel) return;
    const cur = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    const opts = Api.getFilterOptions();
    opts.secretarias.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = siglaLabel(s);
      sel.appendChild(opt);
    });
    if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  }

  // Popula os selects dos filtros de coluna na tabela
  function populateColFilterSelects() {
    const opts = Api.getFilterOptions();
    // Despesa
    const despSel = document.querySelector('.col-filter-select[data-col="Despesa"]');
    if (despSel) {
      const cur = despSel.value;
      while (despSel.options.length > 1) despSel.remove(1);
      opts.despesas.forEach(d => {
        const o = document.createElement('option'); o.value = d; o.textContent = d;
        despSel.appendChild(o);
      });
      if ([...despSel.options].some(o => o.value === cur)) despSel.value = cur;
    }
    // Mes
    const mesSel = document.querySelector('.col-filter-select[data-col="Mes"]');
    if (mesSel) {
      const cur = mesSel.value;
      while (mesSel.options.length > 1) mesSel.remove(1);
      opts.meses.forEach(m => {
        const o = document.createElement('option'); o.value = String(m); o.textContent = (CONFIG.MESES[m]||m) + ' (' + m + ')';
        mesSel.appendChild(o);
      });
      if ([...mesSel.options].some(o => o.value === cur)) mesSel.value = cur;
    }
    // Ano
    const anoSel = document.querySelector('.col-filter-select[data-col="Ano"]');
    if (anoSel) {
      const cur = anoSel.value;
      while (anoSel.options.length > 1) anoSel.remove(1);
      opts.anos.forEach(a => {
        const o = document.createElement('option'); o.value = String(a); o.textContent = a;
        anoSel.appendChild(o);
      });
      if ([...anoSel.options].some(o => o.value === cur)) anoSel.value = cur;
    }
  }

  function populateAll() {
    // Refresh multi-selects
    const msAno    = document.getElementById('msAno');
    const msDespesa= document.getElementById('msDespesa');
    if (msAno?._refresh)     msAno._refresh();
    if (msDespesa?._refresh) msDespesa._refresh();
    populateSecretaria();
    populateColFilterSelects();
  }

  // ── Apply filters ─────────────────────────────────────

  function applyFilters() {
    const f   = State.getFilters();
    const col = State.getColFilters();
    const raw = State.getRawData();

    const result = raw.filter(row => {
      // Multi-select anos
      if (f.anos.length && !f.anos.includes(String(row.Ano))) return false;
      // Multi-select despesas
      if (f.despesas.length) {
        const d = row.Despesa || '';
        const match = f.despesas.some(fd =>
          d === fd ||
          (fd === 'Combustivel' && (d === 'Combustível' || d === 'Combustivel')) ||
          (fd === 'Manutencao'  && (d === 'Manutenção'  || d === 'Manutencao'))
        );
        if (!match) return false;
      }
      // Tipo (chips)
      if (f.tipo) {
        const t = row.Tipo || '';
        const lower = t.toLowerCase();
        if (f.tipo === 'Veiculo' && !lower.startsWith('ve')) return false;
        if (f.tipo === 'Maquina' && !lower.startsWith('m'))  return false;
      }
      // Secretaria
      if (f.secretaria && row.Sigla !== f.secretaria) return false;

      // Filtros de coluna
      if (col.Sigla        && !String(row.Sigla||'').toLowerCase().includes(col.Sigla.toLowerCase()))              return false;
      if (col.Departamento && !String(row.Departamento||'').toLowerCase().includes(col.Departamento.toLowerCase())) return false;
      if (col.Placa        && !String(row.Placa||'').toLowerCase().includes(col.Placa.toLowerCase()))               return false;
      if (col.Modelo       && !String(row.Modelo||'').toLowerCase().includes(col.Modelo.toLowerCase()))             return false;
      if (col.Classificacao&& !String(row.Classificacao||'').toLowerCase().includes(col.Classificacao.toLowerCase())) return false;
      if (col.Tipo) {
        const t = (row.Tipo||'').toLowerCase();
        const cv = col.Tipo.toLowerCase();
        if (!t.includes(cv) && !(cv==='veiculo'&&t.startsWith('ve')) && !(cv==='maquina'&&t.startsWith('m'))) return false;
      }
      if (col.Despesa) {
        const d = row.Despesa||'';
        if (d !== col.Despesa && !(col.Despesa==='Veiculo'&&false)) {
          // normaliza
          const nd = d.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
          const nc = col.Despesa.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
          if (nd !== nc) return false;
        }
      }
      if (col.Mes && String(row.Mes) !== col.Mes) return false;
      if (col.Ano && String(row.Ano) !== col.Ano) return false;
      if (col.ValorMin) {
        const min = parseFloat(col.ValorMin.replace(',','.'));
        if (!isNaN(min) && row.Valor < min) return false;
      }

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
    _debounceTimer = setTimeout(() => { applyFilters(); App.refresh(); }, CONFIG.FILTER_DEBOUNCE_MS);
  }

  // ── UI feedback ───────────────────────────────────────

  function updateRecordCount(filtered, total) {
    const el = document.getElementById('filterRecordCount');
    if (!el) return;
    el.textContent = filtered === total
      ? `${total.toLocaleString('pt-BR')} registros`
      : `${filtered.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} registros`;
  }

  function updateTabelaCount(n) {
    const el = document.getElementById('tabelaCountPill');
    if (el) el.textContent = `${n.toLocaleString('pt-BR')} registros`;
  }

  function updateClearButton() {
    const btn = document.getElementById('btnClearFilters');
    if (!btn) return;
    State.hasActiveFilters() ? btn.classList.remove('hidden') : btn.classList.add('hidden');
  }

  function updateFilterItemStates() {
    const f = State.getFilters();
    document.getElementById('filtroItemAno')?.classList.toggle('ativo', f.anos.length > 0);
    document.getElementById('filtroItemDespesa')?.classList.toggle('ativo', f.despesas.length > 0);
    document.getElementById('filtroItemSecretaria')?.classList.toggle('ativo', !!f.secretaria);
    // Highlight col-filter inputs
    document.querySelectorAll('.col-filter-input,.col-filter-select').forEach(el => {
      el.classList.toggle('ativo', !!el.value);
    });
  }

  function updateFiltrosResumo() {
    const el = document.getElementById('filtrosResumo');
    if (!el) return;
    const f = State.getFilters();
    const col = State.getColFilters();
    const tags = [];
    if (f.anos.length)     tags.push({ key:'anos',       label:`Anos: ${f.anos.join(', ')}` });
    if (f.despesas.length) tags.push({ key:'despesas',   label:`Despesas: ${f.despesas.join(', ')}` });
    if (f.tipo)            tags.push({ key:'tipo',       label:`Tipo: ${f.tipo}` });
    if (f.secretaria)      tags.push({ key:'secretaria', label:`Secretaria: ${siglaLabel(f.secretaria)}` });
    Object.entries(col).forEach(([k,v]) => { if (v) tags.push({ key:'col_'+k, label:`${k}: ${v}`, isCol:true }); });

    if (!tags.length) { el.classList.remove('visivel'); el.innerHTML=''; return; }
    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
      <span style="font-size:12px;font-weight:600;">Filtros:</span>
      ${tags.map(t => `<span class="filtro-tag">${t.label}<button aria-label="Remover ${t.label}" onclick="Filters._removeTag('${t.key}')">x</button></span>`).join('')}
      <button style="margin-left:auto;background:none;border:none;color:var(--accent);font-size:12px;font-weight:700;cursor:pointer;padding:4px 10px;border-radius:6px;" onclick="Filters.clearAll()">Limpar tudo</button>`;
    el.classList.add('visivel');
  }

  // ── Chips ─────────────────────────────────────────────

  function initChips() {
    document.querySelectorAll('.filtro-chip').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.filtro-chip').forEach(x => x.classList.remove('ativo'));
        c.classList.add('ativo');
        const val = c.dataset.chip;
        State.setFilter('tipo', val === 'todos' ? '' : val);
        applyFilters();
        App.refresh();
      });
    });
  }

  // ── Public API ────────────────────────────────────────

  function _removeTag(key) {
    if (key === 'anos')       { State.setMultiFilter('anos',[]); document.getElementById('msAno')?._refresh?.(); }
    else if (key === 'despesas') { State.setMultiFilter('despesas',[]); document.getElementById('msDespesa')?._refresh?.(); }
    else if (key === 'tipo')  { State.setFilter('tipo',''); document.querySelectorAll('.filtro-chip').forEach(c=>c.classList.toggle('ativo',c.dataset.chip==='todos')); }
    else if (key === 'secretaria') { State.setFilter('secretaria',''); const s=document.getElementById('filterSecretaria'); if(s) s.value=''; }
    else if (key.startsWith('col_')) {
      const col = key.replace('col_','');
      State.setColFilter(col,'');
      const el = document.querySelector(`.col-filter-input[data-col="${col}"],.col-filter-select[data-col="${col}"]`);
      if (el) el.value = '';
    }
    applyFilters();
    App.refresh();
  }

  function clearAll() {
    State.clearFilters();
    ['filterSecretaria'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('msAno')?._refresh?.();
    document.getElementById('msDespesa')?._refresh?.();
    document.querySelectorAll('.filtro-chip').forEach(c => c.classList.toggle('ativo', c.dataset.chip==='todos'));
    document.querySelectorAll('.col-filter-input,.col-filter-select').forEach(el => { el.value=''; el.classList.remove('ativo'); });
    applyFilters();
    App.refresh();
  }

  // ── Event bindings ────────────────────────────────────

  function bindEvents() {
    // Multi-selects
    buildMultiSelect('msAno',     'anos',     'Todos os anos');
    buildMultiSelect('msDespesa', 'despesas', 'Todas as despesas');

    // Secretaria
    document.getElementById('filterSecretaria')?.addEventListener('change', e => {
      State.setFilter('secretaria', e.target.value);
      applyFiltersDebounced();
    });

    // Limpar
    document.getElementById('btnClearFilters')?.addEventListener('click', clearAll);
    document.getElementById('btnExport')?.addEventListener('click', () => Tables.exportCSV());

    // Chips
    initChips();

    // Filtros de coluna
    document.querySelectorAll('.col-filter-input').forEach(inp => {
      inp.addEventListener('input', () => {
        State.setColFilter(inp.dataset.col, inp.value.trim());
        applyFiltersDebounced();
        inp.classList.toggle('ativo', !!inp.value);
      });
    });
    document.querySelectorAll('.col-filter-select').forEach(sel => {
      sel.addEventListener('change', () => {
        State.setColFilter(sel.dataset.col, sel.value);
        applyFilters();
        App.refresh();
        sel.classList.toggle('ativo', !!sel.value);
      });
    });

    // Limpar filtros de coluna
    document.getElementById('btnClearColFilters')?.addEventListener('click', () => {
      State.clearColFilters();
      document.querySelectorAll('.col-filter-input,.col-filter-select').forEach(el => { el.value=''; el.classList.remove('ativo'); });
      applyFilters();
      App.refresh();
    });

    // Sidebar filtros rápidos por sigla
    document.querySelectorAll('.side-menu-item[data-filter-sigla]').forEach(item => {
      item.addEventListener('click', () => {
        const sigla = item.dataset.filterSigla;
        State.setFilter('secretaria', sigla);
        const sel = document.getElementById('filterSecretaria');
        if (sel) sel.value = sigla;
        applyFilters();
        App.refresh();
        updateClearButton();
      });
    });
  }

  return { populateAll, applyFilters, bindEvents, updateRecordCount, updateClearButton, clearAll, _removeTag, siglaLabel };
})();