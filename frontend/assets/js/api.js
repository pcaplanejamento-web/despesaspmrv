/**
 * api.js — Integração com Google Apps Script
 *
 * Responsabilidades:
 * - Realizar requisições ao endpoint (parâmetro: ?rota=dados)
 * - Normalizar a resposta JSON para o modelo interno
 * - Gerenciar cache via State (evita requisições desnecessárias)
 * - Atualizar indicadores de status na interface
 *
 * Correções aplicadas (v1.1.1):
 * [1] _get(): adicionado `redirect: 'follow'` ao fetch — necessário para
 *     seguir os redirecionamentos 302 emitidos pelo Google Apps Script.
 * [2] normalizeRow(): fallback robusto para a chave 'Mês' com acento,
 *     usando escape Unicode (\u00eas) para evitar problemas de encoding.
 * [3] fetchFromApi(): filtro de cabeçalho reescrito — agora descarta apenas
 *     linhas onde row[0] === 'Empresa' ou row[9] === 'Valor', preservando
 *     registros legítimos com Valor igual a zero ou string vazia.
 */

const Api = (() => {
  // ----- Status UI -----

  function setStatus(estado, mensagem) {
    const dot   = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    if (!dot || !label) return;
    dot.className = `status-dot status-${estado}`;
    label.textContent = mensagem;
  }

  function setLastSyncLabel(timestamp) {
    const el = document.getElementById('lastSyncLabel');
    if (!el) return;
    if (!timestamp) { el.textContent = ''; return; }
    const d = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    el.textContent = `Atualizado às ${hh}:${mm}`;
  }

  function setSyncButtonLoading(loading) {
    const btn = document.getElementById('btnSync');
    if (!btn) return;
    const icon = btn.querySelector('.sync-icon');
    if (loading) {
      btn.disabled = true;
      btn.classList.add('btn-sync--loading');
      if (icon) icon.classList.add('spin');
    } else {
      btn.disabled = false;
      btn.classList.remove('btn-sync--loading');
      if (icon) icon.classList.remove('spin');
    }
  }

  // ----- Requisição com timeout -----

  async function _get(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

    try {
      // [CORREÇÃO 1] redirect: 'follow' é obrigatório para o Apps Script.
      // O GAS emite um redirecionamento 302 antes de entregar o conteúdo;
      // sem este parâmetro o fetch falha silenciosamente com erro de rede.
      const response = await fetch(url, {
        signal:   controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      if (json && json.status === 'erro') {
        throw new Error(json.mensagem || 'Erro desconhecido na API');
      }

      return json;

    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Tempo limite excedido. Verifique a conexão.');
      }
      throw err;
    }
  }

  // ----- Normalização de linha -----

  function normalizeRow(row) {
    // Suporta tanto array posicional quanto objeto com chaves
    if (Array.isArray(row)) {
      return {
        Empresa:       String(row[0]  || '').trim(),
        Sigla:         String(row[1]  || '').trim(),
        CentroCusto:   String(row[2]  || '').trim(),
        Departamento:  String(row[3]  || '').trim(),
        Despesa:       String(row[4]  || '').trim(),
        Modelo:        String(row[5]  || '').trim(),
        Classificacao: String(row[6]  || '').trim(),
        Tipo:          String(row[7]  || '').trim(),
        Placa:         String(row[8]  || '').trim().toUpperCase(),
        Valor:         parseFloat(String(row[9]  || '0').replace(',', '.')) || 0,
        Liquidado:     parseFloat(String(row[10] || '0').replace(',', '.')) || 0,
        Mes:           parseInt(row[11], 10) || 0,
        Ano:           parseInt(row[12], 10) || 0,
        Contrato:      String(row[13] || '').trim(),
      };
    }

    // [CORREÇÃO 2] A chave 'Mês' (com acento) pode ser serializada de formas
    // distintas dependendo do encoding adotado pelo Apps Script / JSON.stringify.
    // Testamos todas as variantes conhecidas antes de cair no fallback numérico.
    const mesRaw =
      row['M\u00eas']   ||   // 'Mês' via escape Unicode — mais seguro
      row['Mês']        ||   // literal UTF-8 (quando o arquivo está em UTF-8)
      row['Mes']        ||   // sem acento (normalização prévia do GAS)
      row.mes           ||   // camelCase
      row.month         ||   // chave em inglês (improvável, mas defensivo)
      0;

    // Resposta como objeto com chaves
    return {
      Empresa:       String(row.Empresa       || row.empresa       || '').trim(),
      Sigla:         String(row.Sigla         || row.sigla         || '').trim(),
      CentroCusto:   String(row['Centro de Custo'] || row['centro de custo'] || row.centroCusto || '').trim(),
      Departamento:  String(row.Departamento  || row.departamento  || '').trim(),
      Despesa:       String(row.Despesa       || row.despesa       || '').trim(),
      Modelo:        String(row.Modelo        || row.modelo        || '').trim(),
      Classificacao: String(row['Classifica\u00e7\u00e3o'] || row['Classificação'] || row.Classificacao || row.classificacao || '').trim(),
      Tipo:          String(row.Tipo          || row.tipo          || '').trim(),
      Placa:         String(row.Placa         || row.placa         || '').trim().toUpperCase(),
      Valor:         parseFloat(String(row.Valor     || row.valor     || '0').replace(',', '.')) || 0,
      Liquidado:     parseFloat(String(row.Liquidado || row.liquidado || '0').replace(',', '.')) || 0,
      Mes:           parseInt(mesRaw, 10) || 0,
      Ano:           parseInt(row.Ano         || row.ano           || 0, 10) || 0,
      Contrato:      String(row.Contrato      || row.contrato      || '').trim(),
    };
  }

  // ----- Extração do array de dados da resposta -----

  function extractRows(json) {
    if (Array.isArray(json))                    return json;
    if (json && Array.isArray(json.dados))      return json.dados;
    if (json && Array.isArray(json.registros))  return json.registros;
    if (json && Array.isArray(json.data))       return json.data;
    return [];
  }

  // ----- Busca principal com cache -----

  async function fetchFromApi(forceRefresh = false) {
    if (!forceRefresh && State.isCacheValid() && State.hasData()) {
      return State.getRawData();
    }

    setStatus('loading', 'Carregando...');
    setSyncButtonLoading(true);

    try {
      const url = `${CONFIG.API_URL}?rota=dados`;
      const json = await _get(url);
      const rows = extractRows(json);

      // [CORREÇÃO 3] A lógica anterior descartava qualquer linha cujo índice [9]
      // não fosse um número válido — eliminando registros com Valor = "" ou 0.
      // Agora descartamos apenas linhas que são explicitamente cabeçalho:
      // row[0] === 'Empresa'  →  linha de cabeçalho de texto
      // row[9] === 'Valor'    →  linha de cabeçalho de texto (coluna Valor)
      const dataRows = rows.filter(row => {
        if (!Array.isArray(row)) return true;           // objetos passam sempre
        if (row[0] === 'Empresa') return false;         // descarta cabeçalho
        if (row[9] === 'Valor')   return false;         // descarta cabeçalho alternativo
        return true;                                    // preserva todos os dados, incluindo Valor = 0
      });

      const normalized = dataRows.map(normalizeRow);
      State.setRawData(normalized);

      setStatus('connected', 'Conectado');
      setLastSyncLabel(State.getLastSyncAt());
      setSyncButtonLoading(false);

      return normalized;

    } catch (err) {
      console.error('[API] Erro ao buscar dados:', err.message);
      setStatus('error', 'Erro de conexão');
      setSyncButtonLoading(false);
      throw err;
    }
  }

  /**
   * Retorna valores únicos para os filtros, derivados do dataset em cache.
   * Não faz chamada à API — opera sobre dados já carregados.
   */
  function getFilterOptions() {
    const data = State.getRawData();
    const unique = (arr) => [...new Set(arr.filter(Boolean))].sort();

    return {
      anos:        unique(data.map(r => String(r.Ano))),
      meses:       [...new Set(data.map(r => r.Mes).filter(m => m > 0))].sort((a, b) => a - b),
      despesas:    unique(data.map(r => r.Despesa)),
      tipos:       unique(data.map(r => r.Tipo)),
      secretarias: unique(data.map(r => r.Sigla)),
      empresas:    unique(data.map(r => r.Empresa)),
    };
  }

  return { fetchFromApi, getFilterOptions, setStatus };
})();