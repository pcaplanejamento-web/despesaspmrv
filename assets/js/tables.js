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
      btns.push(`<button ${disabled?'disabled':''} ${active?'class="ativa"':''} data-pg="${pg}">${label}</button>`);
    add('«',1,false,current===1); add('‹',current-1,false,current===1);
    const W=2;
    for(let p=1;p<=totalPages;p++){
      if(p===1||p===totalPages||(p>=current-W&&p<=current+W)) add(p,p,p===current);
      else if(p===current-W-1||p===current+W+1) btns.push(`<button disabled style="pointer-events:none;opacity:.5">…</button>`);
    }
    add('›',current+1,false,current===totalPages); add('»',totalPages,false,current===totalPages);
    container.innerHTML=`<div class="paginacao-btns">${btns.join('')}</div>`;
    container.querySelectorAll('button[data-pg]').forEach(btn=>
      btn.addEventListener('click',()=>{ State.setTablePage(parseInt(btn.dataset.pg)); renderTable();
        document.getElementById('secaoRegistros')?.scrollIntoView({behavior:'smooth',block:'start'}); })
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

    const frag = document.createDocumentFragment();
    rows.forEach(row=>{
      const tr = document.createElement('tr');
      const cells = cellFn(row);
      tr.innerHTML = cells.map((c,i)=>`<td class="${i>0?'tr':''}">${c}</td>`).join('');
      frag.appendChild(tr);
    });

    // Linha de total
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