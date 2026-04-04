/**
 * app.js — v3.0
 * Modal utility, toast, loading banner, sidebar, header (sem status/sync).
 */

// ── Modal Utility ─────────────────────────────────────────────────────────
const Modal = (() => {

  function fmtBRL(v) {
    if (!v && v!==0) return '--';
    return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function fmtMes(m) { return (typeof CONFIG!=='undefined'?CONFIG.MESES[m]:'')||String(m||'--'); }

  function open(tipo, data) {
    switch(tipo) {
      case 'detalheRegistro': _openRegistro(data); break;
      case 'chartDetalhe':    _openChart(data);    break;
      case 'evolucaoDetalhe': _openEvolucao(data); break;
    }
  }

  function _panel(html) {
    let overlay = document.getElementById('modalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modalOverlay';
      overlay.className = 'modal-overlay';
      overlay.addEventListener('click', e => { if(e.target===overlay) close(); });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div class="modal-panel" role="dialog" aria-modal="true">${html}</div>`;
    overlay.classList.add('open');
    overlay.querySelector('.modal-panel').style.animation='lgDrop .4s cubic-bezier(.22,1,.36,1) both';
    document.body.style.overflow='hidden';
    const closeBtn = overlay.querySelector('[data-modal-close]');
    closeBtn?.addEventListener('click', close);
    // ESC fecha
    const handler = e => { if(e.key==='Escape'){ close(); document.removeEventListener('keydown',handler); } };
    document.addEventListener('keydown', handler);
  }

  function close() {
    const ov = document.getElementById('modalOverlay');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow='';
  }

  function _openRegistro(r) {
    const sl = typeof Filters!=='undefined' ? Filters.siglaLabel(r.Sigla||'') : r.Sigla||'--';
    _panel(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div class="modal-tag">Registro de Despesa</div>
            <h2 class="modal-title">${r.Modelo || r.Placa || 'Detalhes do Registro'}</h2>
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
        <div class="modal-grid">
          <div class="modal-campo modal-campo-wide"><span class="modal-campo-label">Secretaria</span><span class="modal-campo-valor">${sl}</span></div>
          <div class="modal-campo modal-campo-wide"><span class="modal-campo-label">Departamento</span><span class="modal-campo-valor">${r.Departamento||'--'}</span></div>
          <div class="modal-campo modal-campo-wide"><span class="modal-campo-label">Centro de Custo</span><span class="modal-campo-valor">${r.CentroCusto||'--'}</span></div>
          <div class="modal-campo modal-campo-wide"><span class="modal-campo-label">Classificação</span><span class="modal-campo-valor">${r.Classificacao||'--'}</span></div>
          <div class="modal-campo modal-campo-wide"><span class="modal-campo-label">Empresa</span><span class="modal-campo-valor">${r.Empresa||'--'}</span></div>
        </div>
      </div>
      <div class="modal-footer">
        <span class="modal-footer-hint">Clique fora ou pressione ESC para fechar</span>
        <button class="btn btn-ghost" data-modal-close>Fechar</button>
      </div>`);
  }

  function _openChart(d) {
    const {titulo, registros, tipo} = d;
    const total = registros.reduce((s,r)=>s+r.Valor,0);
    const top5  = [...registros].sort((a,b)=>b.Valor-a.Valor).slice(0,10);
    _panel(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon">
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
          <span class="modal-value-sub">${registros.length.toLocaleString('pt-BR')} registros</span>
        </div>
        <div class="modal-secao-titulo">Top 10 maiores despesas</div>
        <div class="modal-table-wrap">
          <table class="modal-table">
            <thead><tr><th>Placa</th><th>Modelo</th><th>Despesa</th><th class="tr">Valor</th></tr></thead>
            <tbody>${top5.map(r=>`<tr><td class="mono">${r.Placa||'--'}</td><td>${r.Modelo||'--'}</td><td>${r.Despesa||'--'}</td><td class="tr">${fmtBRL(r.Valor)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <span class="modal-footer-hint">${registros.length} registros nesta categoria</span>
        <button class="btn btn-ghost" data-modal-close>Fechar</button>
      </div>`);
  }

  function _openEvolucao(d) {
    const {mes, ano, total, registros} = d;
    const mesNome = fmtMes(mes);
    const bySigla = {};
    registros.forEach(r => { bySigla[r.Sigla||'--']=(bySigla[r.Sigla||'--']||0)+r.Valor; });
    const topSiglas = Object.entries(bySigla).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const byClassif = {};
    registros.forEach(r => { byClassif[r.Classificacao||'--']=(byClassif[r.Classificacao||'--']||0)+r.Valor; });
    const topClassif = Object.entries(byClassif).sort((a,b)=>b[1]-a[1]).slice(0,5);

    _panel(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div>
            <div class="modal-tag">Evolução Mensal</div>
            <h2 class="modal-title">${mesNome} / ${ano}</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="modal-value-destaque">
          <span class="modal-value-label">Total do Período</span>
          <span class="modal-value-num">${fmtBRL(total)}</span>
          <span class="modal-value-sub">${registros.length.toLocaleString('pt-BR')} despesas</span>
        </div>
        <div class="modal-grid-2col">
          <div>
            <div class="modal-secao-titulo">Principais Secretarias</div>
            ${topSiglas.map(([s,v])=>`<div class="modal-row-bar"><span>${s}</span><span class="tr">${fmtBRL(v)}</span></div>`).join('')}
          </div>
          <div>
            <div class="modal-secao-titulo">Principais Categorias</div>
            ${topClassif.map(([c,v])=>`<div class="modal-row-bar"><span class="td-truncate">${c}</span><span class="tr">${fmtBRL(v)}</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <span class="modal-footer-hint">${mesNome} de ${ano}</span>
        <button class="btn btn-ghost" data-modal-close>Fechar</button>
      </div>`);
  }

  return { open, close };
})();

// ── App Orquestrador ──────────────────────────────────────────────────────
const App = (() => {

  // ── Toast ─────────────────────────────────────────────────────────────────
  let _toastTimer = null;
  const TOAST_ICONS = {
    success:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warn:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  function showToast(tipo, titulo, sub='', dur=3500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer=null; }
    const map = {success:'success',ok:'success',error:'error',erro:'error',warn:'warn',info:'info'};
    const t   = map[tipo]||'info';
    document.getElementById('toast-title')?.textContent !== undefined && (document.getElementById('toast-title').textContent=titulo);
    const subEl = document.getElementById('toast-sub');
    if (subEl) { subEl.textContent=sub; subEl.style.display=sub?'block':'none'; }
    const iconEl = document.getElementById('toast-icon-wrap');
    if (iconEl) iconEl.innerHTML=TOAST_ICONS[t]||TOAST_ICONS.info;
    const bar = document.getElementById('toast-bar');
    toast.className=t; toast.classList.add('show');
    if (bar) { bar.style.transition='none'; bar.style.transform='scaleX(1)'; requestAnimationFrame(()=>{ bar.style.transition=`transform ${dur}ms linear`; bar.style.transform='scaleX(0)'; }); }
    _toastTimer = setTimeout(()=>{ toast.classList.remove('show'); _toastTimer=null; }, dur);
  }

  // ── Loading Banner ────────────────────────────────────────────────────────
  const STEPS=['lbStep1','lbStep2','lbStep3','lbStep4'];
  const STEP_LABELS=['Conectando ao Apps Script...','Lendo planilha GERAL...','Normalizando registros...','Renderizando painel...'];
  let _stepIdx=0, _stepTimer=null;

  function lbShow() {
    const b=document.getElementById('loadingBanner'); if(!b) return;
    _stepIdx=0;
    STEPS.forEach((id,i)=>{ const el=document.getElementById(id); if(el) el.className='lb-step'+(i===0?' active':''); });
    _set('lbTitle','Carregando dados'); _set('lbStatus',STEP_LABELS[0]);
    const p=document.getElementById('lbProgressFill');
    if(p){p.classList.add('indeterminate');p.style.width='';}
    const w=document.getElementById('lbSpinnerWrap'); if(w) w.className='lb-spinner-wrap';
    document.getElementById('lbRetry')?.classList.remove('visivel');
    document.getElementById('lbRecordCount')?.classList.remove('visivel');
    b.classList.remove('hidden'); b.classList.add('visible');
    _stepTimer=setInterval(()=>{ if(_stepIdx<STEPS.length-1) _stepAdv(); },1200);
  }

  function _stepAdv() {
    const prev=document.getElementById(STEPS[_stepIdx]); if(prev){prev.classList.remove('active');prev.classList.add('done');}
    _stepIdx++;
    const next=document.getElementById(STEPS[_stepIdx]); if(next) next.classList.add('active');
    _set('lbStatus',STEP_LABELS[_stepIdx]||'');
  }

  function lbSuccess(n) {
    const b=document.getElementById('loadingBanner'); if(!b) return;
    if(_stepTimer){clearInterval(_stepTimer);_stepTimer=null;}
    STEPS.forEach(id=>{ const el=document.getElementById(id); if(el){el.classList.remove('active');el.classList.add('done');} });
    _set('lbTitle','Dados carregados'); _set('lbStatus','Painel atualizado com sucesso');
    const p=document.getElementById('lbProgressFill'); if(p){p.classList.remove('indeterminate');p.style.width='100%';}
    const w=document.getElementById('lbSpinnerWrap'); if(w) w.className='lb-spinner-wrap success';
    const numEl=document.getElementById('lbRecordNum'); if(numEl) numEl.textContent=n.toLocaleString('pt-BR');
    document.getElementById('lbRecordCount')?.classList.add('visivel');
    setTimeout(()=>{ b.classList.remove('visible'); b.classList.add('hidden'); },3000);
  }

  function lbError(msg) {
    const b=document.getElementById('loadingBanner'); if(!b) return;
    if(_stepTimer){clearInterval(_stepTimer);_stepTimer=null;}
    _set('lbTitle','Falha no carregamento'); _set('lbStatus',msg||'Erro de conexão');
    const p=document.getElementById('lbProgressFill'); if(p){p.classList.remove('indeterminate');p.style.width='0';}
    const w=document.getElementById('lbSpinnerWrap'); if(w) w.className='lb-spinner-wrap error';
    document.getElementById('lbRetry')?.classList.add('visivel');
  }

  function _set(id,val){ const el=document.getElementById(id); if(el) el.textContent=val; }

  // ── Data ──────────────────────────────────────────────────────────────────

  function refresh() {
    Kpis.render();
    Charts.renderAll();
    Tables.renderTable();
    Tables.renderSummaryTables();
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
      if (force) showToast('success','Dados sincronizados',`${State.getRawData().length.toLocaleString('pt-BR')} registros`,3000);
    } catch(err) {
      lbError(err.message);
      showToast('error','Erro ao carregar dados',err.message,5000);
      const tb=document.getElementById('tableBody');
      if(tb) tb.innerHTML=`<tr><td colspan="10"><div class="table-estado">
        <div class="table-estado-icon" style="background:rgba(239,68,68,.12);color:#ef4444;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
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
    if (!menu) return;

    function open()  { menu.classList.add('open'); ov?.classList.add('open'); hb?.classList.add('open'); hb?.setAttribute('aria-expanded','true'); }
    function close() { menu.classList.remove('open'); ov?.classList.remove('open'); hb?.classList.remove('open'); hb?.setAttribute('aria-expanded','false'); }
    hb?.addEventListener('click',()=>menu.classList.contains('open')?close():open());
    cb?.addEventListener('click',close);
    ov?.addEventListener('click',close);
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ close(); Modal.close(); } });

    // Navegação
    document.querySelectorAll('.side-menu-item[data-view]').forEach(item=>{
      item.addEventListener('click',()=>{
        document.querySelectorAll('.side-menu-item').forEach(i=>{i.classList.remove('active-nav');i.removeAttribute('aria-current');});
        item.classList.add('active-nav'); item.setAttribute('aria-current','page');
        const el=document.getElementById(item.dataset.view);
        el?.scrollIntoView({behavior:'smooth',block:'start'});
        if(window.innerWidth<768) close();
      });
    });

    // Sync no sidebar
    document.getElementById('btnSidebarSync')?.addEventListener('click',()=>{ sync(); if(window.innerWidth<768) close(); });
  }

  // ── Scroll compacto ───────────────────────────────────────────────────────

  function initScrollCompact() {
    const hdr=document.querySelector('header'); if(!hdr) return;
    window.addEventListener('scroll',()=>{ hdr.classList.toggle('hdr-compact',window.scrollY>24); },{passive:true});
  }

  // ── Tema ──────────────────────────────────────────────────────────────────

  function initTheme() {
    const btn=document.getElementById('btnTheme');
    const root=document.documentElement;
    const icon=document.getElementById('themeIcon');
    const MOON='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    const SUN='<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    function set(dark){ root.setAttribute('data-theme',dark?'dark':'light'); localStorage.setItem('gasto-theme',dark?'dark':'light'); if(icon) icon.innerHTML=dark?SUN:MOON; if(typeof Charts!=='undefined'&&Charts.updateTheme) Charts.updateTheme(dark); }
    const saved=localStorage.getItem('gasto-theme');
    set(saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches));
    btn?.addEventListener('click',()=>set(root.getAttribute('data-theme')!=='dark'));
  }

  // ── Header height CSS var ─────────────────────────────────────────────────
  // FIX: calcula top do pill-wrap + altura do header para --hdr-h correto
  function syncHeaderHeight() {
    const hdr  = document.querySelector('header');
    const pill = document.querySelector('.header-pill-wrap');
    if (!hdr) return;

    function upd() {
      const pillTop  = pill ? parseInt(getComputedStyle(pill).top) || 10 : 10;
      const hdrH     = hdr.getBoundingClientRect().height;
      // total = distância do topo da viewport até o fundo do header em posição sticky
      const total    = pillTop + hdrH;
      document.documentElement.style.setProperty('--hdr-h', total + 'px');
    }
    upd();
    new ResizeObserver(upd).observe(hdr);
    window.addEventListener('scroll', upd, { passive: true });
  }

  // ── Sticky search Registros ───────────────────────────────────────────────
  // FIX: sentinel inserido ANTES do banner (ci-banner), não antes do search bar,
  // para que is-stuck seja ativado assim que o banner sair da tela

  function initStickySearch() {
    const bar     = document.getElementById('tabelaSearchBar');
    const section = document.getElementById('secaoRegistros');
    if (!bar || !section || !('IntersectionObserver' in window)) return;

    // Sentinela no topo da seção Registros — ativa is-stuck quando section sai de cima
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
    section.style.position = 'relative';
    section.prepend(sentinel);

    new IntersectionObserver(([e]) => {
      bar.classList.toggle('is-stuck', !e.isIntersecting);
    }, { threshold: 0, rootMargin: `-${document.documentElement.style.getPropertyValue('--hdr-h') || '68px'} 0px 0px 0px` }).observe(sentinel);
  }

  // ── KPI card click (Maior Despesa) ────────────────────────────────────────

  function initKpiClicks() {
    document.getElementById('kpiMaiorCard')?.addEventListener('click',()=>Kpis.openMaiorDespesaModal());
  }

  // ── Toast close ───────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('toast-close')?.addEventListener('click',()=>{ const t=document.getElementById('toast'); t?.classList.remove('show'); });
  });

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  function init() {
    initSidebar();
    initScrollCompact();
    initTheme();
    syncHeaderHeight();
    Filters.bindEvents();
    Tables.bindEvents();
    initKpiClicks();
    setTimeout(initStickySearch,300);
    loadData(false);
    // Versão na sidebar
    const v=document.getElementById('versaoSidebar');
    if(v&&typeof CONFIG!=='undefined') v.textContent=CONFIG.VERSAO;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  return { refresh, sync, showToast };
})();