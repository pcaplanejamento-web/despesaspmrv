/**
 * impressao.js — v1.0
 * Relatório de impressão com filtros: Ano, Tipo de Despesa, Tipo de Frota, Secretaria, Classificação.
 * Gerado 100% no frontend a partir dos dados já carregados.
 */
const Impressao = (() => {

  function fmtBRL(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtMes(m){ return (CONFIG.MESES||[])[m]||String(m||'--'); }
  function _sl(s){
    try{ const l=typeof Filters!=='undefined'?Filters.siglaLabel(String(s||'')):s||'--'; return(l!=null&&l!=='')?String(l):String(s||'--'); }
    catch(e){ return String(s||'--'); }
  }
  function _slShort(s){ return _sl(s).split('—')[0].trim()||String(s||'--'); }

  function _filtrar(data,p){
    return data.filter(r=>{
      if(p.ano     && String(r.Ano)!==String(p.ano))                          return false;
      if(p.despesa && (r.Despesa||'')!==p.despesa)                            return false;
      if(p.tipo    && (r.Tipo||'').toLowerCase()!==p.tipo.toLowerCase())      return false;
      if(p.sigla   && r.Sigla!==p.sigla)                                      return false;
      if(p.classif && (r.Classificacao||'')!==p.classif)                      return false;
      return true;
    });
  }

  function _chips(p){
    const c=[];
    if(p.ano)     c.push({l:'Ano',v:p.ano});
    if(p.despesa) c.push({l:'Despesa',v:p.despesa});
    if(p.tipo)    c.push({l:'Tipo',v:p.tipo});
    if(p.sigla)   c.push({l:'Secretaria',v:_slShort(p.sigla)});
    if(p.classif) c.push({l:'Classificação',v:p.classif});
    if(!c.length) c.push({l:'Filtros',v:'Todos os dados'});
    return c;
  }

  function abrir(){
    const rawData = typeof State!=='undefined' ? State.getRawData() : [];
    const anos    = [...new Set(rawData.map(r=>r.Ano).filter(Boolean))].sort((a,b)=>b-a);
    const despesas= [...new Set(rawData.map(r=>r.Despesa).filter(Boolean))].sort();
    const tipos   = [...new Set(rawData.map(r=>r.Tipo).filter(Boolean))].sort();
    const siglas  = [...new Set(rawData.map(r=>r.Sigla).filter(Boolean))].sort();
    const classifs= [...new Set(rawData.map(r=>r.Classificacao).filter(Boolean))].sort();

    const opts=(arr,ph='Todos')=>`<option value="">${ph}</option>`+arr.map(v=>`<option value="${v}">${v}</option>`).join('');
    const siglaOpts=`<option value="">Todas as secretarias</option>`+siglas.map(s=>`<option value="${s}">${_slShort(s)||s}</option>`).join('');

    Modal.openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:rgba(67,97,238,.12);color:var(--accent)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          </div>
          <div>
            <div class="modal-tag">Relatório</div>
            <h2 class="modal-title">Gerar Relatório de Impressão</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="analise-filtros" style="margin-bottom:0;padding-bottom:20px;">
          <div class="analise-filtro-group">
            <label class="analise-filtro-label">Ano</label>
            <select class="analise-filtro-select" id="pFiltroAno">${opts(anos,'Todos os anos')}</select>
          </div>
          <div class="analise-filtro-group">
            <label class="analise-filtro-label">Tipo de Despesa</label>
            <select class="analise-filtro-select" id="pFiltroDespesa">${opts(despesas,'Todos')}</select>
          </div>
          <div class="analise-filtro-group">
            <label class="analise-filtro-label">Tipo de Frota</label>
            <select class="analise-filtro-select" id="pFiltroTipo">${opts(tipos,'Todos')}</select>
          </div>
          <div class="analise-filtro-group">
            <label class="analise-filtro-label">Secretaria</label>
            <select class="analise-filtro-select" id="pFiltroSigla">${siglaOpts}</select>
          </div>
          <div class="analise-filtro-group">
            <label class="analise-filtro-label">Classificação</label>
            <select class="analise-filtro-select" id="pFiltroClassif">${opts(classifs,'Todas')}</select>
          </div>
          <div class="analise-filtro-group" style="justify-content:flex-end;">
            <button class="analise-filtro-btn" id="btnGerarRel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Gerar
            </button>
          </div>
        </div>
        <div id="printPreviewWrap"></div>
      </div>
      <div class="modal-footer" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <span class="modal-footer-hint" id="printHint">Configure os filtros acima e clique em Gerar</span>
        <button class="btn-modal-analise" id="btnImprimirFinal" style="display:none;" onclick="window.print()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir
        </button>
      </div>`,'modal-panel modal-panel-wide');

    document.getElementById('btnGerarRel')?.addEventListener('click',()=>_gerar(rawData));
  }

  function _gerar(rawData){
    const g=id=>document.getElementById(id)?.value||'';
    const p={ano:g('pFiltroAno'),despesa:g('pFiltroDespesa'),tipo:g('pFiltroTipo'),sigla:g('pFiltroSigla'),classif:g('pFiltroClassif')};
    const data=_filtrar(rawData,p);
    const chips=_chips(p);
    const total=data.reduce((s,r)=>s+r.Valor,0);
    const qtde=data.length;
    const mesesSet=new Set(data.map(r=>`${r.Ano}-${r.Mes}`));
    const media=mesesSet.size>0?total/mesesSet.size:0;
    const maior=data.reduce((m,r)=>r.Valor>m?r.Valor:m,0);

    // Tabela por mês
    const porMes={};
    data.forEach(r=>{
      const k=`${r.Ano}-${String(r.Mes).padStart(2,'0')}`;
      if(!porMes[k])porMes[k]={mes:r.Mes,ano:r.Ano,total:0,qtde:0};
      porMes[k].total+=r.Valor;porMes[k].qtde++;
    });
    const tMes=Object.values(porMes).sort((a,b)=>a.ano!==b.ano?a.ano-b.ano:a.mes-b.mes);

    // Tabela por secretaria
    const porSigla={};
    data.forEach(r=>{
      const k=r.Sigla||'--';
      if(!porSigla[k])porSigla[k]={sigla:k,nome:_slShort(k),total:0,qtde:0};
      porSigla[k].total+=r.Valor;porSigla[k].qtde++;
    });
    const tSigla=Object.values(porSigla).sort((a,b)=>b.total-a.total).slice(0,15);

    // Top 20 registros
    const tTop=[...data].sort((a,b)=>b.Valor-a.Valor).slice(0,20);

    const now=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});

    const html=`
      <div id="printPreview">
        <div class="print-header">
          <div>
            <div class="print-logo">Gastos RV — Despesas de Frota</div>
            <div class="print-sub">Prefeitura Municipal de Rio Verde · Sistema PCA</div>
          </div>
          <div class="print-meta">
            <strong>Gerado em ${now}</strong>
            ${chips.map(c=>c.l+': '+c.v).join(' · ')}
          </div>
        </div>

        <div class="print-filtros">
          ${chips.map(c=>`<span class="print-filtro-chip">${c.l}: ${c.v}</span>`).join('')}
        </div>

        <div class="print-kpis">
          <div class="print-kpi blue"><div class="print-kpi-label">Total Geral</div><div class="print-kpi-val">${fmtBRL(total)}</div></div>
          <div class="print-kpi green"><div class="print-kpi-label">Registros</div><div class="print-kpi-val">${qtde.toLocaleString('pt-BR')}</div></div>
          <div class="print-kpi amber"><div class="print-kpi-label">Média Mensal</div><div class="print-kpi-val">${fmtBRL(media)}</div></div>
          <div class="print-kpi rose"><div class="print-kpi-label">Maior Despesa</div><div class="print-kpi-val">${fmtBRL(maior)}</div></div>
        </div>

        <div class="print-secao">
          <div class="print-secao-titulo">Despesas por Mês</div>
          <table class="print-table">
            <thead><tr><th>Mês</th><th>Ano</th><th class="tr">Registros</th><th class="tr">Total</th></tr></thead>
            <tbody>${tMes.map(r=>`<tr><td>${fmtMes(r.mes)}</td><td>${r.ano}</td><td class="tr">${r.qtde.toLocaleString('pt-BR')}</td><td class="tr">${fmtBRL(r.total)}</td></tr>`).join('')}</tbody>
            <tfoot><tr><td colspan="2">TOTAL</td><td class="tr">${qtde.toLocaleString('pt-BR')}</td><td class="tr">${fmtBRL(total)}</td></tr></tfoot>
          </table>
        </div>

        <div class="print-secao">
          <div class="print-secao-titulo">Despesas por Secretaria (Top 15)</div>
          <table class="print-table">
            <thead><tr><th>Sigla</th><th>Secretaria</th><th class="tr">Registros</th><th class="tr">Total</th></tr></thead>
            <tbody>${tSigla.map(r=>`<tr><td style="font-family:monospace;font-weight:700">${r.sigla}</td><td>${r.nome}</td><td class="tr">${r.qtde.toLocaleString('pt-BR')}</td><td class="tr">${fmtBRL(r.total)}</td></tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="print-secao">
          <div class="print-secao-titulo">Maiores Despesas Individuais (Top 20)</div>
          <table class="print-table">
            <thead><tr><th>Placa</th><th>Modelo</th><th>Despesa</th><th>Secretaria</th><th>Mês</th><th>Ano</th><th class="tr">Valor</th></tr></thead>
            <tbody>${tTop.map(r=>`<tr><td style="font-family:monospace">${r.Placa||'--'}</td><td>${r.Modelo||'--'}</td><td>${r.Despesa||'--'}</td><td>${r.Sigla||'--'}</td><td>${fmtMes(r.Mes)}</td><td>${r.Ano||'--'}</td><td class="tr" style="font-weight:700">${fmtBRL(r.Valor)}</td></tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="print-footer-info">
          <span>Gastos RV · PMRV · Sistema PCA</span>
          <span>${chips.map(c=>c.l+': '+c.v).join(' · ')}</span>
          <span>Gerado em ${now}</span>
        </div>
      </div>`;

    const wrap=document.getElementById('printPreviewWrap');
    if(wrap) wrap.innerHTML=html;
    const btn=document.getElementById('btnImprimirFinal');
    if(btn) btn.style.display='';
    const hint=document.getElementById('printHint');
    if(hint) hint.textContent=`${qtde.toLocaleString('pt-BR')} registros · ${fmtBRL(total)}`;
  }

  return { abrir };
})();
