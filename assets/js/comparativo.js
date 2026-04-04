/**
 * comparativo.js — v1.0
 * Comparativo de Períodos: selecionar dois períodos quaisquer
 * e comparar total, qtde, média, variação por secretaria.
 */
const Comparativo = (() => {

  function fmtBRL(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtMes(m) { return CONFIG.MESES[m]||String(m||'--'); }
  const PAL = CONFIG.PALETA_GRAFICOS;
  let _chartInst = null;

  function isDark()  { return document.documentElement.getAttribute('data-theme')==='dark'; }
  function textColor(){ return isDark()?'rgba(232,237,245,.75)':'rgba(26,31,54,.70)'; }
  function gridColor(){ return isDark()?'rgba(255,255,255,.07)':'rgba(67,97,238,.07)'; }
  function kFmt(v){
    if(v>=1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M';
    if(v>=1e3) return 'R$'+(v/1e3).toFixed(0)+'k';
    return 'R$'+v;
  }

  // ── Filtrar dados por período ─────────────────────────

  function _filtrarPeriodo(data, anoIni, mesIni, anoFim, mesFim) {
    return data.filter(r => {
      if (!r.Ano || !r.Mes) return false;
      const d = r.Ano*100 + r.Mes;
      return d >= anoIni*100+mesIni && d <= anoFim*100+mesFim;
    });
  }

  function _calcKpis(regs) {
    const total = regs.reduce((s,r)=>s+r.Valor,0);
    const qtde  = regs.length;
    const meses = new Set(regs.map(r=>`${r.Ano}-${r.Mes}`));
    const media = meses.size ? total/meses.size : 0;
    const bySigla = {};
    regs.forEach(r=>{ const k=r.Sigla||'--'; bySigla[k]=(bySigla[k]||0)+r.Valor; });
    return { total, qtde, media, bySigla, meses:meses.size };
  }

  // ── Abrir modal ───────────────────────────────────────

  function abrir() {
    const data = State.getRawData();
    const anos = [...new Set(data.map(r=>r.Ano).filter(Boolean))].sort((a,b)=>b-a);
    const mesesOpts = CONFIG.MESES.slice(1).map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
    const anosOpts  = anos.map(a=>`<option value="${a}">${a}</option>`).join('');

    Modal.openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:rgba(124,58,237,.12);color:#7c3aed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
          </div>
          <div>
            <div class="modal-tag">Análise</div>
            <h2 class="modal-title">Comparativo de Períodos</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <!-- Seletores de período -->
        <div class="comp-periodos-grid">
          <div class="comp-periodo-card comp-periodo-a">
            <div class="comp-periodo-label">Período A</div>
            <div class="comp-periodo-row">
              <div class="comp-periodo-field">
                <label>De</label>
                <div style="display:flex;gap:6px">
                  <select id="compA_mesIni" class="comp-select">${mesesOpts}</select>
                  <select id="compA_anoIni" class="comp-select">${anosOpts}</select>
                </div>
              </div>
              <div class="comp-periodo-field">
                <label>Até</label>
                <div style="display:flex;gap:6px">
                  <select id="compA_mesFim" class="comp-select">${mesesOpts}</select>
                  <select id="compA_anoFim" class="comp-select">${anosOpts}</select>
                </div>
              </div>
            </div>
          </div>
          <div class="comp-vs">VS</div>
          <div class="comp-periodo-card comp-periodo-b">
            <div class="comp-periodo-label">Período B</div>
            <div class="comp-periodo-row">
              <div class="comp-periodo-field">
                <label>De</label>
                <div style="display:flex;gap:6px">
                  <select id="compB_mesIni" class="comp-select">${mesesOpts}</select>
                  <select id="compB_anoIni" class="comp-select">${anosOpts}</select>
                </div>
              </div>
              <div class="comp-periodo-field">
                <label>Até</label>
                <div style="display:flex;gap:6px">
                  <select id="compB_mesFim" class="comp-select">${mesesOpts}</select>
                  <select id="compB_anoFim" class="comp-select">${anosOpts}</select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button id="compCalcular" class="btn-comp-calcular">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Comparar Períodos
        </button>
        <div id="compResultado"></div>
      </div>`, 'modal-panel modal-panel-wide');

    // Valores padrão sensatos
    if (anos.length >= 2) {
      document.getElementById('compA_anoIni').value = anos[1];
      document.getElementById('compA_anoFim').value = anos[1];
      document.getElementById('compA_mesIni').value = '1';
      document.getElementById('compA_mesFim').value = '12';
      document.getElementById('compB_anoIni').value = anos[0];
      document.getElementById('compB_anoFim').value = anos[0];
      document.getElementById('compB_mesIni').value = '1';
      document.getElementById('compB_mesFim').value = '12';
    }

    document.getElementById('compCalcular')?.addEventListener('click', () => _calcularEExibir(data));
  }

  function _calcularEExibir(data) {
    const g = id => parseInt(document.getElementById(id)?.value||'0');
    const pA = { anoIni:g('compA_anoIni'), mesIni:g('compA_mesIni'), anoFim:g('compA_anoFim'), mesFim:g('compA_mesFim') };
    const pB = { anoIni:g('compB_anoIni'), mesIni:g('compB_mesIni'), anoFim:g('compB_anoFim'), mesFim:g('compB_mesFim') };
    const regsA = _filtrarPeriodo(data, pA.anoIni, pA.mesIni, pA.anoFim, pA.mesFim);
    const regsB = _filtrarPeriodo(data, pB.anoIni, pB.mesIni, pB.anoFim, pB.mesFim);
    const kA = _calcKpis(regsA), kB = _calcKpis(regsB);

    const sl = typeof Filters!=='undefined' ? Filters.siglaLabel : s=>s;
    const labelA = `${fmtMes(pA.mesIni).substring(0,3)}/${pA.anoIni}–${fmtMes(pA.mesFim).substring(0,3)}/${pA.anoFim}`;
    const labelB = `${fmtMes(pB.mesIni).substring(0,3)}/${pB.anoIni}–${fmtMes(pB.mesFim).substring(0,3)}/${pB.anoFim}`;

    function varRow(valA, valB, fmt=fmtBRL) {
      const diff = valB - valA;
      const pct  = valA>0?((diff/valA)*100):0;
      const up   = diff>0;
      const cor  = up?'#e11d48':'#059669';
      const seta = up?'↑':'↓';
      return `<span style="color:${cor};font-size:12px;font-weight:700">${seta} ${up?'+':''}${fmt===fmtBRL?fmtBRL(diff):diff.toLocaleString('pt-BR')} (${up?'+':''}${pct.toFixed(1).replace('.',',')}%)</span>`;
    }

    // Comparativo por secretaria — todas que aparecem em A ou B
    const todasSiglas = new Set([...Object.keys(kA.bySigla),...Object.keys(kB.bySigla)]);
    const siglaRows = [...todasSiglas].map(s=>({
      sigla:s, nome:sl(s), valA:kA.bySigla[s]||0, valB:kB.bySigla[s]||0,
    })).sort((a,b)=>Math.max(b.valA,b.valB)-Math.max(a.valA,a.valB)).slice(0,15);

    const resultado = document.getElementById('compResultado');
    if (!resultado) return;

    resultado.innerHTML = `
      <!-- KPIs lado a lado -->
      <div class="comp-kpi-grid" style="margin-top:20px;">
        <div class="comp-kpi-header" style="background:${PAL[0]}22;border-color:${PAL[0]}44">${labelA}</div>
        <div class="comp-kpi-header comp-kpi-middle">Variação</div>
        <div class="comp-kpi-header" style="background:${PAL[2]}22;border-color:${PAL[2]}44">${labelB}</div>

        <div class="comp-kpi-val" style="color:${PAL[0]}">${fmtBRL(kA.total)}</div>
        <div class="comp-kpi-label">Total</div>
        <div class="comp-kpi-val" style="color:${PAL[2]}">${fmtBRL(kB.total)}</div>

        <div class="comp-kpi-sub">${kA.qtde.toLocaleString('pt-BR')} registros</div>
        ${varRow(kA.total, kB.total)}
        <div class="comp-kpi-sub">${kB.qtde.toLocaleString('pt-BR')} registros</div>

        <div class="comp-kpi-val">${fmtBRL(kA.media)}</div>
        <div class="comp-kpi-label">Média Mensal</div>
        <div class="comp-kpi-val">${fmtBRL(kB.media)}</div>

        <div class="comp-kpi-sub">${kA.meses} mês(es)</div>
        ${varRow(kA.media, kB.media)}
        <div class="comp-kpi-sub">${kB.meses} mês(es)</div>
      </div>

      <!-- Gráfico comparativo -->
      <div class="modal-secao-titulo" style="margin-top:20px">Comparativo por Secretaria</div>
      <div style="position:relative;height:${Math.max(180,siglaRows.length*32)}px;margin-bottom:16px">
        <canvas id="compChart"></canvas>
      </div>

      <!-- Tabela de secretarias -->
      <table class="modal-table" style="margin-top:8px">
        <thead><tr><th>Secretaria</th><th class="tr">${labelA}</th><th class="tr">${labelB}</th><th class="tr">Variação</th></tr></thead>
        <tbody>
          ${siglaRows.map(r=>{
            const diff=r.valB-r.valA, pct=r.valA>0?((diff/r.valA)*100):0;
            const cor=diff>0?'#e11d48':'#059669';
            const seta=diff>0?'↑':'↓';
            return `<tr>
              <td style="font-size:12px">${r.nome||r.sigla}</td>
              <td class="tr">${fmtBRL(r.valA)}</td>
              <td class="tr">${fmtBRL(r.valB)}</td>
              <td class="tr" style="color:${cor};font-weight:700">${seta} ${pct.toFixed(1).replace('.',',')}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    // Gráfico barras agrupadas
    requestAnimationFrame(()=>{
      const canvas=document.getElementById('compChart');
      if(!canvas) return;
      if(_chartInst){_chartInst.destroy();_chartInst=null;}
      _chartInst=new Chart(canvas,{
        type:'bar',
        data:{
          labels:siglaRows.map(r=>r.nome?.split('—')[0]?.trim()||r.sigla),
          datasets:[
            {label:labelA, data:siglaRows.map(r=>r.valA), backgroundColor:PAL[0]+'BB', borderColor:PAL[0], borderWidth:0, borderRadius:4},
            {label:labelB, data:siglaRows.map(r=>r.valB), backgroundColor:PAL[2]+'BB', borderColor:PAL[2], borderWidth:0, borderRadius:4},
          ],
        },
        options:{
          responsive:true, maintainAspectRatio:false,
          animation:{duration:400,easing:'easeOutQuart'},
          indexAxis:'y',
          plugins:{
            legend:{display:true,position:'top',labels:{color:textColor(),font:{size:11},boxWidth:10,padding:10}},
            tooltip:{
              backgroundColor:isDark()?'#1a1f36':'#fff',
              titleColor:isDark()?'#e8edf5':'#1a1f36',
              bodyColor:isDark()?'#9ca3af':'#6b7280',
              borderColor:isDark()?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)',
              borderWidth:1,padding:10,cornerRadius:8,
              callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmtBRL(ctx.parsed.x)}`},
            },
          },
          scales:{
            x:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:10},callback:kFmt}},
            y:{grid:{display:false},border:{display:false},ticks:{color:textColor(),font:{size:10,weight:'600'}}},
          },
        },
      });
    });
  }

  return { abrir };
})();
