/**
 * ux.js — v1.0
 * Melhorias de UX:
 *   • Atalhos de teclado (/, F, A, V, ESC, Mod+S, Mod+P)
 *   • Modo Apresentação (slideshow automático)
 *   • Filtros Favoritos (salvo em localStorage)
 *   • Tour Guiado (5 passos, primeira visita)
 */
const UX = (() => {

  // ══════════════════════════════════════════════════════
  //  1. ATALHOS DE TECLADO
  // ══════════════════════════════════════════════════════

  const ATALHOS = [
    { keys:['/'],          desc:'Focar na busca de registros',      fn:()=>_focarBusca() },
    { keys:['f','F'],      desc:'Abrir Ficha do Veículo',           fn:()=>typeof Veiculo!=='undefined'&&Veiculo.abrirBusca() },
    { keys:['a','A'],      desc:'Ir para Alertas',                  fn:()=>_navegar('secaoAlertas') },
    { keys:['v','V'],      desc:'Ir para Visualizações',            fn:()=>_navegar('secaoVisualizacoes') },
    { keys:['g','G'],      desc:'Ir para Gráficos',                 fn:()=>_navegar('secaoGraficos') },
    { keys:['k','K'],      desc:'Ir para KPIs',                     fn:()=>_navegar('secaoKpis') },
    { keys:['r','R'],      desc:'Ir para Registros',                fn:()=>_navegar('secaoRegistros') },
    { keys:['p','P'],      desc:'Modo Apresentação (toggle)',        fn:()=>toggleApresentacao() },
    { keys:['?'],          desc:'Ver todos os atalhos',             fn:()=>mostrarAjudaAtalhos() },
    { keys:['Escape'],     desc:'Fechar modal / sair de modo',      fn:()=>_escape() },
  ];

  function _focarBusca(){
    const el=document.getElementById('tableSearch');
    if(el){ el.focus(); el.select(); _navegar('secaoRegistros',false); }
  }
  function _navegar(id, scroll=true){
    if(scroll) document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function _escape(){
    if(typeof Modal!=='undefined') Modal.close();
    if(_apresentacaoAtiva) pararApresentacao();
  }

  function initAtalhos() {
    document.addEventListener('keydown', e => {
      // Ignorar se estiver em input/textarea/select
      const tag=(e.target.tagName||'').toLowerCase();
      if(['input','textarea','select'].includes(tag)&&e.key!=='Escape') return;
      // Ignorar se modal aberto (exceto ESC)
      if(e.key==='Escape') { _escape(); return; }

      // Ctrl/Cmd + S = Sincronizar
      if((e.ctrlKey||e.metaKey)&&e.key==='s') { e.preventDefault(); App?.sync(); return; }

      // Outros atalhos
      const atalho = ATALHOS.find(a=>a.keys.includes(e.key));
      if(atalho&&!e.ctrlKey&&!e.metaKey&&!e.altKey) {
        e.preventDefault();
        atalho.fn();
      }
    });
  }

  function mostrarAjudaAtalhos() {
    if(typeof Modal==='undefined') return;
    Modal.openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:var(--accent-soft);color:var(--accent)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>
          </div>
          <div>
            <div class="modal-tag">Guia Rápido</div>
            <h2 class="modal-title">Atalhos de Teclado</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="atalhos-grid">
          ${ATALHOS.map(a=>`
            <div class="atalho-item">
              <div class="atalho-keys">${a.keys.map(k=>`<kbd class="atalho-kbd">${k==='Escape'?'ESC':k==='/'?'/':k}</kbd>`).join(' ')}</div>
              <div class="atalho-desc">${a.desc}</div>
            </div>`).join('')}
          <div class="atalho-item">
            <div class="atalho-keys"><kbd class="atalho-kbd">Ctrl</kbd><kbd class="atalho-kbd">S</kbd></div>
            <div class="atalho-desc">Sincronizar dados</div>
          </div>
        </div>
      </div>`, 'modal-panel');
  }

  // ══════════════════════════════════════════════════════
  //  2. MODO APRESENTAÇÃO
  // ══════════════════════════════════════════════════════

  let _apresentacaoAtiva=false, _apresentacaoTimer=null, _apresentacaoIdx=0;

  const SECOES_APRESENTACAO=[
    'secaoKpis','secaoGraficos','secaoVisualizacoes','secaoTabSumarizadas',
    'secaoAnalise','secaoAlertas',
  ];
  const DURACAO_SLIDE=10000; // 10s por slide

  function toggleApresentacao() {
    _apresentacaoAtiva ? pararApresentacao() : iniciarApresentacao();
  }

  function iniciarApresentacao() {
    _apresentacaoAtiva=true;
    _apresentacaoIdx=0;
    document.body.classList.add('modo-apresentacao');
    // Criar overlay de controle
    const ctrl=document.createElement('div');
    ctrl.id='apresentacaoCtrl';
    ctrl.innerHTML=`
      <div class="apres-info">
        <span class="apres-dot"></span>
        <span id="apresSlideLabel">Carregando…</span>
      </div>
      <div class="apres-btns">
        <button onclick="UX.slidePrev()" title="Slide anterior">‹</button>
        <button onclick="UX.slideNext()" title="Próximo slide">›</button>
        <button onclick="UX.pararApresentacao()" title="Encerrar (ESC)"></button>
      </div>
      <div class="apres-progress"><div id="apresProgressBar"></div></div>`;
    document.body.appendChild(ctrl);
    _irSlide(0);
    App?.showToast('info','Modo Apresentação','Pressione ESC para sair · P para pausar',3000);
  }

  function pararApresentacao() {
    _apresentacaoAtiva=false;
    clearTimeout(_apresentacaoTimer);
    document.body.classList.remove('modo-apresentacao');
    document.getElementById('apresentacaoCtrl')?.remove();
  }

  function _irSlide(idx) {
    clearTimeout(_apresentacaoTimer);
    _apresentacaoIdx=((idx%SECOES_APRESENTACAO.length)+SECOES_APRESENTACAO.length)%SECOES_APRESENTACAO.length;
    const secaoId=SECOES_APRESENTACAO[_apresentacaoIdx];
    const secao=document.getElementById(secaoId);
    if(secao) secao.scrollIntoView({behavior:'smooth',block:'start'});
    // Label
    const lbl=document.getElementById('apresSlideLabel');
    const nomes={'secaoKpis':'Indicadores','secaoGraficos':'Gráficos',
      'secaoVisualizacoes':'Visualizações','secaoTabSumarizadas':'Resumos',
      'secaoAnalise':'Análises','secaoAlertas':'Alertas'};
    if(lbl) lbl.textContent=`${_apresentacaoIdx+1}/${SECOES_APRESENTACAO.length} — ${nomes[secaoId]||secaoId}`;
    // Barra de progresso
    const bar=document.getElementById('apresProgressBar');
    if(bar){ bar.style.transition='none'; bar.style.width='0%'; requestAnimationFrame(()=>{ bar.style.transition=`width ${DURACAO_SLIDE}ms linear`; bar.style.width='100%'; }); }
    _apresentacaoTimer=setTimeout(()=>{ if(_apresentacaoAtiva) _irSlide(_apresentacaoIdx+1); },DURACAO_SLIDE);
  }

  function slideNext() { if(_apresentacaoAtiva) _irSlide(_apresentacaoIdx+1); }
  function slidePrev() { if(_apresentacaoAtiva) _irSlide(_apresentacaoIdx-1); }

  // ══════════════════════════════════════════════════════
  //  3. FILTROS FAVORITOS
  // ══════════════════════════════════════════════════════

  const LS_KEY='gasto-rv-favoritos';

  function carregarFavoritos() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch{ return []; }
  }

  function salvarFavorito(nome) {
    if(!nome?.trim()) return;
    const favs=carregarFavoritos();
    const filtros=State.getFilters();
    // Verificar se tem algo para salvar
    const temFiltro=Object.values(filtros).some(v=>Array.isArray(v)&&v.length>0);
    if(!temFiltro){ App?.showToast('warn','Nenhum filtro ativo','Selecione filtros antes de salvar'); return; }
    const idx=favs.findIndex(f=>f.nome===nome.trim());
    const novo={nome:nome.trim(),filtros,criadoEm:Date.now()};
    if(idx>=0) favs[idx]=novo; else favs.push(novo);
    localStorage.setItem(LS_KEY,JSON.stringify(favs.slice(0,10))); // max 10
    renderizarFavoritos();
    App?.showToast('success',`Favorito salvo: "${nome.trim()}"`,`${Object.values(filtros).flat().length} filtros ativos`);
  }

  function aplicarFavorito(nome) {
    const favs=carregarFavoritos();
    const fav=favs.find(f=>f.nome===nome);
    if(!fav) return;
    Object.entries(fav.filtros).forEach(([k,v])=>State.setMultiFilter(k,v));
    if(typeof Filters!=='undefined') Filters.applyFilters();
    App?.refresh();
    App?.showToast('info',`Favorito aplicado: "${nome}"`);
  }

  function removerFavorito(nome) {
    const favs=carregarFavoritos().filter(f=>f.nome!==nome);
    localStorage.setItem(LS_KEY,JSON.stringify(favs));
    renderizarFavoritos();
  }

  function renderizarFavoritos() {
    const container=document.getElementById('favoritosContainer');
    if(!container) return;
    const favs=carregarFavoritos();
    if(!favs.length){
      container.innerHTML='<span class="favs-vazio">Nenhum favorito salvo</span>';
      return;
    }
    container.innerHTML=favs.map(f=>`
      <div class="fav-chip" title="Aplicar: ${f.nome}">
        <button class="fav-chip-apply" onclick="UX.aplicarFavorito('${f.nome.replace(/'/g,"\\'")}')">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          ${f.nome}
        </button>
        <button class="fav-chip-del" onclick="UX.removerFavorito('${f.nome.replace(/'/g,"\\'")}')}" title="Remover favorito">×</button>
      </div>`).join('');
  }

  function abrirModalSalvarFavorito() {
    if(typeof Modal==='undefined') return;
    Modal.openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:rgba(240,155,10,.12);color:#b45309">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div>
            <div class="modal-tag">Filtros Favoritos</div>
            <h2 class="modal-title">Salvar Seleção Atual</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Dê um nome para salvar os filtros ativos e reutilizá-los depois.</p>
        <div style="display:flex;gap:10px;align-items:center">
          <input id="favNomeInput" class="veiculo-busca-input" placeholder='Ex: "FMS 2025" ou "Manutenção SMIDU"' style="flex:1">
          <button onclick="UX.salvarFavorito(document.getElementById('favNomeInput')?.value)" class="btn-veiculo-busca">Salvar</button>
        </div>
        <div id="favListaModal" style="margin-top:16px"></div>
      </div>`, 'modal-panel');

    // Popular lista de favoritos existentes no modal
    const favs=carregarFavoritos();
    const lista=document.getElementById('favListaModal');
    if(lista&&favs.length){
      lista.innerHTML='<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin-bottom:8px">Favoritos salvos</p>'+
        favs.map(f=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-dim)">
          <span style="font-size:13px;font-weight:600">${f.nome}</span>
          <button onclick="UX.removerFavorito('${f.nome.replace(/'/g,"\\'")}');document.getElementById('favListaModal').remove()" style="background:none;border:none;color:#e11d48;cursor:pointer;font-size:13px;font-weight:700">Remover</button>
        </div>`).join('');
    }
    document.getElementById('favNomeInput')?.focus();
  }

  // ══════════════════════════════════════════════════════
  //  4. TOUR GUIADO
  // ══════════════════════════════════════════════════════

  const TOUR_KEY='gasto-rv-tour-visto';
  const TOUR_PASSOS=[
    { elementId:'secaoKpis',      titulo:'Indicadores — KPIs',      texto:'Aqui você vê os totais gerais. Clique no card "Maior Despesa" para ver todos os detalhes do item mais caro do período.' },
    { elementId:'secaoFiltros',   titulo:'Filtros',                 texto:'Selecione ano, tipo de despesa, secretaria e classificação. Os gráficos e tabelas atualizam em tempo real.' },
    { elementId:'secaoGraficos',  titulo:'Análise Gráfica',         texto:'Clique em qualquer barra ou ponto para ver detalhes. Use os botões no banner para alternar entre barras e pizza ou expandir.' },
    { elementId:'secaoAnalise',   titulo:'Análises Avançadas',      texto:'Projeção dos próximos 3 meses, sazonalidade histórica, score de saúde da frota e rastreamento de veículos entre secretarias.' },
    { elementId:'secaoVisualizacoes',titulo:'Visualizações',       texto:'Heatmap mensal, Treemap de secretarias, Dispersão por veículo e Waterfall de variação anual. Clique nos elementos interativos.' },
  ];

  let _tourAtivo=false, _tourPasso=0, _tourOverlay=null;

  function iniciarTour(forcado=false) {
    if(!forcado&&localStorage.getItem(TOUR_KEY)) return;
    _tourAtivo=true;
    _tourPasso=0;
    localStorage.setItem(TOUR_KEY,'1');
    _renderTourPasso();
  }

  function _renderTourPasso() {
    document.getElementById('tourOverlay')?.remove();
    if(!_tourAtivo||_tourPasso>=TOUR_PASSOS.length){ _tourAtivo=false; return; }

    const passo=TOUR_PASSOS[_tourPasso];
    const alvo=document.getElementById(passo.elementId);
    if(alvo) alvo.scrollIntoView({behavior:'smooth',block:'start'});

    const overlay=document.createElement('div');
    overlay.id='tourOverlay';
    const total=TOUR_PASSOS.length;
    overlay.innerHTML=`
      <div class="tour-panel" id="tourPanel">
        <div class="tour-header">
          <span class="tour-step">${_tourPasso+1} / ${total}</span>
          <button class="tour-close" onclick="UX.encerrarTour()">×</button>
        </div>
        <h3 class="tour-title">${passo.titulo}</h3>
        <p class="tour-text">${passo.texto}</p>
        <div class="tour-dots">
          ${TOUR_PASSOS.map((_,i)=>`<span class="tour-dot${i===_tourPasso?' active':''}"></span>`).join('')}
        </div>
        <div class="tour-footer">
          ${_tourPasso>0?'<button class="tour-btn tour-btn-sec" onclick="UX.tourPrev()">‹ Anterior</button>':'<span></span>'}
          ${_tourPasso<total-1
            ?'<button class="tour-btn tour-btn-pri" onclick="UX.tourNext()">Próximo ›</button>'
            :'<button class="tour-btn tour-btn-pri" onclick="UX.encerrarTour()">Concluir ✓</button>'}
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Posicionar próximo ao elemento alvo
    setTimeout(()=>{
      const panel=document.getElementById('tourPanel');
      if(!panel||!alvo) return;
      const rect=alvo.getBoundingClientRect();
      const pH=panel.offsetHeight, pW=panel.offsetWidth;
      let top=rect.bottom+window.scrollY+12;
      let left=Math.min(Math.max(16,rect.left+window.scrollX),window.innerWidth-pW-16);
      if(top+pH>window.scrollY+window.innerHeight-20) top=rect.top+window.scrollY-pH-12;
      panel.style.top=top+'px'; panel.style.left=left+'px';
    },400);
  }

  function tourNext(){ _tourPasso++; _renderTourPasso(); }
  function tourPrev(){ _tourPasso=Math.max(0,_tourPasso-1); _renderTourPasso(); }
  function encerrarTour(){ _tourAtivo=false; document.getElementById('tourOverlay')?.remove(); }

  // ══════════════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════════════

  function init() {
    initAtalhos();
    renderizarFavoritos();
    // Binds dos botões na sidebar
    document.getElementById('btnModoApresentacao')?.addEventListener('click',toggleApresentacao);
    document.getElementById('btnSalvarFavorito')?.addEventListener('click',abrirModalSalvarFavorito);
    document.getElementById('btnAjudaAtalhos')?.addEventListener('click',mostrarAjudaAtalhos);
    document.getElementById('btnIniciarTour')?.addEventListener('click',()=>iniciarTour(true));
    // Tour automático na primeira visita (após 1.5s)
    setTimeout(()=>iniciarTour(false),1500);
  }

  return {
    init, toggleApresentacao, iniciarApresentacao, pararApresentacao,
    slideNext, slidePrev,
    salvarFavorito, aplicarFavorito, removerFavorito, abrirModalSalvarFavorito,
    iniciarTour, tourNext, tourPrev, encerrarTour,
    mostrarAjudaAtalhos,
  };
})();
