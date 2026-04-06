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
    openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div class="modal-tag">Registro de Despesa</div>
            <h2 class="modal-title">${r.Modelo||r.Placa||'Detalhes do Registro'}</h2>
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
          <div class="modal-campo"><span class="modal-campo-label">Placa</span><span class="modal-campo-valor mono">${r.Placa||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Modelo</span><span class="modal-campo-valor">${r.Modelo||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Tipo</span><span class="modal-campo-valor">${r.Tipo||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Despesa</span><span class="modal-campo-valor">${r.Despesa||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Período</span><span class="modal-campo-valor">${fmtMes(r.Mes)} / ${r.Ano||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Contrato</span><span class="modal-campo-valor">${r.Contrato||'--'}</span></div>
        </div>
        <div class="modal-secao-titulo">Localização</div>
        <div class="modal-grid modal-grid-2">
          <div class="modal-campo"><span class="modal-campo-label">Secretaria</span><span class="modal-campo-valor">${sl(r.Sigla)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Departamento</span><span class="modal-campo-valor">${r.Departamento||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Centro de Custo</span><span class="modal-campo-valor">${r.CentroCusto||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Classificação</span><span class="modal-campo-valor">${r.Classificacao||'--'}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Empresa</span><span class="modal-campo-valor">${r.Empresa||'--'}</span></div>
        </div>
      </div>
      <div class="modal-footer modal-footer-only-hint">
        <span class="modal-footer-hint">ESC ou clique fora para fechar</span>
      </div>`);
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

  // ── Loading Banner ────────────────────────────────────────────────────────
  const STEPS=['lbStep1','lbStep2','lbStep3','lbStep4'];
  const STEP_LABELS=['Conectando ao Apps Script...','Lendo planilha GERAL...','Normalizando registros...','Renderizando painel...'];
  let _sIdx=0,_sTimer=null;

  function lbShow() {
    const b=document.getElementById('loadingBanner'); if(!b) return;
    _sIdx=0;
    STEPS.forEach((id,i)=>{ const el=document.getElementById(id); if(el) el.className='lb-step'+(i===0?' active':''); });
    _s('lbTitle','Carregando dados'); _s('lbStatus',STEP_LABELS[0]);
    const p=document.getElementById('lbProgressFill'); if(p){p.classList.add('indeterminate');p.style.width='';}
    const w=document.getElementById('lbSpinnerWrap'); if(w) w.className='lb-spinner-wrap';
    document.getElementById('lbRetry')?.classList.remove('visivel');
    document.getElementById('lbRecordCount')?.classList.remove('visivel');
    b.classList.remove('hidden'); b.classList.add('visible');
    _sTimer=setInterval(()=>{ if(_sIdx<STEPS.length-1){ const pv=document.getElementById(STEPS[_sIdx]); if(pv){pv.classList.remove('active');pv.classList.add('done');} _sIdx++; const nx=document.getElementById(STEPS[_sIdx]); if(nx) nx.classList.add('active'); _s('lbStatus',STEP_LABELS[_sIdx]||''); } },1200);
  }

  function lbSuccess(n) {
    const b=document.getElementById('loadingBanner'); if(!b) return;
    if(_sTimer){clearInterval(_sTimer);_sTimer=null;}
    STEPS.forEach(id=>{ const el=document.getElementById(id); if(el){el.classList.remove('active');el.classList.add('done');} });
    _s('lbTitle','Dados carregados'); _s('lbStatus','Painel atualizado');
    const p=document.getElementById('lbProgressFill'); if(p){p.classList.remove('indeterminate');p.style.width='100%';}
    const w=document.getElementById('lbSpinnerWrap'); if(w) w.className='lb-spinner-wrap success';
    const ne=document.getElementById('lbRecordNum'); if(ne) ne.textContent=n.toLocaleString('pt-BR');
    document.getElementById('lbRecordCount')?.classList.add('visivel');
    setTimeout(()=>{ b.classList.remove('visible'); b.classList.add('hidden'); },3000);
  }

  function lbError(msg) {
    const b=document.getElementById('loadingBanner'); if(!b) return;
    if(_sTimer){clearInterval(_sTimer);_sTimer=null;}
    _s('lbTitle','Falha no carregamento'); _s('lbStatus',msg||'Erro de conexão');
    const p=document.getElementById('lbProgressFill'); if(p){p.classList.remove('indeterminate');p.style.width='0';}
    const w=document.getElementById('lbSpinnerWrap'); if(w) w.className='lb-spinner-wrap error';
    document.getElementById('lbRetry')?.classList.add('visivel');
  }

  function _s(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }

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
      await Api.fetchFromApi(force);
      Filters.populateAll();
      Filters.applyFilters();
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