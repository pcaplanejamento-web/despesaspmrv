/**
 * config.js
 * Constantes globais e configuração da API.
 * ÚNICO arquivo que precisa ser editado ao trocar de planilha ou ambiente.
 */

const CONFIG = {

  // URL publicada do Google Apps Script (Web App)
  // Substitua após publicar o script — veja docs/apps-script-deploy.md
  API_URL: 'https://script.google.com/macros/s/AKfycbwhScEiKoEAPGQ-VaQNfse1XUpswEaQxcfXEBjf-wQN4e1He99nhi78cD-OpTwclEXQ/exec',

  // Timeout máximo para chamadas à API (ms)
  API_TIMEOUT: 15000,

  // Versão do sistema (exibida no rodapé)
  VERSAO: '1.0.0',

  // Nome exibido no cabeçalho e título da aba
  NOME_SISTEMA: 'Gastos — Rio Verde',

  // Subtítulo do sistema
  SUBTITULO: 'Combustível e Manutenção de Frota',

};

/**
 * Mapeamento das colunas da planilha para campos internos.
 * Se a planilha mudar os nomes das colunas, ajuste apenas aqui.
 */
const COLUNAS = {
  empresa:        'Empresa',
  sigla:          'Sigla',
  centroCusto:    'Centro de Custo',
  departamento:   'Departamento',
  despesa:        'Despesa',
  modelo:         'Modelo',
  classificacao:  'Classificação',
  tipo:           'Tipo',
  placa:          'Placa',
  valor:          'Valor',
  valorLiquidado: 'Liquidado (-5,01%)',
  mes:            'Mês',
  ano:            'Ano',
  contrato:       'Contrato',
};

/**
 * Rótulos dos meses (usados em gráficos e tabelas).
 */
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/**
 * Paleta de cores padrão do sistema (alinhada ao PCA).
 */
const CORES = {
  primaria:    '#185FA5',
  secundaria:  '#1D9E75',
  alerta:      '#D85A30',
  aviso:       '#BA7517',
  roxo:        '#534AB7',
  cinza:       '#73726c',
  // Série de cores para gráficos com múltiplas categorias
  serie: ['#185FA5','#1D9E75','#D85A30','#BA7517','#534AB7','#993556','#3B6D11','#73726c'],
};
