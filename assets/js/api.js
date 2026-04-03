/**
 * api.js — Integração com Google Apps Script
 * v1.2.0
 *
 * BUGS CORRIGIDOS NESTA VERSÃO:
 *
 * [B1] _get(): redirect:'follow' já presente — mantido.
 *
 * [B2] _get(): response.json() lançava SyntaxError silencioso quando o GAS
 *      retorna HTML de erro (quota, autenticação). Agora detecta e relança
 *      com mensagem clara: "Resposta inesperada da API (não é JSON)".
 *
 * [B3] normalizeRow(): parseFloat(str.replace(',','.')) falhava com valores
 *      em formato brasileiro com separador de milhar, ex: "1.234,56" virava
 *      "1.234.56" → parseFloat lia apenas 1.234. Novo helper parseBRFloat()
 *      remove pontos de milhar antes de trocar a vírgula decimal por ponto.
 *
 * [B4] extractRows(): quando o GAS retorna string duplo-codificada
 *      (JSON.stringify aninhado), a função retornava [] silenciosamente.
 *      Agora detecta string e tenta JSON.parse antes de extrair.
 *      Adicionadas chaves 'rows' e 'values' (compatibilidade Sheets API v4).
 *
 * [B5] fetchFromApi(): quando normalized.length === 0 após parse, o sistema
 *      exibia "Conectado" + 0 registros sem nenhuma pista de diagnóstico.
 *      Agora emite console.warn detalhado com a resposta bruta da API.
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
      const response = await fetch(url, {
        signal:   controller.signal,
        redirect: 'follow',  // obrigatório para o redirecionamento 302 do GAS
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      // [B2] Isola o parse de JSON para dar mensagem de erro útil quando
      // o GAS retorna HTML (quota excedida, script não publicado, etc.)
      let json;
      try {
        json = await response.json();
      } catch (_) {
        throw new Error(
          'Resposta inesperada da API (não é JSON). ' +
          'Verifique se o Apps Script está publicado como Web App com acesso "Qualquer pessoa".'
        );
      }

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

  // ----- [B3] Parser numérico para formato pt-BR -----

  /**
   * Converte string de número em formato brasileiro para float.
   *   "1.234,56" → 1234.56   (milhar '.' + decimal ',')
   *   "1234,56"  → 1234.56   (decimal ',' sem milhar)
   *   "1234.56"  → 1234.56   (já no formato US / número puro)
   *   1234.56    → 1234.56   (já é number — retorna diretamente)
   */
  function parseBRFloat(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const s = String(val || '0')
      .trim()
      .replace(/[R$\s]/g, '')              // remove prefixo R$
      .replace(/\.(?=\d{3}(?:[,.]|$))/g, '') // remove separador de milhar '.'
      .replace(',', '.');                  // vírgula decimal → ponto
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // ----- Normalização de linha -----

  function normalizeRow(row) {
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
        Valor:         parseBRFloat(row[9]),   // [B3]
        Liquidado:     parseBRFloat(row[10]),  // [B3]
        Mes:           parseInt(row[11], 10) || 0,
        Ano:           parseInt(row[12], 10) || 0,
        Contrato:      String(row[13] || '').trim(),
      };
    }

    // Fallback robusto para 'Mês' — encoding do GAS pode variar
    const mesRaw =
      row['M\u00eas'] ||  // escape Unicode — mais portável
      row['Mês']      ||  // literal UTF-8
      row['Mes']      ||  // sem acento
      row.mes         ||
      row.month       ||
      0;

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
      Valor:         parseBRFloat(row.Valor    || row.valor),     // [B3]
      Liquidado:     parseBRFloat(row.Liquidado || row.liquidado || row.valorLiquidado), // [B3][B9] backend serializa como valorLiquidado
      Mes:           parseInt(mesRaw, 10) || 0,
      Ano:           parseInt(row.Ano || row.ano || 0, 10) || 0,
      Contrato:      String(row.Contrato || row.contrato || '').trim(),
    };
  }

  // ----- [B4] Extração do array de dados da resposta -----

  function extractRows(json) {
    // Desempacota string duplo-codificada (GAS às vezes serializa duas vezes)
    if (typeof json === 'string') {
      try { json = JSON.parse(json); } catch (_) { return []; }
    }

    if (Array.isArray(json))                                        return json;
    if (json && json.dados && Array.isArray(json.dados.registros)) return json.dados.registros; // [B8] resposta paginada do Router
    if (json && Array.isArray(json.dados))                         return json.dados;
    if (json && Array.isArray(json.registros))                     return json.registros;
    if (json && Array.isArray(json.data))       return json.data;
    if (json && Array.isArray(json.rows))       return json.rows;    // Sheets API
    if (json && Array.isArray(json.values))     return json.values;  // Sheets API v4
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
      const url  = `${CONFIG.API_URL}?rota=dados`;
      const json = await _get(url);

      // ── [DIAG] Ponto 1: estrutura bruta da resposta ──────────────────
      console.warn('[DIAG-1] Chaves de json:', Object.keys(json || {}));
      console.warn('[DIAG-1] json.status:', json?.status);
      console.warn('[DIAG-1] typeof json.dados:', typeof json?.dados);
      console.warn('[DIAG-1] Array.isArray(json.dados):', Array.isArray(json?.dados));
      if (json?.dados && typeof json.dados === 'object' && !Array.isArray(json.dados)) {
        console.warn('[DIAG-1] Chaves de json.dados:', Object.keys(json.dados));
        console.warn('[DIAG-1] Array.isArray(json.dados.registros):', Array.isArray(json?.dados?.registros));
        console.warn('[DIAG-1] json.dados.registros?.length:', json?.dados?.registros?.length);
      }
      // ────────────────────────────────────────────────────────────────

      const rows = extractRows(json);

      // ── [DIAG] Ponto 2: resultado do extractRows ─────────────────────
      console.warn('[DIAG-2] rows.length após extractRows:', rows.length);
      if (rows.length > 0) console.warn('[DIAG-2] Primeiro row (keys):', Object.keys(rows[0] || {}));
      // ────────────────────────────────────────────────────────────────

      // Descarta apenas linhas que são explicitamente cabeçalho textual
      const dataRows = rows.filter(row => {
        if (!Array.isArray(row)) return true;
        if (row[0] === 'Empresa') return false;
        if (row[9] === 'Valor')   return false;
        return true;
      });

      const normalized = dataRows.map(normalizeRow);

      // ── [DIAG] Ponto 3: resultado da normalização ────────────────────
      console.warn('[DIAG-3] normalized.length:', normalized.length);
      if (normalized.length > 0) {
        const p = normalized[0];
        console.warn('[DIAG-3] Primeiro registro normalizado:', {
          Empresa: p.Empresa, Sigla: p.Sigla, Despesa: p.Despesa,
          Valor: p.Valor, Mes: p.Mes, Ano: p.Ano
        });
      }
      // ────────────────────────────────────────────────────────────────

      // [B5] Diagnóstico quando 0 registros são retornados após parse
      if (normalized.length === 0) {
        console.warn(
          '[API] Atenção: nenhum registro foi normalizado.\n' +
          'Possíveis causas:\n' +
          '  • Chave de dados não reconhecida (esperado: "dados", "registros", "data", "rows" ou "values")\n' +
          '  • Colunas fora da ordem esperada (Empresa[0]…Ano[12])\n' +
          '  • Apps Script retornou estrutura vazia ou inesperada\n' +
          'Resposta bruta recebida:',
          json
        );
      }

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