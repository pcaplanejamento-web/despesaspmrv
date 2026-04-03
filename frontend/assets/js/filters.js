/**
 * filters.js — v3.0
 * Multi-select completo: anos, despesas, tipos, secretarias, classificacoes.
 * Padrão visual PCA "Filtrar por Local".
 */
const Filters = (() => {
  let _debounceTimer = null;

  // Mapa completo sigla → nome
  const NOMES = {
    'AMAE':    'AMAE — Agência Mun. de Regulação de Água e Esgoto',
    'AMT':     'AMT — Agência Mun. de Mobilidade e Trânsito',
    'CGM':     'CGM — Controladoria Geral do Município',
    'FEMBOM':  'FEMBOM — Fundo Esp. Mun. do Corpo de Bombeiros',
    'FMAS':    'FMAS — Fundo Municipal de Assistência Social',
    'FMC':     'FMC — Fundo Municipal da Cultura',
    'FMDCA':   'FMDCA — Fundo Mun. da Criança e do Adolescente',
    'FMI':     'FMI — Fundo Municipal do Idoso',
    'FMP':     'FMP — Fundo Municipal de Posturas',
    'FMS':     'FMS — Fundo Municipal da Saúde',
    'FMSB':    'FMSB — Fundo Mun. de Saneamento Básico',
    'GCM':     'GCM — Guarda Civil Municipal',
    'GP':      'GP — Gabinete do Prefeito',
    'LAGOA DO BAUZINHO': 'LAGOA DO BAUZINHO — Subprefeitura de Lagoa do Bauzinho',
    'OUROANA': 'OUROANA — Subprefeitura de Ouroana',
    'PGM':     'PGM — Procuradoria Geral do Município',
    'PROCON':  'PROCON — Fundo Mun. de Defesa do Consumidor',
    'RIVERLÂNDIA': 'RIVERLÂNDIA — Subprefeitura de Riverlândia',
    'SEFAZ':   'SEFAZ — Secretaria da Fazenda',
    'SMAPA':   'SMAPA — Sec. Mun. de Agricultura, Pecuária e Abastecimento',
    'SMAUSP':  'SMAUSP — Sec. Mun. de Ação Urbana e Serviços Públicos',
    'SMC':     'SMC — Secretaria Municipal de Comunicação',
    'SMCTI':   'SMCTI — Sec. Mun. de Ciência, Tecnologia e Inovação',
    'SMDES':   'SMDES — Sec. Mun. de Desenvolvimento Econômico Sustentável',
    'SMDMU':   'SMDMU — Sec. Mun. de Desenvolvimento e Mobilidade Urbana',
    'SME':     'SME — Secretaria Municipal de Educação',
    'SMEL':    'SMEL — Sec. Mun. de Esporte e Lazer',
    'SMHRF':   'SMHRF — Sec. Mun. de Habitação e Regularização Fundiária',
    'SMIDU':   'SMIDU — Sec. Mun. de Infraestrutura e Desenvolvimento Urbano',
    'SMIR':    'SMIR — Sec. Mun. de Infraestrutura Rural',
    'SMMA':    'SMMA — Secretaria Municipal de Meio Ambiente',
    'SMPG':    'SMPG — Sec. Mun. de Planejamento e Gestão',
    'SMTUR':   'SMTUR — Secretaria Municipal de Turismo',
    'FME':     'FME — Fundo Municipal de Educação',
  };

  function siglaLabel(s) { return NOMES[s] || s; }

  // ─── Multi-Select Component ───────────────────────────────────────────────
  // Recebe: wrapId, stateKey, placeholder, optionsFn (→ string[])
  // Cria dropdown com checkboxes reativo ao estado.

  const _msRefs = {};

  function buildMultiSelect(wrapId, stateKey, placeholder, optionsFn) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const btn      = wrap.querySelector('.ms-btn');
    const dropdown = wrap.querySelector('.ms-dropdown');
    if (!btn || !dropdown) return;

    function getSelected()  { return State.getFilters()[stateKey] || []; }
    function getOptions()   { return optionsFn ? optionsFn() : []; }

    function updateLabel() {
      const sel  = getSelected();
      const lbl  = btn.querySelector('.ms-label');
      if (!lbl) return;
      lbl.textContent = !sel.length ? placeholder
        : sel.length === 1 ? (stateKey === 'secretarias' ? siglaLabel(sel[0]).split('—')[0].trim() : sel[0])
        : `${sel.length} selecionados`;
    }

    function buildOptions() {
      const opts = getOptions();
      const sel  = getSelected();
      dropdown.innerHTML = '';

      if (!opts.length) {
        dropdown.innerHTML = '<div style="padding:12px 16px;font-size:12px;color:var(--text-muted);">Sem opções disponíveis</div>';
        return;
      }

      opts.forEach(val => {
        const isSel = sel.includes(String(val));
        const div   = document.createElement('div');
        div.className = 'ms-option' + (isSel ? ' selected' : '');
        div.setAttribute('role','option');
        div.setAttribute('aria-selected', isSel);
        div.dataset.value = String(val);
        const display = stateKey === 'secretarias' ? siglaLabel(val) : val;
        div.innerHTML = `
          <span class="ms-checkbox" aria-hidden="true">
            <svg class="ms-checkbox-tick" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="2 6 5 9 10 3"/></svg>
          </span>
          <span class="ms-opt-label">${display}</span>`;
        div.addEventListener('click', e => {
          e.stopPropagation();
          State.toggleMultiFilter(stateKey, String(val));
          buildOptions();
          updateLabel();
          applyFiltersDebounced();
        });
        dropdown.appendChild(div);
      });

      // Botão limpar dentro do dropdown
      if (sel.length) {
        const clrDiv = document.createElement('div');
        clrDiv.className = 'ms-clear-all';
        clrDiv.innerHTML = `<button type="button" class="ms-clear-btn">Limpar seleção</button>`;
        clrDiv.querySelector('button').addEventListener('click', e => {
          e.stopPropagation();
          State.setMultiFilter(stateKey, []);
          buildOptions();
          updateLabel();
          applyFiltersDebounced();
        });
        dropdown.appendChild(clrDiv);
      }
    }

    function open()  { dropdown.classList.add('open'); btn.classList.add('open'); btn.setAttribute('aria-expanded','true'); buildOptions(); }
    function close() { dropdown.classList.remove('open'); btn.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
    function toggle(){ dropdown.classList.contains('open') ? close() : open(); }

    btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    // Expõe método de refresh externo
    _msRefs[wrapId] = { refresh: () => { buildOptions(); updateLabel(); } };
    updateLabel();
  }

  function refreshAll() {
    Object.values(_msRefs).forEach(ref => ref.refresh?.());
  }

  // ─── Populate selects de col-filters ─────────────────────────────────────

  function populateColFilterSelects() {
    const opts = Api.getFilterOptions();

    // Despesa col-filter
    const ds = document.querySelector('.col-filter-select[data-col="Despesa"]');
    if (ds) {
      const cur = ds.value;
      while (ds.options.length > 1) ds.remove(1);
      opts.despesas.forEach(d => { const o = new Option(d,d); ds.add(o); });
      if ([...ds.options].some(o => o.value === cur)) ds.value = cur;
    }

    // Tipo col-filter — fixo
    // Mes col-filter
    const ms = document.querySelector('.col-filter-select[data-col="Mes"]');
    if (ms) {
      const cur = ms.value;
      while (ms.options.length > 1) ms.remove(1);
      opts.meses.forEach(m => { const o = new Option((CONFIG.MESES[m]||m)+' ('+m+')', String(m)); ms.add(o); });
      if ([...ms.options].some(o => o.value === cur)) ms.value = cur;
    }

    // Ano col-filter
    const as = document.querySelector('.col-filter-select[data-col="Ano"]');
    if (as) {
      const cur = as.value;
      while (as.options.length > 1) as.remove(1);
      opts.anos.forEach(a => { const o = new Option(a,a); as.add(o); });
      if ([...as.options].some(o => o.value === cur)) as.value = cur;
    }
  }

  // ─── Populate all ─────────────────────────────────────────────────────────

  function populateAll() {
    const opts = Api.getFilterOptions();
    _msRefs['msAnos']?._refresh?.();
    _msRefs['msDespesas']?._refresh?.();
    _msRefs['msTipos']?._refresh?.();
    _msRefs['msSecretarias']?._refresh?.();
    _msRefs['msClassificacoes']?._refresh?.();
    // Trigger rebuild
    Object.values(_msRefs).forEach(r => r.refresh?.());
    populateColFilterSelects();
    updateRecordCount(State.getFilteredData().length, State.getRawData().length);
  }

  // ─── Apply filters ────────────────────────────────────────────────────────
  // Normaliza strings para comparação ignorando acentos e caixa

  function norm(s) {
    return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }

  function matchesMulti(arr, value) {
    if (!arr.length) return true;
    const nv = norm(value);
    return arr.some(a => norm(a) === nv);
  }

  function applyFilters() {
    const f   = State.getFilters();
    const col = State.getColFilters();
    const raw = State.getRawData();

    const result = raw.filter(r => {
      if (!matchesMulti(f.anos,           r.Ano))           return false;
      if (!matchesMulti(f.despesas,       r.Despesa))       return false;
      if (!matchesMulti(f.tipos,          r.Tipo))          return false;
      if (!matchesMulti(f.secretarias,    r.Sigla))         return false;
      if (!matchesMulti(f.classificacoes, r.Classificacao)) return false;
      return true;
    });

    State.setFilteredData(result);
    updateRecordCount(result.length, raw.length);
    updateClearButton();
    updateFiltrosResumo();
    updateTabCount(result.length);
  }

  function applyFiltersDebounced() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => { applyFilters(); App.refresh(); }, CONFIG.FILTER_DEBOUNCE_MS);
  }

  // ─── UI helpers ──────────────────────────────────────────────────────────

  function updateRecordCount(filtered, total) {
    const el = document.getElementById('filterRecordCount');
    if (!el) return;
    el.textContent = filtered === total
      ? `${total.toLocaleString('pt-BR')} registros`
      : `${filtered.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')}`;
  }

  function updateTabCount(n) {
    const el = document.getElementById('tabelaCountPill');
    if (el) el.textContent = `${n.toLocaleString('pt-BR')} registros`;
    const sb = document.getElementById('sidebarRecordCount');
    if (sb) sb.textContent = n.toLocaleString('pt-BR');
  }

  function updateClearButton() {
    const btn = document.getElementById('btnClearFilters');
    if (!btn) return;
    btn.classList.toggle('hidden', !State.hasActiveFilters());
  }

  function updateFiltrosResumo() {
    const el = document.getElementById('filtrosResumo');
    if (!el) return;
    const f = State.getFilters();
    const tags = [];
    if (f.anos.length)           tags.push({ key:'anos',           label:'Anos: '+f.anos.join(', ') });
    if (f.despesas.length)       tags.push({ key:'despesas',       label:'Despesas: '+f.despesas.join(', ') });
    if (f.tipos.length)          tags.push({ key:'tipos',          label:'Tipo: '+f.tipos.join(', ') });
    if (f.secretarias.length)    tags.push({ key:'secretarias',    label:'Secretaria: '+f.secretarias.map(s=>s).join(', ') });
    if (f.classificacoes.length) tags.push({ key:'classificacoes', label:'Classif.: '+f.classificacoes.length+' selecionadas' });

    if (!tags.length) { el.classList.remove('visible'); el.innerHTML=''; return; }

    el.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
      <span class="filtro-resumo-label">Filtros ativos:</span>
      ${tags.map(t=>`<span class="filtro-tag">${t.label}<button aria-label="Remover ${t.label}" onclick="Filters._removeTag('${t.key}')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button></span>`).join('')}
      <button class="filtro-resumo-clear" onclick="Filters.clearAll()">Limpar tudo</button>`;
    el.classList.add('visible');
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  function _removeTag(key) {
    State.setMultiFilter(key, []);
    _msRefs[{ anos:'msAnos', despesas:'msDespesas', tipos:'msTipos', secretarias:'msSecretarias', classificacoes:'msClassificacoes' }[key]]?.refresh?.();
    applyFilters();
    App.refresh();
    updateClearButton();
  }

  function clearAll() {
    State.clearFilters();
    Object.values(_msRefs).forEach(r => r.refresh?.());
    applyFilters();
    App.refresh();
  }

  // ─── Col-filter bindings ─────────────────────────────────────────────────

  function bindColFilters() {
    document.querySelectorAll('.col-filter-input').forEach(inp => {
      inp.addEventListener('input', () => {
        State.setColFilter(inp.dataset.col, inp.value.trim());
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => { Tables.renderTable(); }, 200);
        inp.classList.toggle('ativo', !!inp.value);
      });
    });
    document.querySelectorAll('.col-filter-select').forEach(sel => {
      sel.addEventListener('change', () => {
        State.setColFilter(sel.dataset.col, sel.value);
        Tables.renderTable();
        sel.classList.toggle('ativo', !!sel.value);
      });
    });
    document.getElementById('btnClearColFilters')?.addEventListener('click', () => {
      State.clearColFilters();
      document.querySelectorAll('.col-filter-input,.col-filter-select').forEach(el => { el.value=''; el.classList.remove('ativo'); });
      Tables.renderTable();
    });
  }

  // ─── Bootstrap ───────────────────────────────────────────────────────────

  function bindEvents() {
    const opts = Api.getFilterOptions;

    buildMultiSelect('msAnos',           'anos',           'Todos os anos',       () => Api.getFilterOptions().anos);
    buildMultiSelect('msDespesas',       'despesas',       'Todos os tipos',      () => Api.getFilterOptions().despesas);
    buildMultiSelect('msTipos',          'tipos',          'Todos os tipos',      () => Api.getFilterOptions().tipos);
    buildMultiSelect('msSecretarias',    'secretarias',    'Todas as secretarias',() => Api.getFilterOptions().secretarias);
    buildMultiSelect('msClassificacoes', 'classificacoes', 'Todas as categorias', () => Api.getFilterOptions().classificacoes);

    document.getElementById('btnClearFilters')?.addEventListener('click', clearAll);
    document.getElementById('btnExport')?.addEventListener('click', () => Tables.exportCSV());

    bindColFilters();
  }

  return { populateAll, applyFilters, bindEvents, updateRecordCount, updateClearButton, clearAll, _removeTag, siglaLabel };
})();