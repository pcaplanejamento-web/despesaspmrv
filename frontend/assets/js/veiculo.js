/**
 * veiculo.js — v2.1
 * Ficha do Veículo: análise completa por despesa, previsão, YoY,
 * desvio padrão, contrato, % secretaria, histórico siglas,
 * histórico de despesas, PDF via SVG inline.
 */
const Veiculo = (() => {

  const PAL = CONFIG.PALETA_GRAFICOS;
  function fmtBRL(v)  { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtMes(m)  { return CONFIG.MESES[m]||String(m||'--'); }
  function fmtPct(v)  { return Number(v||0).toFixed(1).replace('.',',')+'%'; }
  function isDark()   { return document.documentElement.getAttribute('data-theme')==='dark'; }
  function tc()       { return isDark()?'rgba(232,237,245,.75)':'rgba(26,31,54,.70)'; }
  function gc()       { return isDark()?'rgba(255,255,255,.07)':'rgba(67,97,238,.07)'; }
  function kFmt(v) {
    v = Number(v||0);
    if(v>=1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M';
    if(v>=1e3) return 'R$'+(v/1e3).toFixed(0)+'k';
    return 'R$'+v.toFixed(0);
  }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function sl(sigla) { return typeof Filters!=='undefined'?Filters.siglaLabel(sigla||''):(sigla||'--'); }

  // ── _fmtKey no escopo do módulo (acessível em _gerarPDF) ──
  function _fmtKey(k) {
    const [a, m] = String(k||'').split('-');
    return `${fmtMes(parseInt(m||0)).substring(0,3)}/${a||'--'}`;
  }
  function _mesKey(r) { return `${r.Ano||0}-${String(r.Mes||0).padStart(2,'0')}`; }

  let _charts = [];

  function _destroyCharts() {
    _charts.forEach(c => { try { c.destroy(); } catch(_){} });
    _charts = [];
  }

  function _tooltip() {
    return {
      backgroundColor: isDark()?'#1a1f36':'#fff',
      titleColor:      isDark()?'#e8edf5':'#1a1f36',
      bodyColor:       isDark()?'#9ca3af':'#6b7280',
      borderColor:     isDark()?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)',
      borderWidth:1, padding:10, cornerRadius:8,
    };
  }

  // ── Abrir busca ───────────────────────────────────────
  function abrirBusca() {
    Modal.openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:rgba(67,97,238,.12);color:var(--accent)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div>
            <div class="modal-tag">Análise de Veículo</div>
            <h2 class="modal-title">Ficha do Veículo</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Busque pela placa ou identificador para ver análise completa de despesas.</p>
        <div class="veiculo-busca-wrap">
          <input id="veiculoBuscaInput" class="veiculo-busca-input" type="text"
            placeholder="Ex: ABC-1234 ou ZZZ-001..."
            style="text-transform:uppercase;" autocomplete="off" spellcheck="false">
          <button id="veiculoBuscaBtn" class="btn-veiculo-busca">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Buscar
          </button>
        </div>
        <div id="veiculoSugestoes" class="veiculo-sugestoes"></div>
      </div>`, 'modal-panel');

    const inp = document.getElementById('veiculoBuscaInput');
    const btn = document.getElementById('veiculoBuscaBtn');
    const sug = document.getElementById('veiculoSugestoes');
    const placas = [...new Set(State.getRawData().map(r=>r.Placa||'').filter(Boolean))].sort();

    inp?.addEventListener('input', () => {
      const q = (inp.value||'').toUpperCase().trim();
      if (!q) { sug.innerHTML=''; return; }
      const matches = placas.filter(p=>p.toUpperCase().includes(q)).slice(0,8);
      sug.innerHTML = matches.map(p=>`<button class="veiculo-sug-item" data-placa="${esc(p)}">${esc(p)}</button>`).join('');
      sug.querySelectorAll('.veiculo-sug-item').forEach(b=>b.addEventListener('click',()=>abrirFicha(b.dataset.placa)));
    });
    inp?.addEventListener('keydown', e=>{ if(e.key==='Enter') abrirFicha(inp.value.trim()); });
    btn?.addEventListener('click',  ()=> abrirFicha(inp?.value.trim()||''));
    inp?.focus();
  }

  // ── Abrir ficha por placa ─────────────────────────────
  function abrirFicha(placa) {
    if (!placa || placa === '--') return;
    const todos = State.getRawData();
    const regs  = todos.filter(r => (r.Placa||'').toUpperCase() === placa.toUpperCase());
    if (!regs.length) {
      if(typeof App!=='undefined') App.showToast('warn','Veículo não encontrado',`Nenhum registro para ${placa}`);
      return;
    }
    _renderFicha(placa, regs, todos);
  }

  // ═══════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════

  function _aggMes(regs) {
    const map = {};
    regs.forEach(r => {
      if (!r.Mes||!r.Ano) return;
      const k = `${r.Ano}-${String(r.Mes).padStart(2,'0')}`;
      if (!map[k]) map[k] = {key:k,mes:r.Mes,ano:r.Ano,total:0,qtde:0};
      map[k].total += r.Valor||0; map[k].qtde++;
    });
    return Object.values(map).sort((a,b)=>a.key<b.key?-1:1);
  }

  function _stdDev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((s,v)=>s+v,0)/values.length;
    const variance = values.reduce((s,v)=>s+(v-mean)**2,0)/(values.length-1);
    return Math.sqrt(variance);
  }

  function _prever(evolMes, anoAtual) {
    const anoRegs = evolMes.filter(m=>m.ano===anoAtual);
    if (!anoRegs.length) return null;
    const mesesPresentes = anoRegs.map(m=>m.mes);
    const mesesFaltantes = Array.from({length:12},(_,i)=>i+1).filter(m=>!mesesPresentes.includes(m));
    if (!mesesFaltantes.length) return null;

    const vals = anoRegs.map(m=>m.total);
    const ultimos = vals.slice(-3);
    const mediaMensal = ultimos.reduce((s,v)=>s+v,0)/ultimos.length;

    let slope = 0;
    if (ultimos.length >= 2) {
      const n=ultimos.length, sumX=n*(n+1)/2, sumX2=n*(n+1)*(2*n+1)/6;
      const sumY=ultimos.reduce((s,v)=>s+v,0), sumXY=ultimos.reduce((s,v,i)=>s+(i+1)*v,0);
      slope = (n*sumXY - sumX*sumY)/(n*sumX2 - sumX**2)||0;
    }

    const totalAtual = vals.reduce((s,v)=>s+v,0);
    let previsao = 0;
    mesesFaltantes.forEach((_,i)=>{ previsao += Math.max(0, mediaMensal+slope*(i+1)); });
    return { totalAtual, previsao, totalPrevisto:totalAtual+previsao, mesesRestantes:mesesFaltantes.length, mediaMensal };
  }

  // ═══════════════════════════════════════════════════════
  // RENDER FICHA
  // ═══════════════════════════════════════════════════════

  function _renderFicha(placa, regs, todos) {
    _destroyCharts();

    // Identidade
    const sorted    = [...regs].sort((a,b)=>_mesKey(a)<_mesKey(b)?-1:1);
    const primeiro  = sorted[0];
    const ultimo    = sorted[sorted.length-1];
    const modelo    = regs.find(r=>r.Modelo)?.Modelo||'--';
    const tipo      = regs.find(r=>r.Tipo)?.Tipo||'--';
    const empresa   = regs.find(r=>r.Empresa)?.Empresa||'--';
    const depto     = regs.find(r=>r.Departamento)?.Departamento||'--';
    const cc        = regs.find(r=>r.CentroCusto)?.CentroCusto||'--';
    const classif   = regs.find(r=>r.Classificacao)?.Classificacao||'--';
    const contrato  = regs.find(r=>r.Contrato)?.Contrato||'--';
    const isProprio = /^pr[oó]prio$/i.test(contrato.trim());
    const siglaAtual= ultimo?.Sigla||'--';
    const periodoStr= `${_fmtKey(_mesKey(primeiro))} – ${_fmtKey(_mesKey(ultimo))}`;

    // Totais globais
    const totalVei  = regs.reduce((s,r)=>s+r.Valor,0);
    const qtde      = regs.length;
    const evolGeral = _aggMes(regs);
    const anoAtual  = new Date().getFullYear();
    const anosUniq  = [...new Set(regs.map(r=>r.Ano).filter(Boolean))].sort((a,b)=>a-b);

    // Frota do mesmo tipo
    const veicTipo = {};
    todos.filter(r=>r.Tipo===tipo).forEach(r=>{ if(!r.Placa||!r.Valor) return; veicTipo[r.Placa]=(veicTipo[r.Placa]||0)+r.Valor; });
    const totaisTipo  = Object.values(veicTipo);
    const mediaFlota  = totaisTipo.length?totaisTipo.reduce((s,v)=>s+v,0)/totaisTipo.length:0;
    const rankingPos  = [...totaisTipo].sort((a,b)=>b-a).indexOf(totalVei)+1;
    const diffMedia   = totalVei-mediaFlota;
    const pctMedia    = mediaFlota>0?(diffMedia/mediaFlota*100):0;
    const corMedia    = diffMedia>0?'#e11d48':'#059669';

    const ticketMedio = evolGeral.length?totalVei/evolGeral.length:0;

    // Contrato
    let contratoInfo = null;
    if (!isProprio && contrato!=='--') {
      const rc = todos.filter(r=>(r.Contrato||'').trim()===contrato.trim());
      const tc2 = rc.reduce((s,r)=>s+r.Valor,0);
      contratoInfo = { totalContrato:tc2, pctContrato:tc2>0?(totalVei/tc2*100):0, veicsContrato:new Set(rc.map(r=>r.Placa).filter(Boolean)).size };
    }

    // Despesas únicas
    const despesasUniq = [...new Set(regs.map(r=>r.Despesa||'--').filter(d=>d!=='--'))];
    const analiseDesp = despesasUniq.map((desp,idx)=>{
      const dr    = regs.filter(r=>(r.Despesa||'--')===desp);
      const total = dr.reduce((s,r)=>s+r.Valor,0);
      const evolD = _aggMes(dr);
      const vals  = evolD.map(m=>m.total);
      const media = vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:0;
      const dp    = _stdDev(vals);
      const pct   = totalVei>0?(total/totalVei*100):0;
      const regSec= todos.filter(r=>(r.Sigla||'')===(siglaAtual||'')&&(r.Despesa||'--')===desp);
      const totSec= regSec.reduce((s,r)=>s+r.Valor,0);
      const pctSec= totSec>0?(total/totSec*100):0;
      const prev  = _prever(evolD,anoAtual);
      const cor   = PAL[idx%PAL.length];
      const yoy   = {};
      anosUniq.forEach(a=>{ yoy[a]={ano:a,total:0,meses:{}}; });
      dr.forEach(r=>{ if(!r.Ano||!r.Mes) return; if(!yoy[r.Ano]) yoy[r.Ano]={ano:r.Ano,total:0,meses:{}}; yoy[r.Ano].total+=r.Valor; yoy[r.Ano].meses[r.Mes]=(yoy[r.Ano].meses[r.Mes]||0)+r.Valor; });
      return { desp,total,evolD,vals,media,dp,pct,pctSec,prev,cor,yoy };
    });

    // Histórico de secretarias
    const siglaMap = {};
    regs.forEach(r2=>{ const s=r2.Sigla||'--', k=_mesKey(r2); if(!siglaMap[s]) siglaMap[s]={sigla:s,min:k,max:k}; if(k<siglaMap[s].min) siglaMap[s].min=k; if(k>siglaMap[s].max) siglaMap[s].max=k; });
    const siglasList = Object.values(siglaMap).sort((a,b)=>a.min<b.min?-1:1);

    // ── HTML: contrato ────────────────────────────────
    const contratoHTML = isProprio
      ? `<div class="modal-campo" style="grid-column:1/-1">
          <span class="modal-campo-label">Contrato</span>
          <span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="badge" style="background:rgba(16,185,129,.12);color:#059669;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Frota Própria PMRV
            </span>
            <span style="font-size:11px;color:var(--text-muted)">Sem contrato de locação</span>
          </span>
         </div>`
      : `<div class="modal-campo">
          <span class="modal-campo-label">Contrato</span>
          <span class="modal-campo-valor mono" style="overflow:hidden;text-overflow:ellipsis" title="${esc(contrato)}">${esc(contrato)}</span>
         </div>
         ${contratoInfo?`<div class="modal-campo">
          <span class="modal-campo-label">Participação no Contrato</span>
          <span class="modal-campo-valor" style="color:var(--accent)">${fmtPct(contratoInfo.pctContrato)}<span style="font-size:10px;color:var(--text-muted);font-weight:400"> de ${fmtBRL(contratoInfo.totalContrato)} · ${contratoInfo.veicsContrato} veículos</span></span>
         </div>`:''}`;

    // ── HTML: pills secretarias ───────────────────────
    const siglaPills = siglasList.map(s=>{
      const nc = sl(s.sigla);
      const periodo = s.min===s.max?_fmtKey(s.min):`${_fmtKey(s.min)} – ${_fmtKey(s.max)}`;
      return `<span class="rp-tag" title="${esc(nc)}" style="display:inline-flex;flex-direction:column;gap:2px;padding:6px 11px;border-radius:9px;max-width:190px;min-width:0">
        <span style="font-size:11px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.sigla)}</span>
        <span style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85">${esc(periodo)}</span>
      </span>`;
    }).join('');

    // ── HTML: blocos por despesa ──────────────────────
    const despBlocos = analiseDesp.map((ad,idx)=>{
      const canvasId = `vchart-${idx}`;
      const yoyId    = `vchartYoy-${idx}`;
      const prevBadge = ad.prev?`<div style="margin-top:10px;padding:10px 12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:9px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#b45309;margin-bottom:6px">Previsão ${anoAtual} — ${ad.prev.mesesRestantes} ${ad.prev.mesesRestantes===1?'mês restante':'meses restantes'}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Realizado</div><div style="font-size:13px;font-weight:800;color:var(--text)">${fmtBRL(ad.prev.totalAtual)}</div></div>
            <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Projeção</div><div style="font-size:13px;font-weight:800;color:#d97706">+${fmtBRL(ad.prev.previsao)}</div></div>
            <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Total previsto</div><div style="font-size:13px;font-weight:800;color:var(--accent)">${fmtBRL(ad.prev.totalPrevisto)}</div></div>
          </div>
        </div>`:'';
      const yoyBlock = anosUniq.length>1?`<div class="modal-secao-titulo" style="margin-top:14px;display:flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Comparativo Anual</div><div style="position:relative;height:130px;margin-bottom:4px"><canvas id="${esc(yoyId)}"></canvas></div>`:'';
      return `<div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--border-dim)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
          <span style="width:10px;height:10px;border-radius:50%;background:${esc(ad.cor)};flex-shrink:0;display:inline-block"></span>
          <span style="font-size:13px;font-weight:800;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0">${esc(ad.desp)}</span>
          <span style="font-size:12px;font-weight:700;color:var(--accent);white-space:nowrap">${fmtBRL(ad.total)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
          <div class="modal-campo"><span class="modal-campo-label">Média Mensal</span><span class="modal-campo-valor">${fmtBRL(ad.media)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Desvio Padrão Mensal</span><span class="modal-campo-valor">${fmtBRL(ad.dp)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">% do Total do Veículo</span><span class="modal-campo-valor" style="color:var(--accent)">${fmtPct(ad.pct)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">% do Total — ${esc(siglaAtual)}</span><span class="modal-campo-valor" style="color:${ad.pctSec>20?'#e11d48':'var(--accent)'}">${fmtPct(ad.pctSec)}</span></div>
        </div>
        <div class="modal-secao-titulo" style="display:flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>Evolução Mensal</div>
        <div style="position:relative;height:140px;margin-bottom:4px"><canvas id="${esc(canvasId)}"></canvas></div>
        ${prevBadge}${yoyBlock}
      </div>`;
    }).join('');

    // ── HTML: histórico de despesas (tabela cronológica) ──
    const histSorted = [...regs].sort((a,b)=>{ const ka=`${b.Ano||0}-${String(b.Mes||0).padStart(2,'0')}`, kb=`${a.Ano||0}-${String(a.Mes||0).padStart(2,'0')}`; return ka<kb?-1:ka>kb?1:0; });
    const totalHist  = regs.reduce((s,r)=>s+r.Valor,0);
    const MAX_VIS    = 10;
    const temMais    = histSorted.length>MAX_VIS;
    function _histRow(r2) {
      const isComb = (r2.Despesa||'').toLowerCase().startsWith('combust');
      const badge  = isComb?`<span class="badge badge-combustivel" style="white-space:nowrap">${esc(r2.Despesa||'--')}</span>`:`<span class="badge badge-manutencao" style="white-space:nowrap">${esc(r2.Despesa||'--')}</span>`;
      return `<tr>
        <td style="white-space:nowrap">${fmtMes(r2.Mes).substring(0,3)}/${r2.Ano||'--'}</td>
        <td>${badge}</td>
        <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r2.Classificacao||'')}">${esc(r2.Classificacao||'--')}</td>
        <td style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--accent);white-space:nowrap">${esc(r2.Sigla||'--')}</td>
        <td class="tr fw-700">${fmtBRL(r2.Valor)}</td>
      </tr>`;
    }
    const rowsVis  = histSorted.slice(0,MAX_VIS).map(_histRow).join('');
    const rowsExt  = histSorted.slice(MAX_VIS).map(_histRow).join('');

    const secaoHistDespesas = `
      <div class="modal-table-wrap">
        <table class="modal-table">
          <thead><tr><th>Período</th><th>Tipo</th><th>Classificação</th><th>Sigla</th><th class="tr">Valor</th></tr></thead>
          <tbody>${rowsVis}</tbody>
          ${temMais?`<tbody id="vhExtra" style="display:none">${rowsExt}</tbody>`:''}
        </table>
      </div>
      ${temMais?`<button id="vhToggle" style="margin-top:8px;font-size:12px;font-weight:700;color:var(--accent);background:none;border:none;cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:4px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        Ver todos (${histSorted.length} registros)
      </button>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0 0;border-top:1px solid var(--border-dim);margin-top:6px;gap:8px">
        <span style="font-size:12px;color:var(--text-muted)">${histSorted.length.toLocaleString('pt-BR')} registros no histórico</span>
        <span style="font-size:13px;font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums;white-space:nowrap">${fmtBRL(totalHist)}</span>
      </div>`;

    // ── Montar modal (apenas botão PDF no footer) ─────
    Modal.openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:rgba(67,97,238,.12);color:var(--accent)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div style="min-width:0">
            <div class="modal-tag">Ficha do Veículo</div>
            <h2 class="modal-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(placa.toUpperCase())} — ${esc(modelo)}</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="modal-body">

        <div class="modal-value-destaque">
          <span class="modal-value-label">Total Acumulado de Despesas</span>
          <span class="modal-value-num">${fmtBRL(totalVei)}</span>
          <span class="modal-value-sub">${qtde} registros · Período: ${esc(periodoStr)}</span>
        </div>

        <div class="modal-grid">
          <div class="modal-campo"><span class="modal-campo-label">Placa</span><span class="modal-campo-valor mono" style="overflow:hidden;text-overflow:ellipsis">${esc(placa.toUpperCase())}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Modelo</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${esc(modelo)}">${esc(modelo)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Tipo</span><span class="modal-campo-valor">${esc(tipo)}</span></div>
          ${contratoHTML}
        </div>

        <div class="modal-secao-titulo">Localização Atual</div>
        <div class="modal-grid modal-grid-2">
          <div class="modal-campo"><span class="modal-campo-label">Secretaria</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${esc(sl(siglaAtual))}">${esc(sl(siglaAtual))}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Sigla</span><span class="modal-campo-valor mono">${esc(siglaAtual)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Departamento</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${esc(depto)}">${esc(depto)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Centro de Custo</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${esc(cc)}">${esc(cc)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Empresa</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${esc(empresa)}">${esc(empresa)}</span></div>
          <div class="modal-campo"><span class="modal-campo-label">Classificação</span><span class="modal-campo-valor" style="overflow:hidden;text-overflow:ellipsis" title="${esc(classif)}">${esc(classif)}</span></div>
        </div>

        <div class="modal-secao-titulo" style="margin-top:18px;display:flex;align-items:center;gap:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          Indicadores do Veículo
        </div>
        <div class="modal-grid">
          <div class="modal-campo">
            <span class="modal-campo-label">Ticket Médio Mensal</span>
            <span class="modal-campo-valor" style="color:var(--accent)">${fmtBRL(ticketMedio)}</span>
          </div>
          <div class="modal-campo">
            <span class="modal-campo-label">vs. Média da Frota (${esc(tipo)})</span>
            <span class="modal-campo-valor" style="color:${esc(corMedia)};display:flex;align-items:center;gap:4px">
              ${diffMedia>0?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>':'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>'}
              ${pctMedia>0?'+':''}${fmtPct(pctMedia)}
            </span>
            <span style="font-size:10px;color:var(--text-muted)">Média: ${fmtBRL(mediaFlota)} · #${rankingPos} no ranking</span>
          </div>
          <div class="modal-campo">
            <span class="modal-campo-label">Secretaria atual</span>
            <span class="modal-campo-valor mono" style="overflow:hidden;text-overflow:ellipsis">${esc(siglaAtual)}</span>
          </div>
        </div>

        <div class="modal-secao-titulo" style="margin-top:18px;display:flex;align-items:center;gap:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Análise por Tipo de Despesa
        </div>
        ${despBlocos||'<p style="font-size:12px;color:var(--text-muted)">Sem dados de despesa encontrados.</p>'}

        <div class="modal-secao-titulo" style="margin-top:4px;display:flex;align-items:center;gap:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          Histórico de Secretarias
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${siglasList.length>1?`Veículo transitou por <strong style="color:var(--text)">${siglasList.length}</strong> secretarias`:'Secretaria única no período'}</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">${siglaPills}</div>

        <div class="modal-secao-titulo" style="display:flex;align-items:center;gap:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/></svg>
          Histórico de Despesas
        </div>
        ${secaoHistDespesas}

      </div>

      <div class="modal-footer" style="justify-content:space-between;align-items:center">
        <span class="modal-footer-hint">ESC ou clique fora para fechar</span>
        <button id="vFichaPDFBtn" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid var(--accent);background:var(--accent-soft);color:var(--accent);font-family:var(--font-ui);font-size:12.5px;font-weight:700;cursor:pointer;transition:background .15s,color .15s;white-space:nowrap;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir Ficha PDF
        </button>
      </div>`, 'modal-panel modal-panel-wide');

    // ── Bind: gráficos + toggle histórico + PDF ───────
    requestAnimationFrame(()=>{
      // Gráficos por despesa
      analiseDesp.forEach((ad,idx)=>{
        const canvas = document.getElementById(`vchart-${idx}`);
        if (canvas && ad.evolD.length) {
          const labels   = ad.evolD.map(m=>`${fmtMes(m.mes).substring(0,3)}/${String(m.ano).slice(2)}`);
          const values   = ad.evolD.map(m=>m.total);
          const mediaArr = Array(values.length).fill(ad.media);
          const c = new Chart(canvas,{
            type:'bar',
            data:{labels,datasets:[
              {data:values,backgroundColor:ad.cor+'BB',borderColor:ad.cor,borderWidth:0,borderRadius:5,borderSkipped:false,label:'Despesa'},
              {data:mediaArr,type:'line',borderColor:'#f59e0b',borderWidth:1.5,borderDash:[5,3],pointRadius:0,fill:false,label:'Média'},
            ]},
            options:{responsive:true,maintainAspectRatio:false,animation:{duration:350,easing:'easeOutQuart'},
              plugins:{legend:{display:false},tooltip:{..._tooltip(),callbacks:{label:ctx=>` ${fmtBRL(ctx.parsed.y)}`}}},
              scales:{x:{grid:{display:false},border:{display:false},ticks:{color:tc(),font:{size:9}}},y:{grid:{color:gc(),drawTicks:false},border:{display:false},ticks:{color:tc(),font:{size:9},callback:kFmt}}},
            },
          });
          _charts.push(c);
        }
        // YoY
        const yoyCanvas = document.getElementById(`vchartYoy-${idx}`);
        if (yoyCanvas && anosUniq.length>1) {
          const meses12   = Array.from({length:12},(_,i)=>i+1);
          const yoyLabels = meses12.map(m=>fmtMes(m).substring(0,3));
          const datasets  = anosUniq.map((ano,ai)=>({
            label:String(ano),data:meses12.map(m=>ad.yoy[ano]?.meses[m]||0),
            backgroundColor:PAL[ai%PAL.length]+'BB',borderColor:PAL[ai%PAL.length],borderWidth:0,borderRadius:4,borderSkipped:false,
          }));
          const cy = new Chart(yoyCanvas,{
            type:'bar',data:{labels:yoyLabels,datasets},
            options:{responsive:true,maintainAspectRatio:false,animation:{duration:350,easing:'easeOutQuart'},
              plugins:{legend:{display:true,position:'top',labels:{color:tc(),font:{size:10},boxWidth:10,padding:12}},tooltip:{..._tooltip(),callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmtBRL(ctx.parsed.y)}`}}},
              scales:{x:{grid:{display:false},border:{display:false},ticks:{color:tc(),font:{size:9}}},y:{grid:{color:gc(),drawTicks:false},border:{display:false},ticks:{color:tc(),font:{size:9},callback:kFmt}}},
            },
          });
          _charts.push(cy);
        }
      });

      // Toggle histórico de despesas
      const toggleBtn  = document.getElementById('vhToggle');
      const extraTbody = document.getElementById('vhExtra');
      if (toggleBtn && extraTbody) {
        toggleBtn.addEventListener('click',()=>{
          const aberto = extraTbody.style.display!=='none';
          extraTbody.style.display = aberto?'none':'';
          toggleBtn.innerHTML = aberto
            ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg> Ver todos (${histSorted.length} registros)`
            :`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg> Recolher`;
        });
      }

      // Botão PDF — único, no footer
      document.getElementById('vFichaPDFBtn')?.addEventListener('click',()=>{
        _gerarPDF({ placa,modelo,tipo,empresa,depto,cc,classif,contrato,isProprio,contratoInfo,
          siglaAtual,siglasList,periodoStr,totalVei,qtde,ticketMedio,mediaFlota,rankingPos,
          pctMedia,diffMedia,analiseDesp,anosUniq,histSorted });
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  // SVG BUILDERS (puros, sem dependência, seguros para print)
  // ═══════════════════════════════════════════════════════

  function _svgBar(dados, cor) {
    if (!dados.length) return '';
    const W=540,H=100,padL=44,padR=12,padT=14,padB=26;
    const innerW=W-padL-padR, innerH=H-padT-padB;
    const maxV=Math.max(...dados.map(d=>d.v),1);
    const colW=Math.floor(innerW/dados.length);
    const barW=Math.max(4,Math.floor(colW*0.6));
    const grid=[.5,1].map(p=>{
      const y=(padT+innerH-innerH*p).toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2"/><text x="${(padL-3).toFixed(1)}" y="${(parseFloat(y)+3).toFixed(1)}" text-anchor="end" font-size="7" fill="#9ca3af">${kFmt(maxV*p)}</text>`;
    }).join('');
    const bars=dados.map((d,i)=>{
      const x=(padL+i*colW+(colW-barW)/2).toFixed(1);
      const bH=Math.max(2,(d.v/maxV)*innerH).toFixed(1);
      const y=(padT+innerH-parseFloat(bH)).toFixed(1);
      return `<rect x="${x}" y="${y}" width="${barW}" height="${bH}" fill="${cor}" rx="2" opacity="0.85"/><text x="${(parseFloat(x)+barW/2).toFixed(1)}" y="${(padT+innerH+13).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="#6b7280">${esc(String(d.l||'').substring(0,7))}</text>`;
    }).join('');
    const mediaV=dados.reduce((s,d)=>s+d.v,0)/dados.length;
    const mediaY=(padT+innerH-(mediaV/maxV)*innerH).toFixed(1);
    const avgLine=`<line x1="${padL}" y1="${mediaY}" x2="${W-padR}" y2="${mediaY}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,3"/><text x="${(W-padR+2).toFixed(1)}" y="${(parseFloat(mediaY)+3).toFixed(1)}" font-size="7" fill="#b45309">média</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">${grid}${bars}${avgLine}</svg>`;
  }

  function _svgBarYoy(yoy, anos) {
    const meses12=Array.from({length:12},(_,i)=>i+1);
    const W=540,H=100,padL=44,padR=12,padT=24,padB=26;
    const innerW=W-padL-padR, innerH=H-padT-padB;
    const allVals=anos.flatMap(a=>meses12.map(m=>yoy[a]?.meses[m]||0));
    const maxV=Math.max(...allVals,1);
    const slotW=Math.floor(innerW/12);
    const barW=Math.max(2,Math.floor(slotW*0.85/anos.length));
    const pal=['#185FA5','#D85A30','#1D9E75','#BA7517'];
    const grid=[.5,1].map(p=>{ const y=(padT+innerH-innerH*p).toFixed(1); return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2"/>`; }).join('');
    const legend=anos.map((a,i)=>`<rect x="${(padL+i*48).toFixed(1)}" y="4" width="8" height="8" fill="${pal[i%pal.length]}" rx="1"/><text x="${(padL+i*48+11).toFixed(1)}" y="11.5" font-size="8" fill="#374151">${a}</text>`).join('');
    const bars=meses12.map((mes,mi)=>{
      const x=padL+mi*slotW;
      const mesLbl=fmtMes(mes).substring(0,3);
      const rects=anos.map((ano,ai)=>{ const v=yoy[ano]?.meses[mes]||0; const bH=Math.max(1,(v/maxV)*innerH).toFixed(1); const y=(padT+innerH-parseFloat(bH)).toFixed(1); return `<rect x="${(x+ai*(barW+1)).toFixed(1)}" y="${y}" width="${barW}" height="${bH}" fill="${pal[ai%pal.length]}" rx="1" opacity="0.85"/>`; }).join('');
      return `${rects}<text x="${(x+slotW/2).toFixed(1)}" y="${(padT+innerH+12).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="#6b7280">${mesLbl}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block"><g>${legend}</g>${grid}${bars}</svg>`;
  }

  // ═══════════════════════════════════════════════════════
  // GERAR PDF
  // ═══════════════════════════════════════════════════════

  function _gerarPDF(p) {
    const { placa,modelo,tipo,empresa,depto,cc,classif,contrato,isProprio,contratoInfo,
      siglaAtual,siglasList,periodoStr,totalVei,qtde,ticketMedio,mediaFlota,rankingPos,
      pctMedia,diffMedia,analiseDesp,anosUniq,histSorted } = p;

    // Abrir nova aba — usar Blob URL para evitar bloqueio de popup
    const now     = new Date();
    const dtStr   = now.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
    const corMedia= diffMedia>0?'#dc2626':'#059669';

    // Seções de despesa
    const despSecoes = analiseDesp.map(ad=>{
      const evolDados = ad.evolD.map(m=>({l:`${fmtMes(m.mes).substring(0,3)}/${String(m.ano).slice(2)}`,v:m.total}));
      const svgBar    = _svgBar(evolDados, ad.cor);
      const svgYoy    = anosUniq.length>1?_svgBarYoy(ad.yoy,anosUniq):'';
      const prevHTML  = ad.prev?`<div style="margin-top:8px;padding:10px 12px;background:#fff9f0;border:1px solid #f59e0b;border-radius:8px">
        <div style="font-size:9pt;font-weight:700;color:#b45309;margin-bottom:6px">Previsão ${now.getFullYear()} — ${ad.prev.mesesRestantes} mês(es)</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div><div style="font-size:8pt;color:#9ca3af">Realizado</div><div style="font-size:11pt;font-weight:800;color:#1a1f36">${fmtBRL(ad.prev.totalAtual)}</div></div>
          <div><div style="font-size:8pt;color:#9ca3af">Projeção</div><div style="font-size:11pt;font-weight:800;color:#d97706">+${fmtBRL(ad.prev.previsao)}</div></div>
          <div><div style="font-size:8pt;color:#9ca3af">Total previsto</div><div style="font-size:11pt;font-weight:800;color:#185FA5">${fmtBRL(ad.prev.totalPrevisto)}</div></div>
        </div></div>` : '';
      return `<div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #e5e7eb">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="width:10px;height:10px;border-radius:50%;background:${esc(ad.cor)};display:inline-block;flex-shrink:0"></span>
          <strong style="font-size:12pt;color:#1a1f36;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(ad.desp)}</strong>
          <span style="font-size:12pt;font-weight:800;color:#185FA5;white-space:nowrap">${fmtBRL(ad.total)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">Média Mensal</div><div style="font-size:11pt;font-weight:800;color:#185FA5">${fmtBRL(ad.media)}</div></div>
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">Desvio Padrão</div><div style="font-size:11pt;font-weight:800;color:#1a1f36">${fmtBRL(ad.dp)}</div></div>
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">% do Veículo</div><div style="font-size:11pt;font-weight:800;color:#185FA5">${fmtPct(ad.pct)}</div></div>
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">% da ${esc(siglaAtual)}</div><div style="font-size:11pt;font-weight:800;color:${ad.pctSec>20?'#dc2626':'#185FA5'}">${fmtPct(ad.pctSec)}</div></div>
        </div>
        ${svgBar}${prevHTML}
        ${anosUniq.length>1?`<div style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin:8px 0 4px">Comparativo Anual</div>${svgYoy}`:''}
      </div>`;
    }).join('');

    // Histórico de siglas
    const siglaLinhas = siglasList.map(s=>{
      const periodo = s.min===s.max?_fmtKey(s.min):`${_fmtKey(s.min)} – ${_fmtKey(s.max)}`;
      return `<span style="display:inline-flex;flex-direction:column;gap:2px;padding:6px 10px;border-radius:8px;background:#eef2ff;border:1px solid #c7d2fe;margin:3px">
        <span style="font-size:9pt;font-weight:700;font-family:monospace;color:#185FA5">${esc(s.sigla)}</span>
        <span style="font-size:8pt;color:#6b7280">${esc(periodo)}</span>
      </span>`;
    }).join('');

    // Histórico de despesas (tabela PDF — até 40 linhas)
    const histPDFRows = [...histSorted].slice(0,40).map(r2=>{
      const isComb=(r2.Despesa||'').toLowerCase().startsWith('combust');
      const cor=isComb?'#185FA5':'#D85A30';
      return `<tr style="${histSorted.indexOf(r2)%2===0?'background:#f8f9fc':''}">
        <td style="padding:5px 8px;white-space:nowrap">${fmtMes(r2.Mes).substring(0,3)}/${r2.Ano||'--'}</td>
        <td style="padding:5px 8px"><span style="font-size:8pt;font-weight:700;color:${cor};background:${isComb?'rgba(24,95,165,.1)':'rgba(216,90,48,.1)'};padding:2px 7px;border-radius:10px">${esc(r2.Despesa||'--')}</span></td>
        <td style="padding:5px 8px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r2.Classificacao||'--')}</td>
        <td style="padding:5px 8px;font-family:monospace;font-weight:700;color:#185FA5">${esc(r2.Sigla||'--')}</td>
        <td style="padding:5px 8px;text-align:right;font-weight:700;color:#185FA5;font-variant-numeric:tabular-nums">${fmtBRL(r2.Valor)}</td>
      </tr>`;
    }).join('');
    const histPDFTotal = histSorted.reduce((s,r)=>s+r.Valor,0);
    const histExtra    = histSorted.length>40?`<tr><td colspan="5" style="padding:6px 8px;text-align:center;color:#9ca3af;font-style:italic">... e mais ${(histSorted.length-40).toLocaleString('pt-BR')} registros</td></tr>`:'';

    // Contrato PDF
    const contratoHtmlPDF = isProprio
      ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <div><strong style="color:#059669">Frota Própria PMRV</strong> <span style="color:#6b7280;font-size:9pt">— Sem contrato de locação</span></div>
         </div>`
      : `<div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px">
          <div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Contrato de Locação</div>
          <div style="font-size:11pt;font-weight:700;color:#1a1f36;font-family:monospace">${esc(contrato)}</div>
          ${contratoInfo?`<div style="font-size:9pt;color:#185FA5;margin-top:4px;font-weight:600">${fmtPct(contratoInfo.pctContrato)} do contrato · Total: ${fmtBRL(contratoInfo.totalContrato)} · ${contratoInfo.veicsContrato} veículos</div>`:''}
         </div>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ficha do Veículo — ${esc(placa.toUpperCase())}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
@page{size:A4 portrait;margin:15mm 14mm 18mm 14mm;}
@media print{.no-print{display:none!important;}}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:11pt;color:#1a1f36;background:#fff;line-height:1.5;}
table{border-collapse:collapse;width:100%;}
th{background:#185FA5;color:#fff;padding:7px 8px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:left;}
th.tr{text-align:right;}
td{border-bottom:1px solid #f1f5f9;font-size:9pt;}
</style></head><body>

<button class="no-print" onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#185FA5;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;z-index:99;box-shadow:0 4px 14px rgba(24,95,165,.35)">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
  Imprimir / Salvar PDF
</button>

<div style="border-top:6px solid #185FA5;padding:40px 48px 28px;margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:28px">
    <div style="width:48px;height:48px;background:#185FA5;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    </div>
    <div><div style="font-size:16px;font-weight:700;color:#185FA5">Gastos RV</div><div style="font-size:11px;color:#6b7280">Prefeitura Municipal de Rio Verde — PMRV</div></div>
  </div>
  <h1 style="font-size:24pt;font-weight:800;color:#1a1f36;letter-spacing:-.5px;margin-bottom:5px">Ficha do Veículo</h1>
  <p style="font-size:13pt;color:#6b7280;margin-bottom:22px">${esc(placa.toUpperCase())} — ${esc(modelo)}</p>
  <div style="height:1px;background:#e5e7eb;margin-bottom:16px"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:16px">
    <div><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px">Tipo</div><div style="font-size:11pt;font-weight:600">${esc(tipo)}</div></div>
    <div><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px">Secretaria atual</div><div style="font-size:11pt;font-weight:600">${esc(sl(siglaAtual))}</div></div>
    <div><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px">Período</div><div style="font-size:11pt;font-weight:600">${esc(periodoStr)}</div></div>
    <div><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px">Registros</div><div style="font-size:11pt;font-weight:600">${qtde.toLocaleString('pt-BR')}</div></div>
  </div>
  <div style="font-size:8pt;color:#9ca3af;display:flex;justify-content:space-between"><span>Gastos RV v${CONFIG.VERSAO||'1.x'}</span><span>Emitido em ${dtStr}</span></div>
</div>

<div style="padding:0 48px">

<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Indicadores Globais</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px"><div style="font-size:8pt;color:#9ca3af;margin-bottom:4px">Total Acumulado</div><div style="font-size:14pt;font-weight:800;color:#185FA5;font-variant-numeric:tabular-nums">${fmtBRL(totalVei)}</div></div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px"><div style="font-size:8pt;color:#9ca3af;margin-bottom:4px">Ticket Médio Mensal</div><div style="font-size:14pt;font-weight:800;color:#185FA5;font-variant-numeric:tabular-nums">${fmtBRL(ticketMedio)}</div></div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px"><div style="font-size:8pt;color:#9ca3af;margin-bottom:4px">vs. Média da Frota</div><div style="font-size:14pt;font-weight:800;color:${esc(corMedia)};font-variant-numeric:tabular-nums">${pctMedia>0?'+':''}${fmtPct(pctMedia)}</div><div style="font-size:8pt;color:#9ca3af">Média: ${fmtBRL(mediaFlota)}</div></div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px"><div style="font-size:8pt;color:#9ca3af;margin-bottom:4px">Ranking</div><div style="font-size:14pt;font-weight:800;color:#1a1f36">#${rankingPos}</div><div style="font-size:8pt;color:#9ca3af">entre ${esc(tipo)}s</div></div>
</div>

<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Contrato</div>
<div style="margin-bottom:20px">${contratoHtmlPDF}</div>

<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Dados Cadastrais</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px">
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">Empresa</div><div style="font-size:10pt;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(empresa)}">${esc(empresa)}</div></div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">Departamento</div><div style="font-size:10pt;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(depto)}">${esc(depto)}</div></div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">Classificação</div><div style="font-size:10pt;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(classif)}">${esc(classif)}</div></div>
</div>

<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:14px">Análise por Tipo de Despesa</div>
${despSecoes}

<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Histórico de Secretarias</div>
<p style="font-size:10pt;color:#6b7280;margin-bottom:10px">${siglasList.length>1?`Veículo transitou por ${siglasList.length} secretarias`:'Secretaria única no período'}</p>
<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:24px">${siglaLinhas}</div>

<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Histórico de Despesas</div>
<table style="margin-bottom:8px">
  <thead><tr><th>Período</th><th>Tipo</th><th>Classificação</th><th>Sigla</th><th class="tr" style="text-align:right">Valor</th></tr></thead>
  <tbody>${histPDFRows}${histExtra}</tbody>
  <tfoot><tr style="background:#eef2fa"><td colspan="4" style="padding:7px 8px;font-weight:800">TOTAL</td><td style="padding:7px 8px;text-align:right;font-weight:800;color:#185FA5;font-variant-numeric:tabular-nums">${fmtBRL(histPDFTotal)}</td></tr></tfoot>
</table>

</div>
</body></html>`;

    // Usar Blob URL — evita bloqueio de popup e funciona mesmo com restrições
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url,'_blank');
    if (!win) {
      // Fallback: link clicável
      const a = Object.assign(document.createElement('a'),{href:url,target:'_blank'});
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    // Revogar URL após uso
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
    if(typeof App!=='undefined') App.showToast('success','Ficha gerada','Use Ctrl+P ou Cmd+P para salvar como PDF');
  }

  return { abrirFicha, abrirBusca };
})();
