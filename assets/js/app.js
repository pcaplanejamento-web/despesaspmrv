/**
 * app.js — Orquestrador principal v2.0
 * Toast system, loading banner detalhado, sidebar, tema, scroll compacto
 */

const App = (() => {

  // ── Toast System ──────────────────────────────────────

  let _toastTimer = null;

  const TOAST_ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warn:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  function showToast(tipo, titulo, subtitulo = '', duracao = 3500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }

    const iconMap  = { success: 'success', ok: 'success', error: 'error', erro: 'error', warn: 'warn', info: 'info' };
    const tipoNorm = iconMap[tipo] || 'info';

    const titleEl = document.getElementById('toast-title');
    const subEl   = document.getElementById('toast-sub');
    const iconEl  = document.getElementById('toast-icon-wrap');
    const bar     = document.getElementById('toast-bar');

    if (titleEl) titleEl.textContent = titulo;
    if (subEl) {
      subEl.textContent = subtitulo;
      subEl.style.display = subtitulo ? 'block' : 'none';
    }
    if (iconEl) iconEl.innerHTML = TOAST_ICONS[tipoNorm] || TOAST_ICONS.info;

    toast.className = tipoNorm;
    toast.classList.add('show');

    // Barra de progresso animada
    if (bar) {
      bar.style.transform = 'scaleX(1)';
      bar.style.transition = `transform ${duracao}ms linear`;
      requestAnimationFrame(() => {
        bar.style.transform = 'scaleX(0)';
      });
    }

    _toastTimer = setTimeout(() => hideToast(), duracao);
  }

  function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) toast.classList.remove('show');
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  }

  // Fechar toast manualmente
  document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('toast-close');
    if (closeBtn) closeBtn.addEventListener('click', hideToast);
  });

  // ── Loading Banner ────────────────────────────────────

  let _bannerStepTimer = null;

  const LB_STEPS = ['lbStep1', 'lbStep2', 'lbStep3', 'lbStep4'];
  const LB_STEP_LABELS = [
    'Conectando ao Apps Script...',
    'Lendo planilha GERAL...',
    'Normalizando registros...',
    'Renderizando painel...',
  ];

  let _lbStepIndex = 0;
  let _lbStepTimer = null;

  function lbShow() {
    const banner = document.getElementById('loadingBanner');
    if (!banner) return;

    _lbStepIndex = 0;
    _resetBannerSteps();

    const title  = document.getElementById('lbTitle');
    const status = document.getElementById('lbStatus');
    const prog   = document.getElementById('lbProgressFill');
    const wrap   = document.getElementById('lbSpinnerWrap');
    const retry  = document.getElementById('lbRetry');
    const count  = document.getElementById('lbRecordCount');

    if (title)  title.textContent  = 'Carregando dados';
    if (status) status.textContent = LB_STEP_LABELS[0];
    if (prog) { prog.classList.add('indeterminate'); prog.style.width = ''; }
    if (wrap) { wrap.className = 'lb-spinner-wrap'; }
    if (retry) retry.classList.remove('visivel');
    if (count) count.classList.remove('visivel');

    banner.classList.remove('hidden');
    banner.classList.add('visible');

    // Avança os steps com delay para simular progresso
    _lbStepTimer = setInterval(() => {
      if (_lbStepIndex < LB_STEPS.length - 1) {
        _advanceBannerStep();
      }
    }, 1200);
  }

  function lbSuccess(numRegistros) {
    const banner = document.getElementById('loadingBanner');
    if (!banner) return;
    if (_lbStepTimer) { clearInterval(_lbStepTimer); _lbStepTimer = null; }

    _allBannerStepsDone();

    const title  = document.getElementById('lbTitle');
    const status = document.getElementById('lbStatus');
    const prog   = document.getElementById('lbProgressFill');
    const wrap   = document.getElementById('lbSpinnerWrap');
    const count  = document.getElementById('lbRecordCount');
    const numEl  = document.getElementById('lbRecordNum');

    if (title)  title.textContent  = 'Dados carregados';
    if (status) status.textContent = 'Painel atualizado com sucesso';
    if (prog) { prog.classList.remove('indeterminate'); prog.style.width = '100%'; }
    if (wrap) wrap.className = 'lb-spinner-wrap success';
    if (numEl) numEl.textContent = numRegistros.toLocaleString('pt-BR');
    if (count) count.classList.add('visivel');

    // Auto-oculta após 3s
    setTimeout(() => {
      banner.classList.remove('visible');
      banner.classList.add('hidden');
    }, 3000);
  }

  function lbError(mensagem) {
    const banner = document.getElementById('loadingBanner');
    if (!banner) return;
    if (_lbStepTimer) { clearInterval(_lbStepTimer); _lbStepTimer = null; }

    const title  = document.getElementById('lbTitle');
    const status = document.getElementById('lbStatus');
    const prog   = document.getElementById('lbProgressFill');
    const wrap   = document.getElementById('lbSpinnerWrap');
    const retry  = document.getElementById('lbRetry');

    if (title)  title.textContent  = 'Falha no carregamento';
    if (status) status.textContent = mensagem || 'Erro de conexao com a API';
    if (prog) { prog.classList.remove('indeterminate'); prog.style.width = '0'; }
    if (wrap) wrap.className = 'lb-spinner-wrap error';
    if (retry) retry.classList.add('visivel');
  }

  function _resetBannerSteps() {
    LB_STEPS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'lb-step';
    });
    const first = document.getElementById(LB_STEPS[0]);
    if (first) first.classList.add('active');
  }

  function _advanceBannerStep() {
    const prev = document.getElementById(LB_STEPS[_lbStepIndex]);
    if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
    _lbStepIndex++;
    const next = document.getElementById(LB_STEPS[_lbStepIndex]);
    if (next) next.classList.add('active');
    const status = document.getElementById('lbStatus');
    if (status && LB_STEP_LABELS[_lbStepIndex]) status.textContent = LB_STEP_LABELS[_lbStepIndex];
  }

  function _allBannerStepsDone() {
    LB_STEPS.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('active'); el.classList.add('done'); }
    });
  }

  // ── Data loading ──────────────────────────────────────

  function refresh() {
    Kpis.render();
    Charts.renderAll();
    Tables.renderTable();
  }

  async function loadData(forceRefresh = false) {
    lbShow();
    Api.setStatus('loading', 'Carregando...');

    try {
      await Api.fetchFromApi(forceRefresh);
      Filters.populateAll();
      Filters.applyFilters();
      refresh();

      const total = State.getRawData().length;
      lbSuccess(total);
      if (forceRefresh) {
        showToast('success', 'Dados sincronizados', `${total.toLocaleString('pt-BR')} registros carregados`, 3000);
      }
    } catch (err) {
      lbError(err.message);
      showToast('error', 'Erro ao carregar dados', err.message, 5000);
      document.getElementById('tableBody').innerHTML = `
        <tr>
          <td colspan="11">
            <div class="table-estado">
              <div class="table-estado-icon" style="background:rgba(239,68,68,.12);color:#ef4444;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <span>Falha ao carregar dados</span>
              <button class="table-retry" onclick="App.sync()">Tentar novamente</button>
            </div>
          </td>
        </tr>`;
    }
  }

  async function sync() {
    await loadData(true);
  }

  // ── Sidebar ───────────────────────────────────────────

  function initSidebar() {
    const menu    = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    const hambBtn = document.getElementById('hamburgerBtn');
    const closeBtn= document.getElementById('sideMenuClose');

    function openMenu() {
      menu.classList.add('open');
      overlay.classList.add('open');
      hambBtn.classList.add('open');
      hambBtn.setAttribute('aria-expanded', 'true');
      overlay.setAttribute('aria-hidden', 'false');
    }
    function closeMenu() {
      menu.classList.remove('open');
      overlay.classList.remove('open');
      hambBtn.classList.remove('open');
      hambBtn.setAttribute('aria-expanded', 'false');
      overlay.setAttribute('aria-hidden', 'true');
    }

    hambBtn?.addEventListener('click', () => menu.classList.contains('open') ? closeMenu() : openMenu());
    closeBtn?.addEventListener('click', closeMenu);
    overlay?.addEventListener('click', closeMenu);

    // Escape fecha menu
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    // Itens de navegacao
    document.querySelectorAll('.side-menu-item[data-view]').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.side-menu-item').forEach(i => {
          i.classList.remove('active-nav');
          i.removeAttribute('aria-current');
        });
        item.classList.add('active-nav');
        item.setAttribute('aria-current', 'page');

        const view = item.dataset.view;
        scrollToSection(view);
        if (window.innerWidth < 768) closeMenu();
      });
    });

    // Filtros rapidos por sigla
    document.querySelectorAll('.side-menu-item[data-filter-sigla]').forEach(item => {
      item.addEventListener('click', () => {
        const sigla = item.dataset.filterSigla;
        const sel = document.getElementById('filterSecretaria');
        if (sel) {
          sel.value = sigla;
          State.setFilter('secretaria', sigla);
          Filters.applyFilters();
          refresh();
          Filters.updateClearButton();
        }
        if (window.innerWidth < 768) closeMenu();
      });
    });
  }

  function scrollToSection(view) {
    const map = {
      'visao-geral': 'secaoKpis',
      'graficos':    'secaoGraficos',
      'registros':   'secaoRegistros',
    };
    const el = document.getElementById(map[view]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Header compacto ao rolar ──────────────────────────

  function initScrollCompact() {
    const header = document.querySelector('header');
    if (!header) return;
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > 24) {
        header.classList.add('hdr-compact');
      } else {
        header.classList.remove('hdr-compact');
      }
      lastScroll = y;
    }, { passive: true });
  }

  // ── Tema claro/escuro ─────────────────────────────────

  function initTheme() {
    const btn  = document.getElementById('btnTheme');
    const root = document.documentElement;
    const icon = document.getElementById('themeIcon');

    const MOON_ICON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    const SUN_ICON  = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

    function setTheme(dark) {
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      localStorage.setItem('gasto-theme', dark ? 'dark' : 'light');
      if (icon) {
        icon.innerHTML = dark ? SUN_ICON : MOON_ICON;
      }
      // Atualiza cores dos graficos
      if (typeof Charts !== 'undefined' && Charts.updateTheme) Charts.updateTheme(dark);
    }

    const saved = localStorage.getItem('gasto-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved === 'dark' || (!saved && prefersDark));

    btn?.addEventListener('click', () => {
      setTheme(root.getAttribute('data-theme') !== 'dark');
    });
  }

  // ── Sync button ───────────────────────────────────────

  function initSyncButton() {
    const btn = document.getElementById('btnSync');
    btn?.addEventListener('click', sync);
  }

  // ── Altura do header para CSS var ─────────────────────

  function syncHeaderHeight() {
    const header = document.querySelector('header');
    if (!header) return;
    const update = () => {
      const h = header.getBoundingClientRect().height + 20; // 20 = top spacing
      document.documentElement.style.setProperty('--hdr-h', h + 'px');
    };
    update();
    new ResizeObserver(update).observe(header);
  }

  // ── sticky search bar detection ───────────────────────

  function initStickySearch() {
    const bar = document.getElementById('tabelaSearchBar');
    if (!bar || !('IntersectionObserver' in window)) return;
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'height:1px;margin-top:-1px;';
    bar.parentNode.insertBefore(sentinel, bar);
    new IntersectionObserver(([entry]) => {
      bar.classList.toggle('is-stuck', !entry.isIntersecting);
    }, { threshold: 1 }).observe(sentinel);
  }

  // ── Bootstrap ─────────────────────────────────────────

  function init() {
    initSidebar();
    initScrollCompact();
    initTheme();
    initSyncButton();
    syncHeaderHeight();
    Filters.bindEvents();
    Tables.bindEvents();
    setTimeout(initStickySearch, 300);
    loadData(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { refresh, sync, showToast };
})();