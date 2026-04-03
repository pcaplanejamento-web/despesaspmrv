/**
 * tables.js — Tabela detalhada com paginação, ordenação e busca
 */

const Tables = (() => {
  // ----- Formatação -----

  function fBRL(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function badgeTipo(tipo) {
    const cls = tipo === 'Veículo' ? 'badge-veiculo' : 'badge-maquina';
    return `<span class="badge ${cls}">${tipo}</span>`;
  }

  function badgeDespesa(despesa) {
    const cls = despesa === 'Combustível' ? 'badge-combustivel' : 'badge-manutencao';
    return `<span class="badge ${cls}">${despesa}</span>`;
  }

  // ----- Ordenação -----

  function sortData(data) {
    const { col, dir } = State.getTableSort();
    if (!col) return data;

    return [...data].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      let cmp;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), 'pt-BR');
      }
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  // ----- Busca textual -----

  function searchData(data) {
    const term = State.getTableSearch();
    if (!term) return data;
    return data.filter(r =>
      r.Placa.toLowerCase().includes(term)       ||
      r.Modelo.toLowerCase().includes(term)      ||
      r.Departamento.toLowerCase().includes(term)||
      r.Sigla.toLowerCase().includes(term)
    );
  }

  // ----- Renderização da tabela -----

  function renderTable() {
    const filtered  = State.getFilteredData();
    const searched  = searchData(filtered);
    const sorted    = sortData(searched);
    const pageSize  = State.getTablePageSize();
    const page      = State.getTablePage();
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage  = Math.min(page, totalPages);
    if (safePage !== page) State.setTablePage(safePage);

    const start = (safePage - 1) * pageSize;
    const slice = sorted.slice(start, start + pageSize);

    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="12" class="table-empty">Nenhum registro encontrado para os filtros aplicados.</td></tr>';
    } else {
      tbody.innerHTML = slice.map(r => `
        <tr>
          <td>${r.Empresa}</td>
          <td><span class="sigla-badge">${r.Sigla}</span></td>
          <td>${r.Departamento}</td>
          <td>${badgeDespesa(r.Despesa)}</td>
          <td>${r.Modelo}</td>
          <td>${r.Classificacao}</td>
          <td>${badgeTipo(r.Tipo)}</td>
          <td class="td-mono">${r.Placa}</td>
          <td class="td-number">${fBRL(r.Valor)}</td>
          <td class="td-number">${r.Liquidado > 0 ? fBRL(r.Liquidado) : '—'}</td>
          <td>${CONFIG.MESES[r.Mes] || r.Mes}</td>
          <td>${r.Ano}</td>
        </tr>
      `).join('');
    }

    renderInfo(sorted.length, filtered.length, start, start + slice.length);
    renderPagination(safePage, totalPages);
    renderSortIcons();
  }

  // ----- Info -----

  function renderInfo(searched, filtered, from, to) {
    const el = document.getElementById('tableInfo');
    if (!el) return;
    if (!searched) { el.textContent = 'Nenhum registro'; return; }
    const showing = `Exibindo ${(from + 1).toLocaleString('pt-BR')}–${to.toLocaleString('pt-BR')} de ${searched.toLocaleString('pt-BR')}`;
    el.textContent = searched < filtered ? `${showing} (filtrado de ${filtered.toLocaleString('pt-BR')})` : showing;
  }

  // ----- Paginação -----

  function renderPagination(current, total) {
    const container = document.getElementById('tablePagination');
    if (!container) return;
    if (total <= 1) { container.innerHTML = ''; return; }

    const pages = [];
    const addPage = (p) => pages.push(p);
    const addEllipsis = () => pages.push('...');

    if (total <= 7) {
      for (let i = 1; i <= total; i++) addPage(i);
    } else {
      addPage(1);
      if (current > 3) addEllipsis();
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) addPage(i);
      if (current < total - 2) addEllipsis();
      addPage(total);
    }

    container.innerHTML = pages.map(p => {
      if (p === '...') return `<span class="page-ellipsis">...</span>`;
      const active = p === current ? 'page-btn--active' : '';
      return `<button class="page-btn ${active}" data-page="${p}" aria-label="Página ${p}" ${p === current ? 'aria-current="page"' : ''}>${p}</button>`;
    }).join('');

    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        State.setTablePage(Number(btn.dataset.page));
        renderTable();
      });
    });
  }

  // ----- Ícones de ordenação -----

  function renderSortIcons() {
    const { col, dir } = State.getTableSort();
    document.querySelectorAll('.th-sortable').forEach(th => {
      const icon = th.querySelector('.sort-icon');
      if (!icon) return;
      if (th.dataset.col === col) {
        icon.textContent = dir === 'asc' ? ' ▲' : ' ▼';
        th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
      } else {
        icon.textContent = '';
        th.removeAttribute('aria-sort');
      }
    });
  }

  // ----- Exportação CSV -----

  function exportCSV() {
    const data = searchData(State.getFilteredData());
    const headers = ['Empresa','Sigla','Departamento','Despesa','Modelo','Classificação','Tipo','Placa','Valor','Liquidado','Mês','Ano','Contrato'];
    const rows = data.map(r => [
      r.Empresa, r.Sigla, r.Departamento, r.Despesa, r.Modelo,
      r.Classificacao, r.Tipo, r.Placa,
      r.Valor.toFixed(2).replace('.', ','),
      r.Liquidado.toFixed(2).replace('.', ','),
      CONFIG.MESES[r.Mes] || r.Mes, r.Ano, r.Contrato,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `despesas_frota_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ----- Events -----

  function bindEvents() {
    // Ordenação por coluna
    document.querySelectorAll('.th-sortable').forEach(th => {
      th.addEventListener('click', () => {
        State.setTableSort(th.dataset.col);
        renderTable();
      });
    });

    // Tamanho de página
    const pageSizeEl = document.getElementById('tablePageSize');
    if (pageSizeEl) {
      pageSizeEl.addEventListener('change', () => {
        State.setTablePageSize(pageSizeEl.value);
        renderTable();
      });
    }

    // Busca com debounce
    let searchTimer;
    const searchEl = document.getElementById('tableSearch');
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          State.setTableSearch(searchEl.value);
          renderTable();
        }, 250);
      });
    }

    // Exportar CSV
    const csvBtn = document.getElementById('btnExportCSV');
    if (csvBtn) csvBtn.addEventListener('click', exportCSV);
  }

  return { renderTable, bindEvents };
})();
