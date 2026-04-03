/**
 * api.js — Integração com Google Apps Script v3.0
 */
const Api = (() => {

  function setStatus(estado, mensagem) {
    const dot   = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    const wrap  = document.getElementById('statusIndicator');
    if (!dot || !label) return;
    dot.className = `status-dot status-${estado}`;
    label.textContent = mensagem;
    if (wrap) {
      wrap.className = 'status-indicator';
      if (estado === 'connected') wrap.classList.add('status-connected');
      if (estado === 'error')     wrap.classList.add('status-error');
      if (estado === 'loading')   wrap.classList.add('status-loading');
    }
  }

  function setLastSyncLabel(timestamp) {
    const el = document.getElementById('lastSyncLabel');
    if (!el || !timestamp) return;
    const d  = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    el.textContent = `Atualizado às ${hh}:${mm}`;
  }

  function setSyncButtonLoading(loading) {
    const btn  = document.getElementById('btnSync');
    const icon = btn?.querySelector('.sync-icon');
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('btn-sync--loading', loading);
    icon?.classList.toggle('spin', loading);
  }

  // Requisição com timeout
  async function _get(url) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.API_TIMEOUT);
    try {
      const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}: ${res.statusText}`);
      let json;
      try { json = await res.json(); }
      catch (_) { throw new Error('Resposta inesperada da API (não é JSON). Verifique se o Apps Script está publicado corretamente.'); }
      if (json?.status === 'erro') throw new Error(json.mensagem || 'Erro desconhecido na API');
      return json;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Tempo limite excedido. Verifique a conexão.');
      throw err;
    }
  }

  // Parser numérico pt-BR
  function parseBRFloat(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const s = String(val || '0').trim()
      .replace(/[R$\s]/g, '')
      .replace(/\.(?=\d{3}(?:[,.]|$))/g, '')
      .replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function normalizeRow(row) {
    if (Array.isArray(row)) {
      return {
        Empresa: String(row[0]||'').trim(), Sigla: String(row[1]||'').trim(),
        CentroCusto: String(row[2]||'').trim(), Departamento: String(row[3]||'').trim(),
        Despesa: String(row[4]||'').trim(), Modelo: String(row[5]||'').trim(),
        Classificacao: String(row[6]||'').trim(), Tipo: String(row[7]||'').trim(),
        Placa: String(row[8]||'').trim().toUpperCase(),
        Valor: parseBRFloat(row[9]), Liquidado: parseBRFloat(row[10]),
        Mes: parseInt(row[11],10)||0, Ano: parseInt(row[12],10)||0,
        Contrato: String(row[13]||'').trim(),
      };
    }
    const mesRaw = row['M\u00eas'] || row['Mês'] || row['Mes'] || row.mes || row.month || 0;
    return {
      Empresa:       String(row.Empresa       || row.empresa       || '').trim(),
      Sigla:         String(row.Sigla         || row.sigla         || '').trim(),
      CentroCusto:   String(row['Centro de Custo'] || row.centroCusto || '').trim(),
      Departamento:  String(row.Departamento  || row.departamento  || '').trim(),
      Despesa:       String(row.Despesa       || row.despesa       || '').trim(),
      Modelo:        String(row.Modelo        || row.modelo        || '').trim(),
      Classificacao: String(row['Classifica\u00e7\u00e3o'] || row['Classificação'] || row.Classificacao || row.classificacao || '').trim(),
      Tipo:          String(row.Tipo          || row.tipo          || '').trim(),
      Placa:         String(row.Placa         || row.placa         || '').trim().toUpperCase(),
      Valor:         parseBRFloat(row.Valor    || row.valor),
      Liquidado:     parseBRFloat(row.Liquidado || row.liquidado || row.valorLiquidado),
      Mes:           parseInt(mesRaw, 10) || 0,
      Ano:           parseInt(row.Ano || row.ano || 0, 10) || 0,
      Contrato:      String(row.Contrato || row.contrato || '').trim(),
    };
  }

  function extractRows(json) {
    if (typeof json === 'string') { try { json = JSON.parse(json); } catch (_) { return []; } }
    if (Array.isArray(json)) return json;
    if (json?.dados && Array.isArray(json.dados.registros)) return json.dados.registros;
    if (json && Array.isArray(json.dados))     return json.dados;
    if (json && Array.isArray(json.registros)) return json.registros;
    if (json && Array.isArray(json.data))      return json.data;
    if (json && Array.isArray(json.rows))      return json.rows;
    if (json && Array.isArray(json.values))    return json.values;
    return [];
  }

  async function fetchFromApi(forceRefresh = false) {
    if (!forceRefresh && State.isCacheValid() && State.hasData()) return State.getRawData();
    setStatus('loading', 'Carregando...');
    setSyncButtonLoading(true);
    try {
      const json = await _get(`${CONFIG.API_URL}?rota=dados`);
      const rows = extractRows(json);
      const dataRows = rows.filter(r => {
        if (!Array.isArray(r)) return true;
        if (r[0] === 'Empresa' || r[9] === 'Valor') return false;
        return true;
      });
      const normalized = dataRows.map(normalizeRow);
      if (!normalized.length) console.warn('[API] Nenhum registro normalizado. Resposta:', json);
      State.setRawData(normalized);
      setStatus('connected', 'Conectado');
      setLastSyncLabel(State.getLastSyncAt());
      setSyncButtonLoading(false);
      return normalized;
    } catch (err) {
      console.error('[API]', err.message);
      setStatus('error', 'Erro de conexão');
      setSyncButtonLoading(false);
      throw err;
    }
  }

  function getFilterOptions() {
    const data  = State.getRawData();
    const uniq  = arr => [...new Set(arr.filter(Boolean))].sort();
    return {
      anos:           uniq(data.map(r => String(r.Ano))),
      meses:          [...new Set(data.map(r => r.Mes).filter(m => m > 0))].sort((a,b) => a-b),
      despesas:       uniq(data.map(r => r.Despesa)),
      tipos:          uniq(data.map(r => r.Tipo)),
      secretarias:    uniq(data.map(r => r.Sigla)),
      classificacoes: uniq(data.map(r => r.Classificacao)),
      empresas:       uniq(data.map(r => r.Empresa)),
    };
  }

  return { fetchFromApi, getFilterOptions, setStatus };
})();