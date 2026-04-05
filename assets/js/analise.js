/**
 * analise.js — v1.0
 * Módulo de análises avançadas:
 *   • Projeção de Gastos (média móvel 3 meses + linha tracejada)
 *   • Detecção de Sazonalidade (meses historicamente mais caros por secretaria)
 *   • Score de Saúde da Frota (0–100 por veículo)
 *   • Rastreamento de Frota (histórico de placas entre secretarias)
 */
const Analise = (() => {

  const PAL = CONFIG.PALETA_GRAFICOS;
  const fmtBRL = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fmtMes = m => CONFIG.MESES[m] || String(m||'--');
  const fmtMes3 = m => (CONFIG.MESES[m]||String(m)).substring(0,3);
  const isDark  = () => document.documentElement.getAttribute('data-theme')==='dark';
  const textColor = () => isDark() ? 'rgba(232,237,245,.75)' : 'rgba(26,31,54,.70)';
  const gridColor = () => isDark() ? 'rgba(255,255,255,.07)' : 'rgba(67,97,238,.07)';
  function kFmt(v){ if(v>=1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M'; if(v>=1e3) return 'R$'+(v/1e3).toFixed(0)+'k'; return 'R$'+v; }
  // Helpers defensivos: nunca quebram com siglas null/undefined
  function _sl(sigla) {
    const s = sigla != null ? String(sigla) : '';
    if (!s) return '--';
    try { const l = typeof Filters !== 'undefined' ? Filters.siglaLabel(s) : s; return (l!=null&&l!=='') ? String(l) : s; }
    catch(e) { return s; }
  }
  function _slShort(sigla) { return _sl(sigla).split('—')[0].trim() || String(sigla||'--'); }
  // Helper robusto: sempre retorna string, nunca quebra em .split()
  function _sl(sigla) {
    const s = sigla != null ? String(sigla) : '';
    if (!s) return '--';
    try {
      const label = typeof Filters !== 'undefined' ? Filters.siglaLabel(s) : s;
      return (label != null && label !== '') ? String(label) : s;
    } catch(e) { return s; }
  }
  function _slShort(sigla) { return _sl(sigla).split('—')[0].trim() || String(sigla||'--'); }

  let _charts = {};
  function _destroyChart(id) { if(_charts[id]){_charts[id].destroy();delete _charts[id];} }

  // ══════════════════════════════════════════════════════
  //  1. PROJEÇÃO DE GASTOS
  // ══════════════════════════════════════════════════════

  function calcularProjecao(data) {
    // Agrupa por mês/ano
    const porMes = {};
    data.forEach(r => {
      if (!r.Mes||!r.Ano) return;
      const key = `${r.Ano}-${String(r.Mes).padStart(2,'0')}`;
      porMes[key] = (porMes[key]||0) + r.Valor;
    });

    const series = Object.entries(porMes).sort((a,b)=>a[0]<b[0]?-1:1);
    if (series.length < 3) return null;

    // Média móvel dos últimos 3 meses para projetar 3 meses futuros
    const ultimos3 = series.slice(-3).map(([,v])=>v);
    const mediaMovel = ultimos3.reduce((s,v)=>s+v,0) / 3;

    // Determinar próximos 3 meses a partir do último mês com dados
    const [lastKey] = series[series.length-1];
    const [lastAno, lastMesStr] = lastKey.split('-');
    let ano = parseInt(lastAno), mes = parseInt(lastMesStr);
    const projecoes = [];
    for (let i=0;i<3;i++) {
      mes++; if(mes>12){mes=1;ano++;}
      // Ajuste sazonal: se esse mês existe em anos anteriores, ponderar
      const historico = series.filter(([k])=>k.endsWith(`-${String(mes).padStart(2,'0')}`)).map(([,v])=>v);
      let projetado = mediaMovel;
      if (historico.length > 0) {
        const mediaHist = historico.reduce((s,v)=>s+v,0)/historico.length;
        // Blend 60% média móvel + 40% histórico sazonal
        projetado = mediaMovel*0.6 + mediaHist*0.4;
      }
      projecoes.push({ key:`${ano}-${String(mes).padStart(2,'0')}`, mes, ano, valor:projetado, mediaMovel });
    }

    return { series, projecoes, mediaMovel };
  }

  function renderizarProjecao(data) {
    const resultado = calcularProjecao(data);
    const secao = document.getElementById('secaoProjecao');
    if (!secao) return;

    if (!resultado) {
      secao.innerHTML = '<p class="analise-vazio">Dados insuficientes para projeção (mínimo 3 meses)</p>';
      return;
    }

    const { series, projecoes, mediaMovel } = resultado;

    // Montar labels e datasets
    const todasKeys = [...series.map(([k])=>k), ...projecoes.map(p=>p.key)];
    const idxCorte  = series.length; // onde começa a projeção

    const labelsFormatados = todasKeys.map(k => {
      const [a,m] = k.split('-');
      return `${fmtMes3(parseInt(m))}/${String(a).slice(2)}`;
    });

    const valoresReais = [...series.map(([,v])=>v), ...projecoes.map(()=>null)];
    const valoresProj  = [...series.map(()=>null), ...projecoes.map(p=>p.valor)];
    // Ponto de conexão
    valoresProj[idxCorte-1] = series[series.length-1][1];

    const canvas = document.getElementById('chartProjecao');
    if (!canvas) return;
    _destroyChart('projecao');

    _charts['projecao'] = new Chart(canvas, {
      type:'line',
      data:{
        labels: labelsFormatados,
        datasets:[
          {
            label:'Gastos Reais',
            data: valoresReais,
            borderColor: PAL[0], backgroundColor: PAL[0]+'22',
            fill: true, tension:.35, borderWidth:2.5,
            pointBackgroundColor: PAL[0], pointBorderColor:'#fff', pointBorderWidth:2,
            pointRadius:4, pointHoverRadius:8,
          },
          {
            label:'Projeção (3 meses)',
            data: valoresProj,
            borderColor: '#f59e0b', backgroundColor:'rgba(245,158,11,.08)',
            borderDash:[8,4], fill:true, tension:.35, borderWidth:2.5,
            pointBackgroundColor:'#f59e0b', pointBorderColor:'#fff', pointBorderWidth:2,
            pointRadius:5, pointHoverRadius:8,
          },
        ],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{duration:400,easing:'easeOutQuart'},
        plugins:{
          legend:{ display:true, position:'top',
            labels:{color:textColor(),font:{size:12,weight:'600'},boxWidth:12,borderRadius:6,padding:14} },
          tooltip:{
            backgroundColor:isDark()?'#1a1f36':'#fff',
            titleColor:isDark()?'#e8edf5':'#1a1f36',
            bodyColor:isDark()?'#9ca3af':'#6b7280',
            borderColor:isDark()?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)',
            borderWidth:1,padding:12,cornerRadius:10,
            callbacks:{
              label: ctx => {
                if(ctx.parsed.y===null) return null;
                const isProj = ctx.datasetIndex===1;
                return ` ${isProj?'Projeção':'Real'}: ${fmtBRL(ctx.parsed.y)}`;
              },
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if(idx >= idxCorte) {
                  const p = projecoes[idx-idxCorte];
                  if(p) return [`Média móvel: ${fmtBRL(p.mediaMovel)}`];
                }
                return [];
              },
            },
          },
          // Linha vertical separando real de projeção
          annotation: undefined,
        },
        scales:{
          x:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11}}},
          y:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11},callback:kFmt}},
        },
      },
    });

    // Atualizar KPIs de projeção
    const totalProjetado = projecoes.reduce((s,p)=>s+p.valor,0);
    const el = id => document.getElementById(id);
    if(el('projTotal'))  el('projTotal').textContent  = fmtBRL(totalProjetado);
    if(el('projMedia'))  el('projMedia').textContent  = fmtBRL(mediaMovel);
    if(el('projMeses'))  el('projMeses').textContent  = projecoes.map(p=>`${fmtMes3(p.mes)}/${String(p.ano).slice(2)}`).join(', ');
    if(el('projValores')) el('projValores').innerHTML = projecoes.map(p=>
      `<div class="proj-mes-item"><span class="proj-mes-label">${fmtMes(p.mes)}/${p.ano}</span><span class="proj-mes-val">${fmtBRL(p.valor)}</span></div>`
    ).join('');
  }

  // ══════════════════════════════════════════════════════
  //  2. DETECÇÃO DE SAZONALIDADE
  // ══════════════════════════════════════════════════════

  function calcularSazonalidade(data) {
    // Para cada mês (1-12), calcular média histórica e identificar picos/vales
    const porMes = Array.from({length:13}, ()=>({total:0,count:0,anos:[]}));
    const porAnoMes = {};

    data.forEach(r => {
      if(!r.Mes||!r.Ano) return;
      const m = r.Mes;
      porMes[m].total += r.Valor;
      porMes[m].count++;
      const k = `${r.Ano}-${m}`;
      porAnoMes[k] = (porAnoMes[k]||0)+r.Valor;
    });

    // Calcular média por mês ao longo dos anos
    const anos = [...new Set(data.map(r=>r.Ano).filter(Boolean))].sort();
    const mediaPorMes = Array.from({length:13}, (_,m)=>({mes:m,media:0,valores:[]}));
    anos.forEach(ano => {
      for(let m=1;m<=12;m++){
        const v = porAnoMes[`${ano}-${m}`]||0;
        if(v>0) mediaPorMes[m].valores.push(v);
      }
    });
    for(let m=1;m<=12;m++){
      const vals = mediaPorMes[m].valores;
      mediaPorMes[m].media = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
    }

    const mediaGeral = mediaPorMes.slice(1).reduce((s,m)=>s+m.media,0)/12;

    // Índice sazonal: > 1.2 = pico, < 0.8 = vale
    return mediaPorMes.slice(1).map((m,i)=>({
      mes:i+1,
      media:m.media,
      indice: mediaGeral>0 ? m.media/mediaGeral : 1,
      tipo: mediaGeral>0
        ? (m.media>mediaGeral*1.2?'pico':m.media<mediaGeral*0.8?'vale':'normal')
        : 'normal',
      anos: m.valores.length,
    }));
  }

  function renderizarSazonalidade(data) {
    const sazon = calcularSazonalidade(data);
    const canvas = document.getElementById('chartSazonalidade');
    const insightsEl = document.getElementById('sazonalidadeInsights');
    if(!canvas) return;

    _destroyChart('sazonalidade');
    const cores = sazon.map(m=>
      m.tipo==='pico' ? '#e11d48' : m.tipo==='vale' ? '#059669' : PAL[0]
    );

    _charts['sazonalidade'] = new Chart(canvas,{
      type:'bar',
      data:{
        labels: sazon.map(m=>fmtMes3(m.mes)),
        datasets:[{
          label:'Média Histórica Mensal',
          data: sazon.map(m=>m.media),
          backgroundColor: cores.map(c=>c+'BB'),
          borderColor: cores,
          borderWidth:0, borderRadius:8, borderSkipped:false,
        }],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{duration:400,easing:'easeOutQuart'},
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:isDark()?'#1a1f36':'#fff',
            titleColor:isDark()?'#e8edf5':'#1a1f36',
            bodyColor:isDark()?'#9ca3af':'#6b7280',
            borderColor:isDark()?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)',
            borderWidth:1,padding:12,cornerRadius:10,
            callbacks:{
              label:ctx=>` ${fmtBRL(ctx.parsed.y)}`,
              afterLabel:ctx=>{
                const m=sazon[ctx.dataIndex];
                const ind=(m.indice*100).toFixed(0);
                return `Índice sazonal: ${ind}% | ${m.tipo==='pico'?'⚠ Mês de pico':m.tipo==='vale'?'✓ Mês mais tranquilo':'Mês regular'}`;
              },
            },
          },
        },
        scales:{
          x:{grid:{display:false},border:{display:false},ticks:{color:textColor(),font:{size:11}}},
          y:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11},callback:kFmt}},
        },
      },
    });

    // Insights textuais
    if(insightsEl) {
      const picos = sazon.filter(m=>m.tipo==='pico').sort((a,b)=>b.media-a.media);
      const vales = sazon.filter(m=>m.tipo==='vale').sort((a,b)=>a.media-b.media);
      insightsEl.innerHTML = `
        <div class="sazon-insights-grid">
          <div class="sazon-card sazon-pico">
            <div class="sazon-card-title">📈 Meses de Maior Gasto</div>
            ${picos.map(m=>`
              <div class="sazon-item">
                <span class="sazon-mes">${fmtMes(m.mes)}</span>
                <span class="sazon-barra" style="width:${(m.indice*60).toFixed(0)}px;background:#e11d48"></span>
                <span class="sazon-val">${fmtBRL(m.media)}</span>
                <span class="sazon-ind" style="color:#e11d48">${(m.indice*100).toFixed(0)}%</span>
              </div>`).join('') || '<p style="font-size:12px;color:var(--text-muted)">Nenhum pico detectado</p>'}
          </div>
          <div class="sazon-card sazon-vale">
            <div class="sazon-card-title">📉 Meses de Menor Gasto</div>
            ${vales.map(m=>`
              <div class="sazon-item">
                <span class="sazon-mes">${fmtMes(m.mes)}</span>
                <span class="sazon-barra" style="width:${(m.indice*60).toFixed(0)}px;background:#059669"></span>
                <span class="sazon-val">${fmtBRL(m.media)}</span>
                <span class="sazon-ind" style="color:#059669">${(m.indice*100).toFixed(0)}%</span>
              </div>`).join('') || '<p style="font-size:12px;color:var(--text-muted)">Nenhum vale detectado</p>'}
          </div>
        </div>`;
    }
  }

  // ══════════════════════════════════════════════════════
  //  3. SCORE DE SAÚDE DA FROTA
  // ══════════════════════════════════════════════════════

  function calcularScoreSaude(data) {
    if(!data||!data.length) return [];

    // Agrupar por placa
    const veics = {};
    data.forEach(r => {
      if(!r.Placa) return;
      if(!veics[r.Placa]) veics[r.Placa]={
        placa:r.Placa, modelo:r.Modelo||r.Placa, tipo:r.Tipo||'--',
        sigla:r.Sigla||'--', gastos:[], manutencoes:[], combustiveis:[],
        meses:new Set(),
      };
      const v=veics[r.Placa];
      v.gastos.push({mes:r.Mes,ano:r.Ano,valor:r.Valor,despesa:r.Despesa||''});
      v.meses.add(`${r.Ano}-${r.Mes}`);
      const d=(r.Despesa||'').toLowerCase();
      if(d.startsWith('manut')) v.manutencoes.push({mes:r.Mes,ano:r.Ano,valor:r.Valor});
      if(d.startsWith('combust')) v.combustiveis.push({mes:r.Mes,ano:r.Ano,valor:r.Valor});
    });

    const totalGeral = data.reduce((s,r)=>s+r.Valor,0);
    const mediaGastoVeic = totalGeral / Object.keys(veics).length;

    return Object.values(veics).map(v => {
      const totalVeic  = v.gastos.reduce((s,g)=>s+g.valor,0);
      const totalManu  = v.manutencoes.reduce((s,m)=>s+m.valor,0);
      const mesesAtivo = v.meses.size;

      // Componentes do score (cada um 0–100):
      // A) Proporção manutenção/total: ideal ~20-30%
      const pctManu = totalVeic>0?(totalManu/totalVeic)*100:0;
      const scoreA = pctManu>50?20:pctManu>40?40:pctManu>30?60:pctManu>=10?100:pctManu>0?70:30;

      // B) Custo relativo vs média geral da frota
      const custoMedio = mesesAtivo>0?totalVeic/mesesAtivo:0;
      const mediaFlota = mediaGastoVeic;
      const ratio = mediaFlota>0?custoMedio/mediaFlota:1;
      const scoreB = ratio>3?10:ratio>2?30:ratio>1.5?60:ratio>1?80:100;

      // C) Frequência de manutenção (manutenções por mês ativo)
      const freqManu = mesesAtivo>0?v.manutencoes.length/mesesAtivo:0;
      const scoreC = freqManu>1?20:freqManu>0.5?50:freqManu>0.2?80:freqManu>0?100:40;

      // D) Tendência de custo (últimos 3 meses vs primeiros 3)
      const sorted = v.gastos.sort((a,b)=>a.ano!==b.ano?a.ano-b.ano:a.mes-b.mes);
      let scoreD = 80;
      if(sorted.length>=6){
        const primeiros3 = sorted.slice(0,3).reduce((s,g)=>s+g.valor,0)/3;
        const ultimos3   = sorted.slice(-3).reduce((s,g)=>s+g.valor,0)/3;
        const tendencia  = primeiros3>0?(ultimos3-primeiros3)/primeiros3:0;
        scoreD = tendencia>0.5?20:tendencia>0.25?40:tendencia>0?70:tendencia>-0.1?90:100;
      }

      const score = Math.round((scoreA*0.25)+(scoreB*0.35)+(scoreC*0.20)+(scoreD*0.20));
      const nivel = score>=75?'bom':score>=50?'alerta':score>=25?'ruim':'critico';

      return {
        placa:v.placa, modelo:v.modelo, tipo:v.tipo, sigla:v.sigla,
        score, nivel, totalVeic, pctManu:pctManu.toFixed(1),
        mesesAtivo, qtdeManu:v.manutencoes.length, qtdeComb:v.combustiveis.length,
        components:{a:scoreA,b:scoreB,c:scoreC,d:scoreD},
      };
    }).sort((a,b)=>a.score-b.score); // piores primeiro
  }

  function renderizarScoreSaude(data) {
    const listaEl = document.getElementById('scoresSaude');
    if(!listaEl) return;
    const scores = calcularScoreSaude(data).slice(0,30);
    if(!scores.length){ listaEl.innerHTML='<p class="analise-vazio">Sem dados suficientes</p>'; return; }

    const NIVEL = {
      bom:    {cor:'#059669',bg:'rgba(5,150,105,.10)',label:'Saudável',icon:'✓'},
      alerta: {cor:'#f59e0b',bg:'rgba(245,158,11,.10)',label:'Atenção',icon:'⚠'},
      ruim:   {cor:'#e11d48',bg:'rgba(225,29,72,.10)',label:'Ruim',icon:'↓'},
      critico:{cor:'#7c3aed',bg:'rgba(124,58,237,.10)',label:'Crítico',icon:'⚡'},
    };
    listaEl.innerHTML = scores.map(s => {
      const n = NIVEL[s.nivel]||NIVEL.alerta;
      return `
        <div class="score-item" data-nivel="${s.nivel}" onclick="Veiculo&&Veiculo.abrirFicha('${s.placa}')" title="Clique para ver a Ficha do Veículo">
          <div class="score-gauge-wrap">
            <div class="score-gauge" style="--pct:${s.score};--cor:${n.cor}">
              <span class="score-num" style="color:${n.cor}">${s.score}</span>
            </div>
          </div>
          <div class="score-info">
            <div class="score-header">
              <span class="score-placa">${s.placa}</span>
              <span class="score-modelo">${s.modelo}</span>
              <span class="score-nivel" style="background:${n.bg};color:${n.cor}">${n.icon} ${n.label}</span>
            </div>
            <div class="score-meta">
              <span>${_slShort(s.sigla)}</span>
              <span>·</span>
              <span>${s.tipo}</span>
              <span>·</span>
              <span>${fmtBRL(s.totalVeic)} total</span>
              <span>·</span>
              <span>${s.pctManu}% manutenção</span>
              <span>·</span>
              <span>${s.mesesAtivo} mês(es) ativo</span>
            </div>
            <div class="score-bar-wrap">
              <div class="score-bar" style="width:${s.score}%;background:${n.cor}"></div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════════════
  //  4. RASTREAMENTO DE FROTA (histórico de placas)
  // ══════════════════════════════════════════════════════

  function calcularRastreamento(data) {
    // Detectar placas que aparecem em mais de uma secretaria
    const placasSiglas = {};
    data.forEach(r => {
      if(!r.Placa||!r.Sigla) return;
      if(!placasSiglas[r.Placa]) placasSiglas[r.Placa]={modelo:r.Modelo||r.Placa,tipo:r.Tipo||'--',siglas:{}};
      const d_num = (r.Ano||0)*100+(r.Mes||0);
      if(!placasSiglas[r.Placa].siglas[r.Sigla])
        placasSiglas[r.Placa].siglas[r.Sigla]={primeiro:d_num,ultimo:d_num,total:0,count:0};
      const s = placasSiglas[r.Placa].siglas[r.Sigla];
      s.total += r.Valor||0;
      s.count++;
      if(d_num < s.primeiro) s.primeiro=d_num;
      if(d_num > s.ultimo)   s.ultimo=d_num;
    });

    return Object.entries(placasSiglas)
      .filter(([,v])=>Object.keys(v.siglas).length>1)
      .map(([placa,v])=>({
        placa, modelo:v.modelo, tipo:v.tipo,
        secretarias: Object.entries(v.siglas)
          .sort((a,b)=>a[1].primeiro-b[1].primeiro)
          .map(([sigla,s])=>({sigla, ...s})),
      }))
      .sort((a,b)=>b.secretarias.length-a.secretarias.length);
  }

  function renderizarRastreamento(data) {
    const listaEl = document.getElementById('rastreamentoLista');
    const badgeEl = document.getElementById('rastreamentoBadge');
    if(!listaEl) return;
    const registros = calcularRastreamento(data);
    if(badgeEl) badgeEl.textContent = registros.length||'';

    if(!registros.length){
      listaEl.innerHTML='<p class="analise-vazio">Nenhum veículo detectado em múltiplas secretarias</p>';
      return;
    }

    function decodeData(num){ const ano=Math.floor(num/100),mes=num%100; return `${fmtMes3(mes)}/${String(ano).slice(2)}`; }

    listaEl.innerHTML = registros.slice(0,25).map(r => `
      <div class="rastr-item" onclick="Veiculo&&Veiculo.abrirFicha('${r.placa}')" title="Clique para ver a Ficha do Veículo">
        <div class="rastr-header">
          <span class="rastr-placa">${r.placa}</span>
          <span class="rastr-modelo">${r.modelo}</span>
          <span class="rastr-badge">${r.secretarias.length} secretarias</span>
        </div>
        <div class="rastr-timeline">
          ${r.secretarias.map((s,i)=>`
            <div class="rastr-etapa">
              ${i>0?'<div class="rastr-seta">→</div>':''}
              <div class="rastr-sec">
                <span class="rastr-sec-sigla">${s.sigla||'--'}</span>
                <span class="rastr-sec-nome">${_slShort(s.sigla)}</span>
                <span class="rastr-sec-periodo">${decodeData(s.primeiro)}–${decodeData(s.ultimo)}</span>
                <span class="rastr-sec-total">${fmtBRL(s.total)}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════════════
  //  RENDER ALL — chamado no refresh()
  // ══════════════════════════════════════════════════════

  function renderAll() {
    const data = State.getFilteredData();
    renderizarProjecao(data);
    renderizarSazonalidade(data);
    renderizarScoreSaude(data);
    renderizarRastreamento(data);
  }

  return { renderAll, calcularProjecao, calcularSazonalidade, calcularScoreSaude, calcularRastreamento };
})();
