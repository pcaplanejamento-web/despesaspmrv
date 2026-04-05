/**
 * visualizacoes.js — v1.0
 * Visualizações avançadas renderizadas com Canvas 2D (sem libs extras):
 *   • Heatmap Mensal (12 × N anos)
 *   • Treemap de Secretarias (hierárquico)
 *   • Dispersão Frequência vs Custo (clique abre Ficha)
 *   • Waterfall de Variação por Secretaria
 */
const Visualizacoes = (() => {

  const PAL = CONFIG.PALETA_GRAFICOS;
  const fmtBRL = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fmtMes3 = m => (CONFIG.MESES[m]||String(m)).substring(0,3);
  const isDark  = () => document.documentElement.getAttribute('data-theme')==='dark';
  const bg      = () => isDark()?'#1a1f36':'#ffffff';
  const fg      = () => isDark()?'rgba(232,237,245,.75)':'rgba(26,31,54,.70)';
  const fgDim   = () => isDark()?'rgba(255,255,255,.30)':'rgba(26,31,54,.30)';
  const accentCor = () => isDark()?'#5b78ff':'#4361ee';

  // ── Helpers Canvas ────────────────────────────────────

  function lerp(a,b,t){ return a+(b-a)*t; }
  function colorIntensidade(t,tipo='calor'){
    // t: 0–1
    if(tipo==='calor'){
      // azul frio → laranja → vermelho
      if(t<0.5){
        const r=Math.round(lerp(240,255,t*2));
        const g=Math.round(lerp(248,152,t*2));
        const b=Math.round(lerp(255,50,t*2));
        return `rgb(${r},${g},${b})`;
      } else {
        const r=Math.round(lerp(255,180,( t-.5)*2));
        const g=Math.round(lerp(152,0,  (t-.5)*2));
        const b=Math.round(lerp(50,0,   (t-.5)*2));
        return `rgb(${r},${g},${b})`;
      }
    }
    return `hsl(${Math.round(240-t*240)},80%,55%)`;
  }

  function setupHDPI(canvas, w, h){
    const dpr = window.devicePixelRatio||1;
    canvas.width  = w*dpr; canvas.height = h*dpr;
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr,dpr);
    return ctx;
  }

  // ══════════════════════════════════════════════════════
  //  1. HEATMAP MENSAL
  // ══════════════════════════════════════════════════════

  let _heatmapTooltip = null;

  function renderizarHeatmap(data) {
    const canvas = document.getElementById('canvasHeatmap');
    if(!canvas) return;

    // Montar matriz ano×mês
    const porAnoMes={};
    data.forEach(r=>{
      if(!r.Ano||!r.Mes) return;
      const k=`${r.Ano}-${r.Mes}`;
      porAnoMes[k]=(porAnoMes[k]||0)+r.Valor;
    });
    const anos=[...new Set(data.map(r=>r.Ano).filter(Boolean))].sort();
    const meses=[1,2,3,4,5,6,7,8,9,10,11,12];
    if(!anos.length) return;

    const todos=Object.values(porAnoMes).filter(v=>v>0);
    const minV=Math.min(...todos), maxV=Math.max(...todos);

    const PAD_L=50, PAD_T=36, PAD_R=20, PAD_B=28;
    const containerW = canvas.parentElement?.offsetWidth || canvas.offsetWidth || 600;
    const CELL_W=Math.max(28, Math.floor((containerW-PAD_L-PAD_R)/12));
    const CELL_H=Math.max(32,40);
    const W=CELL_W*12+PAD_L+PAD_R;
    const H=CELL_H*anos.length+PAD_T+PAD_B;

    const ctx=setupHDPI(canvas,W,H);
    ctx.clearRect(0,0,W,H);

    // Fundo
    ctx.fillStyle=isDark()?'rgba(22,27,39,.0)':'rgba(255,255,255,.0)';
    ctx.fillRect(0,0,W,H);

    // Cabeçalho meses
    ctx.fillStyle=fg(); ctx.font='700 11px system-ui,sans-serif'; ctx.textAlign='center';
    meses.forEach((m,i)=>{
      ctx.fillText(fmtMes3(m), PAD_L+i*CELL_W+CELL_W/2, PAD_T-10);
    });
    // Cabeçalho anos
    ctx.textAlign='right'; ctx.font='700 12px system-ui,sans-serif';
    anos.forEach((ano,j)=>{
      ctx.fillStyle=fg();
      ctx.fillText(ano, PAD_L-8, PAD_T+j*CELL_H+CELL_H/2+4);
    });

    // Células
    const cellData=[]; // para tooltip
    anos.forEach((ano,j)=>{
      meses.forEach((mes,i)=>{
        const v=porAnoMes[`${ano}-${mes}`]||0;
        const t=maxV>minV?(v-minV)/(maxV-minV):0;
        const x=PAD_L+i*CELL_W, y=PAD_T+j*CELL_H;
        const cor=v>0?colorIntensidade(t,'calor'):(isDark()?'rgba(255,255,255,.04)':'rgba(0,0,0,.05)');

        ctx.beginPath();
        ctx.roundRect(x+2,y+2,CELL_W-4,CELL_H-4,6);
        ctx.fillStyle=cor;
        ctx.fill();

        if(v>0){
          ctx.fillStyle=t>0.5?'rgba(255,255,255,.9)':'rgba(0,0,0,.7)';
          ctx.font='600 9px system-ui,sans-serif';
          ctx.textAlign='center';
          ctx.fillText(fmtBRL(v).replace('R$','').trim().replace(/\s/g,''), x+CELL_W/2, y+CELL_H/2+3);
        }

        cellData.push({x,y,w:CELL_W,h:CELL_H,ano,mes,valor:v});
      });
    });

    // Tooltip por mousemove
    if(_heatmapTooltip) { canvas.removeEventListener('mousemove',_heatmapTooltip); }
    const tip=document.getElementById('heatmapTooltip');
    _heatmapTooltip=(e)=>{
      const rect=canvas.getBoundingClientRect();
      const mx=(e.clientX-rect.left)*(canvas.width/rect.width/window.devicePixelRatio);
      const my=(e.clientY-rect.top)*(canvas.height/rect.height/window.devicePixelRatio);
      const cell=cellData.find(c=>mx>=c.x&&mx<=c.x+c.w&&my>=c.y&&my<=c.y+c.h);
      if(cell&&cell.valor>0&&tip){
        tip.style.display='block';
        tip.style.left=(e.clientX+12)+'px';
        tip.style.top=(e.clientY-32)+'px';
        tip.innerHTML=`<strong>${fmtMes3(cell.mes)}/${cell.ano}</strong> — ${fmtBRL(cell.valor)}`;
      } else if(tip) tip.style.display='none';
    };
    canvas.addEventListener('mousemove',_heatmapTooltip);
    canvas.addEventListener('mouseleave',()=>{ if(tip) tip.style.display='none'; });
  }

  // ══════════════════════════════════════════════════════
  //  2. TREEMAP DE SECRETARIAS
  // ══════════════════════════════════════════════════════

  let _treemapRects=[];

  function _squarify(items, x, y, w, h){
    // Algoritmo squarified treemap
    if(!items.length) return [];
    const total=items.reduce((s,i)=>s+i.value,0);
    const rects=[];

    function _place(row, x, y, w, h, dir){
      const rowTotal=row.reduce((s,i)=>s+i.value,0);
      let pos = dir==='h' ? x : y;
      row.forEach(item=>{
        const frac=item.value/rowTotal;
        const rw=dir==='h'?w*frac:w;
        const rh=dir==='h'?h:h*frac;
        const rx=dir==='h'?pos:x;
        const ry=dir==='h'?y:pos;
        rects.push({...item,rx,ry,rw,rh});
        pos+=dir==='h'?rw:rh;
      });
    }

    function _worst(row,sideLen){
      const s=row.reduce((a,i)=>a+i.value,0);
      const max=Math.max(...row.map(i=>i.value));
      const min=Math.min(...row.map(i=>i.value));
      return Math.max(sideLen*sideLen*max/(s*s), s*s/(sideLen*sideLen*min));
    }

    function _layout(items,x,y,w,h){
      if(!items.length) return;
      const area=w*h, totalVal=items.reduce((s,i)=>s+i.value,0);
      const scaled=items.map(i=>({...i,scaled:i.value/totalVal*area}));

      let row=[], rest=[...scaled];
      const side=Math.min(w,h);

      while(rest.length){
        const candidate=[...row,rest[0]];
        if(!row.length||_worst(candidate,side)<=_worst(row,side)){
          row.push(rest.shift());
        } else {
          const dir=w>=h?'h':'v';
          const rowTotal=row.reduce((s,i)=>s+i.scaled,0);
          const rowFrac=rowTotal/area;
          const rowW=dir==='h'?w:w*rowFrac;
          const rowH=dir==='h'?h*rowFrac:h;
          _place(row,x,y,rowW,rowH,dir==='h'?'v':'h');
          if(dir==='h'){y+=rowH;h-=rowH;} else {x+=rowW;w-=rowW;}
          row=[rest.shift()];
          rest;
        }
      }
      if(row.length) { const dir=w>=h?'v':'h'; _place(row,x,y,w,h,dir); }
    }

    _layout(scaled=items.map(i=>({...i,scaled:i.value/total*(w*h)})),x,y,w,h);
    return rects;
  }

  function renderizarTreemap(data) {
    const canvas=document.getElementById('canvasTreemap');
    if(!canvas) return;

    const bySigla={};
    data.forEach(r=>{
      if(!r.Sigla) return;
      if(!bySigla[r.Sigla]) bySigla[r.Sigla]={label:r.Sigla,value:0,count:0};
      bySigla[r.Sigla].value+=r.Valor||0;
      bySigla[r.Sigla].count++;
    });

    const items=Object.values(bySigla).sort((a,b)=>b.value-a.value);
    if(!items.length) return;

    const W=canvas.offsetWidth||600, H=Math.max(320,W*0.55);
    const ctx=setupHDPI(canvas,W,H);
    ctx.clearRect(0,0,W,H);

    const total=items.reduce((s,i)=>s+i.value,0);
    const norm=items.map((it,i)=>({...it,value:it.value/total*W*H,orig:it.value,idx:i}));

    // Algoritmo simples row-by-row para estabilidade
    _treemapRects=[];
    let rx=0,ry=0,rw=W,rh=H;
    const sorted=[...norm];
    while(sorted.length){
      const dir=rw>=rh?'h':'v';
      const rowH_or_W=dir==='h'?rh:rw;
      let row=[],rowArea=0;
      while(sorted.length){
        const next=sorted[0];
        const testRow=[...row,next];
        const testArea=rowArea+next.value;
        const side=dir==='h'?rowH_or_W:rowH_or_W;
        const rowLen=testArea/side;
        let ok=true;
        if(row.length>0){
          const oldRatio=Math.max(...row.map(i=>{const s=rowArea/side;const rlen=i.value/s;return Math.max(rlen/s,s/rlen);}));
          const newRatio=Math.max(...testRow.map(i=>{const s=testArea/side;const rlen=i.value/s;return Math.max(rlen/s,s/rlen);}));
          if(newRatio>oldRatio) ok=false;
        }
        if(ok||!row.length){row.push(sorted.shift());rowArea+=row[row.length-1].value;}
        else break;
      }
      const rowLen=rowArea/rowH_or_W;
      let pos=dir==='h'?ry:rx;
      row.forEach(it=>{
        const frac=it.value/rowArea;
        const cw=dir==='h'?rowLen:rowH_or_W*frac;
        const ch=dir==='h'?rowH_or_W*frac:rowLen;
        const cx=dir==='h'?rx:pos;
        const cy=dir==='h'?pos:ry;
        _treemapRects.push({...it,cx,cy,cw,ch});
        pos+=dir==='h'?ch:cw;
      });
      if(dir==='h'){rx+=rowLen;rw-=rowLen;} else {ry+=rowLen;rh-=rowLen;}
    }

    // Desenhar
    const sl=typeof Filters!=='undefined'?Filters.siglaLabel:s=>s;
    _treemapRects.forEach((r,i)=>{
      const cor=PAL[r.idx%PAL.length];
      ctx.beginPath();
      ctx.roundRect(r.cx+2,r.cy+2,r.cw-4,r.ch-4,6);
      ctx.fillStyle=cor+'CC'; ctx.fill();
      ctx.strokeStyle=isDark()?'rgba(0,0,0,.3)':'rgba(255,255,255,.6)';
      ctx.lineWidth=1; ctx.stroke();

      if(r.cw>60&&r.ch>30){
        ctx.fillStyle='rgba(255,255,255,.92)';
        ctx.font=`700 ${Math.min(13,r.cw/6)}px system-ui,sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        const lbl=r.label;
        const pct=((r.orig/total)*100).toFixed(1)+'%';
        ctx.fillText(lbl,r.cx+r.cw/2,r.cy+r.ch/2-(r.ch>50?8:0));
        if(r.ch>50){
          ctx.font=`500 ${Math.min(10,r.cw/8)}px system-ui,sans-serif`;
          ctx.fillStyle='rgba(255,255,255,.75)';
          ctx.fillText(pct,r.cx+r.cw/2,r.cy+r.ch/2+10);
        }
      }
    });

    // Tooltip
    const tip=document.getElementById('treemapTooltip');
    canvas.onmousemove=(e)=>{
      const rect=canvas.getBoundingClientRect();
      const mx=(e.clientX-rect.left)*(W/rect.width);
      const my=(e.clientY-rect.top)*(H/rect.height);
      const hit=_treemapRects.find(r=>mx>=r.cx&&mx<=r.cx+r.cw&&my>=r.cy&&my<=r.cy+r.ch);
      if(hit&&tip){
        tip.style.display='block';
        tip.style.left=(e.clientX+12)+'px';
        tip.style.top=(e.clientY-32)+'px';
        tip.innerHTML=`<strong>${sl(hit.label)}</strong><br>${fmtBRL(hit.orig)} · ${((hit.orig/total)*100).toFixed(1)}%`;
      } else if(tip) tip.style.display='none';
    };
    canvas.onmouseleave=()=>{ if(tip) tip.style.display='none'; };
    canvas.onclick=(e)=>{
      const rect=canvas.getBoundingClientRect();
      const mx=(e.clientX-rect.left)*(W/rect.width);
      const my=(e.clientY-rect.top)*(H/rect.height);
      const hit=_treemapRects.find(r=>mx>=r.cx&&mx<=r.cx+r.cw&&my>=r.cy&&my<=r.cy+r.ch);
      if(hit) {
        // Filtrar por secretaria
        if(typeof State!=='undefined'&&typeof App!=='undefined'){
          State.setMultiFilter('secretarias',[hit.label]);
          Filters.applyFilters();
          App.refresh();
          App.showToast('info',`Filtro aplicado: ${hit.label}`,`${fmtBRL(hit.orig)} em despesas`);
        }
      }
    };
  }

  // ══════════════════════════════════════════════════════
  //  3. DISPERSÃO FREQUÊNCIA vs CUSTO
  // ══════════════════════════════════════════════════════

  let _scatterPoints=[];

  function renderizarDispersao(data) {
    const canvas=document.getElementById('canvasDispersao');
    if(!canvas) return;

    // Agrupar por placa
    const porPlaca={};
    data.forEach(r=>{
      if(!r.Placa) return;
      if(!porPlaca[r.Placa]) porPlaca[r.Placa]={placa:r.Placa,modelo:r.Modelo||r.Placa,sigla:r.Sigla||'--',total:0,count:0,tipo:r.Tipo||'--'};
      porPlaca[r.Placa].total+=r.Valor||0;
      porPlaca[r.Placa].count++;
    });

    const veics=Object.values(porPlaca).filter(v=>v.count>0);
    if(!veics.length) return;

    const maxCount=Math.max(...veics.map(v=>v.count));
    const maxTotal=Math.max(...veics.map(v=>v.total));
    const mediaCount=veics.reduce((s,v)=>s+v.count,0)/veics.length;
    const mediaTotal=veics.reduce((s,v)=>s+v.total,0)/veics.length;

    const PAD=52;
    const W=canvas.offsetWidth||600, H=Math.max(320,W*0.55);
    const ctx=setupHDPI(canvas,W,H);
    ctx.clearRect(0,0,W,H);

    // Eixos
    ctx.strokeStyle=fgDim(); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD,PAD); ctx.lineTo(PAD,H-PAD); ctx.lineTo(W-PAD/2,H-PAD); ctx.stroke();

    // Linhas de media (quadrantes)
    const mx_px=PAD+(mediaCount/maxCount)*(W-PAD-PAD/2);
    const my_px=H-PAD-(mediaTotal/maxTotal)*(H-2*PAD);
    ctx.setLineDash([4,4]); ctx.strokeStyle=fgDim(); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(mx_px,PAD); ctx.lineTo(mx_px,H-PAD); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD,my_px); ctx.lineTo(W-PAD/2,my_px); ctx.stroke();
    ctx.setLineDash([]);

    // Rótulos dos quadrantes
    ctx.fillStyle=fgDim(); ctx.font='11px system-ui,sans-serif'; ctx.textAlign='center';
    ctx.fillText('Alta freq., baixo custo',PAD+(mx_px-PAD)/2,PAD+16);
    ctx.fillText('Alta freq., alto custo',mx_px+(W-PAD/2-mx_px)/2,PAD+16);
    ctx.fillText('Baixa freq., baixo custo',PAD+(mx_px-PAD)/2,H-PAD-8);
    ctx.fillText('Baixa freq., alto custo',mx_px+(W-PAD/2-mx_px)/2,H-PAD-8);

    // Labels eixos
    ctx.fillStyle=fg(); ctx.font='bold 11px system-ui,sans-serif'; ctx.textAlign='center';
    ctx.fillText('Frequência (qtde de registros)',W/2,H-8);
    ctx.save(); ctx.translate(14,H/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('Custo Total (R$)',0,0); ctx.restore();

    // Pontos
    _scatterPoints=[];
    veics.forEach(v=>{
      const px=PAD+(v.count/maxCount)*(W-PAD-PAD/2);
      const py=H-PAD-(v.total/maxTotal)*(H-2*PAD);
      const r=Math.max(4,Math.min(14, 4+(v.total/maxTotal)*10));
      const isCritico=v.count>mediaCount&&v.total>mediaTotal;
      const cor=isCritico?'#e11d48':v.tipo==='Máquina'?'#f59e0b':PAL[0];

      ctx.beginPath();
      ctx.arc(px,py,r,0,Math.PI*2);
      ctx.fillStyle=cor+'BB'; ctx.fill();
      ctx.strokeStyle=cor; ctx.lineWidth=1.5; ctx.stroke();

      _scatterPoints.push({px,py,r,v,cor,isCritico});
    });

    // Tooltip + clique
    const tip=document.getElementById('dispersaoTooltip');
    const sl=typeof Filters!=='undefined'?Filters.siglaLabel:s=>s;
    function hitTest(e){
      const rect=canvas.getBoundingClientRect();
      const mx=(e.clientX-rect.left)*(W/rect.width);
      const my=(e.clientY-rect.top)*(H/rect.height);
      return _scatterPoints.find(p=>Math.hypot(mx-p.px,my-p.py)<=p.r+4);
    }
    canvas.onmousemove=(e)=>{
      const h=hitTest(e);
      if(h&&tip){
        canvas.style.cursor='pointer';
        tip.style.display='block';
        tip.style.left=(e.clientX+14)+'px';
        tip.style.top=(e.clientY-40)+'px';
        tip.innerHTML=`<strong>${h.v.placa}</strong> — ${h.v.modelo}<br>${sl(h.v.sigla).split('—')[0].trim()}<br>${fmtBRL(h.v.total)} · ${h.v.count} registros`;
      } else { canvas.style.cursor='default'; if(tip) tip.style.display='none'; }
    };
    canvas.onmouseleave=()=>{ if(tip) tip.style.display='none'; };
    canvas.onclick=(e)=>{
      const h=hitTest(e);
      if(h&&typeof Veiculo!=='undefined') Veiculo.abrirFicha(h.v.placa);
    };
  }

  // ══════════════════════════════════════════════════════
  //  4. WATERFALL DE VARIAÇÃO
  // ══════════════════════════════════════════════════════

  let _chartWaterfall=null;

  function renderizarWaterfall(data) {
    const canvas=document.getElementById('canvasWaterfall');
    if(!canvas||typeof Chart==='undefined') return;
    if(_chartWaterfall){_chartWaterfall.destroy();_chartWaterfall=null;}

    // Precisamos de 2 anos para comparar; usa os 2 mais recentes
    const anos=[...new Set(data.map(r=>r.Ano).filter(Boolean))].sort();
    if(anos.length<2){ const el=document.getElementById('waterfallVazio'); if(el) el.style.display=''; return; }
    const anoA=anos[anos.length-2], anoB=anos[anos.length-1];

    const bySigla={};
    data.filter(r=>r.Ano===anoA||r.Ano===anoB).forEach(r=>{
      if(!r.Sigla) return;
      if(!bySigla[r.Sigla]) bySigla[r.Sigla]={a:0,b:0};
      if(r.Ano===anoA) bySigla[r.Sigla].a+=r.Valor||0;
      else bySigla[r.Sigla].b+=r.Valor||0;
    });

    const entries=Object.entries(bySigla)
      .map(([s,v])=>({sigla:s,diff:v.b-v.a,a:v.a,b:v.b}))
      .sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,12);

    const totalA=entries.reduce((s,e)=>s+e.a,0);
    const totalB=entries.reduce((s,e)=>s+e.b,0);

    const labels=[`Total ${anoA}`,...entries.map(e=>e.sigla),`Total ${anoB}`];
    const barData=entries.map(e=>Math.abs(e.diff));
    const cores=entries.map(e=>e.diff>0?'rgba(225,29,72,.75)':'rgba(5,150,105,.75)');
    const sl=typeof Filters!=='undefined'?Filters.siglaLabel:s=>s;

    _chartWaterfall=new Chart(canvas,{
      type:'bar',
      data:{
        labels:['Início '+anoA,...entries.map(e=>e.sigla.length>8?e.sigla.substring(0,8)+'…':e.sigla),'Total '+anoB],
        datasets:[
          // Barras de variação
          {
            label:'Variação',
            data:[0,...barData,0],
            backgroundColor:[accentCor()+'33',...cores,accentCor()+'33'],
            borderColor:[accentCor(),...entries.map(e=>e.diff>0?'#e11d48':'#059669'),accentCor()],
            borderWidth:2, borderRadius:6, borderSkipped:false,
          },
        ],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{duration:450,easing:'easeOutQuart'},
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:isDark()?'#1a1f36':'#fff',
            titleColor:isDark()?'#e8edf5':'#1a1f36',
            bodyColor:isDark()?'#9ca3af':'#6b7280',
            borderColor:isDark()?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)',
            borderWidth:1,padding:12,cornerRadius:10,
            callbacks:{
              title:items=>{
                const idx=items[0]?.dataIndex;
                if(idx===0) return `Total ${anoA}: ${fmtBRL(totalA)}`;
                if(idx===entries.length+1) return `Total ${anoB}: ${fmtBRL(totalB)}`;
                const e=entries[idx-1];
                return sl(e.sigla);
              },
              label:items=>{
                const idx=items.dataIndex;
                if(idx===0||idx===entries.length+1) return '';
                const e=entries[idx-1];
                const pct=e.a>0?((e.diff/e.a)*100).toFixed(1):'∞';
                return `${e.diff>0?'↑ +':'↓ '}${fmtBRL(e.diff)} (${pct}%)`;
              },
            },
          },
        },
        scales:{
          x:{grid:{display:false},border:{display:false},ticks:{color:isDark()?'rgba(232,237,245,.75)':'rgba(26,31,54,.70)',font:{size:10}}},
          y:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:isDark()?'rgba(232,237,245,.75)':'rgba(26,31,54,.70)',font:{size:10},callback:v=>v===0?'':'R$'+(v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'k':v)}},
        },
      },
    });

    // Subtitle dinâmico
    const sub=document.getElementById('waterfallSub');
    if(sub){
      const diff=totalB-totalA;
      const pct=totalA>0?((diff/totalA)*100).toFixed(1):'--';
      const cor=diff>0?'#e11d48':'#059669';
      const seta=diff>0?'↑':'↓';
      sub.innerHTML=`${anoA} → ${anoB}: <span style="color:${cor};font-weight:700">${seta} ${diff>0?'+':''}${fmtBRL(diff)} (${diff>0?'+':''}${pct}%)</span>`;
    }
  }

  // ══════════════════════════════════════════════════════
  //  RENDER ALL
  // ══════════════════════════════════════════════════════

  function renderAll() {
    const data=State.getFilteredData();
    renderizarHeatmap(data);
    renderizarTreemap(data);
    renderizarDispersao(data);
    renderizarWaterfall(data);
  }

  // Re-renderizar ao redimensionar
  let _resizeTimer=null;
  window.addEventListener('resize',()=>{
    clearTimeout(_resizeTimer);
    _resizeTimer=setTimeout(()=>{ if(State.hasData()) renderAll(); },300);
  },{passive:true});

  return { renderAll, renderizarHeatmap, renderizarTreemap, renderizarDispersao, renderizarWaterfall };
})();
