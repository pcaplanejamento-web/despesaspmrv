/**
 * tables.js — v3.0
 * Tabelas resumo: todas as linhas, sem paginação.
 * Registros Detalhados: click = modal, col-filters, busca global.
 */
const Tables = (() => {

  // ── Formatação ────────────────────────────────────────────────────────────

  function fmtBRL(v) {
    if (v === undefined || v === null || v === '') return '--';
    return Number(v).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  }
  function fmtMes(m) { return CONFIG.MESES[m] || String(m||'--'); }

  function tipoBadge(tipo) {
    const t = String(tipo||'').toLowerCase();
    if (t.startsWith('ve')) return `<span class="badge badge-veiculo">Veículo</span>`;
    if (t.startsWith('m'))  return `<span class="badge badge-maquina">Máquina</span>`;
    return tipo ? `<span class="badge">${tipo}</span>` : '--';
  }
  function despesaBadge(d) {
    const l = String(d||'').toLowerCase();
    if (l.startsWith('combust')) return `<span class="badge badge-combustivel">${d}</span>`;
    if (l.startsWith('manut'))   return `<span class="badge badge-manutencao">${d}</span>`;
    return d ? `<span class="badge">${d}</span>` : '--';
  }

  // ── Aplicar busca + col-filters (Registros Detalhados) ───────────────────

  function applySearchAndColFilters(rows) {
    const term = State.getTableSearch();
    const col  = State.getColFilters();

    return rows.filter(r => {
      if (term) {
        const q = term;
        const match =
          (r.Placa        ||'').toLowerCase().includes(q) ||
          (r.Modelo       ||'').toLowerCase().includes(q) ||
          (r.Departamento ||'').toLowerCase().includes(q) ||
          (r.Classificacao||'').toLowerCase().includes(q) ||
          (r.Sigla        ||'').toLowerCase().includes(q) ||
          (r.Empresa      ||'').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (col.Sigla        && !(r.Sigla        ||'').toLowerCase().includes(col.Sigla.toLowerCase()))         return false;
      if (col.Departamento && !(r.Departamento ||'').toLowerCase().includes(col.Departamento.toLowerCase()))  return false;
      if (col.Placa        && !(r.Placa        ||'').toLowerCase().includes(col.Placa.toLowerCase()))         return false;
      if (col.Modelo       && !(r.Modelo       ||'').toLowerCase().includes(col.Modelo.toLowerCase()))        return false;
      if (col.Classificacao&& !(r.Classificacao||'').toLowerCase().includes(col.Classificacao.toLowerCase())) return false;
      if (col.Despesa) {
        const nd = (r.Despesa||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const nc = col.Despesa.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        if (nd !== nc) return false;
      }
      if (col.Tipo) {
        const nt = (r.Tipo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const nc = col.Tipo.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        if (!nt.includes(nc)) return false;
      }
      if (col.Mes && String(r.Mes) !== col.Mes) return false;
      if (col.Ano && String(r.Ano) !== col.Ano) return false;
      if (col.ValorMin) {
        const min = parseFloat(col.ValorMin.replace(',','.'));
        if (!isNaN(min) && r.Valor < min) return false;
      }
      return true;
    });
  }

  function applySort(rows) {
    const {col, dir} = State.getTableSort();
    if (!col) return rows;
    return [...rows].sort((a,b) => {
      let va = a[col], vb = b[col];
      if (typeof va==='number' && typeof vb==='number') return dir==='asc'?va-vb:vb-va;
      va=String(va||'').toLowerCase(); vb=String(vb||'').toLowerCase();
      return va<vb?(dir==='asc'?-1:1):va>vb?(dir==='asc'?1:-1):0;
    });
  }

  // ── Render Registros Detalhados ───────────────────────────────────────────

  function renderTable() {
    const tbody = document.getElementById('tableBody');
    const info  = document.getElementById('tableInfo');
    const pag   = document.getElementById('tablePagination');
    const ftv   = document.getElementById('tableFooterTotal');
    if (!tbody) return;

    let rows = applySearchAndColFilters(State.getFilteredData());
    rows = applySort(rows);

    const total    = rows.length;
    const pageSize = State.getTablePageSize();
    const totalPg  = Math.ceil(total/pageSize)||1;
    const page     = Math.max(1, Math.min(State.getTablePage(), totalPg));
    State.setTablePage(page);

    const start    = (page-1)*pageSize;
    const pageRows = rows.slice(start, start+pageSize);

    if (ftv) ftv.textContent = fmtBRL(rows.reduce((s,r)=>s+r.Valor,0));

    const btnCC = document.getElementById('btnClearColFilters');
    if (btnCC) btnCC.style.display = State.hasActiveColFilters() ? '' : 'none';

    if (info) info.textContent = total
      ? `${start+1}–${Math.min(start+pageSize,total)} de ${total.toLocaleString('pt-BR')} registros`
      : 'Nenhum registro encontrado';

    if (!pageRows.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="table-estado">
        <div class="table-estado-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <span>${State.getRawData().length ? 'Nenhum registro corresponde aos filtros' : 'Nenhum dado carregado'}</span>
      </div></td></tr>`;
      if(pag) pag.innerHTML='';
      return;
    }

    const frag = document.createDocumentFragment();
    pageRows.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'table-row-clickable';
      tr.innerHTML = `
        <td class="td-mono td-sigla">${r.Sigla||'--'}</td>
        <td class="td-truncate">${r.Departamento||'--'}</td>
        <td>${despesaBadge(r.Despesa)}</td>
        <td>${tipoBadge(r.Tipo)}</td>
        <td class="td-mono">${r.Placa||'--'}</td>
        <td class="td-truncate">${r.Modelo||'--'}</td>
        <td class="td-truncate">${r.Classificacao||'--'}</td>
        <td class="td-number fw-700">${fmtBRL(r.Valor)}</td>
        <td>${fmtMes(r.Mes)}</td>
        <td class="fw-600">${r.Ano||'--'}</td>`;
      tr.addEventListener('click', () => Modal.open('detalheRegistro', r));
      frag.appendChild(tr);
    });
    tbody.innerHTML='';
    tbody.appendChild(frag);
    renderPagination(page, totalPg, pag);
    updateSortIcons();
  }

  function renderPagination(current, totalPages, container) {
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML=''; return; }
    const btns=[];
    const add=(label,pg,active=false,disabled=false)=>
      btns.push(`<button class="pag-btn${active?' ativa':''}" ${disabled?'disabled':''} data-pg="${pg}" aria-label="Página ${pg}" ${active?'aria-current="page"':''}>${label}</button>`);
    add('«',1,false,current===1); add('‹',current-1,false,current===1);
    const W=2;
    for(let p=1;p<=totalPages;p++){
      if(p===1||p===totalPages||(p>=current-W&&p<=current+W)) add(p,p,p===current);
      else if(p===current-W-1||p===current+W+1) btns.push(`<span class="pag-ellipsis">…</span>`);
    }
    add('›',current+1,false,current===totalPages); add('»',totalPages,false,current===totalPages);
    container.innerHTML=`<div class="paginacao">${btns.join('')}</div>`;
    container.querySelectorAll('button[data-pg]').forEach(btn=>
      btn.addEventListener('click',()=>{ State.setTablePage(parseInt(btn.dataset.pg)); renderTable(); })
    );
  }

  function updateSortIcons() {
    const {col,dir} = State.getTableSort();
    document.querySelectorAll('thead th.th-sortable').forEach(th=>{
      const c=th.dataset.col, icon=th.querySelector('.sort-icon');
      th.classList.toggle('sorted',c===col);
      if(icon) icon.textContent=c===col?(dir==='asc'?' ↑':' ↓'):'';
    });
  }

  // ── Tabelas Resumo — SEM paginação ────────────────────────────────────────

  function renderSummaryTables() {
    const data = State.getFilteredData();
    const sl   = typeof Filters!=='undefined' ? Filters.siglaLabel : s=>s;

    function agg(keyFn, labelFn) {
      const map={};
      data.forEach(r=>{
        const k=keyFn(r);
        if(!map[k]) map[k]={label:labelFn?labelFn(r,k):k, total:0, qtde:0};
        map[k].total+=r.Valor; map[k].qtde++;
      });
      return Object.values(map).sort((a,b)=>b.total-a.total);
    }

    _fill('tabClassificacao', agg(r=>r.Classificacao||'--'),
      row=>[row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]);

    _fill('tabMes', agg(r=>`${String(r.Ano||'--')}-${String(r.Mes||'--').padStart(2,'0')}`,
      r=>`${fmtMes(r.Mes)}/${r.Ano}`),
      row=>[row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]);

    _fill('tabTipo', agg(r=>r.Tipo||'--'),
      row=>[row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]);

    _fill('tabDespesa', agg(r=>r.Despesa||'--'),
      row=>[row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]);

    const localRows = agg(r=>r.Sigla||'--', (r,k)=>k).map(r=>({...r,nome:sl(r.label)}));
    _fill('tabLocal', localRows,
      row=>[row.label, row.nome, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]);
  }

  function _fill(tableId, rows, cellFn) {
    const tbl = document.getElementById(tableId);
    if (!tbl) return;
    const tbody = tbl.querySelector('tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML=`<tr><td colspan="4" class="resumo-empty">Sem dados</td></tr>`;
      return;
    }

    const resumoKey = tbl.dataset.resumo || null;

    const frag = document.createDocumentFragment();
    rows.forEach(row=>{
      const tr = document.createElement('tr');
      tr.className = 'resumo-row-clickable';
      if (resumoKey) tr.dataset.key = row.label;
      const cells = cellFn(row);
      tr.innerHTML = cells.map((c,i)=>`<td class="${i>0?'tr':''}">${c}</td>`).join('');
      if (resumoKey) {
        tr.addEventListener('click', () => ResumoPainel.open(resumoKey, row.label));
      }
      frag.appendChild(tr);
    });

    // Linha de total — não é clicável
    const totRow = document.createElement('tr');
    totRow.className='resumo-total-row';
    const totalAmt = rows.reduce((s,r)=>s+r.total,0);
    const totalQtd = rows.reduce((s,r)=>s+r.qtde,0);
    const totCells = cellFn({label:'TOTAL',nome:'',qtde:totalQtd,total:totalAmt});
    totRow.innerHTML = totCells.map((c,i)=>`<td class="${i>0?'tr':''}">${i===0?'TOTAL':c}</td>`).join('');
    frag.appendChild(totRow);

    tbody.innerHTML='';
    tbody.appendChild(frag);
  }

  // ── Export CSV ────────────────────────────────────────────────────────────

  function exportCSV() {
    let rows = applySearchAndColFilters(State.getFilteredData());
    rows = applySort(rows);
    if (!rows.length) { typeof App!=='undefined'&&App.showToast('warn','Sem dados para exportar'); return; }
    const hdrs=['Empresa','Sigla','Centro de Custo','Departamento','Despesa','Modelo','Classificacao','Tipo','Placa','Valor','Liquidado','Mes','Ano','Contrato'];
    const lines=[hdrs.join(';')];
    rows.forEach(r=>lines.push([
      r.Empresa,r.Sigla,r.CentroCusto,r.Departamento,r.Despesa,r.Modelo,r.Classificacao,r.Tipo,r.Placa,
      String(r.Valor||0).replace('.',','), r.Liquidado?String(r.Liquidado).replace('.',','): '',
      r.Mes,r.Ano,r.Contrato,
    ].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(';')));
    const blob=new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8;'});
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`despesas_${new Date().toISOString().slice(0,10)}.csv`});
    a.click(); URL.revokeObjectURL(a.href);
    typeof App!=='undefined'&&App.showToast('success','CSV exportado',`${rows.length.toLocaleString('pt-BR')} registros`);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  function bindEvents() {
    document.querySelectorAll('thead th.th-sortable').forEach(th=>
      th.addEventListener('click',()=>{ State.setTableSort(th.dataset.col); renderTable(); })
    );
    const inp  = document.getElementById('tableSearch');
    const clr  = document.getElementById('searchClear');
    const sbtn = document.getElementById('searchBtn');
    const doSearch=()=>{ State.setTableSearch(inp?.value||''); State.setTablePage(1); renderTable(); clr?.classList.toggle('visivel',!!(inp?.value)); };
    inp?.addEventListener('input',doSearch);
    inp?.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
    clr?.addEventListener('click',()=>{ if(inp){inp.value='';inp.focus();} State.setTableSearch(''); State.setTablePage(1); renderTable(); clr.classList.remove('visivel'); });
    sbtn?.addEventListener('click',doSearch);
    document.getElementById('tablePageSize')?.addEventListener('change',e=>{ State.setTablePageSize(e.target.value); renderTable(); });
  }

  return { renderTable, renderSummaryTables, bindEvents, exportCSV };
})();

// ── ResumoPainel — Painel flutuante de detalhes por linha de tabela resumo ──
const ResumoPainel = (() => {

  const LABELS = {
    Classificacao: 'Classificação',
    Mes:           'Período',
    Tipo:          'Tipo de Frota',
    Despesa:       'Tipo de Despesa',
    Sigla:         'Secretaria / Local',
  };

  function fmtBRL(v) {
    if (v === undefined || v === null || v === '') return '--';
    return Number(v).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  }
  function fmtMes(m) { return CONFIG.MESES[m] || String(m||'--'); }

  function _el(id) { return document.getElementById(id); }

  function _buildKpis(records) {
    const total   = records.reduce((s,r)=>s+r.Valor,0);
    const qtde    = records.length;
    const placas  = new Set(records.map(r=>r.Placa).filter(Boolean)).size;
    const comb    = records.filter(r=>(r.Despesa||'').toLowerCase().startsWith('comb')).reduce((s,r)=>s+r.Valor,0);
    const manut   = records.filter(r=>(r.Despesa||'').toLowerCase().startsWith('manut')).reduce((s,r)=>s+r.Valor,0);

    return `
      <div class="rp-kpi-grid">
        <div class="rp-kpi">
          <span class="rp-kpi-label">Total de Despesa</span>
          <span class="rp-kpi-val">${fmtBRL(total)}</span>
        </div>
        <div class="rp-kpi">
          <span class="rp-kpi-label">Registros</span>
          <span class="rp-kpi-val">${qtde.toLocaleString('pt-BR')}</span>
        </div>
        <div class="rp-kpi">
          <span class="rp-kpi-label">Veículos / Máquinas</span>
          <span class="rp-kpi-val">${placas}</span>
        </div>
        ${comb>0?`<div class="rp-kpi"><span class="rp-kpi-label">Combustível</span><span class="rp-kpi-val rp-kpi-comb">${fmtBRL(comb)}</span></div>`:''}
        ${manut>0?`<div class="rp-kpi"><span class="rp-kpi-label">Manutenção</span><span class="rp-kpi-val rp-kpi-manut">${fmtBRL(manut)}</span></div>`:''}
      </div>`;
  }

  function _buildTable(records) {
    // Agrupa por placa → lista ordenada por total desc
    const map = {};
    records.forEach(r => {
      const placa = r.Placa || '--';
      if (!map[placa]) map[placa] = { placa, modelo: r.Modelo||'--', tipo: r.Tipo||'--', departamento: r.Departamento||'--', total: 0, qtde: 0, despesas: [] };
      map[placa].total += r.Valor;
      map[placa].qtde++;
      map[placa].despesas.push(r);
    });

    const sorted = Object.values(map).sort((a,b)=>b.total-a.total);
    if (!sorted.length) return '<p class="rp-vazio">Sem registros encontrados.</p>';

    const rows = sorted.map(v => {
      const isMaq = (v.tipo||'').toLowerCase().startsWith('m');
      const badge = isMaq
        ? `<span class="badge badge-maquina">Máquina</span>`
        : `<span class="badge badge-veiculo">Veículo</span>`;

      // Sub-linhas de despesa por mês
      const subRows = v.despesas.sort((a,b)=>{
        if (a.Ano !== b.Ano) return (a.Ano||0)-(b.Ano||0);
        return (a.Mes||0)-(b.Mes||0);
      }).map(d => `
        <tr class="rp-sub-row">
          <td class="rp-sub-mes">${fmtMes(d.Mes)}/${d.Ano||'--'}</td>
          <td>${d.Despesa||'--'}</td>
          <td class="tr rp-sub-val">${fmtBRL(d.Valor)}</td>
          <td>${d.Departamento||'--'}</td>
        </tr>`).join('');

      return `
        <tr class="rp-veiculo-row" data-id="${v.placa}">
          <td class="rp-placa-cell"><span class="rp-placa">${v.placa}</span></td>
          <td>${v.modelo}</td>
          <td>${badge}</td>
          <td class="tr fw-700">${fmtBRL(v.total)}</td>
          <td class="tr">${v.qtde}</td>
          <td class="rp-toggle-cell"><button class="rp-expand-btn" aria-expanded="false" title="Ver detalhes">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button></td>
        </tr>
        <tr class="rp-sub-wrap" hidden>
          <td colspan="6" class="rp-sub-td">
            <table class="rp-sub-table">
              <thead><tr><th>Mês/Ano</th><th>Tipo Despesa</th><th class="tr">Valor</th><th>Departamento</th></tr></thead>
              <tbody>${subRows}</tbody>
            </table>
          </td>
        </tr>`;
    }).join('');

    return `
      <table class="rp-table">
        <thead>
          <tr>
            <th>Placa / ID</th>
            <th>Modelo</th>
            <th>Tipo</th>
            <th class="tr">Total</th>
            <th class="tr">Qtde</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function _bindExpand(container) {
    container.querySelectorAll('.rp-veiculo-row').forEach(row => {
      const btn = row.querySelector('.rp-expand-btn');
      const subWrap = row.nextElementSibling;
      if (!btn || !subWrap) return;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = subWrap.hidden;
        subWrap.hidden = !open;
        btn.setAttribute('aria-expanded', open);
        btn.style.transform = open ? 'rotate(180deg)' : '';
      });
    });
  }

  function open(field, value) {
    const data = State.getFilteredData();

    // Filter records matching the clicked row
    let records;
    if (field === 'Mes') {
      // value is "Janeiro/2025" format — match by label reconstruction
      records = data.filter(r => {
        const label = `${fmtMes(r.Mes)}/${r.Ano}`;
        return label === value;
      });
    } else {
      records = data.filter(r => (r[field]||'--') === value);
    }

    // If total row clicked — no records match "TOTAL"
    if (!records.length) return;

    const catLabel = LABELS[field] || field;

    // Populate header
    _el('resumoPainelBadge').textContent = catLabel;
    _el('resumoPainelTitulo').textContent = value;
    _el('resumoPainelSub').textContent = `${records.length.toLocaleString('pt-BR')} registro${records.length!==1?'s':''}`;

    // KPIs
    _el('resumoPainelKpis').innerHTML = _buildKpis(records);

    // Table
    const bodyEl = _el('resumoPainelBody');
    bodyEl.innerHTML = _buildTable(records);
    _bindExpand(bodyEl);

    // Show
    const painel = _el('resumoPainel');
    painel.hidden = false;
    requestAnimationFrame(() => painel.classList.add('rp-open'));
    document.body.style.overflow = 'hidden';
  }

  function close() {
    const painel = _el('resumoPainel');
    painel.classList.remove('rp-open');
    setTimeout(() => { painel.hidden = true; document.body.style.overflow = ''; }, 260);
  }

  function init() {
    _el('resumoPainelClose')?.addEventListener('click', close);
    _el('resumoPainelBackdrop')?.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  return { open, close, init };
})();