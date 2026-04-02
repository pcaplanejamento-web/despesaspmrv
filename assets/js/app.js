/**
 * app.js — corrigido v1.1
 * Orquestra inicialização e fluxo de dados entre API e módulos de UI.
 */

const App = (() => {

  function _setLoading(visivel) {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = visivel ? 'flex' : 'none';
  }

  function _setErro(mensagem) {
    const el = document.getElementById('erro-global');
    if (!el) return;
    if (mensagem) { el.textContent = mensagem; el.style.display = 'block'; }
    else { el.style.display = 'none'; }
  }

  async function _carregarFiltros() {
    try {
      const dados = await Api.getFiltros();
      State.setDados('filtrosDisponiveis', dados);
      Filters.popular(dados);
    } catch (err) {
      console.error('[App] Erro filtros:', err);
    }
  }

  async function _renderizar() {
    const filtros = State.getFiltros();
    State.setCarregando(true);
    State.setErro(null);

    try {
      // Busca KPIs e dados em paralelo
      const [kpis, respDados] = await Promise.all([
        Api.getKpis(filtros),
        Api.getDados(filtros),
      ]);

      State.setDados('kpis', kpis);
      State.setDados('dados', respDados);

      // Normaliza registros — API retorna { registros: [...], paginacao: {} }
      const registros = Array.isArray(respDados)
        ? respDados
        : (respDados && respDados.registros ? respDados.registros : []);

      // Renderiza KPIs
      Kpis.renderizar(kpis);

      // Monta agregados a partir dos KPIs (mais eficiente que processar registros brutos)
      const porDespesa = {};
      (kpis.rankingDespesas || []).forEach(i => { porDespesa[i.chave] = i.valor; });

      const porTipo = {};
      (kpis.rankingTipos || []).forEach(i => { porTipo[i.chave] = i.valor; });

      const porSigla = {};
      (kpis.rankingSecretarias || []).forEach(i => { porSigla[i.chave] = i.valor; });

      const porMesAno = kpis.porMes || {};

      // Renderiza gráficos com dados agregados
      Charts._renderizarComAgregados({ porDespesa, porTipo, porSigla, porMesAno });

      // Renderiza tabela com registros brutos
      Tables.renderizar(registros);

    } catch (err) {
      State.setErro('Erro ao carregar dados: ' + err.message);
      console.error('[App] Erro renderizar:', err);
    } finally {
      State.setCarregando(false);
    }
  }

  function _registrarListeners() {
    State.subscribe((chave, estado) => {
      if (chave === 'carregando') _setLoading(estado.carregando);
      if (chave === 'erro') _setErro(estado.erro);
      if (chave === 'filtros') _renderizar();
    });
  }

  function _iniciarIcones() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function init() {
    _iniciarIcones();
    Filters.registrarListeners();
    _registrarListeners();
    await _carregarFiltros();
    await _renderizar();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', App.init);
