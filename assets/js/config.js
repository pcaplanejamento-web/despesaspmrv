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
  VERSAO: '3.6.0',

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

// ─── Utilitários globais de formatação ────────────────────────────────────────
// Fonte canônica única — nenhum módulo deve redefinir estas funções localmente.

/** Formata valor em BRL completo. Retorna '--' para null/undefined/''. */
function fmtBRL(v) {
  if (v === undefined || v === null || v === '') return '--';
  const n = Number(v);
  if (isNaN(n)) return '--';
  return n.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}

/** Formata valor em BRL abreviado para KPI cards (B / M / completo). */
function fmtBRLAbrev(v) {
  const n = Number(v || 0);
  if (n >= 1e9) return 'R$ ' + (n / 1e9).toFixed(1).replace('.', ',') + 'B';
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toFixed(1).replace('.', ',') + 'M';
  return n.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}

/** Formata valor em escala para eixos de gráfico (M / k / inteiro). */
function kFmt(v) {
  const n = Number(v || 0);
  if (n >= 1e6) return 'R$' + (n / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1e3) return 'R$' + (n / 1e3).toFixed(0) + 'k';
  return 'R$' + n;
}

/** Retorna nome do mês pelo número (1–12). Fallback para o valor original. */
function fmtMes(m) {
  return CONFIG.MESES[m] || String(m || '--');
}

// ─── Utilitários de tema para gráficos ───────────────────────────────────────

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
function textColor() {
  return isDark() ? 'rgba(232,237,245,.75)' : 'rgba(26,31,54,.70)';
}
function gridColor() {
  return isDark() ? 'rgba(255,255,255,.07)' : 'rgba(67,97,238,.07)';
}

// ─── Utilitários de dados ─────────────────────────────────────────────────────

/** Retorna true se o registro é de Combustível. */
function isComb(r)  { return (r.Despesa || '').toLowerCase().startsWith('combust'); }

/** Retorna true se o registro é de Manutenção. */
function isManut(r) { return (r.Despesa || '').toLowerCase().startsWith('manut'); }

/** Escapa caracteres HTML para uso seguro em templates de string. */
function escHTML(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}