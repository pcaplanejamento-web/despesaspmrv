/**
 * app.js — Orquestrador principal da aplicação
 * v1.2.0
 *
 * BUGS CORRIGIDOS NESTA VERSÃO:
 *
 * [B6] hideLoadingBanner(): setTimeout sem referência causava race condition —
 *      se sync() fosse chamado novamente antes dos 2200 ms, o timer antigo
 *      disparava e escondia o banner enquanto o novo carregamento ainda
 *      estava em curso. Corrigido com _bannerTimer cancelável.
 *
 * [B7] initSidebar(): aria-expanded do sidebarToggle estava hardcoded como
 *      "true" no HTML mas o JS iniciava a sidebar como fechada em mobile.
 *      Agora o estado inicial do atributo é definido programaticamente no
 *      init, garantindo consistência entre atributo ARIA e estado visual.
 */

const App = (() => {
  // ----- Atualização da UI com dados filtrados -----

  function refresh() {
    Kpis.render();
    Charts.renderAll();
    Tables.renderTable();
  }

  // ----- Banner de carregamento -----

  let _bannerTimer = null; // [B6] referência do timer para cancelamento

  function showLoadingBanner(mensagem) {
    // [B6] Cancela qualquer timer de ocultação pendente ao mostrar novamente
    if (_bannerTimer) {
      clearTimeout(_bannerTimer);
      _bannerTimer = null;
    }

    let banner = document.getElementById('loadingBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'loadingBanner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.innerHTML = `
        <div class="loading-banner-inner">
          <span class="loading-spinner" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </span>
          <span class="loading-banner-icon-state" id="loadingBannerIcon" aria-hidden="true"></span>
          <span class="loading-banner-text" id="loadingBannerText"></span>
          <span class="loading-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
        </div>
      `;
      const pageContent = document.getElementById('pageContent');
      if (pageContent && pageContent.parentNode) {
        pageContent.parentNode.insertBefore(banner, pageContent);
      } else {
        document.body.appendChild(banner);
      }
    }

    document.getElementById('loadingBannerText').textContent = mensagem || 'Carregando dados da planilha...';
    banner.classList.remove('loading-banner--hidden', 'loading-banner--success', 'loading-banner--error');
    banner.classList.add('loading-banner--visible');
  }

  function hideLoadingBanner(tipo) {
    const banner = document.getElementById('loadingBanner');
    if (!banner) return;

    if (tipo === 'success') {
      banner.classList.add('loading-banner--success');
      document.getElementById('loadingBannerText').textContent = 'Dados carregados com sucesso!';
    } else if (tipo === 'error') {
      banner.classList.add('loading-banner--error');
      document.getElementById('loadingBannerText').textContent = 'Falha ao carregar. Verifique a conexão.';
    }

    // [B6] Guarda referência para poder cancelar se loadData for chamado
    // novamente antes do timer disparar
    _bannerTimer = setTimeout(() => {
      banner.classList.remove('loading-banner--visible');
      banner.classList.add('loading-banner--hidden');
      _bannerTimer = null;
    }, tipo ? 2200 : 0);
  }

  // ----- Carregamento de dados -----

  async function loadData(forceRefresh = false) {
    Api.setStatus('loading', 'Carregando...');
    Charts.showSkeletons();
    showLoadingBanner(forceRefresh ? 'Sincronizando dados da planilha...' : 'Carregando dados da planilha...');

    try {
      await Api.fetchFromApi(forceRefresh);
      Filters.populateAll();
      Filters.applyFilters();
      refresh();
      hideLoadingBanner('success');
    } catch (err) {
      hideLoadingBanner('error');
      document.getElementById('tableBody').innerHTML =
        `<tr><td colspan="12" class="table-error">
          Erro ao carregar dados.
          <button class="btn-retry" onclick="App.sync()">Tentar novamente</button>
        </td></tr>`;
    }
  }

  // ----- Sincronização forçada -----

  async function sync() {
    await loadData(true);
  }

  // ----- Sidebar -----

  function initSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const toggle   = document.getElementById('sidebarToggle');
    const menuBtn  = document.getElementById('topbarMenuBtn');
    const overlay  = document.getElementById('sidebarOverlay');
    const wrapper  = document.getElementById('mainWrapper');

    function isMobile() { return window.innerWidth < 768; }

    function openSidebar() {
      sidebar.classList.add('sidebar--open');
      sidebar.classList.remove('sidebar--closed');
      if (overlay) { overlay.classList.add('overlay--visible'); overlay.setAttribute('aria-hidden', 'false'); }
      if (menuBtn)  menuBtn.setAttribute('aria-expanded', 'true');
      if (toggle)   toggle.setAttribute('aria-expanded', 'true');
      if (wrapper && !isMobile()) wrapper.classList.add('main-wrapper--shifted');
    }

    function closeSidebar() {
      sidebar.classList.remove('sidebar--open');
      sidebar.classList.add('sidebar--closed');
      if (overlay) { overlay.classList.remove('overlay--visible'); overlay.setAttribute('aria-hidden', 'true'); }
      if (menuBtn)  menuBtn.setAttribute('aria-expanded', 'false');
      if (toggle)   toggle.setAttribute('aria-expanded', 'false');
      if (wrapper)  wrapper.classList.remove('main-wrapper--shifted');
    }

    function toggleSidebar() {
      if (sidebar.classList.contains('sidebar--closed')) openSidebar();
      else closeSidebar();
    }

    if (toggle)  toggle.addEventListener('click', toggleSidebar);
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // [B7] Define estado ARIA inicial programaticamente em vez de depender
    // do valor hardcoded no HTML (que era sempre 'true' independente do viewport)
    if (!isMobile()) {
      openSidebar();
    } else {
      closeSidebar(); // garante que aria-expanded='false' em mobile
    }

    window.addEventListener('resize', () => {
      if (!isMobile() && !sidebar.classList.contains('sidebar--closed')) {
        wrapper && wrapper.classList.add('main-wrapper--shifted');
      } else if (isMobile()) {
        wrapper && wrapper.classList.remove('main-wrapper--shifted');
      }
    });

    // Navegação por itens
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(i => {
          i.classList.remove('active');
          i.removeAttribute('aria-current');
        });
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
        if (isMobile()) closeSidebar();
      });
    });
  }

  // ----- Botão Sincronizar -----

  function initSyncButton() {
    const btn = document.getElementById('btnSync');
    if (btn) btn.addEventListener('click', sync);
  }

  // ----- Bootstrap -----

  function init() {
    initSidebar();
    initSyncButton();
    Filters.bindEvents();
    Tables.bindEvents();
    loadData(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { refresh, sync };
})();