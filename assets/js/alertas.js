/**
 * alertas.js — v1.0
 * Dashboard de Alertas: detecta anomalias nos dados carregados.
 * Calculado 100% no frontend, sem backend adicional.
 *
 * Alertas implementados:
 * 1. Veículo com custo > 2× média da sua secretaria
 * 2. Veículo com 3+ manutenções no mesmo mês
 * 3. Secretaria acima de 150% do gasto histórico médio
 * 4. Veículo sem manutenção há mais de 6 meses (mas com combustível)
 */
const Alertas = (() => {

  function fmtBRL(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtMes(m) { return CONFIG.MESES[m]||String(m||'--'); }
  const sl = () => typeof Filters!=='undefined' ? Filters.siglaLabel : s=>s;

  // ── Calcular todos os alertas ─────────────────────────

  function calcular(data) {
    if (!data || !data.length) return [];
    const alertas = [];

    // 1. Veículo custo > 2× média da secretaria
    const costoPorSigla = {};
    const veicPorSigla  = {};
    data.forEach(r => {
      if (!r.Sigla || !r.Placa || !r.Valor) return;
      if (!costoPorSigla[r.Sigla]) { costoPorSigla[r.Sigla]=0; veicPorSigla[r.Sigla]=new Set(); }
      costoPorSigla[r.Sigla] += r.Valor;
      veicPorSigla[r.Sigla].add(r.Placa);
    });
    const custoPorVeic = {};
    data.forEach(r => {
      if (!r.Placa||!r.Valor) return;
      if (!custoPorVeic[r.Placa]) custoPorVeic[r.Placa]={total:0,sigla:r.Sigla,modelo:r.Modelo||r.Placa};
      custoPorVeic[r.Placa].total += r.Valor;
    });
    Object.entries(custoPorVeic).forEach(([placa,{total,sigla,modelo}])=>{
      const nVeic = veicPorSigla[sigla]?.size||1;
      const media = (costoPorSigla[sigla]||0) / nVeic;
      if (total > media*2 && media > 0) {
        alertas.push({
          nivel:'critico',
          tipo:'veiculo-alto-custo',
          titulo:`Custo elevado: ${placa}`,
          descricao:`${modelo} da ${sl()(sigla)} gastou ${fmtBRL(total)}, mais de 2× a média da secretaria (${fmtBRL(media)})`,
          valor:total,
          referencia:media,
          placa, sigla, modelo,
          icone:'alert-triangle',
        });
      }
    });

    // 2. Veículo com 3+ manutenções no mesmo mês
    const manuPorVeicMes = {};
    data.filter(r=>(r.Despesa||'').toLowerCase().startsWith('manut')).forEach(r=>{
      if(!r.Placa||!r.Mes||!r.Ano) return;
      const k=`${r.Placa}|${r.Ano}|${r.Mes}`;
      if(!manuPorVeicMes[k]) manuPorVeicMes[k]={placa:r.Placa,mes:r.Mes,ano:r.Ano,modelo:r.Modelo||r.Placa,sigla:r.Sigla||'--',qtde:0,total:0};
      manuPorVeicMes[k].qtde++;
      manuPorVeicMes[k].total+=r.Valor;
    });
    Object.values(manuPorVeicMes).filter(v=>v.qtde>=3).forEach(v=>{
      alertas.push({
        nivel:'alerta',
        tipo:'manutencao-frequente',
        titulo:`Manutenção frequente: ${v.placa}`,
        descricao:`${v.modelo} teve ${v.qtde} manutenções em ${fmtMes(v.mes)}/${v.ano} — total ${fmtBRL(v.total)}`,
        valor:v.total,
        referencia:v.qtde,
        placa:v.placa, sigla:v.sigla, modelo:v.modelo,
        icone:'tool',
      });
    });

    // 3. Secretaria acima de 150% da sua média histórica mensal
    const porSiglaAno = {};
    data.forEach(r=>{
      if(!r.Sigla||!r.Ano||!r.Mes) return;
      const k=`${r.Sigla}|${r.Ano}|${r.Mes}`;
      if(!porSiglaAno[k]) porSiglaAno[k]={sigla:r.Sigla,ano:r.Ano,mes:r.Mes,total:0};
      porSiglaAno[k].total+=r.Valor;
    });
    const historicoSigla = {};
    Object.values(porSiglaAno).forEach(v=>{
      if(!historicoSigla[v.sigla]) historicoSigla[v.sigla]=[];
      historicoSigla[v.sigla].push({mes:v.mes,ano:v.ano,total:v.total});
    });
    Object.entries(historicoSigla).forEach(([sigla,meses])=>{
      if(meses.length<3) return; // precisamos de histórico
      const ultimos = meses.sort((a,b)=>a.ano!==b.ano?b.ano-a.ano:b.mes-a.mes);
      const ultimo  = ultimos[0];
      const media   = meses.slice(1).reduce((s,m)=>s+m.total,0)/(meses.length-1);
      if(ultimo.total > media*1.5 && media>0){
        alertas.push({
          nivel:'alerta',
          tipo:'secretaria-gasto-alto',
          titulo:`Gasto elevado: ${sl()(sigla)}`,
          descricao:`Em ${fmtMes(ultimo.mes)}/${ultimo.ano}, gastou ${fmtBRL(ultimo.total)} — 50%+ acima da média histórica de ${fmtBRL(media)}`,
          valor:ultimo.total,
          referencia:media,
          sigla, icone:'trending-up',
        });
      }
    });

    // 4. Veículo com combustível mas sem manutenção há 6+ meses
    const ultimaManuPorVeic = {};
    const ultimaCombPorVeic = {};
    data.forEach(r=>{
      if(!r.Placa||!r.Mes||!r.Ano) return;
      const data_num = r.Ano*100+r.Mes;
      const tipo = (r.Despesa||'').toLowerCase();
      if(tipo.startsWith('manut')){
        if(!ultimaManuPorVeic[r.Placa]||data_num>ultimaManuPorVeic[r.Placa].num)
          ultimaManuPorVeic[r.Placa]={num:data_num,mes:r.Mes,ano:r.Ano,modelo:r.Modelo||r.Placa,sigla:r.Sigla||'--'};
      }
      if(tipo.startsWith('combust')){
        if(!ultimaCombPorVeic[r.Placa]||data_num>ultimaCombPorVeic[r.Placa].num)
          ultimaCombPorVeic[r.Placa]={num:data_num,mes:r.Mes,ano:r.Ano};
      }
    });
    const hoje = new Date(); const hNum = hoje.getFullYear()*100+(hoje.getMonth()+1);
    Object.entries(ultimaCombPorVeic).forEach(([placa,comb])=>{
      if(!ultimaManuPorVeic[placa]) {
        // nunca teve manutenção, mas tem combustível recente
        if(hNum-comb.num<=3){
          const {modelo,sigla}=Object.values(ultimaManuPorVeic[placa]||{modelo:placa,sigla:'--'})||{modelo:placa,sigla:'--'};
          alertas.push({
            nivel:'info',
            tipo:'sem-manutencao',
            titulo:`Sem manutenção registrada: ${placa}`,
            descricao:`Veículo ativo (combustível em ${fmtMes(comb.mes)}/${comb.ano}) sem nenhuma manutenção registrada no período`,
            placa, sigla: ultimaCombPorVeic[placa]?.sigla||'--', modelo:placa,
            icone:'alert-circle',
          });
        }
        return;
      }
      const manu = ultimaManuPorVeic[placa];
      const mesesSem = (hNum - manu.num); // diferença simplificada em meses
      if(mesesSem >= 6 && hNum-comb.num<=3){
        alertas.push({
          nivel:'info',
          tipo:'sem-manutencao-recente',
          titulo:`Manutenção ausente: ${placa}`,
          descricao:`${manu.modelo} da ${sl()(manu.sigla)} — última manutenção em ${fmtMes(manu.mes)}/${manu.ano}, mas ainda em uso`,
          placa, sigla:manu.sigla, modelo:manu.modelo,
          icone:'alert-circle',
        });
      }
    });

    // Ordenar: crítico primeiro, depois alerta, depois info
    const prioridade = { critico:0, alerta:1, info:2 };
    return alertas.sort((a,b)=>(prioridade[a.nivel]||2)-(prioridade[b.nivel]||2));
  }

  // ── Renderizar seção de alertas ───────────────────────

  let _ultimosAlertas = [];

  function getUltimosAlertas() { return _ultimosAlertas; }

  function renderizar() {
    const data = State.getFilteredData();
    const lista = calcular(data);
    _ultimosAlertas = lista;

    const badge = document.getElementById('alertasBadge');
    const count = document.getElementById('alertasCount');
    const total = document.getElementById('alertasTotalPill');
    const corpo = document.getElementById('alertasCorpo');

    if (badge) badge.textContent = lista.length || '';
    if (badge) badge.style.display = lista.length ? '' : 'none';
    if (count) count.textContent = lista.length;
    if (total) total.textContent = `${lista.length} alerta${lista.length!==1?'s':''}`;

    if (!corpo) return;
    if (!lista.length) {
      corpo.innerHTML = `
        <div class="alertas-vazio">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <p>Nenhum alerta detectado no período selecionado</p>
        </div>`;
      return;
    }

    const NIVEIS = {
      critico: { cor:'#e11d48', bg:'rgba(225,29,72,.08)', borda:'rgba(225,29,72,.25)', label:'Crítico' },
      alerta:  { cor:'#f59e0b', bg:'rgba(245,158,11,.08)', borda:'rgba(245,158,11,.25)', label:'Atenção' },
      info:    { cor:'#3b82f6', bg:'rgba(59,130,246,.08)', borda:'rgba(59,130,246,.20)', label:'Informativo' },
    };
    const ICONS = {
      'alert-triangle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      'tool':           '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      'trending-up':    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      'alert-circle':   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };

    corpo.innerHTML = lista.map(al => {
      const n = NIVEIS[al.nivel]||NIVEIS.info;
      const clkPlaca = al.placa ? `onclick="Veiculo.abrirFicha('${al.placa}')" style="cursor:pointer"` : '';
      const tagPlaca = al.placa ? `<span class="alerta-tag" ${clkPlaca} title="Ver ficha do veículo">${al.placa}</span>` : '';
      const tagSigla = al.sigla ? `<span class="alerta-tag">${al.sigla}</span>` : '';
      return `
        <div class="alerta-item" style="border-left-color:${n.cor};background:${n.bg};border-color:${n.borda}">
          <div class="alerta-icone" style="color:${n.cor}">${ICONS[al.icone]||ICONS['alert-circle']}</div>
          <div class="alerta-corpo">
            <div class="alerta-header">
              <span class="alerta-titulo">${al.titulo}</span>
              <span class="alerta-nivel" style="background:${n.cor}22;color:${n.cor}">${n.label}</span>
            </div>
            <p class="alerta-desc">${al.descricao}</p>
            <div class="alerta-tags">${tagPlaca}${tagSigla}</div>
          </div>
        </div>`;
    }).join('');
  }

  return { calcular, renderizar, getUltimosAlertas };
})();
