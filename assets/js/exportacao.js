/**
 * exportacao.js — v2.0
 * Exportação XLSX: dados brutos + resumo por secretaria + resumo por mês
 * Relatório PDF: wizard modal em 3 etapas + geração HTML completa com SVGs inline
 */
const Exportacao = (() => {

  // ── Helpers compartilhados ───────────────────────────────────────────────────

  function fmtBRL(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtBRLk(v) {
    v = Number(v||0);
    if (v >= 1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M';
    if (v >= 1e3) return 'R$'+(v/1e3).toFixed(0).replace('.',',')+'k';
    return 'R$'+v.toFixed(0);
  }
  function fmtMes(m) { return CONFIG.MESES[m]||String(m||'--'); }
  function fmtPct(v, total) { return total>0?((v/total)*100).toFixed(1).replace('.',',')+'%':'0,0%'; }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function siglaLabel(s) { return typeof Filters!=='undefined' ? Filters.siglaLabel(s||'') : (s||'--'); }
  function isComb(r) { return (r.Despesa||'').toLowerCase().startsWith('combust'); }
  function isManut(r) { return (r.Despesa||'').toLowerCase().startsWith('manut'); }

  // ── Carregar SheetJS dinamicamente ─────────────────────────────────────────

  function _loadXLSX() {
    return new Promise((resolve, reject) => {
      if (typeof XLSX !== 'undefined') { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Não foi possível carregar a biblioteca de exportação.'));
      document.head.appendChild(s);
    });
  }

  // ── Exportar XLSX ──────────────────────────────────────────────────────────

  async function exportarXLSX() {
    if (typeof App !== 'undefined') App.showToast('info', 'Preparando XLSX...', 'Aguarde um momento');
    try { await _loadXLSX(); } catch(e) {
      if (typeof App !== 'undefined') App.showToast('error', 'Erro ao exportar', e.message);
      return;
    }
    const data = State.getFilteredData();
    if (!data.length) { if (typeof App !== 'undefined') App.showToast('warn', 'Sem dados para exportar'); return; }
    const wb = XLSX.utils.book_new();
    const hdrs = ['Empresa','Sigla','Centro de Custo','Departamento','Despesa','Modelo','Classificação','Tipo','Placa','Valor (R$)','Liquidado (R$)','Mês','Ano','Contrato'];
    const rows = data.map(r => [r.Empresa||'',r.Sigla||'',r.CentroCusto||'',r.Departamento||'',r.Despesa||'',r.Modelo||'',r.Classificacao||'',r.Tipo||'',r.Placa||'',r.Valor||0,r.Liquidado||0,r.Mes||'',r.Ano||'',r.Contrato||'']);
    const ws1 = XLSX.utils.aoa_to_sheet([hdrs,...rows]);
    const range = XLSX.utils.decode_range(ws1['!ref']||'A1');
    for (let R=1;R<=range.e.r;R++) { ['J','K'].forEach(col=>{ const cell=ws1[`${col}${R+1}`]; if(cell&&typeof cell.v==='number') cell.z='#,##0.00'; }); }
    ws1['!cols'] = [10,8,20,20,12,20,24,10,10,14,14,6,6,16].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb,ws1,'Dados Brutos');
    const bySigla = {};
    data.forEach(r=>{ const k=r.Sigla||'--'; if(!bySigla[k]) bySigla[k]={sigla:k,nome:siglaLabel(k),total:0,comb:0,manu:0,qtde:0}; bySigla[k].total+=r.Valor||0; bySigla[k].qtde++; if(isComb(r)) bySigla[k].comb+=r.Valor||0; if(isManut(r)) bySigla[k].manu+=r.Valor||0; });
    const siglaRows = Object.values(bySigla).sort((a,b)=>b.total-a.total);
    const totalSigla = siglaRows.reduce((s,r)=>s+r.total,0);
    const ws2 = XLSX.utils.aoa_to_sheet([['Sigla','Secretaria / Fundo','Qtde','Total (R$)','Combustível (R$)','Manutenção (R$)','% do Total'],...siglaRows.map(r=>[r.sigla,r.nome,r.qtde,r.total,r.comb,r.manu,totalSigla>0?parseFloat(((r.total/totalSigla)*100).toFixed(2)):0]),['','TOTAL',siglaRows.reduce((s,r)=>s+r.qtde,0),totalSigla,siglaRows.reduce((s,r)=>s+r.comb,0),siglaRows.reduce((s,r)=>s+r.manu,0),100]]);
    ws2['!cols'] = [8,32,8,16,16,16,10].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb,ws2,'Por Secretaria');
    const byMes = {};
    data.forEach(r=>{ if(!r.Mes||!r.Ano) return; const k=`${r.Ano}-${String(r.Mes).padStart(2,'0')}`; if(!byMes[k]) byMes[k]={mes:r.Mes,ano:r.Ano,label:`${fmtMes(r.Mes)}/${r.Ano}`,total:0,comb:0,manu:0,qtde:0}; byMes[k].total+=r.Valor||0; byMes[k].qtde++; if(isComb(r)) byMes[k].comb+=r.Valor||0; if(isManut(r)) byMes[k].manu+=r.Valor||0; });
    const mesRows = Object.entries(byMes).sort((a,b)=>a[0]<b[0]?-1:1).map(([,v])=>v);
    const ws3 = XLSX.utils.aoa_to_sheet([['Mês/Ano','Qtde','Total (R$)','Combustível (R$)','Manutenção (R$)'],...mesRows.map(r=>[r.label,r.qtde,r.total,r.comb,r.manu]),['TOTAL',mesRows.reduce((s,r)=>s+r.qtde,0),mesRows.reduce((s,r)=>s+r.total,0),mesRows.reduce((s,r)=>s+r.comb,0),mesRows.reduce((s,r)=>s+r.manu,0)]]);
    ws3['!cols'] = [14,8,16,16,16].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb,ws3,'Por Mês');
    const buf = XLSX.write(wb,{bookType:'xlsx',type:'array'});
    const blob = new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`gastos_rv_${new Date().toISOString().slice(0,10)}.xlsx`});
    a.click(); URL.revokeObjectURL(a.href);
    if (typeof App !== 'undefined') App.showToast('success','XLSX exportado',`${data.length.toLocaleString('pt-BR')} registros em 3 abas`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SVG BUILDERS — funções puras, zero dependência, seguras para impressão
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * buildSVGBar — gráfico de barras verticais
   * @param {Array<{label,total,comb?,manu?}>} dados
   * @param {{ width,height,showValues,colorA,colorB }} opts
   */
  function buildSVGBar(dados, opts={}) {
    if (!dados.length) return '';
    const W = opts.width || 680, H = opts.height || 200;
    const padL=48, padR=12, padT=20, padB=36;
    const innerW = W-padL-padR, innerH = H-padT-padB;
    const maxVal = Math.max(...dados.map(d=>d.total), 1);
    const colW = Math.floor(innerW / dados.length);
    const barW = Math.max(6, Math.floor(colW * 0.55));
    const colorA = opts.colorA||'#185FA5';
    const colorB = opts.colorB||'#D85A30';

    // Grid lines y (4 lines)
    const gridLines = [0.25,0.5,0.75,1].map(p=>{
      const y = padT + innerH - innerH*p;
      const v = maxVal*p;
      return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="3,3"/>
<text x="${(padL-4).toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="8" fill="#9ca3af">${fmtBRLk(v)}</text>`;
    }).join('');

    // Bars
    const bars = dados.map((d,i)=>{
      const x = padL + i*colW + (colW-barW)/2;
      const barH = Math.max(2, (d.total/maxVal)*innerH);
      const y = padT + innerH - barH;
      // Split bar if both comb and manu exist
      let barSvg = '';
      if (d.comb !== undefined && d.manu !== undefined && d.total > 0) {
        const hC = Math.round((d.comb/d.total)*barH);
        const hM = barH - hC;
        barSvg = `<rect x="${x.toFixed(1)}" y="${(y+hM).toFixed(1)}" width="${barW}" height="${hC.toFixed(1)}" fill="${colorA}" rx="2"/>
<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${hM.toFixed(1)}" fill="${colorB}" rx="2"/>`;
      } else {
        barSvg = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}" fill="${colorA}" rx="2"/>`;
      }
      // Value label on top
      const valLabel = opts.showValues !== false
        ? `<text x="${(x+barW/2).toFixed(1)}" y="${(y-3).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#374151" font-weight="600">${fmtBRLk(d.total)}</text>`
        : '';
      // X label
      const lbl = String(d.label||'').substring(0,8);
      const xLbl = x+barW/2;
      const yLbl = padT+innerH+14;
      return `${barSvg}${valLabel}<text x="${xLbl.toFixed(1)}" y="${yLbl.toFixed(1)}" text-anchor="middle" font-size="8" fill="#6b7280">${esc(lbl)}</text>`;
    }).join('');

    // Linha de média
    const avg = dados.reduce((s,d)=>s+d.total,0)/dados.length;
    const avgY = (padT + innerH - (avg/maxVal)*innerH).toFixed(1);
    const avgLine = `<line x1="${padL}" y1="${avgY}" x2="${W-padR}" y2="${avgY}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="5,3"/>
<text x="${(W-padR+2).toFixed(1)}" y="${(Number(avgY)+3).toFixed(1)}" font-size="7.5" fill="#b45309">média</text>`;

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%">${gridLines}${bars}${avgLine}</svg>`;
  }

  /**
   * buildSVGBarH — barras horizontais (ranking de secretarias)
   * @param {Array<{label,total}>} dados
   * @param {{ maxItems,color }} opts
   */
  function buildSVGBarH(dados, opts={}) {
    if (!dados.length) return '';
    const items = dados.slice(0, opts.maxItems||15);
    const maxVal = Math.max(...items.map(d=>d.total), 1);
    const rowH = 22, padL=72, padR=80, padT=8;
    const innerW = 600 - padL - padR;
    const H = padT*2 + items.length * rowH;
    const color = opts.color||'#185FA5';

    const rows = items.map((d,i)=>{
      const y = padT + i*rowH;
      const barW = Math.max(2, (d.total/maxVal)*innerW);
      const lbl = String(d.label||'').substring(0,10);
      return `<text x="${(padL-4).toFixed(1)}" y="${(y+14).toFixed(1)}" text-anchor="end" font-size="9" fill="#374151" font-weight="600">${esc(lbl)}</text>
<rect x="${padL}" y="${(y+4).toFixed(1)}" width="${barW.toFixed(1)}" height="12" fill="${color}" rx="2" opacity="0.85"/>
<text x="${(padL+barW+4).toFixed(1)}" y="${(y+14).toFixed(1)}" font-size="8.5" fill="#185FA5" font-weight="700">${fmtBRLk(d.total)}</text>`;
    }).join('');

    return `<svg viewBox="0 0 600 ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%">${rows}</svg>`;
  }

  /**
   * buildSVGDonut — donut 2 fatias (combustível / manutenção)
   * @param {number} comb
   * @param {number} manut
   */
  function buildSVGDonut(comb, manut) {
    const total = comb + manut;
    if (total === 0) return '';
    const cx=60, cy=60, r=46, ri=30;
    const pctC = comb/total;
    // arc helper
    function arc(pct, startAngle) {
      if (pct >= 1) pct = 0.9999;
      const end = startAngle + pct * 2*Math.PI;
      const x1 = cx + r*Math.sin(startAngle), y1 = cy - r*Math.cos(startAngle);
      const x2 = cx + r*Math.sin(end),         y2 = cy - r*Math.cos(end);
      const xi1= cx +ri*Math.sin(startAngle),   yi1= cy -ri*Math.cos(startAngle);
      const xi2= cx +ri*Math.sin(end),           yi2= cy -ri*Math.cos(end);
      const lg = pct > 0.5 ? 1 : 0;
      return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${xi2.toFixed(2)} ${yi2.toFixed(2)} A ${ri} ${ri} 0 ${lg} 0 ${xi1.toFixed(2)} ${yi1.toFixed(2)} Z`;
    }
    const pathC = arc(pctC, 0);
    const pathM = arc(1-pctC, pctC*2*Math.PI);
    const pctCLabel = Math.round(pctC*100)+'%';
    const pctMLabel = Math.round((1-pctC)*100)+'%';
    return `<svg viewBox="0 0 120 120" width="110" height="110" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
<path d="${pathC}" fill="#185FA5"/>
<path d="${pathM}" fill="#D85A30"/>
<text x="${cx}" y="${cy-5}" text-anchor="middle" font-size="11" font-weight="700" fill="#1a1f36">${pctCLabel}</text>
<text x="${cx}" y="${cy+9}" text-anchor="middle" font-size="8" fill="#6b7280">comb.</text>
<text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="9" fill="#D85A30" font-weight="600">${pctMLabel} man.</text>
</svg>`;
  }

  /**
   * buildSVGSparkline — miniatura de evolução mensal do veículo
   * @param {number[]} valores — ordenados por data
   */
  function buildSVGSparkline(valores) {
    if (!valores.length) return '<svg width="72" height="24"></svg>';
    const W=72, H=24, pad=2;
    const min=Math.min(...valores), max=Math.max(...valores);
    const range=max-min||1;
    const pts = valores.map((v,i)=>{
      const x = pad + (i/(Math.max(valores.length-1,1)))*(W-pad*2);
      const y = pad + (1-(v-min)/range)*(H-pad*2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const lastX = pad+(W-pad*2);
    const lastY = pad+(1-(valores[valores.length-1]-min)/range)*(H-pad*2);
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><polyline points="${pts}" fill="none" stroke="#185FA5" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.5" fill="#185FA5"/></svg>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGGREGATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function _aggByMes(records) {
    const map={};
    records.forEach(r=>{
      if(!r.Mes||!r.Ano) return;
      const k=`${r.Ano}-${String(r.Mes).padStart(2,'0')}`;
      if(!map[k]) map[k]={key:k,mes:r.Mes,ano:r.Ano,label:`${fmtMes(r.Mes)}/${r.Ano}`,total:0,comb:0,manu:0,qtde:0};
      map[k].total+=r.Valor||0; map[k].qtde++;
      if(isComb(r)) map[k].comb+=r.Valor||0;
      if(isManut(r)) map[k].manu+=r.Valor||0;
    });
    return Object.values(map).sort((a,b)=>a.key<b.key?-1:1);
  }

  function _aggBySigla(records) {
    const map={};
    records.forEach(r=>{
      const k=r.Sigla||'--';
      if(!map[k]) map[k]={sigla:k,nome:siglaLabel(k),total:0,comb:0,manu:0,qtde:0,placas:new Set()};
      map[k].total+=r.Valor||0; map[k].qtde++;
      if(r.Placa) map[k].placas.add(r.Placa);
      if(isComb(r)) map[k].comb+=r.Valor||0;
      if(isManut(r)) map[k].manu+=r.Valor||0;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total).map(r=>({...r,placas:r.placas.size}));
  }

  function _aggByClassif(records) {
    const map={};
    records.forEach(r=>{
      const k=r.Classificacao||'--';
      if(!map[k]) map[k]={label:k,total:0,qtde:0};
      map[k].total+=r.Valor||0; map[k].qtde++;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total);
  }

  function _aggByPlaca(records) {
    const map={};
    records.forEach(r=>{
      const k=r.Placa||'--';
      if(!map[k]) map[k]={placa:k,modelo:r.Modelo||'--',tipo:r.Tipo||'--',total:0,comb:0,manu:0,qtde:0,siglas:new Set(),entries:[]};
      map[k].total+=r.Valor||0; map[k].qtde++;
      if(r.Sigla) map[k].siglas.add(r.Sigla);
      if(isComb(r)) map[k].comb+=r.Valor||0;
      if(isManut(r)) map[k].manu+=r.Valor||0;
      map[k].entries.push(r);
    });
    return Object.values(map).sort((a,b)=>b.total-a.total).map(r=>({...r,siglas:[...r.siglas]}));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WIZARD STATE
  // ═══════════════════════════════════════════════════════════════════════════

  let _wiz = {
    step: 1,
    escopo: 'geral',          // 'geral'|'secretaria'|'frota'|'classificacao'
    secretarias: [],
    placasSel: [],
    classificacoesSel: [],
    despesas: ['comb','manut'],
    periodoTipo: 'todos',     // 'todos'|'personalizado'
    anoInicio: null, mesInicio: null,
    anoFim: null, mesFim: null,
    secoes: {
      kpis: true, evolucao: true, secretaria: true,
      classificacao: false, ranking: true, detalhe: false, historico: false,
    },
    topN: '20',
    nivel: 'executivo',
    orientacao: 'retrato',
  };

  // ── Filtrar dados conforme wizard ──────────────────────────────────────────

  function _filtrarDados() {
    let data = State.getFilteredData();

    // Filtro de despesa
    if (_wiz.despesas.length === 1) {
      if (_wiz.despesas[0]==='comb')  data = data.filter(r=>isComb(r));
      if (_wiz.despesas[0]==='manut') data = data.filter(r=>isManut(r));
    } else if (_wiz.despesas.length === 0) {
      data = [];
    }

    // Filtro de período
    if (_wiz.periodoTipo === 'personalizado') {
      data = data.filter(r=>{
        const k = `${r.Ano||0}-${String(r.Mes||0).padStart(2,'0')}`;
        const ki = `${_wiz.anoInicio||0}-${String(_wiz.mesInicio||0).padStart(2,'0')}`;
        const kf = `${_wiz.anoFim||9999}-${String(_wiz.mesFim||12).padStart(2,'0')}`;
        return k >= ki && k <= kf;
      });
    }

    // Filtro de escopo
    if (_wiz.escopo==='secretaria' && _wiz.secretarias.length) {
      data = data.filter(r=>_wiz.secretarias.includes(r.Sigla));
    } else if (_wiz.escopo==='frota' && _wiz.placasSel.length) {
      data = data.filter(r=>_wiz.placasSel.includes(r.Placa));
    } else if (_wiz.escopo==='classificacao' && _wiz.classificacoesSel.length) {
      data = data.filter(r=>_wiz.classificacoesSel.includes(r.Classificacao));
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WIZARD MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  function abrirConfiguradorPDF() {
    const rawData = State.getFilteredData();
    if (!rawData.length) {
      if (typeof App!=='undefined') App.showToast('warn','Sem dados','Carregue os dados antes de gerar o relatório');
      return;
    }

    // Extrair opções únicas dos dados
    const siglas     = [...new Set(rawData.map(r=>r.Sigla||'').filter(Boolean))].sort();
    const placas     = [...new Set(rawData.map(r=>r.Placa||'').filter(Boolean))].sort();
    const classifs   = [...new Set(rawData.map(r=>r.Classificacao||'').filter(Boolean))].sort();
    const anos       = [...new Set(rawData.map(r=>r.Ano).filter(Boolean))].sort();
    const periodos   = [...new Set(rawData.map(r=>r.Mes&&r.Ano?`${r.Ano}-${String(r.Mes).padStart(2,'0')}`:null).filter(Boolean))].sort();
    const periodoObjs= periodos.map(p=>({ key:p, ano:parseInt(p.split('-')[0]), mes:parseInt(p.split('-')[1]), label:`${fmtMes(parseInt(p.split('-')[1]))}/${p.split('-')[0]}` }));

    _wiz.step = 1;

    Modal.openRaw(_buildWizardHTML(siglas, placas, classifs, periodoObjs), 'modal-panel modal-panel-wide');
    _bindWizardEvents(siglas, placas, classifs, periodoObjs, rawData);
  }

  function _buildWizardHTML(siglas, placas, classifs, periodos) {
    // Step indicators
    const steps = ['Escopo','Período','Seções'];
    const stepsHtml = steps.map((s,i)=>{
      const n=i+1;
      const active = n===_wiz.step;
      const done = n<_wiz.step;
      return `<div class="wiz-step ${active?'wiz-step-active':''} ${done?'wiz-step-done':''}">
        <div class="wiz-step-num">${done?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>':n}</div>
        <span class="wiz-step-label">${s}</span>
      </div>`;
    }).join('<div class="wiz-step-line"></div>');

    return `
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:rgba(67,97,238,.12);color:var(--accent)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="11" y2="17"/></svg>
          </div>
          <div>
            <div class="modal-tag">Relatório PDF</div>
            <h2 class="modal-title">Configurar Relatório</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="modal-body" style="padding:0;">
        <!-- Stepper -->
        <div class="wiz-stepper" id="wizStepper">${stepsHtml}</div>
        <!-- Conteúdo das etapas -->
        <div class="wiz-content" id="wizContent">
          ${_buildStep1(siglas, placas, classifs)}
          ${_buildStep2(periodos)}
          ${_buildStep3()}
        </div>
      </div>

      <div class="modal-footer" style="gap:8px">
        <button class="wiz-btn wiz-btn-ghost" id="wizBtnAnterior" style="display:none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Anterior
        </button>
        <div id="wizPreview" class="wiz-preview-pill"></div>
        <button class="wiz-btn wiz-btn-primary" id="wizBtnProximo">
          Próximo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="wiz-btn wiz-btn-gerar" id="wizBtnGerar" style="display:none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Gerar Relatório
        </button>
      </div>`;
  }

  function _buildStep1(siglas, placas, classifs) {
    const siglaOpts = siglas.map(s=>`<label class="wiz-check-item"><input type="checkbox" name="wiz-sigla" value="${esc(s)}" ${_wiz.secretarias.includes(s)?'checked':''}><span class="wiz-check-label"><strong>${esc(s)}</strong> <span class="wiz-check-sub">${esc(siglaLabel(s).split('—')[1]?.trim()||siglaLabel(s))}</span></span></label>`).join('');
    const classifOpts = classifs.slice(0,30).map(c=>`<label class="wiz-check-item"><input type="checkbox" name="wiz-classif" value="${esc(c)}" ${_wiz.classificacoesSel.includes(c)?'checked':''}><span class="wiz-check-label">${esc(c)}</span></label>`).join('');
    return `<div class="wiz-pane" id="wizPane1">
      <div class="wiz-section-title">Escopo do relatório</div>
      <div class="wiz-radio-group" id="wizEscopoGroup">
        ${[['geral','Geral','Todas as secretarias e frotas'],['secretaria','Por secretaria','Selecione secretarias específicas'],['frota','Por frota','Selecione placas/veículos'],['classificacao','Por classificação','Filtre por tipo de serviço']].map(([v,l,s])=>
          `<label class="wiz-radio-card ${_wiz.escopo===v?'wiz-radio-active':''}">
            <input type="radio" name="wiz-escopo" value="${v}" ${_wiz.escopo===v?'checked':''}/>
            <div class="wiz-radio-label">${l}</div>
            <div class="wiz-radio-sub">${s}</div>
          </label>`).join('')}
      </div>

      <div id="wizEscopoSub" style="margin-top:14px">
        <div id="wizSubSecretaria" style="${_wiz.escopo==='secretaria'?'':'display:none'}">
          <div class="wiz-sub-header">
            <span class="wiz-sub-title">Selecionar secretarias</span>
            <div style="display:flex;gap:6px">
              <button class="wiz-link-btn" id="wizSelAllSiglas">Todas</button>
              <button class="wiz-link-btn" id="wizClrSiglas">Limpar</button>
            </div>
          </div>
          <div class="wiz-check-scroll">${siglaOpts}</div>
        </div>
        <div id="wizSubFrota" style="${_wiz.escopo==='frota'?'':'display:none'}">
          <div class="wiz-sub-header">
            <span class="wiz-sub-title">Buscar placa</span>
            <span class="wiz-tag-count" id="wizPlacaCount">${_wiz.placasSel.length} selecionadas</span>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:10px">
            <input class="wiz-input" id="wizPlacaSearch" type="text" placeholder="Ex: ABC-1234..." autocomplete="off" style="text-transform:uppercase;flex:1"/>
            <button class="wiz-btn wiz-btn-sm" id="wizPlacaAdd">Adicionar</button>
          </div>
          <div id="wizPlacaSugestoes" class="wiz-sug-wrap"></div>
          <div id="wizPlacaChips" class="wiz-chips-wrap">${_wiz.placasSel.map(p=>`<span class="wiz-chip" data-placa="${esc(p)}">${esc(p)}<button class="wiz-chip-del">×</button></span>`).join('')}</div>
          <datalist id="wizPlacaList">${placas.map(p=>`<option value="${esc(p)}">`).join('')}</datalist>
        </div>
        <div id="wizSubClassif" style="${_wiz.escopo==='classificacao'?'':'display:none'}">
          <div class="wiz-sub-header">
            <span class="wiz-sub-title">Selecionar classificações</span>
            <div style="display:flex;gap:6px">
              <button class="wiz-link-btn" id="wizSelAllClassif">Todas</button>
              <button class="wiz-link-btn" id="wizClrClassif">Limpar</button>
            </div>
          </div>
          <div class="wiz-check-scroll">${classifOpts}</div>
        </div>
      </div>

      <div class="wiz-section-title" style="margin-top:18px">Tipo de despesa</div>
      <div style="display:flex;gap:12px">
        <label class="wiz-check-inline"><input type="checkbox" id="wizChkComb" ${_wiz.despesas.includes('comb')?'checked':''}/> <span>Combustível</span></label>
        <label class="wiz-check-inline"><input type="checkbox" id="wizChkManut" ${_wiz.despesas.includes('manut')?'checked':''}/> <span>Manutenção</span></label>
      </div>
    </div>`;
  }

  function _buildStep2(periodos) {
    const atalhos = [['todos','Todos os dados'],['ano','Ano atual'],['tri','Último trimestre'],['sem','Último semestre'],['personalizado','Personalizado']];
    const mesOpts = Array.from({length:12},(_,i)=>`<option value="${i+1}">${fmtMes(i+1)}</option>`).join('');
    const anoOpts = [...new Set(periodos.map(p=>p.ano))].sort((a,b)=>a-b).map(a=>`<option value="${a}">${a}</option>`).join('');
    return `<div class="wiz-pane" id="wizPane2" style="display:none">
      <div class="wiz-section-title">Período de análise</div>
      <div class="wiz-atalhos-grid" id="wizAtalhos">
        ${atalhos.map(([v,l])=>`<button class="wiz-atalho ${_wiz.periodoTipo===v?'wiz-atalho-active':''}" data-atalho="${v}">${l}</button>`).join('')}
      </div>
      <div id="wizPeriodoCustom" style="${_wiz.periodoTipo==='personalizado'?'margin-top:14px':'display:none;margin-top:14px'}">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">
          <div>
            <div class="wiz-field-label">Mês/Ano inicial</div>
            <div style="display:flex;gap:6px">
              <select class="wiz-select" id="wizMesInicio">${mesOpts}</select>
              <select class="wiz-select" id="wizAnoInicio">${anoOpts}</select>
            </div>
          </div>
          <span style="font-size:13px;color:var(--text-muted);font-weight:600;text-align:center">até</span>
          <div>
            <div class="wiz-field-label">Mês/Ano final</div>
            <div style="display:flex;gap:6px">
              <select class="wiz-select" id="wizMesFim">${mesOpts}</select>
              <select class="wiz-select" id="wizAnoFim">${anoOpts}</select>
            </div>
          </div>
        </div>
      </div>
      <div class="wiz-preview-inline" id="wizPreviewPeriodo" style="margin-top:16px"></div>
    </div>`;
  }

  function _buildStep3() {
    const secoes = [
      ['kpis','Indicadores Gerais','Totais, proporções (%), ticket médio e mês de pico — visão numérica rápida do período.'],
      ['evolucao','Evolução Mensal','Gráfico de barras mês a mês + tabela com variação percentual entre períodos.'],
      ['secretaria','Por Secretaria / Unidade','Gráfico horizontal + tabela comparativa com % de cada unidade no total.'],
      ['classificacao','Por Classificação','Tabela de tipos de serviço com barras de proporção e participação no total.'],
      ['ranking','Ranking de Veículos','Top N veículos ordenados por gasto, com alerta para alta % de manutenção.'],
      ['detalhe','Detalhamento por Veículo','Card individual de cada veículo com barra de composição e tabela de registros.'],
      ['historico','Histórico de Secretarias','Trajetória do veículo entre secretarias ao longo do período (requer Detalhamento).'],
    ];
    return `<div class="wiz-pane" id="wizPane3" style="display:none">
      <div class="wiz-section-title">Seções do relatório</div>
      <div class="wiz-secoes-grid">
        ${secoes.map(([k,l,s])=>`<label class="wiz-secao-card ${_wiz.secoes[k]?'wiz-secao-active':''}">
          <input type="checkbox" name="wiz-secao" value="${k}" ${_wiz.secoes[k]?'checked':''}/>
          <div class="wiz-secao-label">${l}</div>
          <div class="wiz-secao-sub">${s}</div>
        </label>`).join('')}
      </div>

      <div style="display:flex;gap:24px;margin-top:18px;flex-wrap:wrap">
        <div>
          <div class="wiz-section-title" style="margin-bottom:8px">Top N veículos (ranking)</div>
          <select class="wiz-select" id="wizTopN">
            ${['10','20','50','100','todos'].map(v=>`<option value="${v}" ${_wiz.topN===v?'selected':''}>${v==='todos'?'Todos os veículos':'Top '+v}</option>`).join('')}
          </select>
        </div>
        <div>
          <div class="wiz-section-title" style="margin-bottom:8px">Nível de detalhe</div>
          <div style="display:flex;gap:8px">
            ${[['executivo','Executivo'],['completo','Completo']].map(([v,l])=>`<label class="wiz-check-inline"><input type="radio" name="wiz-nivel" value="${v}" ${_wiz.nivel===v?'checked':''}/> <span>${l}</span></label>`).join('')}
          </div>
        </div>
        <div>
          <div class="wiz-section-title" style="margin-bottom:8px">Orientação</div>
          <div style="display:flex;gap:8px">
            ${[['retrato','Retrato'],['paisagem','Paisagem']].map(([v,l])=>`<label class="wiz-check-inline"><input type="radio" name="wiz-orientacao" value="${v}" ${_wiz.orientacao===v?'checked':''}/> <span>${l}</span></label>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── Bind de eventos do wizard ──────────────────────────────────────────────

  function _bindWizardEvents(siglas, placas, classifs, periodos, rawData) {
    const $ = id => document.getElementById(id);

    function _goStep(n) {
      _wiz.step = n;
      [1,2,3].forEach(i=>{
        const pane=$(`wizPane${i}`);
        if(pane) pane.style.display = i===n?'':'none';
      });
      // Stepper visual
      document.querySelectorAll('.wiz-step').forEach((el,i)=>{
        const sn=i/2+1; // 0,1,2 → 1,2,3 (intercalado com linhas)
        // steps são 0,2,4 e linhas são 1,3
      });
      const steps=document.querySelectorAll('.wiz-step-num');
      steps.forEach((el,i)=>{
        const sn=i+1;
        el.closest('.wiz-step')?.classList.toggle('wiz-step-active',sn===n);
        el.closest('.wiz-step')?.classList.toggle('wiz-step-done',sn<n);
        if(sn<n) el.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
        else el.textContent=sn;
      });
      $('wizBtnAnterior').style.display = n>1?'':'none';
      $('wizBtnProximo').style.display  = n<3?'':'none';
      $('wizBtnGerar').style.display    = n===3?'':'none';
      _updatePreview(rawData);
    }

    function _updatePreview(rawData) {
      const filtered = _filtrarDados();
      const placasN = new Set(filtered.map(r=>r.Placa)).size;
      const pill = $('wizPreview');
      if(pill) pill.textContent = `${filtered.length.toLocaleString('pt-BR')} registros · ${placasN} veículos`;
      const pp = $('wizPreviewPeriodo');
      if(pp) pp.textContent = `${filtered.length.toLocaleString('pt-BR')} registros encontrados neste período`;
    }

    // Navegação
    $('wizBtnProximo')?.addEventListener('click',()=>{ _readStep(_wiz.step); _goStep(_wiz.step+1); });
    $('wizBtnAnterior')?.addEventListener('click',()=>_goStep(_wiz.step-1));
    $('wizBtnGerar')?.addEventListener('click',()=>{ _readStep(3); Modal.close(); _gerarRelatorio(); });

    // Escopo radios
    document.querySelectorAll('[name="wiz-escopo"]').forEach(r=>{
      r.addEventListener('change',()=>{
        _wiz.escopo=r.value;
        document.querySelectorAll('.wiz-radio-card').forEach(c=>c.classList.remove('wiz-radio-active'));
        r.closest('.wiz-radio-card')?.classList.add('wiz-radio-active');
        ['wizSubSecretaria','wizSubFrota','wizSubClassif'].forEach(id=>{ const el=$(id); if(el) el.style.display='none'; });
        if(_wiz.escopo==='secretaria'&&$('wizSubSecretaria')) $('wizSubSecretaria').style.display='';
        if(_wiz.escopo==='frota'&&$('wizSubFrota')) $('wizSubFrota').style.display='';
        if(_wiz.escopo==='classificacao'&&$('wizSubClassif')) $('wizSubClassif').style.display='';
        _updatePreview(rawData);
      });
    });

    // Seleção de siglas
    $('wizSelAllSiglas')?.addEventListener('click',()=>{
      document.querySelectorAll('[name="wiz-sigla"]').forEach(c=>c.checked=true);
      _wiz.secretarias=[...siglas]; _updatePreview(rawData);
    });
    $('wizClrSiglas')?.addEventListener('click',()=>{
      document.querySelectorAll('[name="wiz-sigla"]').forEach(c=>c.checked=false);
      _wiz.secretarias=[]; _updatePreview(rawData);
    });
    document.querySelectorAll('[name="wiz-sigla"]').forEach(c=>c.addEventListener('change',()=>{
      _wiz.secretarias=Array.from(document.querySelectorAll('[name="wiz-sigla"]:checked')).map(e=>e.value);
      _updatePreview(rawData);
    }));

    // Busca de placas
    const placaInput=$('wizPlacaSearch');
    const placaSug=$('wizPlacaSugestoes');
    function _renderChips() {
      const chips=$('wizPlacaChips');
      if(chips) chips.innerHTML=_wiz.placasSel.map(p=>`<span class="wiz-chip" data-placa="${esc(p)}">${esc(p)}<button class="wiz-chip-del">×</button></span>`).join('');
      const cnt=$('wizPlacaCount');
      if(cnt) cnt.textContent=`${_wiz.placasSel.length} selecionadas`;
      chips?.querySelectorAll('.wiz-chip-del').forEach(btn=>btn.addEventListener('click',()=>{
        const p=btn.closest('.wiz-chip')?.dataset.placa;
        if(p){ _wiz.placasSel=_wiz.placasSel.filter(x=>x!==p); _renderChips(); _updatePreview(rawData); }
      }));
    }
    function _addPlaca(p) {
      p=p.toUpperCase().trim();
      if(p&&!_wiz.placasSel.includes(p)&&_wiz.placasSel.length<50){ _wiz.placasSel.push(p); _renderChips(); _updatePreview(rawData); }
      if(placaInput) placaInput.value='';
      if(placaSug) placaSug.innerHTML='';
    }
    placaInput?.addEventListener('input',()=>{
      const q=(placaInput.value||'').toUpperCase().trim();
      if(!q||!placaSug) return;
      const matches=placas.filter(p=>p.toUpperCase().includes(q)).slice(0,8);
      placaSug.innerHTML=matches.map(p=>`<button class="wiz-sug-item" data-p="${esc(p)}">${esc(p)}</button>`).join('');
      placaSug.querySelectorAll('.wiz-sug-item').forEach(b=>b.addEventListener('click',()=>_addPlaca(b.dataset.p)));
    });
    $('wizPlacaAdd')?.addEventListener('click',()=>_addPlaca(placaInput?.value||''));
    placaInput?.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); _addPlaca(placaInput.value); } });

    // Classificações
    $('wizSelAllClassif')?.addEventListener('click',()=>{
      document.querySelectorAll('[name="wiz-classif"]').forEach(c=>c.checked=true);
      _wiz.classificacoesSel=[...classifs]; _updatePreview(rawData);
    });
    $('wizClrClassif')?.addEventListener('click',()=>{
      document.querySelectorAll('[name="wiz-classif"]').forEach(c=>c.checked=false);
      _wiz.classificacoesSel=[]; _updatePreview(rawData);
    });
    document.querySelectorAll('[name="wiz-classif"]').forEach(c=>c.addEventListener('change',()=>{
      _wiz.classificacoesSel=Array.from(document.querySelectorAll('[name="wiz-classif"]:checked')).map(e=>e.value);
      _updatePreview(rawData);
    }));

    // Despesas
    $('wizChkComb')?.addEventListener('change',e=>{ const i=_wiz.despesas.indexOf('comb'); if(e.target.checked&&i<0) _wiz.despesas.push('comb'); else if(!e.target.checked&&i>=0) _wiz.despesas.splice(i,1); _updatePreview(rawData); });
    $('wizChkManut')?.addEventListener('change',e=>{ const i=_wiz.despesas.indexOf('manut'); if(e.target.checked&&i<0) _wiz.despesas.push('manut'); else if(!e.target.checked&&i>=0) _wiz.despesas.splice(i,1); _updatePreview(rawData); });

    // Atalhos de período
    document.querySelectorAll('[data-atalho]').forEach(btn=>btn.addEventListener('click',()=>{
      _wiz.periodoTipo=btn.dataset.atalho;
      document.querySelectorAll('[data-atalho]').forEach(b=>b.classList.remove('wiz-atalho-active'));
      btn.classList.add('wiz-atalho-active');
      const custom=$('wizPeriodoCustom');
      if(custom) custom.style.display=_wiz.periodoTipo==='personalizado'?'':'none';
      _applyAtalho(periodos);
      _updatePreview(rawData);
    }));

    // Selects período
    ['wizMesInicio','wizAnoInicio','wizMesFim','wizAnoFim'].forEach(id=>{
      $(id)?.addEventListener('change',()=>{
        _wiz.mesInicio=parseInt($('wizMesInicio')?.value)||1;
        _wiz.anoInicio=parseInt($('wizAnoInicio')?.value)||2025;
        _wiz.mesFim=parseInt($('wizMesFim')?.value)||12;
        _wiz.anoFim=parseInt($('wizAnoFim')?.value)||2026;
        _updatePreview(rawData);
      });
    });

    // Seções
    document.querySelectorAll('[name="wiz-secao"]').forEach(c=>c.addEventListener('change',()=>{
      _wiz.secoes[c.value]=c.checked;
      c.closest('.wiz-secao-card')?.classList.toggle('wiz-secao-active',c.checked);
    }));
    document.querySelectorAll('.wiz-secao-card').forEach(card=>{
      card.addEventListener('click',e=>{
        if(e.target.tagName==='INPUT') return;
        const chk=card.querySelector('input');
        if(chk){ chk.checked=!chk.checked; _wiz.secoes[chk.value]=chk.checked; card.classList.toggle('wiz-secao-active',chk.checked); }
      });
    });

    // Top N e Nível
    $('wizTopN')?.addEventListener('change',e=>_wiz.topN=e.target.value);
    document.querySelectorAll('[name="wiz-nivel"]').forEach(r=>r.addEventListener('change',()=>_wiz.nivel=r.value));
    document.querySelectorAll('[name="wiz-orientacao"]').forEach(r=>r.addEventListener('change',()=>_wiz.orientacao=r.value));

    _updatePreview(rawData);
  }

  function _applyAtalho(periodos) {
    const now = new Date();
    const curMes=now.getMonth()+1, curAno=now.getFullYear();
    if (_wiz.periodoTipo==='todos') { _wiz.mesInicio=_wiz.anoInicio=_wiz.mesFim=_wiz.anoFim=null; }
    else if (_wiz.periodoTipo==='ano') { _wiz.mesInicio=1;_wiz.anoInicio=curAno;_wiz.mesFim=12;_wiz.anoFim=curAno;_wiz.periodoTipo='personalizado'; }
    else if (_wiz.periodoTipo==='tri') {
      let m=curMes-2; let a=curAno; if(m<=0){m+=12;a--;}
      _wiz.mesInicio=m;_wiz.anoInicio=a;_wiz.mesFim=curMes;_wiz.anoFim=curAno;_wiz.periodoTipo='personalizado';
    } else if (_wiz.periodoTipo==='sem') {
      let m=curMes-5; let a=curAno; if(m<=0){m+=12;a--;}
      _wiz.mesInicio=m;_wiz.anoInicio=a;_wiz.mesFim=curMes;_wiz.anoFim=curAno;_wiz.periodoTipo='personalizado';
    }
  }

  function _readStep(n) {
    if(n===1) {
      _wiz.escopo = document.querySelector('[name="wiz-escopo"]:checked')?.value||'geral';
      _wiz.secretarias = Array.from(document.querySelectorAll('[name="wiz-sigla"]:checked')).map(e=>e.value);
      _wiz.classificacoesSel = Array.from(document.querySelectorAll('[name="wiz-classif"]:checked')).map(e=>e.value);
      const dc=document.getElementById('wizChkComb'), dm=document.getElementById('wizChkManut');
      _wiz.despesas=[]; if(dc?.checked) _wiz.despesas.push('comb'); if(dm?.checked) _wiz.despesas.push('manut');
    }
    if(n===2) {
      const mi=document.getElementById('wizMesInicio'), ai=document.getElementById('wizAnoInicio');
      const mf=document.getElementById('wizMesFim'), af=document.getElementById('wizAnoFim');
      if(mi) _wiz.mesInicio=parseInt(mi.value)||1;
      if(ai) _wiz.anoInicio=parseInt(ai.value)||2025;
      if(mf) _wiz.mesFim=parseInt(mf.value)||12;
      if(af) _wiz.anoFim=parseInt(af.value)||2026;
    }
    if(n===3) {
      document.querySelectorAll('[name="wiz-secao"]').forEach(c=>{ _wiz.secoes[c.value]=c.checked; });
      _wiz.topN=document.getElementById('wizTopN')?.value||'20';
      _wiz.nivel=document.querySelector('[name="wiz-nivel"]:checked')?.value||'executivo';
      _wiz.orientacao=document.querySelector('[name="wiz-orientacao"]:checked')?.value||'retrato';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GERAR RELATÓRIO PDF
  // ═══════════════════════════════════════════════════════════════════════════

  function _gerarRelatorio() {
    const data = _filtrarDados();
    if (!data.length) {
      if (typeof App!=='undefined') App.showToast('warn','Sem dados','Nenhum registro para os critérios selecionados');
      return;
    }

    const placasN = new Set(data.map(r=>r.Placa)).size;
    if (typeof App!=='undefined') App.showToast('info','Preparando relatório…',`${data.length.toLocaleString('pt-BR')} registros · ${placasN} veículos`);

    const win = window.open('','_blank','width=960,height=800');
    if (!win) {
      if (typeof App!=='undefined') App.showToast('warn','Popup bloqueado','Permita popups para este site e tente novamente');
      return;
    }

    const now = new Date();
    const dtStr = now.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
    const dtHora = now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

    // Agregações
    const total  = data.reduce((s,r)=>s+r.Valor,0);
    const totalC = data.filter(isComb).reduce((s,r)=>s+r.Valor,0);
    const totalM = data.filter(isManut).reduce((s,r)=>s+r.Valor,0);
    const qtde   = data.length;
    const byMes    = _aggByMes(data);
    const bySigla  = _aggBySigla(data);
    const byClassif= _aggByClassif(data);
    const byPlaca  = _aggByPlaca(data);

    // KPIs extras
    const ticketMedio = placasN>0 ? total/placasN : 0;
    const mesMaior = byMes.reduce((a,b)=>b.total>a.total?b:a, byMes[0]||{label:'--',total:0});
    const mesMenor = byMes.length>1 ? byMes.reduce((a,b)=>b.total<a.total?b:a,byMes[0]) : null;
    const avgMensal = byMes.length>0 ? total/byMes.length : 0;
    const pctComb  = total>0 ? (totalC/total*100) : 0;
    const pctManut = total>0 ? (totalM/total*100) : 0;
    const secMaior = bySigla[0] || {sigla:'--',nome:'--',total:0,comb:0,manu:0};
    const pctSecMaior = total>0 ? (secMaior.total/total*100) : 0;
    const top3Total = bySigla.slice(0,3).reduce((s,r)=>s+r.total,0);
    const top3Pct   = total>0 ? (top3Total/total*100) : 0;
    const top5PlacaTotal = byPlaca.slice(0,5).reduce((s,r)=>s+r.total,0);
    const top5PlacaPct   = total>0 ? (top5PlacaTotal/total*100) : 0;
    const lastMes = byMes[byMes.length-1] || null;
    const prevMes = byMes.length>=2 ? byMes[byMes.length-2] : null;
    const varUltimo = (lastMes&&prevMes&&prevMes.total>0) ? ((lastMes.total-prevMes.total)/prevMes.total*100) : null;
    const desvioMaior = avgMensal>0 ? ((mesMaior.total-avgMensal)/avgMensal*100) : 0;

    // Insights automáticos (bullets do Resumo Executivo)
    const insights = [];
    if (total>0) insights.push(`O total de despesas no período analisado foi de <strong>${fmtBRL(total)}</strong>, distribuído em <strong>${qtde.toLocaleString('pt-BR')} registros</strong> envolvendo <strong>${placasN} veículos e/ou máquinas</strong> da frota municipal.`);
    if (pctComb>0&&pctManut>0) insights.push(`A composição é de <strong>${pctComb.toFixed(1).replace('.',',')}% em Combustível</strong> (${fmtBRL(totalC)}) e <strong>${pctManut.toFixed(1).replace('.',',')}% em Manutenção</strong> (${fmtBRL(totalM)}), com ticket médio de ${fmtBRL(ticketMedio)} por veículo.`);
    else if (pctComb>0) insights.push(`Todas as despesas são de <strong>Combustível</strong>, totalizando ${fmtBRL(totalC)} com ticket médio de ${fmtBRL(ticketMedio)} por veículo.`);
    else if (pctManut>0) insights.push(`Todas as despesas são de <strong>Manutenção</strong>, totalizando ${fmtBRL(totalM)} com ticket médio de ${fmtBRL(ticketMedio)} por veículo.`);
    if (mesMaior&&mesMaior.total>0&&byMes.length>1) insights.push(`O mês de <strong>maior gasto foi ${esc(mesMaior.label)}</strong> (${fmtBRL(mesMaior.total)}), ${desvioMaior>0?desvioMaior.toFixed(0)+'% acima':'no nível'} da média mensal de ${fmtBRL(avgMensal)}.`);
    if (bySigla.length>0) insights.push(`A unidade com maior volume foi <strong>${esc(secMaior.sigla)}</strong>, responsável por ${pctSecMaior.toFixed(1).replace('.',',')}% do total (${fmtBRL(secMaior.total)}). As 3 principais unidades respondem por ${top3Pct.toFixed(0)}% das despesas.`);
    if (varUltimo!==null) insights.push(`Em relação ao período anterior, o último mês registrado (<strong>${esc(lastMes.label)}</strong>) apresentou <strong>${varUltimo>=0?'aumento de +':'redução de '}${Math.abs(varUltimo).toFixed(1).replace('.',',')}%</strong> nas despesas.`);
    if (byPlaca.length>=5) insights.push(`Os 5 veículos com maiores gastos concentram <strong>${top5PlacaPct.toFixed(0)}%</strong> do total de despesas — acompanhamento individualizado dessas unidades é recomendado.`);

    // Liquidado (descontos contratuais: 5,01% Combustível · 4,32% Manutenção)
    const totalLiquidadoC = totalC * (1 - 0.0501);
    const totalLiquidadoM = totalM * (1 - 0.0432);
    const totalLiquidado  = totalLiquidadoC + totalLiquidadoM;
    const economiaComb    = totalC - totalLiquidadoC;
    const economiaManut   = totalM - totalLiquidadoM;
    const economiaTotal   = economiaComb + economiaManut;

    // Pontos de atenção auto-gerados
    const pontosAtencao = [];
    const veicAltaManut = byPlaca.filter(v=>v.total>0&&(v.manu/v.total)>0.70);
    if (veicAltaManut.length>0) pontosAtencao.push({cor:'amber',txt:`<strong>${veicAltaManut.length} veículo(s)</strong> com mais de 70% das despesas em Manutenção no período: ${veicAltaManut.slice(0,3).map(v=>`<strong>${esc(v.placa)}</strong> (${(v.manu/v.total*100).toFixed(0)}%)`).join(', ')}${veicAltaManut.length>3?` e outros ${veicAltaManut.length-3}`:''} — estado de conservação merece verificação.`});
    if (pctSecMaior>50) pontosAtencao.push({cor:'blue',txt:`<strong>Concentração elevada:</strong> a unidade <strong>${esc(secMaior.sigla)}</strong> responde por ${pctSecMaior.toFixed(1).replace('.',',')}% do total do período — mais da metade de todas as despesas de frota.`});
    if (varUltimo!==null&&Math.abs(varUltimo)>20) pontosAtencao.push({cor:varUltimo>0?'amber':'green',txt:`<strong>Variação expressiva no último período:</strong> ${esc(lastMes&&lastMes.label||'--')} registrou ${varUltimo>0?'crescimento de +':'queda de '}${Math.abs(varUltimo).toFixed(1).replace('.',',')}% em relação ao mês anterior — variação superior a 20%.`});
    if (economiaTotal>0) pontosAtencao.push({cor:'green',txt:`<strong>Desconto de liquidação aplicado:</strong> os descontos contratuais de 5,01% (Combustível) e 4,32% (Manutenção) geraram uma economia de <strong>${fmtBRL(economiaTotal)}</strong> no período — valor liquidado total: <strong>${fmtBRL(totalLiquidado)}</strong>.`});
    if (byPlaca.length>=5&&top5PlacaPct>60) pontosAtencao.push({cor:'blue',txt:`<strong>Concentração de frota:</strong> os 5 veículos de maior despesa respondem por ${top5PlacaPct.toFixed(0)}% do total. Acompanhamento individualizado dessas unidades é recomendado.`});
    if (mesMaior&&desvioMaior>30) pontosAtencao.push({cor:'amber',txt:`<strong>Pico de gastos:</strong> ${esc(mesMaior.label)} registrou valor ${desvioMaior.toFixed(0)}% acima da média mensal do período — variação acima do padrão habitual de 20%.`});

    // Escopo texto
    const escopoTexto = _wiz.escopo==='geral' ? 'Todas as secretarias e frotas'
      : _wiz.escopo==='secretaria' ? `Secretarias: ${_wiz.secretarias.join(', ')||'todas'}`
      : _wiz.escopo==='frota' ? `Frotas: ${_wiz.placasSel.join(', ')||'todas'}`
      : `Classificações: ${_wiz.classificacoesSel.join(', ')||'todas'}`;

    const periodoTexto = _wiz.periodoTipo==='todos' ? 'Período completo disponível'
      : `${fmtMes(_wiz.mesInicio||1)}/${_wiz.anoInicio||'--'} a ${fmtMes(_wiz.mesFim||12)}/${_wiz.anoFim||'--'}`;

    const despTexto = _wiz.despesas.length===2 ? 'Combustível e Manutenção'
      : _wiz.despesas.includes('comb') ? 'Combustível' : 'Manutenção';

    const orient = _wiz.orientacao==='paisagem' ? 'landscape' : 'portrait';

    // ── HTML do relatório ────────────────────────────────────────────────────

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Despesas — Gastos RV</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
@page{size:A4 ${orient};margin:15mm 14mm 18mm 14mm;}
@media print{
  .no-print{display:none!important;}
  .page-break{page-break-before:always;}
  .avoid-break{page-break-inside:avoid;}
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:11pt;color:#1a1f36;background:#fff;line-height:1.55;}
/* ─── Capa ─── */
.capa{min-height:97vh;display:flex;flex-direction:column;justify-content:space-between;border-top:6px solid #185FA5;padding:48px;}
.capa-header{display:flex;align-items:center;gap:14px;margin-bottom:48px;}
.capa-logo-box{width:48px;height:48px;background:#185FA5;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.capa-logo-box svg{stroke:#fff;}
.capa-logo-nome{font-size:18px;font-weight:700;color:#185FA5;letter-spacing:-.2px;}
.capa-logo-sub{font-size:11px;color:#6b7280;}
.capa-title{font-size:28pt;font-weight:800;color:#1a1f36;letter-spacing:-.5px;line-height:1.1;margin-bottom:12px;}
.capa-subtitle{font-size:13pt;color:#6b7280;margin-bottom:36px;}
.capa-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:36px;}
.capa-meta-item{display:flex;flex-direction:column;gap:3px;}
.capa-meta-label{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;}
.capa-meta-val{font-size:11pt;font-weight:600;color:#1a1f36;}
.capa-divider{height:1px;background:#e5e7eb;margin:24px 0;}
.capa-footer{font-size:9pt;color:#9ca3af;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;}
/* ─── Resumo Executivo ─── */
.exec-box{background:linear-gradient(135deg,#f0f5ff 0%,#fafbff 100%);border:1.5px solid #c7d7f8;border-radius:12px;padding:22px 26px;margin-bottom:28px;}
.exec-titulo{font-size:10pt;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#185FA5;margin-bottom:14px;display:flex;align-items:center;gap:7px;}
.exec-intro{font-size:10pt;color:#374151;line-height:1.65;margin-bottom:14px;}
.exec-list{list-style:none;display:flex;flex-direction:column;gap:7px;}
.exec-list li{font-size:9.5pt;color:#374151;display:flex;gap:9px;align-items:flex-start;line-height:1.5;}
.exec-bullet{width:18px;height:18px;border-radius:50%;background:#185FA5;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:8pt;font-weight:800;margin-top:1px;}
/* ─── Seções ─── */
.secao{padding:28px 0;border-bottom:1.5px solid #f1f5f9;}
.secao:last-child{border-bottom:none;}
.secao-header-wrap{margin-bottom:14px;}
.secao-header{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f0f4fb;border-left:4px solid #185FA5;border-radius:0 8px 8px 0;}
.secao-header svg{color:#185FA5;flex-shrink:0;}
.secao-header-titulo{font-size:11pt;font-weight:700;color:#1a1f36;letter-spacing:-.1px;min-width:0;}
.secao-desc{font-size:8.5pt;color:#6b7280;margin-top:6px;padding-left:4px;line-height:1.5;}
/* ─── Callout de destaque ─── */
.callout{display:flex;gap:10px;align-items:flex-start;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:9pt;line-height:1.5;}
.callout-blue{background:#eff5ff;border:1px solid #bdd3fb;}
.callout-amber{background:#fffbeb;border:1px solid #fcd34d;}
.callout-green{background:#f0fdf4;border:1px solid #86efac;}
.callout-rose{background:#fff1f2;border:1px solid #fecdd3;}
.callout-icon{flex-shrink:0;width:20px;height:20px;margin-top:1px;}
.callout-text{color:#374151;}
.callout-text strong{color:#1a1f36;}
/* ─── KPI grid ─── */
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:4px;}
@media print{.kpi-grid{grid-template-columns:repeat(3,1fr);}}
.kpi-card{background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;position:relative;overflow:hidden;}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#185FA5;border-radius:10px 10px 0 0;}
.kpi-card.kpi-comb::before{background:#185FA5;}
.kpi-card.kpi-manut::before{background:#D85A30;}
.kpi-card.kpi-total::before{background:linear-gradient(90deg,#185FA5,#D85A30);}
.kpi-label{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.kpi-val{font-size:14pt;font-weight:800;color:#185FA5;letter-spacing:-.3px;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.kpi-val.manut{color:#D85A30;}
.kpi-val.neutral{color:#1a1f36;}
.kpi-sub{font-size:8pt;color:#9ca3af;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.kpi-badge{display:inline-block;font-size:7.5pt;font-weight:700;padding:2px 7px;border-radius:10px;margin-top:4px;}
.kpi-badge-blue{background:#dbeafe;color:#1d4ed8;}
.kpi-badge-orange{background:#ffedd5;color:#c2410c;}
.kpi-badge-green{background:#dcfce7;color:#15803d;}
.kpi-badge-gray{background:#f1f5f9;color:#64748b;}
/* ─── Tabelas ─── */
table{width:100%;border-collapse:collapse;font-size:9.5pt;}
thead th{background:#185FA5;color:#fff;padding:8px 10px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:left;white-space:nowrap;}
thead th.tr{text-align:right;}
tbody td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#374151;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
tbody td.tr{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#185FA5;}
tbody td.tr.manut{color:#D85A30;}
tbody td.small{font-size:8.5pt;color:#6b7280;}
tbody tr:nth-child(even){background:#f8f9fc;}
.tr-total td{font-weight:800!important;background:#eef2fa!important;border-top:2px solid #dde1ed;color:#1a1f36!important;}
.tr-total td.tr{color:#185FA5!important;}
/* ─── Mini-barra % ─── */
.pct-bar-wrap{display:flex;align-items:center;gap:6px;min-width:80px;}
.pct-bar-track{flex:1;height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden;}
.pct-bar-fill{height:100%;background:#185FA5;border-radius:3px;}
.pct-label{font-size:8pt;font-weight:700;color:#374151;min-width:36px;text-align:right;}
/* ─── Barra inline simples ─── */
.bar-cell{display:flex;align-items:center;gap:6px;}
.bar-inner{height:6px;background:#185FA5;border-radius:3px;min-width:2px;flex-shrink:0;}
/* ─── Legenda de cores ─── */
.legenda-cores{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:#f8f9fc;border-radius:8px;border:1px solid #e5e7eb;}
.leg-item{display:flex;align-items:center;gap:7px;font-size:8.5pt;color:#374151;white-space:nowrap;}
.leg-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0;}
.leg-line{width:22px;height:2px;border-top:2px dashed #f59e0b;flex-shrink:0;}
/* ─── Nota de rodapé ─── */
.nota{font-size:8pt;color:#9ca3af;margin-top:10px;font-style:italic;padding-left:4px;}
/* ─── Veículo card ─── */
.vei-card{border:1px solid #e5e7eb;border-left:4px solid #185FA5;border-radius:0 8px 8px 0;margin-bottom:14px;overflow:hidden;}
.vei-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 16px;background:#f8f9fc;flex-wrap:wrap;}
.vei-header-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}
.vei-placa{font-family:monospace;font-size:12pt;font-weight:800;color:#185FA5;background:#e8eeff;padding:3px 8px;border-radius:5px;white-space:nowrap;flex-shrink:0;}
.vei-modelo{font-size:10pt;font-weight:600;color:#1a1f36;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;}
.vei-header-right{text-align:right;flex-shrink:0;}
.vei-total-val{font-size:13pt;font-weight:800;color:#185FA5;font-variant-numeric:tabular-nums;white-space:nowrap;}
.vei-total-sub{font-size:8pt;color:#9ca3af;}
.vei-body{padding:12px 16px;}
.vei-composicao{display:flex;align-items:center;gap:16px;margin-bottom:12px;flex-wrap:wrap;}
.vei-barra-wrap{flex:1;min-width:120px;}
.vei-barra{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;display:flex;}
.vei-barra-c{height:100%;background:#185FA5;}
.vei-barra-m{height:100%;background:#D85A30;}
.vei-leg{display:flex;gap:14px;flex-wrap:wrap;margin-top:4px;}
.vei-leg-item{font-size:8.5pt;color:#374151;display:flex;align-items:center;gap:4px;white-space:nowrap;}
.vei-leg-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.vei-siglas{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}
.vei-sigla-pill{font-size:8pt;font-weight:700;background:#e8eeff;color:#185FA5;padding:2px 8px;border-radius:12px;white-space:nowrap;}
.badge-v{font-size:8pt;font-weight:700;background:#e8eeff;color:#185FA5;padding:2px 7px;border-radius:10px;white-space:nowrap;}
.badge-m{font-size:8pt;font-weight:700;background:#fff3e0;color:#b45309;padding:2px 7px;border-radius:10px;white-space:nowrap;}
.badge-c{font-size:8pt;font-weight:700;background:#e0f2f1;color:#047857;padding:2px 7px;border-radius:10px;white-space:nowrap;}
.badge-mn{font-size:8pt;font-weight:700;background:#fde8e0;color:#c2410c;padding:2px 7px;border-radius:10px;white-space:nowrap;}
/* ─── Glossário ─── */
.glossario{background:#fafbff;border:1px solid #e0e7ff;border-radius:10px;padding:20px 24px;margin-top:24px;}
.glossario-titulo{font-size:9pt;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#185FA5;margin-bottom:14px;}
.glossario-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;}
.glossario-item{display:flex;flex-direction:column;gap:2px;}
.glossario-term{font-size:8.5pt;font-weight:700;color:#1a1f36;}
.glossario-def{font-size:8pt;color:#6b7280;line-height:1.45;}
.fonte-nota{font-size:8pt;color:#9ca3af;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;}
/* ─── Caixa "Como interpretar" ─── */
.orientacao-box{background:#f8f9fc;border:1.5px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:24px;}
.orientacao-titulo{font-size:9pt;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#6b7280;margin-bottom:12px;display:flex;align-items:center;gap:6px;}
.orientacao-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 20px;}
.orientacao-item{display:flex;gap:9px;align-items:flex-start;}
.orientacao-icone{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.orientacao-texto{font-size:8.5pt;color:#374151;line-height:1.45;}
.orientacao-texto strong{color:#1a1f36;display:block;margin-bottom:1px;}
/* ─── KPI liquidado ─── */
.kpi-card.kpi-liq::before{background:linear-gradient(90deg,#059669,#047857);}
.kpi-val.liq{color:#047857;}
.kpi-badge-green{background:#dcfce7;color:#15803d;}
/* ─── Pontos de Atenção ─── */
.pontos-titulo{font-size:9pt;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:#1a1f36;margin-bottom:12px;display:flex;align-items:center;gap:7px;}
.ponto-item{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:8px;margin-bottom:8px;font-size:9pt;line-height:1.55;}
.ponto-item:last-child{margin-bottom:0;}
.ponto-item.cor-amber{background:#fffbeb;border:1px solid #fcd34d;}
.ponto-item.cor-blue{background:#eff5ff;border:1px solid #bdd3fb;}
.ponto-item.cor-green{background:#f0fdf4;border:1px solid #86efac;}
.ponto-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8pt;font-weight:800;color:#fff;flex-shrink:0;margin-top:1px;}
.cor-amber .ponto-num{background:#d97706;}
.cor-blue .ponto-num{background:#185FA5;}
.cor-green .ponto-num{background:#059669;}
.ponto-texto{color:#374151;flex:1;}
/* ─── Botão de impressão ─── */
.print-btn{position:fixed;top:16px;right:16px;background:#185FA5;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 4px 16px rgba(24,95,165,.3);z-index:99;}
.print-btn:hover{background:#0c447c;}
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
  Imprimir / Salvar PDF
</button>

<!-- ═══ CAPA ═══ -->
<div class="capa">
  <div>
    <div class="capa-header">
      <div class="capa-logo-box">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round">
          <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
      <div>
        <div class="capa-logo-nome">Gastos RV</div>
        <div class="capa-logo-sub">Prefeitura Municipal de Rio Verde — PMRV</div>
      </div>
    </div>
    <h1 class="capa-title">Relatório de Despesas de Frota</h1>
    <p class="capa-subtitle">${esc(despTexto)}</p>
    <div class="capa-divider"></div>
    <div class="capa-meta-grid">
      <div class="capa-meta-item"><span class="capa-meta-label">Escopo</span><span class="capa-meta-val">${esc(escopoTexto)}</span></div>
      <div class="capa-meta-item"><span class="capa-meta-label">Período</span><span class="capa-meta-val">${esc(periodoTexto)}</span></div>
      <div class="capa-meta-item"><span class="capa-meta-label">Registros analisados</span><span class="capa-meta-val">${qtde.toLocaleString('pt-BR')}</span></div>
      <div class="capa-meta-item"><span class="capa-meta-label">Veículos / Máquinas</span><span class="capa-meta-val">${placasN.toLocaleString('pt-BR')}</span></div>
      <div class="capa-meta-item"><span class="capa-meta-label">Total de despesas</span><span class="capa-meta-val">${fmtBRL(total)}</span></div>
      <div class="capa-meta-item"><span class="capa-meta-label">Nível</span><span class="capa-meta-val" style="text-transform:capitalize">${esc(_wiz.nivel)}</span></div>
    </div>
  </div>
  <div>
    <div class="capa-divider"></div>
    <div class="capa-footer">
      <span>Gastos RV v${CONFIG.VERSAO||'1.x'} — Sistema de Análise de Despesas de Frota</span>
      <span>Emitido em ${dtStr} às ${dtHora}</span>
    </div>
  </div>
</div>

<div style="padding:0 48px">

<!-- ═══ COMO INTERPRETAR ═══ -->
<div style="padding-top:28px">
  <div class="orientacao-box">
    <div class="orientacao-titulo">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Como interpretar este relatório
    </div>
    <div class="orientacao-grid">
      <div class="orientacao-item">
        <div class="orientacao-icone" style="background:#e8eeff"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="2.5" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
        <div class="orientacao-texto"><strong>Fonte dos dados</strong>Registros de cartão frota do município — abastecimentos e serviços em oficinas credenciadas. Os dados são consolidados mensalmente na planilha GERAL.</div>
      </div>
      <div class="orientacao-item">
        <div class="orientacao-icone" style="background:#e8eeff"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg></div>
        <div class="orientacao-texto"><strong>Valor × Liquidado</strong>O "Valor" é o montante empenhado. O "Liquidado" é o valor efetivamente pago após descontos: 5,01% sobre Combustível e 4,32% sobre Manutenção.</div>
      </div>
      <div class="orientacao-item">
        <div class="orientacao-icone" style="background:#e8eeff"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="2.5" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>
        <div class="orientacao-texto"><strong>Gráficos de barras</strong>Azul = Combustível · Laranja = Manutenção · Linha tracejada amarela = média mensal do período. Os valores nas barras são formatados em R$k (milhares).</div>
      </div>
      <div class="orientacao-item">
        <div class="orientacao-icone" style="background:#fff3e0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div class="orientacao-texto"><strong>Sigla / Unidade</strong>Cada secretaria ou fundo é identificado por sua sigla (ex: SMIDU, FMS, FMAS). A coluna "% do Total" mostra a participação de cada unidade no gasto geral.</div>
      </div>
      <div class="orientacao-item">
        <div class="orientacao-icone" style="background:#fff3e0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <div class="orientacao-texto"><strong>Variação (Var.%)</strong>▲ indica aumento em relação ao mês anterior · ▼ indica redução. Variações acima de 20% são sinalizadas como pontos de atenção.</div>
      </div>
      <div class="orientacao-item">
        <div class="orientacao-icone" style="background:#fff3e0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
        <div class="orientacao-texto"><strong>Ticket médio</strong>Total de despesas dividido pelo número de veículos e máquinas com ao menos 1 registro no período — representa o custo médio por unidade.</div>
      </div>
    </div>
  </div>
</div>
${insights.length ? `
<div class="secao avoid-break" style="padding-top:32px">
  <div class="exec-box">
    <div class="exec-titulo">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Resumo Executivo — Principais Achados
    </div>
    <p class="exec-intro">Este relatório consolida as despesas de frota do município de Rio Verde (GO) referentes ao período: <strong>${esc(periodoTexto)}</strong>. Os dados abaixo são gerados automaticamente a partir dos registros filtrados e visam facilitar a leitura e análise por qualquer gestor ou servidor.</p>
    <ul class="exec-list">
      ${insights.map((txt,i)=>`<li><span class="exec-bullet">${i+1}</span><span>${txt}</span></li>`).join('')}
    </ul>
  </div>
</div>` : ''}

<!-- ═══ KPIs ═══ -->
${_wiz.secoes.kpis ? `
<div class="secao avoid-break">
  <div class="secao-header-wrap">
    <div class="secao-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
      <span class="secao-header-titulo">Indicadores Gerais</span>
    </div>
    <p class="secao-desc">Visão geral numérica do período: total investido, divisão entre combustível e manutenção, média por veículo e mês de maior movimentação.</p>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card kpi-total">
      <div class="kpi-label">Total de despesas</div>
      <div class="kpi-val neutral">${fmtBRL(total)}</div>
      <div class="kpi-sub">${qtde.toLocaleString('pt-BR')} registros no período</div>
      ${byMes.length>1?`<span class="kpi-badge kpi-badge-gray">Média mensal: ${fmtBRL(avgMensal)}</span>`:''}
    </div>
    <div class="kpi-card kpi-comb">
      <div class="kpi-label">Combustível</div>
      <div class="kpi-val">${fmtBRL(totalC)}</div>
      <div class="kpi-sub">${data.filter(isComb).length} abastecimentos</div>
      <span class="kpi-badge kpi-badge-blue">${pctComb.toFixed(1).replace('.',',')}% do total</span>
    </div>
    <div class="kpi-card kpi-manut">
      <div class="kpi-label">Manutenção</div>
      <div class="kpi-val manut">${fmtBRL(totalM)}</div>
      <div class="kpi-sub">${data.filter(isManut).length} ordens de serviço</div>
      <span class="kpi-badge kpi-badge-orange">${pctManut.toFixed(1).replace('.',',')}% do total</span>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ticket médio por veículo</div>
      <div class="kpi-val neutral">${fmtBRL(ticketMedio)}</div>
      <div class="kpi-sub">${placasN} veíc./máquinas ativos</div>
      <span class="kpi-badge kpi-badge-gray">Custo médio do período</span>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Mês de maior gasto</div>
      <div class="kpi-val neutral" style="font-size:12pt">${esc(mesMaior.label||'--')}</div>
      <div class="kpi-sub">${fmtBRL(mesMaior.total||0)}</div>
      ${desvioMaior>0?`<span class="kpi-badge kpi-badge-orange">+${desvioMaior.toFixed(0)}% acima da média</span>`:'<span class="kpi-badge kpi-badge-green">Dentro da média</span>'}
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Unidades ativas</div>
      <div class="kpi-val neutral">${bySigla.length}</div>
      <div class="kpi-sub">${byClassif.length} classificações de serviço</div>
      <span class="kpi-badge kpi-badge-gray">${placasN} veíc./máquinas</span>
    </div>
    <div class="kpi-card kpi-liq">
      <div class="kpi-label">Total liquidado</div>
      <div class="kpi-val liq">${fmtBRL(totalLiquidado)}</div>
      <div class="kpi-sub">Valor após descontos contratuais</div>
      <span class="kpi-badge kpi-badge-green">Economia: ${fmtBRL(economiaTotal)}</span>
    </div>
  </div>
  <p class="nota">* Ticket médio = total empenhado ÷ nº de veículos/máquinas com ao menos 1 registro. Liquidado = valor efetivamente pago: desconto de 5,01% sobre Combustível e 4,32% sobre Manutenção. Economia = diferença entre valor empenhado e valor liquidado.</p>
</div>` : ''}

<!-- ═══ EVOLUÇÃO MENSAL ═══ -->
${_wiz.secoes.evolucao && byMes.length ? `
<div class="secao">
  <div class="secao-header-wrap">
    <div class="secao-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <span class="secao-header-titulo">Evolução Mensal de Despesas</span>
    </div>
    <p class="secao-desc">Comparativo mês a mês dos gastos totais com frota. As barras mostram a composição entre Combustível (azul) e Manutenção (laranja). A linha tracejada amarela indica a <strong>média mensal do período</strong>. A coluna "Var.%" compara cada mês com o anterior.</p>
  </div>
  ${(()=>{
    const calloutMes = mesMaior&&byMes.length>1 ? `Atenção: <strong>${esc(mesMaior.label)}</strong> foi o mês com maior gasto (${fmtBRL(mesMaior.total)}), ${desvioMaior>5?desvioMaior.toFixed(0)+'% acima':'próximo'} da média mensal de ${fmtBRL(avgMensal)}.${varUltimo!==null?' Tendência do último período: '+(varUltimo>=0?'<strong style="color:#dc2626">↑ alta</strong>':'<strong style="color:#059669">↓ queda</strong>')+' de '+Math.abs(varUltimo).toFixed(1).replace('.',',')+'%.':''}` : null;
    return calloutMes ? `<div class="callout ${desvioMaior>20?'callout-amber':'callout-blue'}">
      <svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="${desvioMaior>20?'#b45309':'#185FA5'}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span class="callout-text">${calloutMes}</span>
    </div>` : '';
  })()}
  <div class="legenda-cores">
    <span class="leg-item"><span class="leg-dot" style="background:#185FA5"></span>Combustível</span>
    <span class="leg-item"><span class="leg-dot" style="background:#D85A30"></span>Manutenção</span>
    <span class="leg-item"><span class="leg-line"></span>Média mensal do período</span>
  </div>
  <div class="avoid-break" style="margin-bottom:18px">
    ${buildSVGBar(byMes.map(m=>({label:fmtMes(m.mes).substring(0,3)+'/'+String(m.ano).slice(2),total:m.total,comb:m.comb,manu:m.manu})),{showValues:byMes.length<=18})}
  </div>
  <table>
    <thead><tr><th>Mês / Ano</th><th class="tr">Total</th><th class="tr">Combustível</th><th class="tr">Manutenção</th><th class="tr">Registros</th><th class="tr">Var.% s/ mês ant.</th></tr></thead>
    <tbody>
      ${byMes.map((m,i)=>{
        const prev=i>0?byMes[i-1].total:null;
        const varP=prev&&prev>0?((m.total-prev)/prev*100):null;
        const varHtml=varP!==null?`<span style="color:${varP>=0?'#dc2626':'#059669'}">${varP>=0?'▲ +':'▼ '}${varP.toFixed(1).replace('.',',')}%</span>`:'<span style="color:#9ca3af">—</span>';
        return `<tr><td><strong>${esc(m.label)}</strong></td><td class="tr">${fmtBRL(m.total)}</td><td class="tr">${fmtBRL(m.comb)}</td><td class="tr manut">${fmtBRL(m.manu)}</td><td class="tr small">${m.qtde}</td><td class="tr">${varHtml}</td></tr>`;
      }).join('')}
    </tbody>
    <tfoot><tr class="tr-total"><td><strong>TOTAL DO PERÍODO</strong></td><td class="tr">${fmtBRL(total)}</td><td class="tr">${fmtBRL(totalC)}</td><td class="tr">${fmtBRL(totalM)}</td><td class="tr small">${qtde}</td><td class="tr">—</td></tr></tfoot>
  </table>
  <p class="nota">▲ = aumento em relação ao mês anterior &nbsp;|&nbsp; ▼ = redução &nbsp;|&nbsp; Var.% calculada sobre o total de cada mês.</p>
</div>` : ''}

<!-- ═══ POR SECRETARIA ═══ -->
${_wiz.secoes.secretaria && bySigla.length ? `
<div class="secao">
  <div class="secao-header-wrap">
    <div class="secao-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      <span class="secao-header-titulo">Resumo por Secretaria / Unidade</span>
    </div>
    <p class="secao-desc">Distribuição das despesas de frota entre as secretarias e fundos municipais. O gráfico horizontal exibe o volume relativo de gastos. A coluna "%" indica a participação de cada unidade no total geral. "Veículos" = quantidade de placas distintas com despesas no período.</p>
  </div>
  <div class="callout callout-blue">
    <svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
    <span class="callout-text">
      ${bySigla.length>0?`<strong>${esc(secMaior.sigla)}</strong> é a unidade com maior volume de despesas (${fmtBRL(secMaior.total)} · ${pctSecMaior.toFixed(1).replace('.',',')}% do total). `:''}
      ${bySigla.length>=3?`As 3 maiores unidades juntas respondem por <strong>${top3Pct.toFixed(0)}%</strong> de todas as despesas do período.`:''}
    </span>
  </div>
  <div class="legenda-cores">
    <span class="leg-item"><span class="leg-dot" style="background:#185FA5"></span>Combustível</span>
    <span class="leg-item"><span class="leg-dot" style="background:#D85A30"></span>Manutenção</span>
  </div>
  <div class="avoid-break" style="margin-bottom:18px">
    ${buildSVGBarH(bySigla.map(s=>({label:s.sigla,total:s.total})),{maxItems:20})}
  </div>
  <table>
    <thead><tr><th>Sigla</th><th>Secretaria / Fundo</th><th class="tr">Total</th><th>% do Total</th><th class="tr">Combustível</th><th class="tr">Manutenção</th><th class="tr">Veículos</th></tr></thead>
    <tbody>
      ${bySigla.map(s=>{
        const pct=total>0?(s.total/total*100):0;
        const pctCombS=s.total>0?(s.comb/s.total*100):0;
        return `<tr>
          <td><strong style="color:#185FA5">${esc(s.sigla)}</strong></td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(siglaLabel(s.sigla).split('—')[1]?.trim()||siglaLabel(s.sigla))}</td>
          <td class="tr">${fmtBRL(s.total)}</td>
          <td style="min-width:110px"><div class="pct-bar-wrap"><div class="pct-bar-track"><div class="pct-bar-fill" style="width:${Math.min(100,pct).toFixed(1)}%"></div></div><span class="pct-label">${pct.toFixed(1).replace('.',',')}%</span></div></td>
          <td class="tr">${fmtBRL(s.comb)}</td>
          <td class="tr manut">${fmtBRL(s.manu)}</td>
          <td class="tr small">${s.placas}</td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot><tr class="tr-total"><td colspan="2"><strong>TOTAL GERAL</strong></td><td class="tr">${fmtBRL(total)}</td><td><span class="pct-label">100%</span></td><td class="tr">${fmtBRL(totalC)}</td><td class="tr">${fmtBRL(totalM)}</td><td class="tr small">${placasN}</td></tr></tfoot>
  </table>
</div>` : ''}

<!-- ═══ POR CLASSIFICAÇÃO ═══ -->
${_wiz.secoes.classificacao && byClassif.length ? `
<div class="secao avoid-break">
  <div class="secao-header-wrap">
    <div class="secao-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span class="secao-header-titulo">Por Classificação de Serviço</span>
    </div>
    <p class="secao-desc">Agrupamento das despesas pelo tipo de serviço realizado (classificação). Permite identificar quais categorias de manutenção ou insumo concentram mais recursos. A barra de % facilita a comparação visual da participação de cada item.</p>
  </div>
  ${byClassif.length>0?`<div class="callout callout-blue">
    <svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span class="callout-text">A classificação <strong>${esc(byClassif[0].label)}</strong> é a mais expressiva, com ${fmtBRL(byClassif[0].total)} (${fmtPct(byClassif[0].total,total)} do total). ${byClassif.length>1?`As 3 maiores classificações somam ${fmtPct(byClassif.slice(0,3).reduce((s,c)=>s+c.total,0),total)} do total.`:''}</span>
  </div>`:''}
  <table>
    <thead><tr><th>Classificação de Serviço</th><th class="tr">Qtde</th><th class="tr">Total (R$)</th><th>% do Total</th></tr></thead>
    <tbody>
      ${byClassif.map(c=>{
        const pct=total>0?(c.total/total*100):0;
        return `<tr>
          <td>${esc(c.label)}</td>
          <td class="tr small">${c.qtde}</td>
          <td class="tr">${fmtBRL(c.total)}</td>
          <td style="min-width:120px"><div class="pct-bar-wrap"><div class="pct-bar-track"><div class="pct-bar-fill" style="width:${Math.min(100,pct).toFixed(1)}%"></div></div><span class="pct-label">${pct.toFixed(1).replace('.',',')}%</span></div></td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot><tr class="tr-total"><td><strong>TOTAL</strong></td><td class="tr small">${qtde}</td><td class="tr">${fmtBRL(total)}</td><td><span class="pct-label">100%</span></td></tr></tfoot>
  </table>
  <p class="nota">* Classificação refere-se ao tipo de serviço ou insumo registrado na nota de despesa (ex.: Combustível Gasolina, Pneus, Mão de Obra, etc.).</p>
</div>` : ''}

<!-- ═══ RANKING DE VEÍCULOS ═══ -->
${_wiz.secoes.ranking && byPlaca.length ? (() => {
  const topItems = _wiz.topN==='todos' ? byPlaca : byPlaca.slice(0, parseInt(_wiz.topN)||20);
  const topConc = total>0 ? (topItems.reduce((s,r)=>s+r.total,0)/total*100) : 0;
  return `<div class="secao">
  <div class="secao-header-wrap">
    <div class="secao-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <span class="secao-header-titulo">Ranking de Gastos por Veículo${_wiz.topN!=='todos'?' — Top '+_wiz.topN:' — Todos os Veículos'}</span>
    </div>
    <p class="secao-desc">Veículos e máquinas ordenados pelo total de despesas no período (do maior para o menor). A miniatura "Evolução" mostra a tendência de gastos mês a mês para cada unidade. Veículos com altos gastos em manutenção merecem atenção especial quanto ao estado de conservação.</p>
  </div>
  <div class="callout callout-blue">
    <svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    <span class="callout-text">
      Os <strong>${topItems.length} veículos listados</strong> representam <strong>${topConc.toFixed(0)}% do total de despesas</strong> do período.
      ${byPlaca[0]?` Maior gasto: <strong>${esc(byPlaca[0].placa)}</strong> (${esc(byPlaca[0].modelo)}) com ${fmtBRL(byPlaca[0].total)}.`:''}
    </span>
  </div>
  <table>
    <thead><tr><th style="width:28px">#</th><th>Placa</th><th>Modelo / Tipo</th><th>Secretaria(s)</th><th class="tr">Total</th><th class="tr">Combustível</th><th class="tr">Manutenção</th><th>Evolução Mensal</th></tr></thead>
    <tbody>
      ${topItems.map((v,i)=>{
        const mesVals=_aggByMes(v.entries).map(m=>m.total);
        const isMaq=(v.tipo||'').toLowerCase().startsWith('m');
        const pctManutV=v.total>0?(v.manu/v.total*100):0;
        const alerta=pctManutV>70;
        return `<tr${alerta?' style="background:#fff8f6"':''}>
          <td class="small" style="color:#9ca3af;font-weight:700">${i+1}</td>
          <td><span style="font-family:monospace;font-weight:800;color:#185FA5">${esc(v.placa)}</span></td>
          <td><div style="display:flex;flex-direction:column;gap:2px"><span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;display:block;font-size:9pt">${esc(v.modelo)}</span><span class="${isMaq?'badge-m':'badge-v'}">${isMaq?'Máquina':'Veículo'}</span></div></td>
          <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;font-size:8.5pt;color:#6b7280">${v.siglas.map(s=>esc(s)).join(', ')}</td>
          <td class="tr" style="font-weight:800">${fmtBRL(v.total)}</td>
          <td class="tr">${fmtBRL(v.comb)}</td>
          <td class="tr manut">${fmtBRL(v.manu)}${alerta?` <span style="color:#c2410c;font-size:7.5pt;font-weight:700">⚠ ${pctManutV.toFixed(0)}%</span>`:''}</td>
          <td style="width:80px">${buildSVGSparkline(mesVals)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <p class="nota">⚠ = mais de 70% dos gastos deste veículo são de Manutenção — pode indicar desgaste elevado ou necessidade de substituição. Evolução = tendência de gastos mês a mês (eixo Y proporcional ao próprio veículo).</p>
</div>`;
})() : ''}

<!-- ═══ DETALHAMENTO POR VEÍCULO ═══ -->
${_wiz.secoes.detalhe && byPlaca.length ? `
<div class="page-break"></div>
<div class="secao">
  <div class="secao-header-wrap">
    <div class="secao-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      <span class="secao-header-titulo">Detalhamento Individual por Veículo / Máquina</span>
    </div>
    <p class="secao-desc">Cada card abaixo corresponde a um veículo ou máquina da frota. A barra de composição mostra a proporção entre Combustível (azul) e Manutenção (laranja). A tabela interna lista todos os registros de despesa do veículo no período.</p>
  </div>
  ${byPlaca.map((v,vi)=>{
    const isMaq=(v.tipo||'').toLowerCase().startsWith('m');
    const pctC=v.total>0?Math.round(v.comb/v.total*100):0;
    const pctM=100-pctC;
    const sorted=[...v.entries].sort((a,b)=>{
      const ka=`${a.Ano||0}-${String(a.Mes||0).padStart(2,'0')}`;
      const kb=`${b.Ano||0}-${String(b.Mes||0).padStart(2,'0')}`;
      return ka<kb?-1:1;
    });
    const maxLinhas=_wiz.nivel==='executivo'?20:9999;
    const limitado=sorted.length>maxLinhas;
    const linhas=sorted.slice(0,maxLinhas);

    // Histórico secretarias
    const histSiglas={};
    sorted.forEach(r=>{
      const k=r.Sigla||'--';
      if(!histSiglas[k]) histSiglas[k]={sigla:k,periodos:new Set()};
      if(r.Mes&&r.Ano) histSiglas[k].periodos.add(`${String(r.Ano).slice(2)}/${String(r.Mes).padStart(2,'0')}`);
    });

    return `<div class="vei-card avoid-break" style="${vi>0?'margin-top:14px':''}">
      <div class="vei-header">
        <div class="vei-header-left">
          <span class="vei-placa">${esc(v.placa)}</span>
          <span class="vei-modelo" title="${esc(v.modelo)}">${esc(v.modelo)}</span>
          <span class="${isMaq?'badge-m':'badge-v'}">${isMaq?'Máquina':'Veículo'}</span>
        </div>
        <div class="vei-header-right">
          <div class="vei-total-val">${fmtBRL(v.total)}</div>
          <div class="vei-total-sub">${v.qtde} registros · ${v.siglas.join(', ')}</div>
        </div>
      </div>
      <div class="vei-body">
        <div class="vei-composicao">
          <div style="flex:1;min-width:0">
            <div style="font-size:8pt;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Composição das despesas</div>
            <div class="vei-barra-wrap">
              <div class="vei-barra">
                <div class="vei-barra-c" style="width:${pctC}%"></div>
                <div class="vei-barra-m" style="width:${pctM}%"></div>
              </div>
            </div>
            <div class="vei-leg">
              <span class="vei-leg-item"><span class="vei-leg-dot" style="background:#185FA5"></span>Combustível: ${fmtBRL(v.comb)} (${pctC}%)</span>
              <span class="vei-leg-item"><span class="vei-leg-dot" style="background:#D85A30"></span>Manutenção: ${fmtBRL(v.manu)} (${pctM}%)</span>
            </div>
          </div>
          ${buildSVGDonut(v.comb,v.manu)}
        </div>
        ${_wiz.secoes.historico?`<div style="font-size:8pt;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Secretarias / Unidades vinculadas</div><div class="vei-siglas">${Object.values(histSiglas).map(h=>`<span class="vei-sigla-pill" title="${esc(siglaLabel(h.sigla))}">${esc(h.sigla)}</span>`).join('')}</div>`:''}
        <table style="margin-top:8px">
          <thead><tr><th>Período</th><th>Tipo de Despesa</th><th>Classificação</th><th>Departamento</th>${_wiz.secoes.historico?'<th>Unidade</th>':''}<th class="tr">Valor (R$)</th></tr></thead>
          <tbody>
            ${linhas.map(r=>`<tr>
              <td style="white-space:nowrap">${fmtMes(r.Mes).substring(0,3)}/${r.Ano||'--'}</td>
              <td><span class="${isComb(r)?'badge-c':'badge-mn'}">${esc(r.Despesa||'--')}</span></td>
              <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis">${esc(r.Classificacao||'--')}</td>
              <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;font-size:8pt;color:#6b7280">${esc(r.Departamento||'--')}</td>
              ${_wiz.secoes.historico?`<td style="font-weight:700;color:#185FA5;font-size:8.5pt">${esc(r.Sigla||'--')}</td>`:''}
              <td class="tr">${fmtBRL(r.Valor)}</td>
            </tr>`).join('')}
            ${limitado?`<tr><td colspan="99" style="text-align:center;color:#9ca3af;font-style:italic;padding:6px">… e mais ${(sorted.length-maxLinhas).toLocaleString('pt-BR')} registros (use nível "Completo" para exibir todos)</td></tr>`:''}
          </tbody>
          <tfoot><tr class="tr-total"><td colspan="${_wiz.secoes.historico?5:4}"><strong>Total — ${esc(v.placa)}</strong></td><td class="tr">${fmtBRL(v.total)}</td></tr></tfoot>
        </table>
      </div>
    </div>`;
  }).join('')}
</div>` : ''}

<!-- ═══ PONTOS DE ATENÇÃO ═══ -->
${pontosAtencao.length ? `
<div class="secao avoid-break">
  <div class="secao-header-wrap">
    <div class="secao-header" style="border-left-color:#d97706;background:#fffbeb;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span class="secao-header-titulo" style="color:#92400e">Pontos de Atenção</span>
    </div>
    <p class="secao-desc">Observações identificadas automaticamente a partir dos dados do período. Cada item destaca um aspecto relevante para acompanhamento e gestão da frota municipal.</p>
  </div>
  <div>
    ${pontosAtencao.map((p,i)=>`<div class="ponto-item cor-${p.cor}">
      <span class="ponto-num">${i+1}</span>
      <span class="ponto-texto">${p.txt}</span>
    </div>`).join('')}
  </div>
</div>` : ''}

<!-- ═══ GLOSSÁRIO E LEGENDA ═══ -->
<div class="secao avoid-break">
  <div class="glossario">
    <div class="glossario-titulo">Glossário de Termos e Legenda de Cores</div>
    <div class="legenda-cores" style="margin-bottom:16px">
      <span class="leg-item"><span class="leg-dot" style="background:#185FA5"></span>Combustível (azul)</span>
      <span class="leg-item"><span class="leg-dot" style="background:#D85A30"></span>Manutenção (laranja)</span>
      <span class="leg-item"><span class="leg-dot" style="background:#059669"></span>Liquidado / Economia (verde)</span>
      <span class="leg-item"><span class="leg-line"></span>Média mensal do período</span>
      <span class="leg-item"><span class="leg-dot" style="background:#e8eeff;border:1.5px solid #185FA5"></span>Veículo</span>
      <span class="leg-item"><span class="leg-dot" style="background:#fff3e0;border:1.5px solid #b45309"></span>Máquina/Equipamento</span>
    </div>
    <div class="glossario-grid">
      <div class="glossario-item"><span class="glossario-term">Combustível</span><span class="glossario-def">Despesas com abastecimento (gasolina, diesel, etanol, GNV) lançadas no cartão frota municipal em postos credenciados.</span></div>
      <div class="glossario-item"><span class="glossario-term">Manutenção</span><span class="glossario-def">Despesas com reparos, peças, mão de obra e serviços mecânicos realizados em oficinas credenciadas pela administração.</span></div>
      <div class="glossario-item"><span class="glossario-term">Valor (empenhado)</span><span class="glossario-def">Valor bruto da despesa conforme registrado no sistema, antes da aplicação dos descontos contratuais de liquidação.</span></div>
      <div class="glossario-item"><span class="glossario-term">Liquidado</span><span class="glossario-def">Valor efetivamente pago após os descontos contratuais: <strong>5,01%</strong> sobre Combustível e <strong>4,32%</strong> sobre Manutenção. Ambas as categorias possuem desconto de liquidação.</span></div>
      <div class="glossario-item"><span class="glossario-term">Economia de liquidação</span><span class="glossario-def">Diferença entre o valor empenhado e o valor liquidado, gerada pela aplicação dos descontos contratuais (5,01% comb. + 4,32% manut.).</span></div>
      <div class="glossario-item"><span class="glossario-term">Ticket médio por veículo</span><span class="glossario-def">Total empenhado dividido pelo número de veículos/máquinas com ao menos 1 registro no período — representa o custo médio por unidade.</span></div>
      <div class="glossario-item"><span class="glossario-term">Sigla / Unidade</span><span class="glossario-def">Abreviação da secretaria ou fundo municipal responsável pelo veículo (ex: SMIDU, FMS, FMAS, GCM, SMIR).</span></div>
      <div class="glossario-item"><span class="glossario-term">Classificação</span><span class="glossario-def">Tipo de serviço ou insumo registrado na despesa (ex: Combustível Diesel S10, Troca de Pneus, Mão de Obra Mecânica).</span></div>
      <div class="glossario-item"><span class="glossario-term">Var.% (Variação mensal)</span><span class="glossario-def">Diferença percentual do total em relação ao mês imediatamente anterior. ▲ = aumento · ▼ = redução. Valores acima de 20% são sinalizados nos Pontos de Atenção.</span></div>
      <div class="glossario-item"><span class="glossario-term">Evolução mensal (sparkline)</span><span class="glossario-def">Miniatura gráfica do histórico mês a mês de cada veículo. O eixo Y é proporcional ao histórico da própria unidade — não comparável entre veículos.</span></div>
    </div>
    <div class="fonte-nota">
      Dados extraídos do Sistema de Análise de Despesas de Frota — Gastos RV v${CONFIG.VERSAO||'1.x'} · Prefeitura Municipal de Rio Verde — GO · Emitido em ${dtStr} às ${dtHora}
    </div>
  </div>
</div>

</div><!-- /padding -->
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    setTimeout(()=>{ if(typeof App!=='undefined') App.showToast('success','Relatório gerado','Use Ctrl+P ou Cmd+P para salvar como PDF'); }, 600);
  }

  // ── Ponto de entrada público ───────────────────────────────────────────────

  function gerarPDF() { abrirConfiguradorPDF(); }

  return { exportarXLSX, gerarPDF, abrirConfiguradorPDF };
})();