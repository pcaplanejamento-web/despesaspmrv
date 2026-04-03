/**
 * config.js — Configurações globais do sistema
 * ÚNICO arquivo a editar ao trocar de ambiente ou planilha.
 */

const CONFIG = Object.freeze({
  // URL publicada do Google Apps Script (Web App)
  // Substitua após publicar o script — veja docs/apps-script-deploy.md

  API_URL: 'https://script.google.com/macros/s/AKfycbzs3Xz8doXZ8b4mc-u1N4hfVM6NrwGiMffIPtbrZcvHCn3WqNK9ux7EfDpu2FQAwukIpg/exec',

  // Timeout máximo para chamadas à API (ms)
  API_TIMEOUT: 15000,

  // Cache TTL em milissegundos (5 minutos)
  CACHE_TTL_MS: 5 * 60 * 1000,

  // Debounce para filtros em milissegundos
  FILTER_DEBOUNCE_MS: 300,

  // Paginação padrão
  DEFAULT_PAGE_SIZE: 25,

  // Versão do sistema
  VERSAO: '1.1.0',

  // Nome e subtítulo exibidos na interface
  NOME_SISTEMA: 'Gastos — Rio Verde',
  SUBTITULO: 'Combustível e Manutenção de Frota',

  // Nomes dos meses por extenso (índice 1 = Janeiro)
  MESES: [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],

  // Cores funcionais — alinhadas ao design system PCA
  CORES: {
    combustivel: '#185FA5',
    manutencao:  '#D85A30',
    veiculo:     '#1c64f2',
    maquina:     '#BA7517',
    primaria:    '#185FA5',
    secundaria:  '#1D9E75',
    sucesso:     '#057a55',
    alerta:      '#D85A30',
    critico:     '#e02424',
    info:        '#0694a2',
    neutro:      '#73726c',
  },

  // Paleta para série de gráficos
  PALETA_GRAFICOS: [
    '#185FA5', '#1D9E75', '#D85A30', '#BA7517',
    '#534AB7', '#993556', '#3B6D11', '#73726c',
  ],
});
