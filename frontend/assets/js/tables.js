/**
 * tables.js
 * Renderiza a tabela de registros com:
 *  - Paginação client-side
 *  - Ordenação por coluna (clique no cabeçalho)
 *  - Exportação para CSV
 *
 * Não acessa a API — recebe o array de registros já filtrados.
 */

const Tables = (() => {

  // Estado interno da tabela
  let _dados       = [];
  let _paginaAtual = 1;
  let _porPagina   = 25;
  let _ordemCol    = 'valor';
  let _ordemDir    = 'desc'; // 'asc' | 'desc'

  // IDs dos elementos no HTML
  const ID_CORPO      = 'tabela-corpo';
  const ID_PAGINACAO  = 'paginacao-principal';
  const ID_BTN_CSV    = 'btn-exportar-tabela';

  // Definição das colunas
  const COLUNAS = [
    { campo: 'sigla',         rotulo: 'Sigla',          formato: null },
    { campo: 'departamento',  rotulo: 'Departamento',   formato: null },
    { campo: 'despesa',       rotulo: 'Despesa',        formato: 'badge-despesa' },
    { campo: 'classificacao', rotulo: 'Classificação',  formato: null },
    { campo: 'tipo',          rotulo: 'Tipo',           formato: 'badge-tipo' },
    { campo: 'placa',         rotulo: 'Placa',          formato: null },
    { campo: 'mes',           rotulo: 'Mês',            formato: 'mes' },
    { campo: 'ano',           rotulo: 'Ano',            formato: null },
    { campo: 'valor',         rotulo: 'Valor',          formato: 'moeda', align: 'right' },
  ];

  // ── API pública ───────────────────────────────────────────────────

  /**
   * Renderiza a tabela com novos dados.
   * Reinicia na página 1 e mantém a ordenação atual.
   * @param {Array} dados - registros retornados pela API
   */
  function renderizar(dados) {
    _dados       = Array.isArray(dados) ? dados : [];
    _paginaAtual = 1;
    _ordenar();
    _renderTabela();
    _renderPaginacao();
    _registrarListeners();
    _registrarBtnCsv();
  }

  // ── Renderização ─────────────────────────────────────────────────

  function _renderTabela() {
    const tbody = document.getElementById(ID_CORPO);
    if (!tbody) return;

    const inicio  = (_paginaAtual - 1) * _porPagina;
    const pagina  = _dados.slice(inicio, inicio + _porPagina);

    if (pagina.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${COLUNAS.length}" class="estado-vazio" style="text-align:center; padding: 32px;">
            Nenhum registro encontrado para os filtros selecionados.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = pagina.map(_renderLinha).join('');
  }

  function _renderLinha(registro) {
    const celulas = COLUNAS.map(col => {
      const val  = registro[col.campo];
      const html = _formatarCelula(val, col.formato);
      const align = col.align === 'right' ? 'style="text-align:right"' : '';
      return `<td class="${col.align === 'right' ? 'col-valor' : ''}" ${align}>${html}</td>`;
    });
    return `<tr>${celulas.join('')}</tr>`;
  }

  function _formatarCelula(val, formato) {
    if (val === null || val === undefined || val === '') return '<span class="text-muted">—</span>';

    switch (formato) {
      case 'moeda':
        return _fmtMoeda(val);

      case 'mes':
        return _fmtMes(val);

      case 'badge-despesa': {
        const cls = String(val).toLowerCase().includes('combustível')
          ? 'badge-combustivel' : 'badge-manutencao';
        return `<span class="badge ${cls}">${val}</span>`;
      }

      case 'badge-tipo': {
        const cls = String(val).toLowerCase() === 'veículo' ? 'badge-veiculo' : 'badge-maquina';
        return `<span class="badge ${cls}">${val}</span>`;
      }

      default:
        return _escaparHtml(String(val));
    }
  }

  // ── Paginação ─────────────────────────────────────────────────────

  function _renderPaginacao() {
    const container = document.getElementById(ID_PAGINACAO);
    if (!container) return;

    const total       = _dados.length;
    const totalPag    = Math.ceil(total / _porPagina);
    const inicio      = (_paginaAtual - 1) * _porPagina + 1;
    const fim         = Math.min(_paginaAtual * _porPagina, total);

    if (total === 0) {
      container.innerHTML = '';
      return;
    }

    // Gera botões de página (máximo 5 visíveis)
    const botoes = _gerarBotoesPaginacao(totalPag);

    container.innerHTML = `
      <span class="text-muted text-sm">
        ${_fmtNum(inicio)}–${_fmtNum(fim)} de ${_fmtNum(total)} registros
      </span>
      <div class="paginacao-controles">
        <button class="paginacao-btn" data-pag="prev" ${_paginaAtual === 1 ? 'disabled' : ''}>
          ‹
        </button>
        ${botoes}
        <button class="paginacao-btn" data-pag="next" ${_paginaAtual === totalPag ? 'disabled' : ''}>
          ›
        </button>
      </div>
    `;

    // Listeners dos botões de página
    container.querySelectorAll('.paginacao-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pag = btn.dataset.pag;
        if (pag === 'prev' && _paginaAtual > 1) {
          _paginaAtual--;
        } else if (pag === 'next' && _paginaAtual < totalPag) {
          _paginaAtual++;
        } else if (!isNaN(pag)) {
          _paginaAtual = parseInt(pag);
        }
        _renderTabela();
        _renderPaginacao();
      });
    });
  }

  function _gerarBotoesPaginacao(totalPag) {
    if (totalPag <= 7) {
      return Array.from({ length: totalPag }, (_, i) => _btnPag(i + 1)).join('');
    }

    const paginas = new Set([1, totalPag, _paginaAtual]);
    if (_paginaAtual > 1) paginas.add(_paginaAtual - 1);
    if (_paginaAtual < totalPag) paginas.add(_paginaAtual + 1);

    const ordenadas = [...paginas].sort((a, b) => a - b);
    let html = '';
    let anterior = 0;

    ordenadas.forEach(p => {
      if (p - anterior > 1) html += '<span style="padding:0 4px;color:var(--texto-terciario)">…</span>';
      html += _btnPag(p);
      anterior = p;
    });

    return html;
  }

  function _btnPag(n) {
    return `<button class="paginacao-btn ${n === _paginaAtual ? 'ativo' : ''}" data-pag="${n}">${n}</button>`;
  }

  // ── Ordenação ─────────────────────────────────────────────────────

  function _ordenar() {
    _dados.sort((a, b) => {
      const va = a[_ordemCol];
      const vb = b[_ordemCol];

      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va || '').localeCompare(String(vb || ''), 'pt-BR');
      }

      return _ordemDir === 'asc' ? cmp : -cmp;
    });
  }

  function _registrarListeners() {
    const tabela = document.getElementById('tabela-principal');
    if (!tabela) return;

    tabela.querySelectorAll('th[data-col]').forEach(th => {
      // Remove listener anterior clonando o nó
      const novo = th.cloneNode(true);
      th.parentNode.replaceChild(novo, th);

      novo.addEventListener('click', () => {
        const col = novo.dataset.col;
        if (_ordemCol === col) {
          _ordemDir = _ordemDir === 'asc' ? 'desc' : 'asc';
        } else {
          _ordemCol = col;
          _ordemDir = 'desc';
        }
        _ordenar();
        _paginaAtual = 1;
        _renderTabela();
        _renderPaginacao();

        // Indicador visual de ordenação
        tabela.querySelectorAll('th[data-col]').forEach(h => {
          h.textContent = h.textContent.replace(' ▲', '').replace(' ▼', '');
        });
        novo.textContent += _ordemDir === 'asc' ? ' ▲' : ' ▼';
      });
    });
  }

  // ── Exportação CSV ────────────────────────────────────────────────

  function _registrarBtnCsv() {
    const btn = document.getElementById(ID_BTN_CSV);
    if (!btn) return;

    const novo = btn.cloneNode(true);
    btn.parentNode.replaceChild(novo, btn);

    novo.addEventListener('click', exportarCsv);
  }

  /**
   * Exporta os dados filtrados (não apenas a página atual) para CSV.
   */
  function exportarCsv() {
    if (_dados.length === 0) return;

    const cabecalho = COLUNAS.map(c => `"${c.rotulo}"`).join(',');
    const linhas    = _dados.map(r =>
      COLUNAS.map(c => {
        const val = r[c.campo];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv    = [cabecalho, ...linhas].join('\n');
    const bom    = '\uFEFF'; // BOM para Excel abrir corretamente em PT-BR
    const blob   = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const link   = document.createElement('a');
    const filtros = Filters.descricaoFiltrosAtivos().replace(/[^a-z0-9]/gi, '_').toLowerCase();

    link.href     = url;
    link.download = `gastos_${filtros}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Formatadores ─────────────────────────────────────────────────

  const MESES_ABREV = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  function _fmtMoeda(v) {
    return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _fmtMes(v) {
    return MESES_ABREV[parseInt(v)] || v;
  }

  function _fmtNum(v) {
    return Number(v).toLocaleString('pt-BR');
  }

  function _escaparHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    renderizar,
    exportarCsv,
  };

})();
