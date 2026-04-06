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
      row=>[row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)],
      row=>`Classificação: ${row.label}`);

    // tabMes: precisamos guardar a key original ("2025-01") para o lookup
    const mesRows = (() => {
      const map = {};
      data.forEach(r => {
        const k = `${String(r.Ano||'--')}-${String(r.Mes||'--').padStart(2,'0')}`;
        if (!map[k]) map[k] = { label: `${fmtMes(r.Mes)}/${r.Ano}`, _key: k, total: 0, qtde: 0 };
        map[k].total += r.Valor; map[k].qtde++;
      });
      return Object.values(map).sort((a,b)=>b.total-a.total);
    })();
    _fill('tabMes', mesRows,
      row=>[row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)],
      row=>`Período: ${row.label}`);

    _fill('tabTipo', agg(r=>r.Tipo||'--'),
      row=>[row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)],
      row=>`Tipo: ${row.label}`);

    _fill('tabDespesa', agg(r=>r.Despesa||'--'),
      row=>[row.label, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)],
      row=>`Despesa: ${row.label}`);

    const localRows = agg(r=>r.Sigla||'--', (r,k)=>k).map(r=>({...r,nome:sl(r.label)}));
    _fill('tabLocal', localRows,
      row=>[row.label, row.nome, row.qtde.toLocaleString('pt-BR'), fmtBRL(row.total)],
      row=>`${row.label} — ${row.nome||''}`);
  }

  // ── Banner Flutuante de Resumo ────────────────────────────────────────────

  let _bannerEl = null;
  let _bannerTimer = null;

  function _getBanner() {
    if (!_bannerEl) {
      _bannerEl = document.createElement('div');
      _bannerEl.className = 'resumo-float-banner';
      _bannerEl.setAttribute('role', 'tooltip');
      _bannerEl.setAttribute('aria-live', 'polite');
      _bannerEl.innerHTML = `
        <button class="resumo-float-close" aria-label="Fechar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="resumo-float-body"></div>`;
      _bannerEl.querySelector('.resumo-float-close').addEventListener('click', _hideBanner);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') _hideBanner(); });
      document.addEventListener('click', e => {
        if (_bannerEl && !_bannerEl.contains(e.target) && !e.target.closest('.resumo-table tr')) _hideBanner();
      }, true);
      document.body.appendChild(_bannerEl);
    }
    return _bannerEl;
  }

  function _hideBanner() {
    if (_bannerTimer) { clearTimeout(_bannerTimer); _bannerTimer = null; }
    if (_bannerEl) { _bannerEl.classList.remove('visible'); }
  }

  function _showBanner(tr, title, items) {
    const banner = _getBanner();
    const body = banner.querySelector('.resumo-float-body');

    const rows = items.map(({ label, value, accent }) =>
      `<div class="resumo-float-row${accent ? ' accent' : ''}">
        <span class="resumo-float-label">${label}</span>
        <span class="resumo-float-value">${value}</span>
      </div>`
    ).join('');

    body.innerHTML = `<div class="resumo-float-title">${title}</div>${rows}`;

    // Posicionar relativo ao tr clicado
    const rect = tr.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    banner.style.visibility = 'hidden';
    banner.style.display = 'block';
    banner.classList.remove('visible');

    // Calcular posição após render
    requestAnimationFrame(() => {
      const bw = banner.offsetWidth;
      const bh = banner.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top = rect.bottom + scrollY + 6;
      let left = rect.left + scrollX + rect.width / 2 - bw / 2;

      // Não sair da tela
      if (left + bw > scrollX + vw - 12) left = scrollX + vw - bw - 12;
      if (left < scrollX + 12) left = scrollX + 12;
      if (rect.bottom + bh + 6 > vh) top = rect.top + scrollY - bh - 6;

      banner.style.top = `${top}px`;
      banner.style.left = `${left}px`;
      banner.style.visibility = '';
      banner.classList.add('visible');
    });

    if (_bannerTimer) clearTimeout(_bannerTimer);
    _bannerTimer = setTimeout(_hideBanner, 8000);
  }

  function _fill(tableId, rows, cellFn, bannerTitleFn) {
    const tbl = document.getElementById(tableId);
    if (!tbl) return;
    const tbody = tbl.querySelector('tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML=`<tr><td colspan="4" class="resumo-empty">Sem dados</td></tr>`;
      return;
    }

    const data = State.getFilteredData();

    const frag = document.createDocumentFragment();
    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = 'resumo-row-clickable';
      const cells = cellFn(row);
      tr.innerHTML = cells.map((c,i)=>`<td class="${i>0?'tr':''}">${c}</td>`).join('');

      tr.addEventListener('click', () => {
        // Filtrar registros relacionados a esta linha
        const rowData = _getRowRecords(tableId, row, data);
        const titleStr = bannerTitleFn ? bannerTitleFn(row) : (row.label || row.nome || '');

        // Calcular métricas dos registros filtrados
        const total = rowData.reduce((s, r) => s + (r.Valor || 0), 0);
        const qtde  = rowData.length;

        // Distribuição por despesa
        const porDespesa = {};
        const porTipo = {};
        rowData.forEach(r => {
          const d = r.Despesa || 'Sem tipo';
          const t = r.Tipo    || 'Sem tipo';
          porDespesa[d] = (porDespesa[d] || 0) + r.Valor;
          porTipo[t]    = (porTipo[t]    || 0) + r.Valor;
        });

        const items = [
          { label: 'Registros', value: qtde.toLocaleString('pt-BR') },
          { label: 'Total',     value: fmtBRL(total), accent: true },
        ];

        // Adicionar despesa breakdown se mais de 1 categoria
        const despKeys = Object.keys(porDespesa);
        if (despKeys.length > 1) {
          despKeys.sort((a,b) => porDespesa[b]-porDespesa[a]).forEach(k => {
            items.push({ label: k, value: fmtBRL(porDespesa[k]) });
          });
        }

        // Tipo breakdown se mais de 1
        const tipoKeys = Object.keys(porTipo);
        if (tipoKeys.length > 1) {
          tipoKeys.sort((a,b) => porTipo[b]-porTipo[a]).forEach(k => {
            items.push({ label: k, value: fmtBRL(porTipo[k]) });
          });
        }

        _showBanner(tr, titleStr, items);
      });

      frag.appendChild(tr);
    });

    // Linha de total
    const totRow = document.createElement('tr');
    totRow.className = 'resumo-total-row';
    const totalAmt = rows.reduce((s,r)=>s+r.total,0);
    const totalQtd = rows.reduce((s,r)=>s+r.qtde,0);
    const totCells = cellFn({label:'TOTAL',nome:'',qtde:totalQtd,total:totalAmt});
    totRow.innerHTML = totCells.map((c,i)=>`<td class="${i>0?'tr':''}">${i===0?'TOTAL':c}</td>`).join('');
    frag.appendChild(totRow);

    tbody.innerHTML='';
    tbody.appendChild(frag);
  }

  // Retorna os registros filtrados correspondentes à linha clicada
  function _getRowRecords(tableId, row, data) {
    switch (tableId) {
      case 'tabClassificacao':
        return data.filter(r => (r.Classificacao||'--') === row.label);
      case 'tabMes': {
        // row.label é "Janeiro/2025" etc; row.key é "2025-01"
        // Usamos o key diretamente
        const key = row._key;
        return key
          ? data.filter(r => `${String(r.Ano||'--')}-${String(r.Mes||'--').padStart(2,'0')}` === key)
          : [];
      }
      case 'tabTipo':
        return data.filter(r => (r.Tipo||'--') === row.label);
      case 'tabDespesa':
        return data.filter(r => (r.Despesa||'--') === row.label);
      case 'tabLocal':
        return data.filter(r => (r.Sigla||'--') === row.label);
      default:
        return [];
    }
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