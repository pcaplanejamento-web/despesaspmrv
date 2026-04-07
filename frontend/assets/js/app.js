/**
 * app.js — v4.0
 * Modal: sem botão "Fechar" no footer, só X.
 * Top 10: clique em linha abre detalhe completo.
 * Evolução: modal com todos os anos do ponto + análise YoY.
 */

// ── Modal Utility ─────────────────────────────────────────────────────────
const Modal = (() => {

  function fmtBRL(v) { if(!v&&v!==0) return '--'; return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtMes(m) { return (typeof CONFIG!=='undefined'?CONFIG.MESES[m]:'')||String(m||'--'); }
  function sl(sigla) { return typeof Filters!=='undefined' ? Filters.siglaLabel(sigla||'') : sigla||'--'; }

  let _closeHandler = null;

  function _ensureOverlay() {
    let ov = document.getElementById('modalOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'modalOverlay';
      ov.className = 'modal-overlay';
      ov.addEventListener('click', e => { if(e.target===ov) close(); });
      document.body.appendChild(ov);
    }
    return ov;
  }

  function openRaw(html, panelClass='modal-panel') {
    const ov = _ensureOverlay();
    ov.innerHTML = `<div class="${panelClass}" role="dialog" aria-modal="true">${html}</div>`;
    ov.classList.add('open');
    ov.querySelector('.'+panelClass.split(' ')[0]).style.animation='lgDrop .4s cubic-bezier(.22,1,.36,1) both';
    document.body.style.overflow='hidden';
    // Binds
    ov.querySelectorAll('[data-modal-close]').forEach(btn=>btn.addEventListener('click',close));
    if (_closeHandler) document.removeEventListener('keydown',_closeHandler);
    _closeHandler = e => { if(e.key==='Escape') close(); };
    document.addEventListener('keydown',_closeHandler);
  }

  function open(tipo, data) {
    switch(tipo) {
      case 'detalheRegistro': _openRegistro(data); break;
      case 'chartDetalhe':    _openChart(data);    break;
      case 'evolucaoDetalhe': _openEvolucao(data); break;
    }
  }

  function close() {
    const ov=document.getElementById('modalOverlay');
    if(ov) ov.classList.remove('open');
    document.body.style.overflow='';
  }

  // ── Detalhe de Registro ───────────────────────────────────────────────────
  function _openRegistro(r) {
    // ── Histórico do veículo ─────────────────────────────────────────────────
    const placaKey = (r.Placa||'').toUpperCase().trim();
    const histRegs = placaKey && placaKey !== '--'
      ? State.getRawData().filter(r2 => (r2.Placa||'').toUpperCase().trim() === placaKey)
      : [];

    // Siglas únicas + período de cada uma
    const siglaMap = {};
    histRegs.forEach(r2 => {
      const s = r2.Sigla||'--';
      const k = `${r2.Ano||0}-${String(r2.Mes||0).padStart(2,'0')}`;
      if (!siglaMap[s]) siglaMap[s] = { sigla: s, min: k, max: k };
      if (k < siglaMap[s].min) siglaMap[s].min = k;
      if (k > siglaMap[s].max) siglaMap[s].max = k;
    });
    const siglasList = Object.values(siglaMap).sort((a,b) => a.min < b.min ? -1 : 1);

    function _fmtPeriodo(key) {
      const [ano, mes] = key.split('-');
      return `${fmtMes(parseInt(mes)).substring(0,3)}/${ano}`;
    }

    // Seção A — pills de secretarias
    let secaoSiglas = '';
    if (!placaKey || placaKey === '--') {
      secaoSiglas = `<p style="font-size:12px;color:var(--text-muted)">Identificador não disponível para busca de histórico.</p>`;
    } else if (!siglasList.length) {
      secaoSiglas = `<p style="font-size:12px;color:var(--text-muted)">Nenhum registro encontrado para esta placa.</p>`;
    } else {
      const nota = siglasList.length > 1
        ? `<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Veículo transitou por <strong style="color:var(--text)">${siglasList.length}</strong> secretarias</p>`
        : `<p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Secretaria única no período</p>`;
      const pills = siglasList.map(s => {
        const nomeCompleto = sl(s.sigla);
        const periodo = s.min === s.max
          ? _fmtPeriodo(s.min)
          : `${_fmtPeriodo(s.min)} – ${_fmtPeriodo(s.max)}`;
        const nomeLabel = nomeCompleto.length > 32 ? nomeCompleto.substring(0,32)+'…' : nomeCompleto;
        return `<span class="rp-tag" title="${nomeCompleto}" style="display:inline-flex;flex-direction:column;gap:2px;padding:6px 11px;border-radius:9px;max-width:190px;min-width:0">
          <span style="font-size:11px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.sigla}</span>
          <span style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85">${periodo}</span>
        </span>`;
      }).join('');
      secaoSiglas = nota + `<div style="display:flex;flex-wrap:wrap;gap:6px">${pills}</div>`;
    }

    // Histórico de despesas — ordenado decrescente
    const histSorted = [...histRegs].sort((a, b) => {
      const ka = `${b.Ano||0}-${String(b.Mes||0).padStart(2,'0')}`;
      const kb = `${a.Ano||0}-${String(a.Mes||0).padStart(2,'0')}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    const totalHist = histRegs.reduce((s, r2) => s + r2.Valor, 0);
    const MAX_VIS = 10;
    const temMais = histSorted.length > MAX_VIS;
    const visiveis = histSorted.slice(0, MAX_VIS);
    const extras   = histSorted.slice(MAX_VIS);

    function _isAtual(r2) {
      return r2.Mes === r.Mes && r2.Ano === r.Ano &&
        (r2.Sigla||'') === (r.Sigla||'') &&
        (r2.Despesa||'') === (r.Despesa||'') &&
        Math.abs((r2.Valor||0) - (r.Valor||0)) < 0.01;
    }

    function _rowHtml(r2, isAtual) {
      const isComb = (r2.Despesa||'').toLowerCase().startsWith('combust');
      const badge  = isComb
        ? `<span class="badge badge-combustivel" style="white-space:nowrap">${r2.Despesa||'--'}</span>`
        : `<span class="badge badge-manutencao" style="white-space:nowrap">${r2.Despesa||'--'}</span>`;
      const rowStyle = isAtual
        ? 'style="background:var(--accent-soft);border-left:3px solid var(--accent);"'
        : '';
      return `<tr ${rowStyle}>
        <td style="white-space:nowrap">${fmtMes(r2.Mes).substring(0,3)}/${r2.Ano||'--'}</td>
        <td>${badge}</td>
        <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r2.Classificacao||''}">${r2.Classificacao||'--'}</td>
        <td style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--accent);white-space:nowrap">${r2.Sigla||'--'}</td>
        <td class="tr fw-700">${fmtBRL(r2.Valor)}</td>
      </tr>`;
    }

    const rowsVisiveis = visiveis.map(r2 => _rowHtml(r2, _isAtual(r2))).join('');
    const rowsExtras   = extras.map(r2 => _rowHtml(r2, _isAtual(r2))).join('');

    let secaoHist = '';
    if (!placaKey || placaKey === '--') {
      secaoHist = `<p style="font-size:12px;color:var(--text-muted)">Histórico indisponível — identificador não informado.</p>`;
    } else if (!histSorted.length) {
      secaoHist = `<p style="font-size:12px;color:var(--text-muted)">Nenhum registro encontrado para esta placa.</p>`;
    } else {
      secaoHist = `
        <div class="modal-table-wrap">
          <table class="modal-table">
            <thead><tr><th>Período</th><th>Tipo</th><th>Classificação</th><th>Sigla</th><th class="tr">Valor</th></tr></thead>
            <tbody>${rowsVisiveis}</tbody>
            ${temMais ? `<tbody id="mhExtra" style="display:none">${rowsExtras}</tbody>` : ''}
          </table>
        </div>
        ${temMais ? `<button id="mhToggle" style="margin-top:8px;font-size:12px;font-weight:700;color:var(--accent);background:none;border:none;cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:4px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          Ver todos (${histSorted.length} registros)
        </button>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0 0;border-top:1px solid var(--border-dim);margin-top:6px;gap:8px">
          <span style="font-size:12px;color:var(--text-muted)">${histSorted.length.toLocaleString('pt-BR')} registros no histórico</span>
          <span style="font-size:13px;font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums;white-space:nowrap">${fmtBRL(totalHist)}</span>
        </div>`;
    }

    // ── Render do modal ──────────────────────────────────────────────────────
    openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div class="modal-tag">Registro de Despesa</div>
            <h2 class="modal-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.Modelo||r.Placa||'Detalhes do Registro'}</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="modal-value-destaque">
          <span class="modal-value-label">Valor da Despesa</span>
          <span class="modal-value-num">${fmtBRL(r.Valor)}</span>
          ${r.Liquidado?`<span class="modal-value-sub">Liquidado: ${fmtBRL(r.Liquidado)}</span>`:''}
        </div>
        <div class="modal-grid">
          <div class="modal-campo"><span class="modal-campo-label">Placa</span><span class="modal-campo-valor mono" style="overflow:hidden;text-overflow:ellipsis">${r.Placa||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Modelo</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis">${r.Modelo||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Tipo</span><span class="modal-campo-valor">${r.Tipo||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Despesa</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis">${r.Despesa||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Período</span><span class="modal-campo-valor">${fmtMes(r.Mes)} / ${r.Ano||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Contrato</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis">${r.Contrato||'--'}</span></div>
        </div>
        <div class="modal-secao-titulo">Localização</div>
        <div class="modal-grid modal-grid-2">
          <div class="modal-campo"><span class="modal-campo-label">Secretaria</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${sl(r.Sigla)}">${sl(r.Sigla)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Departamento</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${r.Departamento||''}">${r.Departamento||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Centro de Custo</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${r.CentroCusto||''}">${r.CentroCusto||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Classificação</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${r.Classificacao||''}">${r.Classificacao||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Empresa</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${r.Empresa||''}">${r.Empresa||'--'}</span></div>
        </div>

        <div class="modal-secao-titulo" style="margin-top:18px;display:flex;align-items:center;gap:6px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          Secretarias do Veículo
        </div>
        ${secaoSiglas}

        <div class="modal-secao-titulo" style="margin-top:18px;display:flex;align-items:center;gap:6px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/></svg>
          Histórico de Despesas${placaKey && placaKey !== '--' ? ` — <span style="font-family:var(--font-mono);color:var(--accent)">${r.Placa}</span>` : ''}
        </div>
        ${secaoHist}
      </div>
      <div class="modal-footer modal-footer-only-hint">
        <span class="modal-footer-hint">ESC ou clique fora para fechar</span>
      </div>`);

    // Bind toggle expandir histórico
    const toggleBtn  = document.getElementById('mhToggle');
    const extraTbody = document.getElementById('mhExtra');
    if (toggleBtn && extraTbody) {
      toggleBtn.addEventListener('click', () => {
        const aberto = extraTbody.style.display !== 'none';
        extraTbody.style.display = aberto ? 'none' : '';
        toggleBtn.innerHTML = aberto
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg> Ver todos (${histSorted.length} registros)`
          : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg> Recolher`;
      });
    }
  }

  // ── Detalhe de Gráfico (barra/fatia clicada) ──────────────────────────────
  function _openChart(d) {
    const {titulo, registros, tipo} = d;
    const total = registros.reduce((s,r)=>s+r.Valor,0);
    const top10 = [...registros].sort((a,b)=>b.Valor-a.Valor).slice(0,10);
    openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:var(--accent-soft);color:var(--accent);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </div>
          <div>
            <div class="modal-tag">${tipo==='local'?'Por Secretaria':'Por Classificação'}</div>
            <h2 class="modal-title">${titulo}</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="modal-value-destaque">
          <span class="modal-value-label">Total</span>
          <span class="modal-value-num">${fmtBRL(total)}</span>
          <span class="modal-value-sub">${registros.length.toLocaleString('pt-BR')} registros — clique em uma linha para detalhes</span>
        </div>
        <div class="modal-secao-titulo">Top 10 maiores despesas</div>
        <div class="modal-table-wrap">
          <table class="modal-table modal-table-clickable">
            <thead><tr><th>Placa</th><th>Modelo</th><th>Despesa</th><th>Mês/Ano</th><th class="tr">Valor</th></tr></thead>
            <tbody>
              ${top10.map((r,i)=>`<tr data-idx="${i}" class="modal-table-row" title="Clique para ver todos os detalhes">
                <td class="mono">${r.Placa||'--'}</td>
                <td class="td-truncate">${r.Modelo||'--'}</td>
                <td>${r.Despesa||'--'}</td>
                <td>${fmtMes(r.Mes)}/${r.Ano||'--'}</td>
                <td class="tr fw-700">${fmtBRL(r.Valor)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer modal-footer-only-hint">
        <span class="modal-footer-hint">${registros.length} registros nesta categoria — ESC para fechar</span>
      </div>`);

    // Click em linha → abre detalhe do registro
    document.querySelectorAll('.modal-table-row').forEach((tr,i)=>{
      tr.addEventListener('click',()=>{
        const r = top10[parseInt(tr.dataset.idx)];
        if (r) _openRegistro(r);
      });
    });
  }

  // ── Detalhe de Evolução com YoY ───────────────────────────────────────────
  function _openEvolucao(d) {
    const { mes, dadosMes, topSiglas, yoyHtml, registros } = d;
    const mesNome = fmtMes(mes);
    const totalGeral = dadosMes.reduce((s,dd)=>s+dd.valor,0);

    const resumoAnos = dadosMes.map(dd=>
      `<div class="modal-ano-item">
        <span class="modal-ano-dot" style="background:${dd.color}"></span>
        <span class="modal-ano-label">${dd.ano}</span>
        <span class="modal-ano-val">${fmtBRL(dd.valor)}</span>
        <span class="modal-ano-qtde">${registros.filter(r=>String(r.Ano)===String(dd.ano)).length} reg.</span>
      </div>`
    ).join('');

    openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:rgba(16,185,129,.12);color:#10b981;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div>
            <div class="modal-tag">Evolução Mensal</div>
            <h2 class="modal-title">${mesNome}</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">

        <!-- Resumo por ano -->
        <div class="modal-anos-grid">${resumoAnos}</div>

        ${yoyHtml ? `
        <div class="modal-secao-titulo">Análise de Variação Anual (YoY)</div>
        <div class="modal-yoy-wrap">${yoyHtml}</div>
        ` : ''}

        <div class="modal-grid-2col" style="margin-top:16px;">
          <div>
            <div class="modal-secao-titulo">Principais Secretarias</div>
            ${topSiglas.map(([s,v])=>`<div class="modal-row-bar"><span>${sl(s)}</span><span class="tr">${fmtBRL(v)}</span></div>`).join('')||'<p style="font-size:12px;color:var(--text-muted)">Sem dados</p>'}
          </div>
          <div>
            <div class="modal-secao-titulo">Total geral no mês</div>
            <div style="font-size:22px;font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums;">${fmtBRL(totalGeral)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${registros.length.toLocaleString('pt-BR')} registros</div>
          </div>
        </div>

      </div>
      <div class="modal-footer modal-footer-only-hint">
        <span class="modal-footer-hint">${mesNome} — ESC para fechar</span>
      </div>`);
  }

  return { open, openRaw, close };
})();

// ── App Orquestrador ──────────────────────────────────────────────────────
const App = (() => {

  // ── Toast ─────────────────────────────────────────────────────────────────
  let _toastTimer=null;
  const TOAST_ICONS={
    success:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warn:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  function showToast(tipo,titulo,sub='',dur=3500) {
    const toast=document.getElementById('toast'); if(!toast) return;
    if(_toastTimer){clearTimeout(_toastTimer);_toastTimer=null;}
    const map={success:'success',ok:'success',error:'error',erro:'error',warn:'warn',info:'info'};
    const t=map[tipo]||'info';
    const tel=document.getElementById('toast-title'); if(tel) tel.textContent=titulo;
    const sel=document.getElementById('toast-sub');   if(sel){sel.textContent=sub;sel.style.display=sub?'block':'none';}
    const iel=document.getElementById('toast-icon-wrap'); if(iel) iel.innerHTML=TOAST_ICONS[t]||TOAST_ICONS.info;
    const bar=document.getElementById('toast-bar');
    toast.className=t; toast.classList.add('show');
    if(bar){bar.style.transition='none';bar.style.transform='scaleX(1)';requestAnimationFrame(()=>{bar.style.transition=`transform ${dur}ms linear`;bar.style.transform='scaleX(0)';});}
    _toastTimer=setTimeout(()=>{toast.classList.remove('show');_toastTimer=null;},dur);
  }

  // ── Loading Overlay — progresso real por etapa ────────────────────────────
  let _lbTimer = null;

  function _lbEl(id) { return document.getElementById(id); }

  function _lbSetProgress(pct, statusMsg) {
    const fill = _lbEl('lbProgressFill');
    const pctEl = _lbEl('lbProgressPct');
    const wrap  = _lbEl('lbProgressWrap');
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (fill) { fill.classList.remove('lb-indeterminate'); fill.style.width = p + '%'; }
    if (pctEl) pctEl.textContent = p + '%';
    if (wrap)  wrap.setAttribute('aria-valuenow', p);
    if (statusMsg) { const el = _lbEl('lbStatus'); if (el) el.textContent = statusMsg; }
  }

  function _lbStepActive(n) {
    [1,2,3,4].forEach(i => {
      const el = _lbEl('lbStep' + i);
      if (!el) return;
      el.classList.remove('lb-active','lb-done');
      if (i < n)  el.classList.add('lb-done');
      if (i === n) el.classList.add('lb-active');
    });
  }

  function lbShow() {
    if (_lbTimer) { clearTimeout(_lbTimer); _lbTimer = null; }
    const b = _lbEl('loadingBanner');
    if (!b) return;

    // Reset estado
    const fill = _lbEl('lbProgressFill');
    if (fill) { fill.classList.add('lb-indeterminate'); fill.style.width = ''; }
    const pctEl = _lbEl('lbProgressPct');
    if (pctEl) pctEl.textContent = '0%';

    [1,2,3,4].forEach(i => {
      const el = _lbEl('lbStep' + i);
      if (el) el.className = 'lb-step';
    });
    _lbStepActive(1);

    const title = _lbEl('lbTitle'); if (title) title.textContent = 'Carregando sistema';
    const status = _lbEl('lbStatus'); if (status) status.textContent = 'Iniciando conexão…';

    const result = _lbEl('lbResult');
    if (result) { result.className = 'lb-result'; }
    const retry = _lbEl('lbRetry');
    if (retry) retry.className = 'lb-retry';

    b.classList.remove('hidden');
    b.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function lbSetStep(n, statusMsg, pct) {
    _lbStepActive(n);
    _lbSetProgress(pct, statusMsg);
  }

  function lbSuccess(n) {
    if (_lbTimer) { clearTimeout(_lbTimer); _lbTimer = null; }
    const b = _lbEl('loadingBanner');
    if (!b) return;

    _lbStepActive(5); // marca todos como done
    _lbSetProgress(100, 'Painel pronto');
    const title = _lbEl('lbTitle'); if (title) title.textContent = 'Carregamento concluído';

    const recNum = _lbEl('lbRecordNum');
    if (recNum) recNum.textContent = n.toLocaleString('pt-BR');
    const result = _lbEl('lbResult');
    if (result) result.className = 'lb-result lb-show lb-success';

    _lbTimer = setTimeout(() => {
      b.classList.remove('visible');
      b.classList.add('hidden');
      document.body.style.overflow = '';
      _lbTimer = null;
    }, 1800);
  }

  function lbError(msg) {
    if (_lbTimer) { clearTimeout(_lbTimer); _lbTimer = null; }
    const b = _lbEl('loadingBanner');
    if (!b) return;

    const title = _lbEl('lbTitle'); if (title) title.textContent = 'Falha no carregamento';
    const status = _lbEl('lbStatus'); if (status) status.textContent = 'Verifique sua conexão e tente novamente';

    const fill = _lbEl('lbProgressFill');
    if (fill) { fill.classList.remove('lb-indeterminate'); fill.style.width = '0%'; }
    const pctEl = _lbEl('lbProgressPct'); if (pctEl) pctEl.textContent = '0%';

    const errMsg = _lbEl('lbErrorMsg');
    if (errMsg) errMsg.textContent = msg || 'Erro de conexão';
    const result = _lbEl('lbResult');
    if (result) result.className = 'lb-result lb-show lb-error';

    const retry = _lbEl('lbRetry');
    if (retry) retry.className = 'lb-retry lb-show';
    // Manter overlay visível + scroll bloqueado até retry
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  function refresh() {
    Kpis.render();
    Charts.renderAll();
    Tables.renderTable();
    Tables.renderSummaryTables();
    if (typeof Alertas !== 'undefined') Alertas.renderizar();
    if (typeof UrlHash !== 'undefined') UrlHash.push();
  }

  async function loadData(force=false) {
    lbShow();
    Charts.showSkeletons();
    try {
      // Etapa 1 — Conectando (0 → 20%)
      lbSetStep(1, 'Conectando ao Apps Script…', 5);
      await Api.fetchFromApi(force);
      lbSetStep(2, 'Dados recebidos — processando…', 40);

      // Etapa 2 → 3 — Populando filtros e aplicando (40 → 70%)
      await new Promise(r => setTimeout(r, 80)); // yield para UI renderizar
      Filters.populateAll();
      lbSetStep(3, 'Normalizando e filtrando registros…', 65);

      await new Promise(r => setTimeout(r, 60));
      Filters.applyFilters();
      lbSetStep(4, 'Renderizando painel…', 82);

      // Etapa 4 — Renderização (82 → 100%)
      await new Promise(r => setTimeout(r, 80));
      refresh();
      lbSuccess(State.getRawData().length);
      if(force) showToast('success','Dados sincronizados',`${State.getRawData().length.toLocaleString('pt-BR')} registros`,3000);
    } catch(err) {
      lbError(err.message);
      showToast('error','Erro ao carregar',err.message,5000);
      const tb=document.getElementById('tableBody');
      if(tb) tb.innerHTML=`<tr><td colspan="10"><div class="table-estado">
        <div class="table-estado-icon" style="background:rgba(239,68,68,.12);color:#ef4444;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
        <span>Falha ao carregar dados</span>
        <button class="table-retry" onclick="App.sync()">Tentar novamente</button>
      </div></td></tr>`;
    }
  }

  async function sync() { await loadData(true); }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  function initSidebar() {
    const menu=document.getElementById('sideMenu');
    const ov=document.getElementById('menuOverlay');
    const hb=document.getElementById('hamburgerBtn');
    const cb=document.getElementById('sideMenuClose');
    if(!menu) return;
    function openM() { menu.classList.add('open');ov?.classList.add('open');hb?.classList.add('open');hb?.setAttribute('aria-expanded','true'); }
    function closeM(){ menu.classList.remove('open');ov?.classList.remove('open');hb?.classList.remove('open');hb?.setAttribute('aria-expanded','false'); }
    hb?.addEventListener('click',()=>menu.classList.contains('open')?closeM():openM());
    cb?.addEventListener('click',closeM);
    ov?.addEventListener('click',closeM);
    document.querySelectorAll('.side-menu-item[data-view]').forEach(item=>{
      item.addEventListener('click',()=>{
        document.querySelectorAll('.side-menu-item').forEach(i=>{i.classList.remove('active-nav');i.removeAttribute('aria-current');});
        item.classList.add('active-nav'); item.setAttribute('aria-current','page');
        document.getElementById(item.dataset.view)?.scrollIntoView({behavior:'smooth',block:'start'});
        if(window.innerWidth<768) closeM();
      });
    });
    document.getElementById('btnSidebarSync')?.addEventListener('click',()=>{ sync(); if(window.innerWidth<768) closeM(); });
  }

  // ── Chart controls (expand + toggle) ─────────────────────────────────────
  function initChartControls() {
    document.querySelectorAll('[data-expand-chart]').forEach(btn=>{
      btn.addEventListener('click',()=>Charts.expandChart(btn.dataset.expandChart));
    });
    document.querySelectorAll('[data-toggle-chart]').forEach(btn=>{
      btn.addEventListener('click',()=>Charts.toggleChartType(btn.dataset.toggleChart));
    });
  }

  // ── Outras inits ──────────────────────────────────────────────────────────
  function initScrollCompact(){
    const hdr=document.querySelector('header'); if(!hdr) return;
    window.addEventListener('scroll',()=>hdr.classList.toggle('hdr-compact',window.scrollY>24),{passive:true});
  }

  function initTheme(){
    const btn=document.getElementById('btnTheme');
    const root=document.documentElement;
    const icon=document.getElementById('themeIcon');
    const MOON='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    const SUN='<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    function set(dark){root.setAttribute('data-theme',dark?'dark':'light');localStorage.setItem('gasto-theme',dark?'dark':'light');if(icon) icon.innerHTML=dark?SUN:MOON;if(typeof Charts!=='undefined'&&Charts.updateTheme) Charts.updateTheme(dark);}
    const saved=localStorage.getItem('gasto-theme');
    set(saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches));
    btn?.addEventListener('click',()=>set(root.getAttribute('data-theme')!=='dark'));
  }

  function syncHeaderHeight(){
    const hdr=document.querySelector('header'); if(!hdr) return;
    const upd=()=>document.documentElement.style.setProperty('--hdr-h',(hdr.getBoundingClientRect().height+20)+'px');
    upd(); new ResizeObserver(upd).observe(hdr);
  }

  function initStickySearch(){
    const bar=document.getElementById('tabelaSearchBar');
    if(!bar||!('IntersectionObserver' in window)) return;
    const s=document.createElement('div'); s.style.cssText='height:1px;margin-top:-1px;';
    bar.parentNode.insertBefore(s,bar);
    new IntersectionObserver(([e])=>bar.classList.toggle('is-stuck',!e.isIntersecting),{threshold:1}).observe(s);
  }

  function initKpiClicks(){
    const card=document.getElementById('kpiMaiorCard');
    card?.addEventListener('click',()=>Kpis.openMaiorDespesaModal());
    card?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ') Kpis.openMaiorDespesaModal();});
  }

  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('toast-close')?.addEventListener('click',()=>document.getElementById('toast')?.classList.remove('show'));
  });

  function init() {
    initSidebar();
    initScrollCompact();
    initTheme();
    syncHeaderHeight();
    Filters.bindEvents();
    Tables.bindEvents();
    if (typeof ResumoPainel !== 'undefined') ResumoPainel.init();
    initKpiClicks();
    initChartControls();
    _initFerramentas();
    setTimeout(initStickySearch,300);
    // Restaurar filtros da URL antes de carregar dados
    if (typeof UrlHash !== 'undefined') {
      UrlHash.init();
      UrlHash.restore();
    }
    loadData(false);
    const v=document.getElementById('versaoSidebar');
    if(v&&typeof CONFIG!=='undefined') v.textContent=CONFIG.VERSAO;
  }

  // ── Ferramentas — sidebar buttons ─────────────────────────────────────────
  function _initFerramentas() {
    document.getElementById('btnFichaVeiculo')?.addEventListener('click', () => {
      if (typeof Veiculo !== 'undefined') Veiculo.abrirBusca();
    });
    document.getElementById('btnComparativo')?.addEventListener('click', () => {
      if (typeof Comparativo !== 'undefined') Comparativo.abrir();
    });
    document.getElementById('btnExportXLSX')?.addEventListener('click', () => {
      if (typeof Exportacao !== 'undefined') Exportacao.exportarXLSX();
    });
    document.getElementById('btnGerarPDF')?.addEventListener('click', () => {
      if (typeof Exportacao !== 'undefined') Exportacao.abrirConfiguradorPDF();
    });
    document.getElementById('btnCopiarLink')?.addEventListener('click', () => {
      if (typeof UrlHash !== 'undefined') UrlHash.copiarLink();
    });

    // Clique em placa na tabela → abre ficha
    document.addEventListener('click', e => {
      const placa = e.target.closest('[data-ficha-placa]')?.dataset.fichaPlaca;
      if (placa && typeof Veiculo !== 'undefined') Veiculo.abrirFicha(placa);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  return { refresh, sync, showToast };
})();