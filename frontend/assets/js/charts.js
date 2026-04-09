/**
 * charts.js — v4.0
 * - Alternar tipo: barra ↔ pizza (Siglas e Classificação)
 * - Expandir em modal (fullscreen) ao clicar no ícone de expansão
 * - Evolução: clique em qualquer ponto de qualquer ano, modal com análise YoY
 * - Mobile: legendas compactas, sem overlap
 * - Sem botão "Fechar" nos modais — apenas X
 */
const Charts = (() => {
  const _inst     = {};
  const _types    = { chartSiglas: 'bar', chartClassificacao: 'bar' }; // tipo atual por canvas
  let   _lastData = null;    // dados filtrados mais recentes
  let   _evolData = null;    // { porAno, labels, rawData }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const PAL = CONFIG.PALETA_GRAFICOS;

  function pct(a,b) { if(!b) return '--'; return ((a/b-1)*100).toFixed(1).replace('.',',')+'%'; }

  const TT = () => ({
    backgroundColor: isDark() ? '#1a1f36' : '#fff',
    titleColor:      isDark() ? '#e8edf5' : '#1a1f36',
    bodyColor:       isDark() ? '#9ca3af' : '#6b7280',
    borderColor:     isDark() ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)',
    borderWidth:1, padding:12, cornerRadius:10,
    titleFont:{weight:'700',size:13}, bodyFont:{size:12},
  });

  const BASE = { animation:{duration:350,easing:'easeOutQuart'}, responsive:true, maintainAspectRatio:true };

  function destroy(id) { if (_inst[id]) { _inst[id].destroy(); delete _inst[id]; } }

  function noData(canvasId) {
    const cv = document.getElementById(canvasId); if(!cv) return;
    cv.style.display='none';
    const wrap = cv.closest('.chart-wrap');
    if (wrap && !wrap.querySelector('.chart-no-data')) {
      const p = document.createElement('p'); p.className='chart-no-data';
      p.textContent='Sem dados para o período selecionado'; wrap.appendChild(p);
    }
  }

  function hideSkeleton(name) {
    const sk = document.getElementById('skeleton'+name); if(sk) sk.style.display='none';
    const cv = document.getElementById('chart'+name);
    if(cv){ cv.style.display=''; cv.classList.add('chart-ready'); }
  }

  function resetCanvas(canvasId) {
    const cv = document.getElementById(canvasId); if(!cv) return;
    cv.style.display=''; cv.classList.remove('chart-ready');
    cv.closest('.chart-wrap')?.querySelectorAll('.chart-no-data').forEach(e=>e.remove());
  }

  function showSkeletons() {
    ['Siglas','Classificacao','Evolucao'].forEach(n=>{
      const sk=document.getElementById('skeleton'+n); if(sk) sk.style.display='block';
      const cv=document.getElementById('chart'+n);    if(cv) cv.classList.remove('chart-ready');
    });
  }

  // ── Gráfico BARRA genérico ────────────────────────────────────────────────

  function _buildBar(canvasId, sorted, onClickFn) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId); if(!canvas) return;
    _inst[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(s=>s[0]),
        datasets:[{ data:sorted.map(s=>s[1]),
          backgroundColor:sorted.map((_,i)=>PAL[i%PAL.length]+'BB'),
          borderColor:sorted.map((_,i)=>PAL[i%PAL.length]),
          borderWidth:0, borderRadius:8, borderSkipped:false }],
      },
      options: {
        ...BASE, indexAxis:'y',
        plugins:{ legend:{display:false}, tooltip:{...TT(),callbacks:{label:ctx=>' '+fmtBRL(ctx.parsed.x)}} },
        scales:{
          x:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11},callback:kFmt,maxTicksLimit:5}},
          y:{grid:{display:false},border:{display:false},ticks:{color:textColor(),font:{size:11,weight:'600'},maxTicksLimit:10}},
        },
        onClick(_,elems){ if(!elems.length) return; onClickFn(elems[0].index); },
      },
    });
  }

  // ── Gráfico PIZZA genérico ────────────────────────────────────────────────

  function _buildPie(canvasId, sorted, onClickFn) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId); if(!canvas) return;
    const total  = sorted.reduce((s,r)=>s+r[1],0);
    _inst[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: sorted.map(s=>s[0]),
        datasets:[{ data:sorted.map(s=>s[1]),
          backgroundColor:sorted.map((_,i)=>PAL[i%PAL.length]),
          borderColor:'transparent', borderWidth:0, hoverOffset:12 }],
      },
      options: {
        ...BASE, cutout:'60%',
        plugins:{
          legend:{
            display:true, position:'right',
            labels:{color:textColor(),font:{size:11},boxWidth:12,padding:10,
              generateLabels(chart){
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((lbl,i)=>{
                  const val = ds.data[i]; const p = total ? ((val/total)*100).toFixed(1) : 0;
                  const short = String(lbl).length>18 ? String(lbl).substring(0,16)+'…' : lbl;
                  return { text:`${short} ${p}%`, fillStyle:ds.backgroundColor[i], hidden:false, index:i };
                });
              }
            }
          },
          tooltip:{...TT(),callbacks:{label:ctx=>` ${fmtBRL(ctx.parsed)} (${((ctx.parsed/total)*100).toFixed(1)}%)`}},
        },
        onClick(_,elems){ if(!elems.length) return; onClickFn(elems[0].index); },
        layout:{ padding:{ right: 20 } },
      },
    });
  }

  // ── Mobile: pizza sem legenda lateral, legendas embaixo em pills ──────────

  function _isMobile() { return window.innerWidth < 640; }

  function _buildPieMobile(canvasId, sorted, onClickFn) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId); if(!canvas) return;
    const total  = sorted.reduce((s,r)=>s+r[1],0);
    _inst[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: sorted.map(s=>s[0]),
        datasets:[{ data:sorted.map(s=>s[1]),
          backgroundColor:sorted.map((_,i)=>PAL[i%PAL.length]),
          borderColor:'transparent', borderWidth:0, hoverOffset:10 }],
      },
      options: {
        ...BASE, cutout:'55%',
        plugins:{
          legend:{ display:false },
          tooltip:{...TT(),callbacks:{label:ctx=>` ${fmtBRL(ctx.parsed)} (${((ctx.parsed/total)*100).toFixed(1)}%)`}},
        },
        onClick(_,elems){ if(!elems.length) return; onClickFn(elems[0].index); },
      },
    });
    // Legendas em pills abaixo do canvas
    _renderPieLegend(canvasId, sorted, total);
  }

  function _renderPieLegend(canvasId, sorted, total) {
    const cv = document.getElementById(canvasId); if(!cv) return;
    const legId = canvasId+'Legend';
    let leg = document.getElementById(legId);
    if (!leg) { leg=document.createElement('div'); leg.id=legId; leg.className='chart-pie-legend'; cv.closest('.chart-wrap')?.after(leg)||cv.parentElement.appendChild(leg); }
    leg.innerHTML = sorted.map((s,i)=>{
      const p = total ? ((s[1]/total)*100).toFixed(1) : 0;
      const short = String(s[0]).length>20 ? String(s[0]).substring(0,18)+'…' : s[0];
      return `<span class="pie-leg-pill"><span style="background:${PAL[i%PAL.length]}"></span>${short} <strong>${p}%</strong></span>`;
    }).join('');
  }

  function _buildChart(canvasId, sorted, onClickFn) {
    const type = _types[canvasId] || 'bar';
    if (type === 'pie') {
      _isMobile() ? _buildPieMobile(canvasId, sorted, onClickFn) : _buildPie(canvasId, sorted, onClickFn);
    } else {
      _buildBar(canvasId, sorted, onClickFn);
    }
  }

  // ── Renderizar Siglas ─────────────────────────────────────────────────────

  let _siglasData = [];
  function renderSiglas(data) {
    resetCanvas('chartSiglas'); hideSkeleton('Siglas'); destroy('chartSiglas');
    const canvas = document.getElementById('chartSiglas'); if(!canvas) return;
    const agg={};
    data.forEach(r=>{ if(!r.Mes||!r.Ano||!r.Valor) return; const k=r.Sigla||'--'; agg[k]=(agg[k]||0)+r.Valor; });
    _siglasData = Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,10);
    if(!_siglasData.length){ noData('chartSiglas'); return; }
    _buildChart('chartSiglas', _siglasData, idx => _openChartModal('local', _siglasData[idx], data));
    // Remover legenda de pizza anterior se virou barra
    if (_types['chartSiglas']==='bar') { const l=document.getElementById('chartSiglasLegend'); if(l) l.remove(); }
  }

  // ── Renderizar Classificação ──────────────────────────────────────────────

  let _classifData = [];
  function renderClassificacao(data) {
    resetCanvas('chartClassificacao'); hideSkeleton('Classificacao'); destroy('chartClassificacao');
    const canvas = document.getElementById('chartClassificacao'); if(!canvas) return;
    const agg={};
    data.forEach(r=>{ if(!r.Mes||!r.Ano||!r.Valor) return; const k=(r.Classificacao||'--').substring(0,30); agg[k]=(agg[k]||0)+r.Valor; });
    _classifData = Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,8);
    if(!_classifData.length){ noData('chartClassificacao'); return; }
    _buildChart('chartClassificacao', _classifData, idx => _openChartModal('classificacao', _classifData[idx], data));
    if (_types['chartClassificacao']==='bar') { const l=document.getElementById('chartClassificacaoLegend'); if(l) l.remove(); }
  }

  // ── Renderizar Evolução ───────────────────────────────────────────────────

  function renderEvolucao(data) {
    resetCanvas('chartEvolucao'); hideSkeleton('Evolucao'); destroy('chartEvolucao');
    const canvas=document.getElementById('chartEvolucao');
    const legEl=document.getElementById('evolucaoLegenda');
    if(!canvas) return;

    const porAno={};
    data.forEach(r=>{
      if(!r.Mes||!r.Ano) return;
      const ano=String(r.Ano);
      if(!porAno[ano]) porAno[ano]={};
      porAno[ano][r.Mes]=(porAno[ano][r.Mes]||0)+r.Valor;
    });
    const anos = Object.keys(porAno).sort();
    if(!anos.length){ noData('chartEvolucao'); if(legEl) legEl.innerHTML=''; return; }

    const mesesSet=new Set();
    anos.forEach(a=>Object.keys(porAno[a]).forEach(m=>mesesSet.add(parseInt(m))));
    const labels=[...mesesSet].sort((a,b)=>a-b);
    _evolData={ porAno, labels, rawData:data };

    const datasets=anos.map((ano,i)=>{
      const cor=PAL[i%PAL.length];
      return {
        label:ano,
        data:labels.map(m=>porAno[ano][m]||null),
        borderColor:cor, backgroundColor:cor+'22',
        fill:anos.length===1, tension:.35,
        pointBackgroundColor:cor, pointBorderColor:'#fff', pointBorderWidth:2,
        pointRadius:5, pointHoverRadius:9, borderWidth:2.5, spanGaps:false,
      };
    });

    _inst['chartEvolucao']=new Chart(canvas,{
      type:'line',
      data:{ labels:labels.map(m=>fmtMes(m)), datasets },
      options:{
        ...BASE,
        plugins:{
          legend:{ display:anos.length>1, position:'top',
            labels:{ color:textColor(), font:{size:12,weight:'600'}, boxWidth:12, borderRadius:6, padding:14 } },
          tooltip:{ ...TT(), mode:'index', intersect:false,
            callbacks:{ label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})||'—'}` } },
        },
        interaction:{ mode:'index', intersect:false },
        scales:{
          x:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11},maxRotation:30}},
          y:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11},callback:kFmt}},
        },
        onClick(_,elems){
          if(!elems.length) return;
          const el=elems[0];
          const mes=labels[el.index];
          // Coletar TODOS os anos para aquele mês
          const dadosMes=[];
          anos.forEach((ano,i)=>{
            const v=porAno[ano][mes]||0;
            if(v>0) dadosMes.push({ ano, valor:v, color:PAL[i%PAL.length] });
          });
          _openEvolucaoModal(mes, dadosMes, data);
        },
      },
    });

    if(legEl) {
      legEl.innerHTML=anos.length>1
        ? anos.map((a,i)=>`<span class="evolucao-leg-pill"><span style="background:${PAL[i%PAL.length]}"></span>${a}</span>`).join('')
        : '';
    }
  }

  // ── Modal de gráfico (barra clicada) ──────────────────────────────────────

  function _openChartModal(tipo, entry, allData) {
    const [label, total] = entry;
    const registros = allData.filter(r=>
      tipo==='local' ? r.Sigla===label : (r.Classificacao||'').substring(0,30)===label
    );
    const sl = typeof Filters!=='undefined' ? Filters.siglaLabel : s=>s;
    const titulo = tipo==='local' ? `${sl(label)}` : label;
    Modal.open('chartDetalhe', { titulo, label, total, registros, tipo });
  }

  // ── Modal de evolução: TODOS os anos do ponto ─────────────────────────────

  function _openEvolucaoModal(mes, dadosMes, allData) {
    // Análise YoY: para cada ano presente, compara com o anterior
    const anos     = dadosMes.map(d=>d.ano);
    const regsDoMes = allData.filter(r=>r.Mes===mes && anos.includes(String(r.Ano)));

    // Por sigla neste mês
    const bySigla={};
    regsDoMes.forEach(r=>{ bySigla[r.Sigla||'--']=(bySigla[r.Sigla||'--']||0)+r.Valor; });
    const topSiglas=Object.entries(bySigla).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // YoY analysis
    let yoyHtml='';
    if(dadosMes.length>1) {
      yoyHtml=dadosMes.map((d,i)=>{
        if(i===0) return '';
        const prev=dadosMes[i-1];
        const diff=d.valor-prev.valor;
        const diffPct=pct(d.valor, prev.valor);
        const up=diff>=0;
        return `<div class="modal-yoy-row">
          <span class="modal-yoy-anos">${prev.ano} → ${d.ano}</span>
          <span class="modal-yoy-diff ${up?'up':'down'}">${up?'+':''}${fmtBRL(diff)} (${up?'+':''}${diffPct})</span>
        </div>`;
      }).join('');
    }

    Modal.open('evolucaoDetalhe', { mes, dadosMes, topSiglas, yoyHtml, registros: regsDoMes });
  }

  // ── Expandir gráfico em modal fullscreen ──────────────────────────────────

  function expandChart(chartId) {
    const source = _inst[chartId];
    if (!source) return;

    Modal.openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </div>
          <div>
            <div class="modal-tag">Gráfico Expandido</div>
            <h2 class="modal-title">${document.querySelector(`[data-chart-title="${chartId}"]`)?.textContent || chartId}</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body" style="padding:24px;">
        <canvas id="chartExpanded" style="max-height:520px;width:100%;"></canvas>
      </div>`, 'modal-panel modal-panel-wide');

    // Redesenhar no modal preservando todos os callbacks (sem JSON.parse/stringify)
    setTimeout(() => {
      const expCanvas = document.getElementById('chartExpanded');
      if (!expCanvas) return;
      // Destruir instância anterior no mesmo canvas, se houver
      Chart.getChart(expCanvas)?.destroy();
      const srcOpts = source.config.options;
      new Chart(expCanvas, {
        type: source.config.type,
        data: source.data,
        options: {
          ...srcOpts,
          animation: { duration:400, easing:'easeOutQuart' },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }, 60);
  }

  // ── Alternar tipo barra ↔ pizza ───────────────────────────────────────────

  function toggleChartType(chartId) {
    _types[chartId] = _types[chartId]==='bar' ? 'pie' : 'bar';
    // Recriar o gráfico com o tipo novo
    if (!_lastData) return;
    if (chartId==='chartSiglas')        renderSiglas(_lastData);
    if (chartId==='chartClassificacao') renderClassificacao(_lastData);
    // Atualizar ícone do botão
    const btn = document.querySelector(`[data-toggle-chart="${chartId}"]`);
    if (btn) {
      const isBars = _types[chartId]==='bar';
      btn.title = isBars ? 'Mudar para pizza' : 'Mudar para barras';
      btn.innerHTML = isBars ? _PIE_ICON : _BAR_ICON;
    }
  }

  const _BAR_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>';
  const _PIE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>';

  // ── Render all ────────────────────────────────────────────────────────────

  function renderAll() {
    _lastData = State.getFilteredData();
    renderSiglas(_lastData);
    renderClassificacao(_lastData);
    renderEvolucao(_lastData);
  }

  function updateTheme() { if (_lastData) renderAll(); }

  return { renderAll, showSkeletons, updateTheme, expandChart, toggleChartType };
})();