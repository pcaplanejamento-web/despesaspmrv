/**
 * fipe.js — v1.0
 * Consulta Tabela FIPE via Parallelum API (gratuita, sem autenticação).
 * Apenas veículos (coluna H: Tipo === 'Veículo') — máquinas são ignoradas.
 * Cache em localStorage com TTL de 7 dias.
 *
 * API base: https://parallelum.com.br/fipe/api/v2/
 * Limite: 500 req/dia sem token (suficiente para frotas municipais com cache ativo).
 */
const Fipe = (() => {

  const BASE      = 'https://parallelum.com.br/fipe/api/v2';
  const CACHE_KEY = 'gastosrv_fipe_v1';
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias
  const TIMEOUT   = 12000;  // 12s por requisição
  const MAX_PRE   = 30;     // máx. veículos pré-carregados na inicialização
  const LOTE      = 2;      // veículos por lote (respeitar rate limit)
  const DELAY_MS  = 450;    // pausa entre lotes (ms)

  // ─── Mapeamento de marcas ─────────────────────────────────────────────────
  // Texto do campo Modelo do sistema → nome de busca na FIPE
  const MARCA_MAP = {
    'VW':            'Volkswagen',
    'VOLKSWAGEN':    'Volkswagen',
    'FIAT':          'Fiat',
    'GM':            'GM - Chevrolet',
    'CHEVROLET':     'GM - Chevrolet',
    'FORD':          'Ford',
    'MERCEDES':      'Mercedes-Benz',
    'MERCEDES-BENZ': 'Mercedes-Benz',
    'M.BENZ':        'Mercedes-Benz',
    'M/BENZ':        'Mercedes-Benz',
    'MB':            'Mercedes-Benz',
    'RENAULT':       'Renault',
    'TOYOTA':        'Toyota',
    'HONDA':         'Honda',
    'MITSUBISHI':    'Mitsubishi',
    'NISSAN':        'Nissan',
    'HYUNDAI':       'Hyundai',
    'KIA':           'Kia',
    'PEUGEOT':       'Peugeot',
    'CITROEN':       'Citroën',
    'CITROËN':       'Citroën',
    'IVECO':         'Iveco',
    'SCANIA':        'Scania',
    'VOLVO':         'Volvo',
    'AGRALE':        'Agrale',
    'JEEP':          'Jeep',
    'RAM':           'Ram',
    'LAND ROVER':    'Land Rover',
    'LANDROVER':     'Land Rover',
    'SUZUKI':        'Suzuki',
    'YAMAHA':        'Yamaha',
    'TROLLER':       'Troller',
    'JAC':           'JAC',
    'CHERY':         'Chery',
    'CAOA':          'CAOA Chery',
    'CAOA CHERY':    'CAOA Chery',
    'SUBARU':        'Subaru',
    'DODGE':         'Dodge',
    'CHRYSLER':      'Chrysler',
    'MINI':          'MINI',
    'BMW':           'BMW',
    'AUDI':          'Audi',
  };

  let _cache  = {};   // { [placa]: { data, ts } }
  let _mCache = {};   // { carros: marcas[], caminhoes: marcas[] }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Escapa HTML usando a função global (já disponível em config.js). */
  function _esc(s) {
    return typeof escHTML !== 'undefined' ? escHTML(s) : String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  /** Normaliza tipo para verificar se é veículo (não máquina). */
  function _isVeiculo(tipo) {
    const t = (tipo || '').toLowerCase();
    // Remove acentos para comparação segura
    const sem = t.replace(/[áàâãä]/g,'a').replace(/[éèêë]/g,'e').replace(/[íìîï]/g,'i').replace(/[óòôõö]/g,'o').replace(/[úùûü]/g,'u').replace(/ç/g,'c');
    return sem === 'veiculo';
  }

  // ─── Persistência em localStorage ────────────────────────────────────────

  function _lLoad() {
    try { _cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (_) { _cache = {}; }
  }

  function _lSave() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_cache)); } catch (_) {}
  }

  /** Retorna true se a entrada do cache ainda é válida. */
  function _cacheOk(entry) {
    return !!(entry && (Date.now() - (entry.ts || 0)) < CACHE_TTL);
  }

  // ─── HTTP com timeout ─────────────────────────────────────────────────────

  async function _req(path) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(`${BASE}${path}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      clearTimeout(timer);
      throw (e.name === 'AbortError') ? new Error('Timeout na API FIPE') : e;
    }
  }

  // ─── Extração de marca e modelo do campo Modelo do sistema ───────────────

  function _extrairMarca(modelo) {
    if (!modelo) return null;
    const up = modelo.toUpperCase().trim();

    // Padrão "VW/VOLKSWAGEN 9.150" — usar a parte após "/"
    const slash = up.indexOf('/');
    if (slash > 0 && slash <= 5) {
      const aposSlash = up.slice(slash + 1).split(/[\s/]/)[0];
      if (MARCA_MAP[aposSlash]) return MARCA_MAP[aposSlash];
    }

    // Match por prefixo (mais longo primeiro para evitar "CITROEN" vs "CI")
    const keys = Object.keys(MARCA_MAP).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (up === k || up.startsWith(k + ' ') || up.startsWith(k + '/')) {
        return MARCA_MAP[k];
      }
    }

    // Fallback: primeira palavra
    return up.split(/[\s/]/)[0] || null;
  }

  function _extrairModelo(modelo) {
    if (!modelo) return null;
    let up = modelo.toUpperCase().trim();

    // Remover prefixo "MARCA/NOME " (ex: "VW/VOLKSWAGEN ")
    up = up.replace(/^[\w-]+\/[\w-]+\s+/, '');

    // Remover a marca do início (chave mais longa primeiro)
    const keys = Object.keys(MARCA_MAP).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (up.startsWith(k + ' ') || up === k) {
        up = up.slice(k.length).trim();
        break;
      }
    }

    // Remover motorização no final: "1.0", "1.8 FLEX", "2.0 TURBO", "3.0 16V", etc.
    up = up.replace(/\s+\d+[.,]\d+.*$/, '').trim();

    return up || null;
  }

  // ─── Busca nas listas da API FIPE ─────────────────────────────────────────

  async function _getMarcas() {
    if (_mCache.carros) return _mCache.carros;
    const list = await _req('/carros/marcas');
    _mCache.carros = Array.isArray(list) ? list : [];
    return _mCache.carros;
  }

  function _matchMarca(list, busca) {
    const q = (busca || '').toUpperCase();
    // 1. Igual
    let m = list.find(b => b.nome.toUpperCase() === q);
    if (m) return m;
    // 2. Começa com ou contém
    m = list.find(b => b.nome.toUpperCase().startsWith(q) || q.startsWith(b.nome.toUpperCase()));
    if (m) return m;
    // 3. Primeira palavra da marca contida
    const q0 = q.split(' ')[0];
    return list.find(b => b.nome.toUpperCase().includes(q0) || q0.includes(b.nome.toUpperCase().split(' ')[0])) || null;
  }

  async function _getModelos(marcaCod) {
    const d = await _req(`/carros/marcas/${marcaCod}/modelos`);
    // API v2 retorna { modelos: [...], anos: [...] } ou direto array
    return Array.isArray(d) ? d : (Array.isArray(d?.modelos) ? d.modelos : []);
  }

  function _matchModelo(list, busca) {
    if (!busca || !list.length) return null;
    const q = busca.toUpperCase().replace(/\s+/g, ' ').trim();
    // 1. Igual
    let m = list.find(b => b.nome.toUpperCase() === q);
    if (m) return m;
    // 2. Todas as palavras-chave (> 1 char) presentes
    const words = q.split(' ').filter(w => w.length > 1);
    m = list.find(b => words.every(w => b.nome.toUpperCase().includes(w)));
    if (m) return m;
    // 3. Primeira palavra-chave presente
    if (words[0]) m = list.find(b => b.nome.toUpperCase().includes(words[0]));
    return m || null;
  }

  async function _getAnos(marcaCod, modeloCod) {
    const d = await _req(`/carros/marcas/${marcaCod}/modelos/${modeloCod}/anos`);
    return Array.isArray(d) ? d : [];
  }

  async function _getPreco(marcaCod, modeloCod, anoCod) {
    return await _req(`/carros/marcas/${marcaCod}/modelos/${modeloCod}/anos/${anoCod}`);
  }

  // ─── Parser de valor FIPE ("R$ 45.000,00" → 45000) ───────────────────────

  function _parseVal(v) {
    if (!v) return 0;
    const s = String(v).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  }

  // ─── Consulta principal por placa ─────────────────────────────────────────

  /**
   * Busca dados FIPE para um veículo pelo campo Modelo.
   * Retorna { ok, marca, modelo, anoModelo, combustivel, codigoFipe, valor, valorNum, mesRef }
   * ou { ok: false, erro: '...' }
   * ou null se não for veículo.
   */
  async function fetchFipe(placa, tipo, modelo) {
    const key = (placa || '').toUpperCase().trim();
    if (!key || key === '--') return null;

    // Somente veículos (coluna H)
    if (!_isVeiculo(tipo)) return null;

    // Cache hit
    if (_cacheOk(_cache[key])) return _cache[key].data;

    try {
      const nomeMarca = _extrairMarca(modelo);
      const nomeMod   = _extrairModelo(modelo);
      if (!nomeMarca) throw new Error('Marca não identificada');

      const marcas = await _getMarcas();
      const marca  = _matchMarca(marcas, nomeMarca);
      if (!marca) throw new Error(`Marca "${nomeMarca}" não encontrada na FIPE`);

      const modelos  = await _getModelos(marca.codigo);
      const modeloF  = _matchModelo(modelos, nomeMod || '');
      if (!modeloF) throw new Error(`Modelo "${nomeMod || modelo}" não encontrado na FIPE`);

      const anos = await _getAnos(marca.codigo, modeloF.codigo);
      if (!anos.length) throw new Error('Anos não disponíveis');

      // Preço do ano mais recente (primeiro da lista)
      const preco = await _getPreco(marca.codigo, modeloF.codigo, anos[0].codigo);

      const result = {
        ok:          true,
        marca:       preco?.Marca        || marca.nome,
        modelo:      preco?.Modelo       || modeloF.nome,
        anoModelo:   preco?.AnoModelo    || anos[0].nome,
        combustivel: preco?.Combustivel  || '--',
        codigoFipe:  preco?.CodigoFipe   || '--',
        valor:       preco?.Valor        || '--',
        valorNum:    _parseVal(preco?.Valor),
        mesRef:      preco?.MesReferencia || '--',
        tipoVeiculo: preco?.TipoVeiculo  || '--',
      };

      _cache[key] = { data: result, ts: Date.now() };
      _lSave();
      return result;

    } catch (err) {
      console.warn(`[FIPE] ${key}:`, err.message);
      const result = { ok: false, erro: err.message };
      _cache[key] = { data: result, ts: Date.now() };
      _lSave();
      return result;
    }
  }

  // ─── Busca síncrona no cache local ───────────────────────────────────────

  function buscar(placa) {
    const key = (placa || '').toUpperCase().trim();
    return _cacheOk(_cache[key]) ? _cache[key].data : null;
  }

  // ─── Pré-carregamento ao iniciar o sistema ────────────────────────────────

  /**
   * Carrega FIPE em background para até MAX_PRE veículos únicos ainda não cacheados.
   * Chamado automaticamente pelo App após o painel principal renderizar.
   */
  async function carregar() {
    _lLoad();
    if (typeof State === 'undefined') return;

    const dados  = State.getRawData();
    const vMap   = new Map();

    dados.forEach(r => {
      if (!_isVeiculo(r.Tipo)) return;
      const p = (r.Placa || '').toUpperCase().trim();
      if (p && p !== '--' && !vMap.has(p)) vMap.set(p, r);
    });

    const pendentes = [...vMap.values()]
      .filter(r => !_cacheOk(_cache[(r.Placa || '').toUpperCase()]))
      .slice(0, MAX_PRE);

    if (!pendentes.length) return;

    console.info(`[FIPE] Pré-carregando ${pendentes.length} veículo(s)…`);

    for (let i = 0; i < pendentes.length; i += LOTE) {
      const lote = pendentes.slice(i, i + LOTE);
      await Promise.allSettled(lote.map(r => fetchFipe(r.Placa, r.Tipo, r.Modelo)));
      if (i + LOTE < pendentes.length) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    console.info('[FIPE] Pré-carregamento concluído.');
  }

  // ─── HTML para a Ficha do Veículo (modal) ────────────────────────────────

  /**
   * Retorna o HTML da seção FIPE para ser injetado na Ficha do Veículo.
   * Retorna '' para máquinas.
   */
  function getHTML(placa, tipo) {
    if (!_isVeiculo(tipo)) return '';

    const esc  = _esc;
    const data = buscar(placa);

    const SVG_FIPE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;

    const titulo = `<div class="modal-secao-titulo" style="margin-top:18px;display:flex;align-items:center;gap:6px">${SVG_FIPE}Tabela FIPE</div>`;

    // Ainda carregando
    if (!data) {
      return `${titulo}
        <div style="padding:10px 12px;background:var(--accent-soft);border-radius:9px;font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <div class="fipe-spinner"></div>
          Buscando dados FIPE…
        </div>`;
    }

    // Erro / não encontrado
    if (!data.ok) {
      return `${titulo}
        <div style="padding:10px 12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.18);border-radius:9px;font-size:12px;color:var(--text-muted);margin-bottom:4px">
          Dados FIPE indisponíveis — ${esc(data.erro || 'modelo não encontrado na tabela')}
        </div>`;
    }

    // Sucesso
    return `${titulo}
      <div class="modal-grid" style="margin-bottom:6px">
        <div class="modal-campo" style="grid-column:1/-1">
          <span class="modal-campo-label">Valor de Referência FIPE</span>
          <span class="modal-campo-valor" style="font-size:17px;font-weight:800;color:var(--accent)">${esc(data.valor)}</span>
          <span style="font-size:10px;color:var(--text-muted);display:block;margin-top:2px">Ref.: ${esc(data.mesRef)}</span>
        </div>
        <div class="modal-campo"><span class="modal-campo-label">Marca</span><span class="modal-campo-valor">${esc(data.marca)}</span></div>
        <div class="modal-campo"><span class="modal-campo-label">Modelo FIPE</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${esc(data.modelo)}">${esc(data.modelo)}</span></div>
        <div class="modal-campo"><span class="modal-campo-label">Ano do Modelo</span><span class="modal-campo-valor">${esc(String(data.anoModelo))}</span></div>
        <div class="modal-campo"><span class="modal-campo-label">Combustível</span><span class="modal-campo-valor">${esc(data.combustivel)}</span></div>
        <div class="modal-campo"><span class="modal-campo-label">Código FIPE</span><span class="modal-campo-valor mono">${esc(data.codigoFipe)}</span></div>
      </div>
      <div style="padding:7px 12px;background:rgba(67,97,238,.05);border-radius:8px;font-size:10.5px;color:var(--text-muted);margin-bottom:4px">
        ⓘ Valor referente ao modelo mais recente disponível na tabela FIPE. O valor exato varia conforme o ano de fabricação do veículo.
      </div>`;
  }

  // ─── HTML para o PDF da Ficha ─────────────────────────────────────────────

  /**
   * Retorna o bloco HTML da seção FIPE para o PDF gerado via Blob.
   * Retorna '' se não houver dados ou for máquina.
   */
  function getPDFHTML(placa, tipo) {
    if (!_isVeiculo(tipo)) return '';
    const esc  = _esc;
    const data = buscar(placa);
    if (!data || !data.ok) return '';

    return `
      <div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Tabela FIPE</div>
      <div style="margin-bottom:20px">
        <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px 16px;margin-bottom:10px">
          <div style="font-size:8pt;color:#6b7280;margin-bottom:4px">Valor de Referência FIPE</div>
          <div style="font-size:16pt;font-weight:800;color:#185FA5;font-variant-numeric:tabular-nums">${esc(data.valor)}</div>
          <div style="font-size:8pt;color:#9ca3af;margin-top:3px">Referência: ${esc(data.mesRef)}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
            <div style="font-size:8pt;color:#9ca3af">Marca</div>
            <div style="font-size:10pt;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(data.marca)}</div>
          </div>
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
            <div style="font-size:8pt;color:#9ca3af">Ano do Modelo</div>
            <div style="font-size:10pt;font-weight:600">${esc(String(data.anoModelo))}</div>
          </div>
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
            <div style="font-size:8pt;color:#9ca3af">Código FIPE</div>
            <div style="font-size:10pt;font-weight:600;font-family:monospace">${esc(data.codigoFipe)}</div>
          </div>
        </div>
        <div style="padding:8px 12px;background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;font-size:8pt;color:#9ca3af">
          Modelo FIPE: ${esc(data.modelo)} — ${esc(data.combustivel)}
        </div>
      </div>`;
  }

  // ─── Injetar CSS da animação de spinner uma única vez ────────────────────

  (function _injectStyles() {
    if (document.getElementById('fipe-styles')) return;
    const s = document.createElement('style');
    s.id = 'fipe-styles';
    s.textContent = `
      @keyframes fipeSpin { to { transform: rotate(360deg); } }
      .fipe-spinner {
        width: 13px; height: 13px; flex-shrink: 0;
        border: 2px solid var(--accent, #185FA5);
        border-top-color: transparent;
        border-radius: 50%;
        animation: fipeSpin .8s linear infinite;
      }
    `;
    document.head.appendChild(s);
  })();

  return { carregar, buscar, fetchFipe, getHTML, getPDFHTML };

})();
