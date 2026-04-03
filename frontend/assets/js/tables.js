/**
 * tables.js — v2.1
 * Busca global, filtros de coluna, paginação, tabelas resumo, CSV.
 */
const Tables = (() => {

  // ── Formatação ────────────────────────────────────────

  function fmtBRL(v) {
    if (v === undefined || v === null || v === '') return '--';
    return Number(v).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  }
  function fmtMes(m) { return CONFIG.MESES[m] || String(m); }

  function tipoBadge(tipo) {
    const t = String(tipo||'').toLowerCase();
    if (t.startsWith('ve')) return `<span class="badge badge-veiculo">Veiculo</span>`;
    if (t.startsWith('m'))  return `<span class="badge badge-maquina">Maquina</span>`;
    return tipo ? `<span class="badge">${tipo}</span>` : '--';
  }
  function despesaBadge(d) {
    const l = String(d||'').toLowerCase();
    if (l.startsWith('combust')) return `<span class="badge badge-combustivel">${d}</span>`;
    if (l.startsWith('manut'))   return `<span class="badge badge-manutencao">${d}</span>`;
    return d ? `<span class="badge">${d}</span>` : '--';
  }

  // ── Busca + col-filters ───────────────────────────────

  function applySearchAndColFilters(rows) {
    const term = State.getTableSearch();
    if (term) {
      rows = rows.filter(r =>
        (r.Placa||'').toLowerCase().includes(term)         ||
        (r.Modelo||'').toLowerCase().includes(term)        ||
        (r.Departamento||'').toLowerCase().includes(term)  ||
        (r.Classificacao||'').toLowerCase().includes(term) ||
        (r.Sigla||'').toLowerCase().includes(term)
      );
    }
    return rows;
  }

  // ── Ordenação ─────────────────────────────────────────

  function applySort(rows) {
    const { col, dir } = State.getTableSort();
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      let va = a[col], vb = b[col];
      if (typeof va === 'number' && typeof vb === 'number') return dir==='asc'?va-vb:vb-va;
      va = String(va||'').toLowerCase(); vb = String(vb||'').toLowerCase();
      return va < vb ? (dir==='asc'?-1:1) : va > vb ? (dir==='asc'?1:-1) : 0;
    });
  }

  // ── Render tabela principal ───────────────────────────

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
    const page     = Math.max(1, Math.min(State.getTablePage(), Math.ceil(total/pageSize)||1));
    State.setTablePage(page);

    const start    = (page-1)*pageSize;
    const pageRows = rows.slice(start, start+pageSize);

    if (ftv) ftv.textContent = fmtBRL(rows.reduce((s,r)=>s+r.Valor,0));

    // Botão limpar filtros de coluna
    const btnCC = document.getElementById('btnClearColFilters');
    if (btnCC) btnCC.style.display = State.hasActiveColFilters() ? '' : 'none';

    if (info) info.textContent = total
      ? `Exibindo ${start+1}–${Math.min(start+pageSize,total)} de ${total.toLocaleString('pt-BR')} registros`
      : 'Nenhum registro encontrado';

    if (!pageRows.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="table-estado">
        <div class="table-estado-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
        <span>${State.getRawData().length ? 'Nenhum registro corresponde aos filtros' : 'Nenhum dado carregado'}</span>
      </div></td></tr>`;
      if (pag) pag.innerHTML='';
      return;
    }

    const frag = document.createDocumentFragment();
    pageRows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-mono" style="font-weight:700;color:var(--accent)">${r.Sigla||'--'}</td>
        <td class="td-truncate" title="${r.Departamento||''}">${r.Departamento||'--'}</td>
        <td>${despesaBadge(r.Despesa)}</td>
        <td>${tipoBadge(r.Tipo)}</td>
        <td class="td-mono">${r.Placa||'--'}</td>
        <td class="td-truncate" title="${r.Modelo||''}">${r.Modelo||'--'}</td>
        <td class="td-truncate" title="${r.Classificacao||''}">${r.Classificacao||'--'}</td>
        <td class="td-number" style="font-weight:700">${fmtBRL(r.Valor)}</td>
        <td style="white-space:nowrap">${fmtMes(r.Mes)}</td>
        <td style="font-weight:600">${r.Ano||'--'}</td>`;
      frag.appendChild(tr);
    });
    tbody.innerHTML='';
    tbody.appendChild(frag);

    renderPagination(page, Math.ceil(total/pageSize), pag);
    updateSortIcons();
  }

  function renderPagination(current, totalPages, container) {
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML=''; return; }
    const btns = [];
    const add  = (label, pg, active=false, disabled=false) =>
      btns.push(`<button ${disabled?'disabled':''} ${active?'class="ativa"':''} data-pg="${pg}" aria-label="Pagina ${pg}" ${active?'aria-current="page"':''}>${label}</button>`);

    add('«', 1, false, current===1);
    add('‹', current-1, false, current===1);
    const W = 2;
    for (let p=1; p<=totalPages; p++) {
      if (p===1||p===totalPages||(p>=current-W&&p<=current+W)) add(p,p,p===current);
      else if (p===current-W-1||p===current+W+1) btns.push(`<button disabled style="pointer-events:none;opacity:.5">…</button>`);
    }
    add('›', current+1, false, current===totalPages);
    add('»', totalPages, false, current===totalPages);

    container.innerHTML = `<div class="paginacao-btns">${btns.join('')}</div>`;
    container.querySelectorAll('button[data-pg]').forEach(btn =>
      btn.addEventListener('click', () => {
        State.setTablePage(parseInt(btn.dataset.pg));
        renderTable();
        document.getElementById('secaoRegistros')?.scrollIntoView({behavior:'smooth',block:'start'});
      })
    );
  }

  function updateSortIcons() {
    const {col, dir} = State.getTableSort();
    document.querySelectorAll('thead th.th-sortable').forEach(th => {
      const c = th.dataset.col;
      const icon = th.querySelector('.sort-icon');
      th.classList.toggle('sorted', c===col);
      if (icon) icon.textContent = c===col ? (dir==='asc'?' ↑':' ↓') : '';
    });
  }

  // ── Tabelas de resumo ─────────────────────────────────

  function renderSummaryTables() {
    const data = State.getFilteredData();
    const siglaLabel = typeof Filters !== 'undefined' ? Filters.siglaLabel : s => s;

    // Helper: agrega
    function agg(keyFn, labelFn) {
      const map = {};
      data.forEach(r => {
        const k = keyFn(r);
        if (!map[k]) map[k] = { label: labelFn ? labelFn(r,k) : k, total:0, qtde:0 };
        map[k].total += r.Valor;
        map[k].qtde++;
      });
      return Object.values(map).sort((a,b)=>b.total-a.total);
    }

    // Classificação
    _fillSummaryTable('tabClassificacao',
      agg(r=>r.Classificacao||'--'),
      ['Classificacao','Qtde','Total'],
      row => [row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]
    );

    // Mês/Ano
    _fillSummaryTable('tabMes',
      agg(r=>`${String(r.Ano||'--')}-${String(r.Mes||'--').padStart(2,'0')}`, (r)=>`${fmtMes(r.Mes)}/${r.Ano}`),
      ['Mes / Ano','Qtde','Total'],
      row => [row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]
    );

    // Tipo
    _fillSummaryTable('tabTipo',
      agg(r=>r.Tipo||'--'),
      ['Tipo','Qtde','Total'],
      row => [row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]
    );

    // Despesa
    _fillSummaryTable('tabDespesa',
      agg(r=>r.Despesa||'--'),
      ['Despesa','Qtde','Total'],
      row => [row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]
    );

    // Local
    const localData = agg(r=>r.Sigla||'--', (r,k)=>k);
    _fillSummaryTable('tabLocal',
      localData.map(r=>({...r, nome: siglaLabel(r.label)})),
      ['Sigla','Secretaria','Qtde','Total'],
      row => [row.label, row.nome, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)]
    );
  }

  function _fillSummaryTable(tableId, rows, headers, cellFn) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Sem dados</td></tr>`;
      return;
    }

    const total = rows.reduce((s,r)=>s+r.total, 0);
    const frag  = document.createDocumentFragment();

    rows.forEach(row => {
      const tr = document.createElement('tr');
      const cells = cellFn(row);
      tr.innerHTML = cells.map((c, i) => {
        const isNum = i > 0;
        return `<td class="${isNum?'tr':''}">${c}</td>`;
      }).join('');
      frag.appendChild(tr);
    });

    // Linha de total
    const totRow = document.createElement('tr');
    totRow.className = 'resumo-total-row';
    const cells = cellFn({label:'TOTAL', nome:'', qtde: rows.reduce((s,r)=>s+r.qtde,0), total });
    totRow.innerHTML = cells.map((c,i)=>`<td class="${i>0?'tr':''}" style="font-weight:800">${i===0?'TOTAL':c}</td>`).join('');
    frag.appendChild(totRow);

    tbody.innerHTML='';
    tbody.appendChild(frag);
  }

  // ── Export CSV ────────────────────────────────────────

  function exportCSV() {
    let rows = applySearchAndColFilters(State.getFilteredData());
    rows = applySort(rows);
    if (!rows.length) { typeof App !== 'undefined' && App.showToast('warn','Sem dados para exportar'); return; }

    const headers = ['Empresa','Sigla','Centro de Custo','Departamento','Despesa','Modelo','Classificacao','Tipo','Placa','Valor','Liquidado','Mes','Ano','Contrato'];
    const lines = [headers.join(';')];
    rows.forEach(r => {
      lines.push([
        r.Empresa,r.Sigla,r.CentroCusto,r.Departamento,
        r.Despesa,r.Modelo,r.Classificacao,r.Tipo,r.Placa,
        String(r.Valor||0).replace('.',','),
        r.Liquidado ? String(r.Liquidado).replace('.',',') : '',
        r.Mes, r.Ano, r.Contrato,
      ].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(';'));
    });

    const blob = new Blob(['\uFEFF'+lines.join('\n')], {type:'text/csv;charset=utf-8;'});
    const a = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:`despesas_${new Date().toISOString().slice(0,10)}.csv`});
    a.click();
    URL.revokeObjectURL(a.href);
    typeof App !== 'undefined' && App.showToast('success','CSV exportado',`${rows.length.toLocaleString('pt-BR')} registros`);
  }

  // ── Events ────────────────────────────────────────────

  function bindEvents() {
    document.querySelectorAll('thead th.th-sortable').forEach(th =>
      th.addEventListener('click', () => { State.setTableSort(th.dataset.col); renderTable(); })
    );

    const input  = document.getElementById('tableSearch');
    const clrBtn = document.getElementById('searchClear');
    const srchBt = document.getElementById('searchBtn');

    const doSearch = () => {
      State.setTableSearch(input?.value||'');
      State.setTablePage(1);
      renderTable();
      clrBtn?.classList.toggle('visivel', !!(input?.value));
    };

    input?.addEventListener('input', doSearch);
    input?.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(); });
    clrBtn?.addEventListener('click', () => { if(input){input.value='';input.focus();} State.setTableSearch(''); State.setTablePage(1); renderTable(); clrBtn.classList.remove('visivel'); });
    srchBt?.addEventListener('click', doSearch);

    document.getElementById('tablePageSize')?.addEventListener('change', e => { State.setTablePageSize(e.target.value); renderTable(); });
  }

  return { renderTable, renderSummaryTables, bindEvents, exportCSV };
})();