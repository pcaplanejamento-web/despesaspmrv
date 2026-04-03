/**
 * app.js — Orquestrador principal da aplicação
 *
 * Responsabilidades:
 * - Inicializar todos os módulos na ordem correta
 * - Carregar dados (respeitando o cache do State)
 * - Coordenar o botão de sincronização
 * - Controlar a navegação do sidebar
 * - Gerenciar comportamento responsivo do menu
 */

const App = (() => {
  // ----- Atualização da UI com dados filtrados -----

  function refresh() {
    Kpis.render();
    Charts.renderAll();
    Tables.renderTable();
  }

  // ----- Carregamento de dados -----

  async function loadData(forceRefresh = false) {
    Api.setStatus('loading', 'Carregando...');
    Charts.showSkeletons();

    try {
      await Api.fetchFromApi(forceRefresh);
      Filters.populateAll();
      Filters.applyFilters();
      refresh();
    } catch (err) {
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

    // Em telas grandes, sidebar começa aberta
    if (!isMobile()) openSidebar();

    window.addEventListener('resize', () => {
      if (!isMobile() && !sidebar.classList.contains('sidebar--closed')) {
        wrapper && wrapper.classList.add('main-wrapper--shifted');
      } else if (isMobile()) {
        wrapper && wrapper.classList.remove('main-wrapper--shifted');
      }
    });

    // Navegação por itens
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
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

  // Inicia após DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { refresh, sync };
})();
