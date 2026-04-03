/**
 * tables.js — Tabela v2.0
 * Busca inline, ordenacao, paginacao, exportacao CSV.
 */

const Tables = (() => {

  // ── Formatacao ────────────────────────────────────────

  function fmtBRL(v) {
    if (!v && v !== 0) return '--';
    return Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }

  function fmtMes(m) {
    return CONFIG.MESES[m] || String(m);
  }

  function tipoBadge(tipo) {
    const t = String(tipo).toLowerCase();
    if (t === 'veiculo' || t === 'veículo') return `<span class="badge badge-veiculo">Veiculo</span>`;
    if (t === 'maquina' || t === 'máquina') return `<span class="badge badge-maquina">Maquina</span>`;
    return `<span class="badge">${tipo}</span>`;
  }

  function despesaBadge(d) {
    const lower = String(d).toLowerCase();
    if (lower.startsWith('combust')) return `<span class="badge badge-combustivel">${d}</span>`;
    if (lower.startsWith('manut'))   return `<span class="badge badge-manutencao">${d}</span>`;
    return `<span class="badge">${d}</span>`;
  }

  // ── Busca ─────────────────────────────────────────────

  function getSearchTerm() {
    return State.getTableSearch();
  }

  function applySearch(rows) {
    const term = getSearchTerm();
    if (!term) return rows;
    return rows.filter(r => {
      return (
        r.Placa?.toLowerCase().includes(term)         ||
        r.Modelo?.toLowerCase().includes(term)        ||
        r.Departamento?.toLowerCase().includes(term)  ||
        r.Classificacao?.toLowerCase().includes(term) ||
        r.Sigla?.toLowerCase().includes(term)         ||
        r.Empresa?.toLowerCase().includes(term)       ||
        r.Contrato?.toLowerCase().includes(term)
      );
    });
  }

  // ── Ordenacao ─────────────────────────────────────────

  function applySort(rows) {
    const { col, dir } = State.getTableSort();
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      let va = a[col], vb = b[col];
      if (typeof va === 'number' && typeof vb === 'number') {
        return dir === 'asc' ? va - vb : vb - va;
      }
      va = String(va || '').toLowerCase();
      vb = String(vb || '').toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ?  1 : -1;
      return 0;
    });
  }

  // ── Renderizacao ──────────────────────────────────────

  function renderTable() {
    const tbody  = document.getElementById('tableBody');
    const info   = document.getElementById('tableInfo');
    const pag    = document.getElementById('tablePagination');
    const footTv = document.getElementById('tableFooterTotal');
    if (!tbody) return;

    let rows = State.getFilteredData();
    rows = applySearch(rows);
    rows = applySort(rows);

    const total     = rows.length;
    const pageSize  = State.getTablePageSize();
    const page      = Math.max(1, Math.min(State.getTablePage(), Math.ceil(total / pageSize) || 1));
    State.setTablePage(page);

    const start    = (page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    // Atualiza total financeiro da pagina atual
    const totalValor = rows.reduce((s, r) => s + r.Valor, 0);
    if (footTv) footTv.textContent = fmtBRL(totalValor);

    // Info
    if (info) {
      info.textContent = total
        ? `Exibindo ${start+1}–${Math.min(start+pageSize, total)} de ${total.toLocaleString('pt-BR')} registros`
        : 'Nenhum registro encontrado';
    }

    // Sem dados
    if (!pageRows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">
            <div class="table-estado">
              <div class="table-estado-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <span>${State.getRawData().length ? 'Nenhum registro corresponde aos filtros' : 'Nenhum dado carregado'}</span>
            </div>
          </td>
        </tr>`;
      if (pag) pag.innerHTML = '';
      return;
    }

    // Linhas
    const fragment = document.createDocumentFragment();
    pageRows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-mono" style="font-weight:700;color:var(--accent)">${r.Sigla || '--'}</td>
        <td class="td-truncate" title="${r.Departamento || ''}" style="max-width:160px">${r.Departamento || '--'}</td>
        <td>${despesaBadge(r.Despesa)}</td>
        <td>${tipoBadge(r.Tipo)}</td>
        <td class="td-mono">${r.Placa || '--'}</td>
        <td class="td-truncate" title="${r.Modelo || ''}" style="max-width:150px">${r.Modelo || '--'}</td>
        <td class="td-truncate" title="${r.Classificacao || ''}" style="max-width:160px">${r.Classificacao || '--'}</td>
        <td class="td-number" style="font-weight:700">${fmtBRL(r.Valor)}</td>
        <td class="td-number" style="color:var(--text-muted)">${r.Liquidado ? fmtBRL(r.Liquidado) : '--'}</td>
        <td style="white-space:nowrap">${fmtMes(r.Mes)}</td>
        <td style="font-weight:600">${r.Ano || '--'}</td>
      `;
      fragment.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);

    // Paginacao
    renderPagination(page, Math.ceil(total / pageSize), pag);

    // Atualiza icones de ordenacao
    updateSortIcons();
  }

  function renderPagination(current, totalPages, container) {
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const btns = [];
    const add  = (label, pg, active = false, disabled = false) => {
      btns.push(`<button ${disabled?'disabled':''} ${active?'class="ativa"':''} data-pg="${pg}" aria-label="Pagina ${pg}" ${active?'aria-current="page"':''}>${label}</button>`);
    };

    add('&laquo;', 1,          false, current === 1);
    add('&lsaquo;', current-1, false, current === 1);

    const WINDOW = 2;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= current-WINDOW && p <= current+WINDOW)) {
        add(p, p, p === current);
      } else if (p === current-WINDOW-1 || p === current+WINDOW+1) {
        btns.push(`<button disabled style="pointer-events:none;opacity:.5">...</button>`);
      }
    }

    add('&rsaquo;', current+1, false, current === totalPages);
    add('&raquo;',  totalPages,false, current === totalPages);

    container.innerHTML = `<div class="paginacao-btns">${btns.join('')}</div>`;
    container.querySelectorAll('button[data-pg]').forEach(btn => {
      btn.addEventListener('click', () => {
        State.setTablePage(parseInt(btn.dataset.pg));
        renderTable();
        // Scroll suave para o topo da tabela
        document.getElementById('secaoRegistros')?.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    });
  }

  function updateSortIcons() {
    const { col, dir } = State.getTableSort();
    document.querySelectorAll('thead th.th-sortable').forEach(th => {
      const c = th.dataset.col;
      const icon = th.querySelector('.sort-icon');
      th.classList.toggle('sorted', c === col);
      if (icon) {
        icon.textContent = c === col ? (dir === 'asc' ? ' ↑' : ' ↓') : '';
      }
    });
  }

  // ── Exportacao CSV ────────────────────────────────────

  function exportCSV() {
    let rows = State.getFilteredData();
    rows = applySearch(rows);
    rows = applySort(rows);

    if (!rows.length) {
      if (typeof App !== 'undefined') App.showToast('warn', 'Sem dados para exportar', 'Aplique filtros que retornem registros');
      return;
    }

    const headers = ['Empresa','Sigla','Centro de Custo','Departamento','Despesa','Modelo','Classificacao','Tipo','Placa','Valor','Liquidado','Mes','Ano','Contrato'];
    const lines   = [headers.join(';')];
    rows.forEach(r => {
      lines.push([
        r.Empresa, r.Sigla, r.CentroCusto, r.Departamento,
        r.Despesa, r.Modelo, r.Classificacao, r.Tipo, r.Placa,
        String(r.Valor).replace('.',','),
        r.Liquidado ? String(r.Liquidado).replace('.',',') : '',
        r.Mes, r.Ano, r.Contrato,
      ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(';'));
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `despesas_frota_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof App !== 'undefined') App.showToast('success', 'CSV exportado', `${rows.length.toLocaleString('pt-BR')} registros`);
  }

  // ── Event bindings ────────────────────────────────────

  function bindEvents() {
    // Cabecalhos clicaveis para ordenacao
    document.querySelectorAll('thead th.th-sortable').forEach(th => {
      th.addEventListener('click', () => {
        State.setTableSort(th.dataset.col);
        renderTable();
      });
    });

    // Busca
    const input    = document.getElementById('tableSearch');
    const clearBtn = document.getElementById('searchClear');
    const searchBt = document.getElementById('searchBtn');

    const doSearch = () => {
      State.setTableSearch(input?.value || '');
      State.setTablePage(1);
      renderTable();
      if (clearBtn) clearBtn.classList.toggle('visivel', !!(input?.value));
    };

    input?.addEventListener('input',   doSearch);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    clearBtn?.addEventListener('click', () => {
      if (input) { input.value = ''; input.focus(); }
      State.setTableSearch('');
      State.setTablePage(1);
      renderTable();
      clearBtn.classList.remove('visivel');
    });
    searchBt?.addEventListener('click', doSearch);

    // Registros por pagina
    document.getElementById('tablePageSize')?.addEventListener('change', e => {
      State.setTablePageSize(e.target.value);
      renderTable();
    });
  }

  return { renderTable, bindEvents, exportCSV };
})();