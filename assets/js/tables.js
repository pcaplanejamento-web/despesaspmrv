/**
 * tables.js — v4.0
 * Tabelas resumo + Registros Detalhados.
 * ResumoPainel: banner flutuante lateral ao clicar em linha de resumo.
 * Veículo clicável: abre modal de Registro de Despesa com histórico.
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

  // ── Tabelas Resumo ────────────────────────────────────────────────────────

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
    const resumoKey = tbl.dataset.resumo || null;

    if (!rows.length) {
      tbody.innerHTML=`<tr><td colspan="4" class="resumo-empty">Sem dados</td></tr>`;
      return;
    }

    const frag = document.createDocumentFragment();
    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.className = 'resumo-row-link';
      const cells = cellFn(row);
      tr.innerHTML = cells.map((c,i)=>`<td class="${i>0?'tr':''}">${c}</td>`).join('');
      if (resumoKey) {
        tr.title = 'Clique para ver as despesas deste grupo';
        tr.addEventListener('click', () => ResumoPainel.open(resumoKey, row.label));
      }
      frag.appendChild(tr);
    });

    // Linha de total — não clicável
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


// ═══════════════════════════════════════════════════════════════════════════
// ResumoPainel — Painel lateral flutuante (clique em linha de tabela resumo)
// ═══════════════════════════════════════════════════════════════════════════
const ResumoPainel = (() => {

  const LABEL_MAP = {
    Classificacao: 'Classificação',
    Mes:           'Período',
    Tipo:          'Tipo de Frota',
    Despesa:       'Tipo de Despesa',
    Sigla:         'Secretaria',
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function fmtBRL(v) {
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function fmtMes(m) { return CONFIG.MESES[m] || String(m||'--'); }
  function sl(sigla) {
    return typeof Filters !== 'undefined' ? Filters.siglaLabel(sigla||'') : (sigla||'--');
  }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function $id(id) { return document.getElementById(id); }

  // SVG icons inline (sem dependência de biblioteca externa)
  const SVG = {
    money:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    list:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    car:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    fuel:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M17 11h2a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0 2-2V7l-3-3"/><line x1="3" y1="22" x2="13" y2="22"/><line x1="8" y1="6" x2="8" y2="10"/></svg>`,
    wrench: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    history:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/></svg>`,
    org:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    chevD:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    close:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    ext:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  };

  // ── Filtrar registros pelo campo/valor clicado ────────────────────────────

  function _filterRecords(field, value) {
    const data = State.getFilteredData();
    if (field === 'Mes') {
      return data.filter(r => `${fmtMes(r.Mes)}/${r.Ano}` === value);
    }
    return data.filter(r => (r[field] || '--') === value);
  }

  // ── Construir KPI strip ───────────────────────────────────────────────────

  function _buildKpis(records) {
    const total  = records.reduce((s,r)=>s+r.Valor, 0);
    const qtde   = records.length;
    const placas = new Set(records.map(r=>r.Placa).filter(Boolean)).size;
    const comb   = records.filter(r=>(r.Despesa||'').toLowerCase().startsWith('comb')).reduce((s,r)=>s+r.Valor,0);
    const manut  = records.filter(r=>(r.Despesa||'').toLowerCase().startsWith('manut')).reduce((s,r)=>s+r.Valor,0);

    const kpis = [
      { icon: SVG.money,  label: 'Total',            val: fmtBRL(total),                    accent: true },
      { icon: SVG.list,   label: 'Registros',         val: qtde.toLocaleString('pt-BR'),     accent: false },
      { icon: SVG.car,    label: 'Veículos/Máquinas', val: placas.toString(),                accent: false },
    ];
    if (comb > 0)  kpis.push({ icon: SVG.fuel,   label: 'Combustível', val: fmtBRL(comb),  color: '#0891b2' });
    if (manut > 0) kpis.push({ icon: SVG.wrench, label: 'Manutenção',  val: fmtBRL(manut), color: '#d97706' });

    return `<div class="rp-kpi-grid">${kpis.map(k=>`
      <div class="rp-kpi">
        <span class="rp-kpi-icon">${k.icon}</span>
        <div class="rp-kpi-info">
          <span class="rp-kpi-label">${esc(k.label)}</span>
          <span class="rp-kpi-val${k.accent?' rp-kpi-accent':''}${k.color?'" style="color:'+k.color+'"':'"'}">${esc(k.val)}</span>
        </div>
      </div>`).join('')}</div>`;
  }

  // ── Construir tabela de veículos ──────────────────────────────────────────

  function _buildVeiculoTable(records) {
    // Agrupar por placa
    const map = {};
    records.forEach(r => {
      const placa = r.Placa || '--';
      if (!map[placa]) {
        map[placa] = {
          placa,
          modelo:      r.Modelo || '--',
          tipo:        r.Tipo   || '--',
          total: 0,
          qtde:  0,
          entries: [],
          siglas: new Set(),
          depts:  new Set(),
        };
      }
      map[placa].total += r.Valor;
      map[placa].qtde++;
      map[placa].entries.push(r);
      if (r.Sigla) map[placa].siglas.add(r.Sigla);
      if (r.Departamento) map[placa].depts.add(r.Departamento);
    });

    const sorted = Object.values(map).sort((a,b)=>b.total-a.total);
    if (!sorted.length) return `<p class="rp-vazio">Sem registros para esta seleção.</p>`;

    return sorted.map((v,vi) => {
      const isMaq = (v.tipo||'').toLowerCase().startsWith('m');
      const badge = isMaq
        ? `<span class="badge badge-maquina">Máquina</span>`
        : `<span class="badge badge-veiculo">Veículo</span>`;

      // Siglas que passou
      const siglasPills = [...v.siglas].map(s=>
        `<span class="rp-tag">${esc(s)}</span>`
      ).join('');

      // Histórico de despesas ordenado por data
      const hist = [...v.entries].sort((a,b)=>{
        const ka = `${a.Ano||0}-${String(a.Mes||0).padStart(2,'0')}`;
        const kb = `${b.Ano||0}-${String(b.Mes||0).padStart(2,'0')}`;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });

      const histRows = hist.map(d => {
        const isComb = (d.Despesa||'').toLowerCase().startsWith('comb');
        return `<tr>
          <td><span class="rp-mes-chip">${fmtMes(d.Mes).substring(0,3)}/${String(d.Ano||'').slice(2)}</span></td>
          <td>${isComb
            ? `<span class="badge badge-combustivel">${esc(d.Despesa||'--')}</span>`
            : `<span class="badge badge-manutencao">${esc(d.Despesa||'--')}</span>`}</td>
          <td class="tr rp-val-cell">${fmtBRL(d.Valor)}</td>
          <td class="rp-depto-cell" title="${esc(d.Departamento||'')}">${esc(d.Departamento||'--')}</td>
          <td class="rp-sigla-cell">${esc(d.Sigla||'--')}</td>
        </tr>`;
      }).join('');

      const uid = `rpvei-${vi}`;
      return `
        <div class="rp-veiculo-card" id="${uid}">
          <div class="rp-veiculo-header" data-target="${uid}">
            <div class="rp-veiculo-left">
              <span class="rp-placa">${esc(v.placa)}</span>
              <span class="rp-modelo" title="${esc(v.modelo)}">${esc(v.modelo)}</span>
              ${badge}
            </div>
            <div class="rp-veiculo-right">
              <span class="rp-veiculo-total">${fmtBRL(v.total)}</span>
              <span class="rp-veiculo-qtde">${v.qtde} reg.</span>
              <button class="rp-expand-btn" aria-expanded="false" aria-controls="${uid}-body" title="Expandir histórico">
                <span class="rp-expand-icon">${SVG.chevD}</span>
              </button>
            </div>
          </div>
          <div class="rp-veiculo-body" id="${uid}-body" hidden>
            <div class="rp-veiculo-siglas">
              <span class="rp-section-label">${SVG.org} Secretarias:</span>
              <div class="rp-tags-wrap">${siglasPills || '<span class="rp-tag-none">--</span>'}</div>
            </div>
            <div class="rp-hist-wrap">
              <span class="rp-section-label">${SVG.history} Histórico de despesas:</span>
              <div class="rp-hist-scroll">
                <table class="rp-hist-table">
                  <thead><tr><th>Período</th><th>Tipo</th><th class="tr">Valor</th><th>Departamento</th><th>Sigla</th></tr></thead>
                  <tbody>${histRows}</tbody>
                </table>
              </div>
            </div>
            <div class="rp-veiculo-actions">
              <button class="rp-btn-ficha" data-placa="${esc(v.placa)}">
                ${SVG.ext} Ver Ficha Completa
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Bind interações no painel ─────────────────────────────────────────────

  function _bindBody(bodyEl) {
    // Expand/collapse cartões de veículo
    bodyEl.querySelectorAll('.rp-veiculo-header').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const card   = hdr.closest('.rp-veiculo-card');
        const body   = card.querySelector('.rp-veiculo-body');
        const btn    = hdr.querySelector('.rp-expand-btn');
        const isOpen = !body.hidden;

        body.hidden = isOpen;
        btn.setAttribute('aria-expanded', !isOpen);
        card.classList.toggle('rp-card-open', !isOpen);
      });
    });

    // Botão "Ver Ficha Completa" — abre Veiculo.abrirFicha
    bodyEl.querySelectorAll('.rp-btn-ficha').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const placa = btn.dataset.placa;
        if (typeof Veiculo !== 'undefined' && placa && placa !== '--') {
          Veiculo.abrirFicha(placa);
        }
      });
    });
  }

  // ── Abrir painel ─────────────────────────────────────────────────────────

  function open(field, value) {
    const records = _filterRecords(field, value);
    if (!records.length) return;

    const catLabel = LABEL_MAP[field] || field;

    $id('rpBadge').textContent    = catLabel;
    $id('rpTitulo').textContent   = value;
    $id('rpSub').textContent      = `${records.length.toLocaleString('pt-BR')} registro${records.length !== 1 ? 's' : ''}`;
    $id('rpKpis').innerHTML       = _buildKpis(records);

    const bodyEl = $id('rpBody');
    bodyEl.innerHTML = _buildVeiculoTable(records);
    _bindBody(bodyEl);

    const painel = $id('rpPainel');
    painel.removeAttribute('aria-hidden');
    painel.classList.add('rp-open');
    document.body.classList.add('rp-body-lock');
  }

  // ── Fechar painel ────────────────────────────────────────────────────────

  function close() {
    const painel = $id('rpPainel');
    if (!painel) return;
    painel.classList.remove('rp-open');
    painel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('rp-body-lock');
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    $id('rpClose')?.addEventListener('click', close);
    $id('rpBackdrop')?.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $id('rpPainel')?.classList.contains('rp-open')) close();
    });
  }

  return { open, close, init };
})();
