/**
 * app.js
 * Ponto de entrada da aplicação.
 * Orquestra a inicialização dos módulos e reage a mudanças de estado.
 * Não contém regras de negócio — apenas coordena os outros módulos.
 */

const App = (() => {

  /**
   * Exibe ou oculta o indicador de carregamento global.
   * @param {boolean} visivel
   */
  function _setLoading(visivel) {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = visivel ? 'flex' : 'none';
  }

  /**
   * Exibe uma mensagem de erro na interface.
   * @param {string|null} mensagem
   */
  function _setErro(mensagem) {
    const el = document.getElementById('erro-global');
    if (!el) return;
    if (mensagem) {
      el.textContent = mensagem;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  /**
   * Carrega os filtros disponíveis e popula os seletores.
   */
  async function _carregarFiltros() {
    try {
      const dados = await Api.getFiltros();
      State.setDados('filtrosDisponiveis', dados);
      Filters.popular(dados);
    } catch (err) {
      console.error('[App] Erro ao carregar filtros:', err);
    }
  }

  /**
   * Carrega e renderiza todos os dados do painel com os filtros ativos.
   */
  async function _renderizar() {
    const filtros = State.getFiltros();
    State.setCarregando(true);
    State.setErro(null);

    try {
      // KPIs e dados em paralelo para economizar tempo
      const [kpis, dados] = await Promise.all([
        Api.getKpis(filtros),
        Api.getDados(filtros),
      ]);

      State.setDados('kpis', kpis);
      State.setDados('dados', dados);

      Kpis.renderizar(kpis);
      Charts.renderizar(dados);
      Tables.renderizar(dados);

    } catch (err) {
      State.setErro(err.message);
      console.error('[App] Erro ao renderizar:', err);
    } finally {
      State.setCarregando(false);
    }
  }

  /**
   * Registra reações a mudanças de estado.
   */
  function _registrarListeners() {
    State.subscribe((chave, estado) => {
      if (chave === 'carregando') _setLoading(estado.carregando);
      if (chave === 'erro') _setErro(estado.erro);
      if (chave === 'filtros') _renderizar();
    });
  }

  /**
   * Inicializa os ícones Lucide (se disponível).
   */
  function _iniciarIcones() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Ponto de entrada público — chamado pelo HTML após carregar todos os scripts.
   */
  async function init() {
    _iniciarIcones();
    _registrarListeners();
    await _carregarFiltros();
    await _renderizar();
  }

  return { init };

})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', App.init);
