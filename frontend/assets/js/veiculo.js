/**
 * veiculo.js — v2.0
 * Ficha do Veículo: análise completa por despesa, previsão, YoY,
 * desvio padrão, contrato, % secretaria, histórico siglas, PDF.
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
    if(v>=1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M';
    if(v>=1e3) return 'R$'+(v/1e3).toFixed(0)+'k';
    return 'R$'+v.toFixed(0);
  }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function sl(sigla) { return typeof Filters!=='undefined'?Filters.siglaLabel(sigla||''):(sigla||'--'); }

  let _charts = [];

  // ── Destruir gráficos anteriores ──────────────────────
  function _destroyCharts() {
    _charts.forEach(c => { try { c.destroy(); } catch(_){} });
    _charts = [];
  }

  // ── Tooltip padrão Chart.js ───────────────────────────
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

  // ── Abrir ficha direta por placa ──────────────────────
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
  // ANALYTICS — funções puras de cálculo
  // ═══════════════════════════════════════════════════════

  // Agrega registros por mês/ano → { key, mes, ano, total, qtde }
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

  // Desvio padrão amostral dos totais mensais
  function _stdDev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((s,v)=>s+v,0)/values.length;
    const variance = values.reduce((s,v)=>s+(v-mean)**2,0)/(values.length-1);
    return Math.sqrt(variance);
  }

  // Previsão do ano corrente incompleto
  // Usa média dos últimos 3 meses + tendência linear simples
  function _prever(evolMes, anoAtual) {
    const anoRegs = evolMes.filter(m=>m.ano===anoAtual);
    if (!anoRegs.length) return null;
    const mesesPresentes = anoRegs.map(m=>m.mes);
    const mesesFaltantes = Array.from({length:12},(_,i)=>i+1).filter(m=>!mesesPresentes.includes(m));
    if (!mesesFaltantes.length) return null; // ano completo

    const vals = anoRegs.map(m=>m.total);
    const ultimos = vals.slice(-3);
    const mediaMensal = ultimos.reduce((s,v)=>s+v,0)/ultimos.length;

    // Tendência: slope da regressão simples nos últimos meses
    let slope = 0;
    if (ultimos.length >= 2) {
      const n = ultimos.length;
      const sumX = n*(n+1)/2;
      const sumX2 = n*(n+1)*(2*n+1)/6;
      const sumY  = ultimos.reduce((s,v)=>s+v,0);
      const sumXY = ultimos.reduce((s,v,i)=>s+(i+1)*v,0);
      slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX**2) || 0;
    }

    const totalAtual = vals.reduce((s,v)=>s+v,0);
    let previsao = 0;
    mesesFaltantes.forEach((_, i) => {
      previsao += Math.max(0, mediaMensal + slope*(i+1));
    });
    return {
      totalAtual,
      previsao,
      totalPrevisto: totalAtual + previsao,
      mesesRestantes: mesesFaltantes.length,
      mediaMensal,
    };
  }

  // ═══════════════════════════════════════════════════════
  // RENDER FICHA
  // ═══════════════════════════════════════════════════════

  function _renderFicha(placa, regs, todos) {
    _destroyCharts();

    // ── Identidade do veículo ──────────────────────────
    const primeiro    = [...regs].sort((a,b)=>{ const ka=`${a.Ano}-${String(a.Mes).padStart(2,'0')}`; const kb=`${b.Ano}-${String(b.Mes).padStart(2,'0')}`; return ka<kb?-1:1; })[0];
    const ultimo      = [...regs].sort((a,b)=>{ const ka=`${a.Ano}-${String(a.Mes).padStart(2,'0')}`; const kb=`${b.Ano}-${String(b.Mes).padStart(2,'0')}`; return ka>kb?-1:1; })[0];
    const modelo      = regs.find(r=>r.Modelo)?.Modelo||'--';
    const tipo        = regs.find(r=>r.Tipo)?.Tipo||'--';
    const empresa     = regs.find(r=>r.Empresa)?.Empresa||'--';
    const depto       = regs.find(r=>r.Departamento)?.Departamento||'--';
    const cc          = regs.find(r=>r.CentroCusto)?.CentroCusto||'--';
    const classif     = regs.find(r=>r.Classificacao)?.Classificacao||'--';
    const contrato    = regs.find(r=>r.Contrato)?.Contrato||'--';
    const isProprio   = contrato.trim().toUpperCase() === 'PRÓPRIO' || contrato.trim().toUpperCase() === 'PROPRIO';
    const siglaAtual  = ultimo?.Sigla||'--';

    // Período de atividade
    function _mesKey(r) { return `${r.Ano}-${String(r.Mes).padStart(2,'0')}`; }
    function _fmtKey(k) { const [a,m]=k.split('-'); return `${fmtMes(parseInt(m)).substring(0,3)}/${a}`; }
    const periodoStr = `${_fmtKey(_mesKey(primeiro))} – ${_fmtKey(_mesKey(ultimo))}`;

    // ── Totais globais ─────────────────────────────────
    const totalVei  = regs.reduce((s,r)=>s+r.Valor,0);
    const qtde      = regs.length;

    // Evolução geral por mês
    const evolGeral = _aggMes(regs);
    const anoAtual  = new Date().getFullYear();
    const anosUniq  = [...new Set(regs.map(r=>r.Ano).filter(Boolean))].sort((a,b)=>a-b);

    // ── Comparativo vs frota do mesmo tipo ────────────
    const veicTipo = {};
    todos.filter(r=>r.Tipo===tipo).forEach(r=>{
      if (!r.Placa||!r.Valor) return;
      veicTipo[r.Placa] = (veicTipo[r.Placa]||0)+r.Valor;
    });
    const totaisTipo = Object.values(veicTipo);
    const mediaFlota = totaisTipo.length ? totaisTipo.reduce((s,v)=>s+v,0)/totaisTipo.length : 0;
    const rankingPos = [...totaisTipo].sort((a,b)=>b-a).indexOf(totalVei)+1;
    const diffMedia  = totalVei - mediaFlota;
    const pctMedia   = mediaFlota>0?(diffMedia/mediaFlota*100):0;
    const corMedia   = diffMedia>0?'#e11d48':'#059669';

    // ── Ticket médio mensal global ─────────────────────
    const ticketMedio = evolGeral.length ? totalVei/evolGeral.length : 0;

    // ── Contrato: % que este veículo representa ────────
    let contratoInfo = null;
    if (!isProprio && contrato !== '--') {
      const regContrato = todos.filter(r=>(r.Contrato||'').trim()===contrato.trim());
      const totalContrato = regContrato.reduce((s,r)=>s+r.Valor,0);
      const pctContrato   = totalContrato>0?(totalVei/totalContrato*100):0;
      const veicsContrato = new Set(regContrato.map(r=>r.Placa).filter(Boolean)).size;
      contratoInfo = { totalContrato, pctContrato, veicsContrato };
    }

    // ── Despesas únicas do veículo ─────────────────────
    const despesasUniq = [...new Set(regs.map(r=>r.Despesa||'--').filter(d=>d!=='--'))];

    // Para cada despesa: analytics completo
    const analiseDesp = despesasUniq.map((desp, idx) => {
      const dr    = regs.filter(r=>(r.Despesa||'--')===desp);
      const total = dr.reduce((s,r)=>s+r.Valor,0);
      const evolD = _aggMes(dr);
      const vals  = evolD.map(m=>m.total);
      const media = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;
      const dp    = _stdDev(vals);
      const pct   = totalVei>0?(total/totalVei*100):0;

      // % vs total da secretaria nesta despesa
      const regSecDesp = todos.filter(r=>(r.Sigla||'')===(siglaAtual||'')&&(r.Despesa||'--')===desp);
      const totalSecDesp = regSecDesp.reduce((s,r)=>s+r.Valor,0);
      const pctSec = totalSecDesp>0?(total/totalSecDesp*100):0;

      // Previsão
      const prev = _prever(evolD, anoAtual);

      // Cor da despesa
      const cor = PAL[idx % PAL.length];

      // YoY: agrupa por ano
      const yoy = {};
      anosUniq.forEach(a=>{ yoy[a]={ano:a,total:0,meses:{}}; });
      dr.forEach(r=>{ if(!r.Ano||!r.Mes) return; if(!yoy[r.Ano]) yoy[r.Ano]={ano:r.Ano,total:0,meses:{}}; yoy[r.Ano].total+=r.Valor; yoy[r.Ano].meses[r.Mes]=(yoy[r.Ano].meses[r.Mes]||0)+r.Valor; });

      return { desp, total, evolD, vals, media, dp, pct, pctSec, prev, cor, yoy };
    });

    // ── Histórico de secretarias ───────────────────────
    const siglaMap = {};
    regs.forEach(r2=>{
      const s=r2.Sigla||'--';
      const k=`${r2.Ano||0}-${String(r2.Mes||0).padStart(2,'0')}`;
      if(!siglaMap[s]) siglaMap[s]={sigla:s,min:k,max:k};
      if(k<siglaMap[s].min) siglaMap[s].min=k;
      if(k>siglaMap[s].max) siglaMap[s].max=k;
    });
    const siglasList = Object.values(siglaMap).sort((a,b)=>a.min<b.min?-1:1);

    // ═══════════════════════════════════════════════════
    // CONSTRUIR HTML DO MODAL
    // ═══════════════════════════════════════════════════

    // ── Bloco contrato ─────────────────────────────────
    const contratoHTML = isProprio
      ? `<div class="modal-campo" style="grid-column:1/-1">
          <span class="modal-campo-label">Contrato</span>
          <span style="display:flex;align-items:center;gap:8px">
            <span class="badge" style="background:rgba(16,185,129,.12);color:#059669;font-size:11px;font-weight:700">
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
          <span class="modal-campo-valor" style="color:var(--accent)">${fmtPct(contratoInfo.pctContrato)} <span style="font-size:10px;color:var(--text-muted);font-weight:400">de ${fmtBRL(contratoInfo.totalContrato)} · ${contratoInfo.veicsContrato} veículos</span></span>
         </div>`:''}`;

    // ── Pills de secretarias ───────────────────────────
    const siglaPills = siglasList.map(s=>{
      const nomeComp = sl(s.sigla);
      const periodo  = s.min===s.max?_fmtKey(s.min):`${_fmtKey(s.min)} – ${_fmtKey(s.max)}`;
      return `<span class="rp-tag" title="${esc(nomeComp)}" style="display:inline-flex;flex-direction:column;gap:2px;padding:6px 11px;border-radius:9px;max-width:190px;min-width:0">
        <span style="font-size:11px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.sigla)}</span>
        <span style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85">${esc(periodo)}</span>
      </span>`;
    }).join('');

    // ── Blocos de análise por despesa ──────────────────
    const despBlocos = analiseDesp.map((ad, idx) => {
      const canvasId  = `vchart-${idx}`;
      const yoyId     = `vchartYoy-${idx}`;
      const prevBadge = ad.prev
        ? `<div style="margin-top:10px;padding:10px 12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:9px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#b45309;margin-bottom:6px">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
              Previsão ${anoAtual} — ${ad.prev.mesesRestantes} ${ad.prev.mesesRestantes===1?'mês restante':'meses restantes'}
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
              <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Realizado</div><div style="font-size:13px;font-weight:800;color:var(--text)">${fmtBRL(ad.prev.totalAtual)}</div></div>
              <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Projeção</div><div style="font-size:13px;font-weight:800;color:#d97706">+${fmtBRL(ad.prev.previsao)}</div></div>
              <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Total previsto</div><div style="font-size:13px;font-weight:800;color:var(--accent)">${fmtBRL(ad.prev.totalPrevisto)}</div></div>
            </div>
          </div>`
        : '';

      const yoyBlock = anosUniq.length > 1
        ? `<div class="modal-secao-titulo" style="margin-top:14px;display:flex;align-items:center;gap:6px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Comparativo Anual
           </div>
           <div style="position:relative;height:130px;margin-bottom:4px"><canvas id="${esc(yoyId)}"></canvas></div>`
        : '';

      return `<div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--border-dim)">
        <!-- Header da despesa -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
          <span style="width:10px;height:10px;border-radius:50%;background:${esc(ad.cor)};flex-shrink:0;display:inline-block"></span>
          <span style="font-size:13px;font-weight:800;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0">${esc(ad.desp)}</span>
          <span style="font-size:12px;font-weight:700;color:var(--accent);white-space:nowrap">${fmtBRL(ad.total)}</span>
        </div>

        <!-- KPIs da despesa -->
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
          <div class="modal-campo">
            <span class="modal-campo-label">Média Mensal</span>
            <span class="modal-campo-valor">${fmtBRL(ad.media)}</span>
          </div>
          <div class="modal-campo">
            <span class="modal-campo-label">Desvio Padrão Mensal</span>
            <span class="modal-campo-valor">${fmtBRL(ad.dp)}</span>
          </div>
          <div class="modal-campo">
            <span class="modal-campo-label">% do Total do Veículo</span>
            <span class="modal-campo-valor" style="color:var(--accent)">${fmtPct(ad.pct)}</span>
          </div>
          <div class="modal-campo">
            <span class="modal-campo-label">% do Total — ${esc(siglaAtual)}</span>
            <span class="modal-campo-valor" style="color:${ad.pctSec>20?'#e11d48':'var(--accent)'}">${fmtPct(ad.pctSec)}</span>
          </div>
        </div>

        <!-- Gráfico evolução mensal da despesa -->
        <div class="modal-secao-titulo" style="display:flex;align-items:center;gap:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          Evolução Mensal
        </div>
        <div style="position:relative;height:140px;margin-bottom:4px"><canvas id="${esc(canvasId)}"></canvas></div>

        ${prevBadge}
        ${yoyBlock}
      </div>`;
    }).join('');

    // ── Montar modal ───────────────────────────────────
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
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <button id="vFichaPDF" style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;border:1.5px solid var(--border-dim);background:var(--surface2);color:var(--text-muted);font-family:var(--font-ui);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s" title="Imprimir ficha em PDF">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            PDF
          </button>
          <button class="modal-close-btn" data-modal-close aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="modal-body">

        <!-- ── Valor em destaque ── -->
        <div class="modal-value-destaque">
          <span class="modal-value-label">Total Acumulado de Despesas</span>
          <span class="modal-value-num">${fmtBRL(totalVei)}</span>
          <span class="modal-value-sub">${qtde} registros · Período: ${esc(periodoStr)}</span>
        </div>

        <!-- ── Dados identitários ── -->
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

        <!-- ── KPIs comparativos ── -->
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
              ${diffMedia>0
                ?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>'
                :'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>'}
              ${pctMedia>0?'+':''}${fmtPct(pctMedia)}
            </span>
            <span style="font-size:10px;color:var(--text-muted)">Média: ${fmtBRL(mediaFlota)} · #${rankingPos} no ranking</span>
          </div>
          <div class="modal-campo">
            <span class="modal-campo-label">Secretaria atual</span>
            <span class="modal-campo-valor mono" style="overflow:hidden;text-overflow:ellipsis">${esc(siglaAtual)}</span>
          </div>
        </div>

        <!-- ── Análise por Despesa ── -->
        <div class="modal-secao-titulo" style="margin-top:18px;display:flex;align-items:center;gap:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          Análise por Tipo de Despesa
        </div>
        ${despBlocos || '<p style="font-size:12px;color:var(--text-muted)">Sem dados de despesa encontrados.</p>'}

        <!-- ── Histórico de Secretarias ── -->
        <div class="modal-secao-titulo" style="margin-top:4px;display:flex;align-items:center;gap:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          Histórico de Secretarias
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
          ${siglasList.length>1?`Veículo transitou por <strong style="color:var(--text)">${siglasList.length}</strong> secretarias`:'Secretaria única no período'}
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${siglaPills}</div>

      </div>

      <div class="modal-footer" style="justify-content:space-between">
        <span class="modal-footer-hint">ESC ou clique fora para fechar</span>
        <button id="vFichaPDFFooter" style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;border:1.5px solid var(--accent);background:var(--accent-soft);color:var(--accent);font-family:var(--font-ui);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir Ficha PDF
        </button>
      </div>`, 'modal-panel modal-panel-wide');

    // ── Renderizar gráficos após DOM ───────────────────
    requestAnimationFrame(() => {
      analiseDesp.forEach((ad, idx) => {
        // Gráfico evolução mensal da despesa
        const canvas = document.getElementById(`vchart-${idx}`);
        if (canvas && ad.evolD.length) {
          const labels = ad.evolD.map(m=>`${fmtMes(m.mes).substring(0,3)}/${String(m.ano).slice(2)}`);
          const values = ad.evolD.map(m=>m.total);
          // Linha de média
          const mediaArr = Array(values.length).fill(ad.media);
          const c = new Chart(canvas, {
            type:'bar',
            data:{
              labels,
              datasets:[
                { data:values, backgroundColor:ad.cor+'BB', borderColor:ad.cor, borderWidth:0, borderRadius:5, borderSkipped:false, label:'Despesa' },
                { data:mediaArr, type:'line', borderColor:'#f59e0b', borderWidth:1.5, borderDash:[5,3], pointRadius:0, fill:false, label:'Média' },
              ],
            },
            options:{
              responsive:true, maintainAspectRatio:false,
              animation:{duration:350,easing:'easeOutQuart'},
              plugins:{
                legend:{display:false},
                tooltip:{...(_tooltip()), callbacks:{label:ctx=>` ${fmtBRL(ctx.parsed.y)}`}},
              },
              scales:{
                x:{grid:{display:false},border:{display:false},ticks:{color:tc(),font:{size:9}}},
                y:{grid:{color:gc(),drawTicks:false},border:{display:false},ticks:{color:tc(),font:{size:9},callback:kFmt}},
              },
            },
          });
          _charts.push(c);
        }

        // Gráfico YoY (apenas se > 1 ano)
        const yoyCanvas = document.getElementById(`vchartYoy-${idx}`);
        if (yoyCanvas && anosUniq.length > 1) {
          const meses12 = Array.from({length:12},(_,i)=>i+1);
          const yoyLabels = meses12.map(m=>fmtMes(m).substring(0,3));
          const datasets  = anosUniq.map((ano,ai)=>({
            label:String(ano),
            data:meses12.map(m=>ad.yoy[ano]?.meses[m]||0),
            backgroundColor:PAL[ai%PAL.length]+'BB',
            borderColor:PAL[ai%PAL.length],
            borderWidth:0, borderRadius:4, borderSkipped:false,
          }));
          const cy = new Chart(yoyCanvas,{
            type:'bar',
            data:{labels:yoyLabels,datasets},
            options:{
              responsive:true, maintainAspectRatio:false,
              animation:{duration:350,easing:'easeOutQuart'},
              plugins:{
                legend:{display:true, position:'top', labels:{color:tc(),font:{size:10},boxWidth:10,padding:12}},
                tooltip:{...(_tooltip()), callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmtBRL(ctx.parsed.y)}`}},
              },
              scales:{
                x:{grid:{display:false},border:{display:false},ticks:{color:tc(),font:{size:9}}},
                y:{grid:{color:gc(),drawTicks:false},border:{display:false},ticks:{color:tc(),font:{size:9},callback:kFmt}},
                // Barras agrupadas
              },
            },
          });
          _charts.push(cy);
        }
      });

      // ── Botão PDF ────────────────────────────────────
      const _pdfHandler = () => _gerarPDF(placa, modelo, tipo, empresa, depto, cc, classif,
        contrato, isProprio, contratoInfo, siglaAtual, siglasList, periodoStr,
        totalVei, qtde, ticketMedio, mediaFlota, rankingPos, pctMedia, diffMedia, analiseDesp, anosUniq);

      document.getElementById('vFichaPDF')?.addEventListener('click', _pdfHandler);
      document.getElementById('vFichaPDFFooter')?.addEventListener('click', _pdfHandler);
    });
  }

  // ═══════════════════════════════════════════════════════
  // PDF — Geração de ficha para impressão
  // ═══════════════════════════════════════════════════════

  // SVG bar inline (para PDF sem Chart.js)
  function _svgBar(dados, cor, height) {
    if (!dados.length) return '';
    const W=560, H=height||110, padL=44, padR=8, padT=16, padB=28;
    const innerW=W-padL-padR, innerH=H-padT-padB;
    const maxV = Math.max(...dados.map(d=>d.v),1);
    const colW = Math.floor(innerW/dados.length);
    const barW = Math.max(4, Math.floor(colW*0.6));

    const gridLines=[.25,.5,.75,1].map(p=>{
      const y=(padT+innerH-innerH*p).toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2"/>
<text x="${(padL-3).toFixed(1)}" y="${(parseFloat(y)+3).toFixed(1)}" text-anchor="end" font-size="7" fill="#9ca3af">${kFmt(maxV*p)}</text>`;
    }).join('');

    const bars = dados.map((d,i)=>{
      const x=(padL+i*colW+(colW-barW)/2).toFixed(1);
      const bH=Math.max(2,(d.v/maxV)*innerH).toFixed(1);
      const y=(padT+innerH-parseFloat(bH)).toFixed(1);
      const lbl=String(d.l||'').substring(0,6);
      return `<rect x="${x}" y="${y}" width="${barW}" height="${bH}" fill="${cor}" rx="2" opacity="0.85"/>
<text x="${(parseFloat(x)+barW/2).toFixed(1)}" y="${(padT+innerH+14).toFixed(1)}" text-anchor="middle" font-size="7" fill="#6b7280">${esc(lbl)}</text>`;
    }).join('');

    // Linha de média
    const mediaV=dados.reduce((s,d)=>s+d.v,0)/dados.length;
    const mediaY=(padT+innerH-(mediaV/maxV)*innerH).toFixed(1);
    const avgLine=`<line x1="${padL}" y1="${mediaY}" x2="${W-padR}" y2="${mediaY}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,3"/>
<text x="${(W-padR+2).toFixed(1)}" y="${(parseFloat(mediaY)+3).toFixed(1)}" font-size="7" fill="#b45309">média</text>`;

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">${gridLines}${bars}${avgLine}</svg>`;
  }

  function _svgBarYoy(yoy, anos, cor) {
    const meses12=Array.from({length:12},(_,i)=>i+1);
    const W=560, H=110, padL=44, padR=8, padT=16, padB=28;
    const innerW=W-padL-padR, innerH=H-padT-padB;
    const allVals=anos.flatMap(a=>meses12.map(m=>yoy[a]?.meses[m]||0));
    const maxV=Math.max(...allVals,1);
    const slotW=Math.floor(innerW/12);
    const barW=Math.max(2,Math.floor(slotW*0.85/anos.length));
    const pal=['#185FA5','#D85A30','#1D9E75','#BA7517'];

    const grid=[.5,1].map(p=>{
      const y=(padT+innerH-innerH*p).toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2"/>
<text x="${(padL-3).toFixed(1)}" y="${(parseFloat(y)+3).toFixed(1)}" text-anchor="end" font-size="7" fill="#9ca3af">${kFmt(maxV*p)}</text>`;
    }).join('');

    const bars=meses12.map((mes,mi)=>{
      const x=padL+mi*slotW;
      const mesLbl=fmtMes(mes).substring(0,3);
      const rects=anos.map((ano,ai)=>{
        const v=yoy[ano]?.meses[mes]||0;
        const bH=Math.max(1,(v/maxV)*innerH).toFixed(1);
        const y=(padT+innerH-parseFloat(bH)).toFixed(1);
        const bx=(x+ai*(barW+1)).toFixed(1);
        return `<rect x="${bx}" y="${y}" width="${barW}" height="${bH}" fill="${pal[ai%pal.length]}" rx="1" opacity="0.85"/>`;
      }).join('');
      const lx=(x+slotW/2).toFixed(1);
      return `${rects}<text x="${lx}" y="${(padT+innerH+13).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="#6b7280">${mesLbl}</text>`;
    }).join('');

    const legend=anos.map((a,i)=>`<rect x="${(i*55+2).toFixed(1)}" y="2" width="8" height="8" fill="${pal[i%pal.length]}" rx="1"/><text x="${(i*55+13).toFixed(1)}" y="10" font-size="8" fill="#374151">${a}</text>`).join('');

    return `<svg viewBox="0 0 ${W} ${H+16}" width="100%" height="${H+16}" xmlns="http://www.w3.org/2000/svg" style="display:block">
<g transform="translate(${padL},0)">${legend}</g>
<g transform="translate(0,16)">${grid}${bars}</g></svg>`;
  }

  function _gerarPDF(placa, modelo, tipo, empresa, depto, cc, classif,
    contrato, isProprio, contratoInfo, siglaAtual, siglasList, periodoStr,
    totalVei, qtde, ticketMedio, mediaFlota, rankingPos, pctMedia, diffMedia, analiseDesp, anosUniq) {

    const win = window.open('','_blank','width=960,height=800');
    if (!win) {
      if(typeof App!=='undefined') App.showToast('warn','Popup bloqueado','Permita popups para gerar o PDF');
      return;
    }

    const now = new Date();
    const dtStr = now.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
    const corMedia = diffMedia>0?'#dc2626':'#059669';

    // Seções de despesa
    const despSecoes = analiseDesp.map(ad => {
      const evolDados = ad.evolD.map(m=>({l:`${fmtMes(m.mes).substring(0,3)}/${String(m.ano).slice(2)}`,v:m.total}));
      const svgBar    = _svgBar(evolDados, ad.cor, 100);
      const svgYoy    = anosUniq.length>1 ? _svgBarYoy(ad.yoy, anosUniq, ad.cor) : '';

      const prevHTML = ad.prev ? `<div style="margin-top:10px;padding:10px 12px;background:#fff9f0;border:1px solid #f59e0b;border-radius:8px">
        <div style="font-size:9pt;font-weight:700;color:#b45309;margin-bottom:8px">Previsão ${new Date().getFullYear()} — ${ad.prev.mesesRestantes} mês(es) restante(s)</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div><div style="font-size:8pt;color:#9ca3af">Realizado</div><div style="font-size:11pt;font-weight:800;color:#1a1f36">${fmtBRL(ad.prev.totalAtual)}</div></div>
          <div><div style="font-size:8pt;color:#9ca3af">Projeção restante</div><div style="font-size:11pt;font-weight:800;color:#d97706">+${fmtBRL(ad.prev.previsao)}</div></div>
          <div><div style="font-size:8pt;color:#9ca3af">Total previsto</div><div style="font-size:11pt;font-weight:800;color:#185FA5">${fmtBRL(ad.prev.totalPrevisto)}</div></div>
        </div>
      </div>` : '';

      return `<div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #e5e7eb;page-break-inside:avoid">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="width:10px;height:10px;border-radius:50%;background:${esc(ad.cor)};display:inline-block;flex-shrink:0"></span>
          <strong style="font-size:12pt;color:#1a1f36">${esc(ad.desp)}</strong>
          <span style="margin-left:auto;font-size:12pt;font-weight:800;color:#185FA5">${fmtBRL(ad.total)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
            <div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Média Mensal</div>
            <div style="font-size:11pt;font-weight:800;color:#185FA5">${fmtBRL(ad.media)}</div>
          </div>
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
            <div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Desvio Padrão</div>
            <div style="font-size:11pt;font-weight:800;color:#1a1f36">${fmtBRL(ad.dp)}</div>
          </div>
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
            <div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">% do Veículo</div>
            <div style="font-size:11pt;font-weight:800;color:#185FA5">${fmtPct(ad.pct)}</div>
          </div>
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
            <div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">% da ${esc(siglaAtual)}</div>
            <div style="font-size:11pt;font-weight:800;color:${ad.pctSec>20?'#dc2626':'#185FA5'}">${fmtPct(ad.pctSec)}</div>
          </div>
        </div>
        <div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;margin-bottom:5px">Evolução Mensal</div>
        ${svgBar}
        ${prevHTML}
        ${anosUniq.length>1?`<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;margin:10px 0 5px">Comparativo Anual</div>${svgYoy}`:''}
      </div>`;
    }).join('');

    // Histórico de siglas
    const siglaLinhas = siglasList.map(s=>{
      const periodo = s.min===s.max?`${_fmtKey(s.min)}`:`${_fmtKey(s.min)} – ${_fmtKey(s.max)}`;
      return `<span style="display:inline-flex;flex-direction:column;gap:2px;padding:6px 10px;border-radius:8px;background:#eef2ff;border:1px solid #c7d2fe;margin:3px">
        <span style="font-size:9pt;font-weight:700;font-family:monospace;color:#185FA5">${esc(s.sigla)}</span>
        <span style="font-size:8pt;color:#6b7280">${esc(periodo)}</span>
      </span>`;
    }).join('');

    // Contrato HTML PDF
    const contratoHtmlPDF = isProprio
      ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <div><strong style="color:#059669">Frota Própria PMRV</strong> <span style="color:#6b7280;font-size:9pt">— Sem contrato de locação</span></div>
         </div>`
      : `<div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px">
          <div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Contrato de Locação</div>
          <div style="font-size:11pt;font-weight:700;color:#1a1f36;font-family:monospace">${esc(contrato)}</div>
          ${contratoInfo?`<div style="font-size:9pt;color:#185FA5;margin-top:4px;font-weight:600">${fmtPct(contratoInfo.pctContrato)} do total do contrato (${fmtBRL(contratoInfo.totalContrato)} · ${contratoInfo.veicsContrato} veículos)</div>`:''}
         </div>`;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ficha do Veículo — ${esc(placa.toUpperCase())}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
@page{size:A4 portrait;margin:15mm 14mm 18mm 14mm;}
@media print{.no-print{display:none!important;}.avoid-break{page-break-inside:avoid;}}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:11pt;color:#1a1f36;background:#fff;line-height:1.5;}
</style></head><body>

<button class="no-print" onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#185FA5;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;z-index:99">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
  Imprimir / Salvar PDF
</button>

<!-- CAPA -->
<div style="border-top:6px solid #185FA5;padding:40px 48px 32px;margin-bottom:24px">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:32px">
    <div style="width:48px;height:48px;background:#185FA5;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    </div>
    <div>
      <div style="font-size:16px;font-weight:700;color:#185FA5">Gastos RV</div>
      <div style="font-size:11px;color:#6b7280">Prefeitura Municipal de Rio Verde — PMRV</div>
    </div>
  </div>
  <h1 style="font-size:26pt;font-weight:800;color:#1a1f36;letter-spacing:-.5px;margin-bottom:6px">Ficha do Veículo</h1>
  <p style="font-size:14pt;color:#6b7280;margin-bottom:28px">${esc(placa.toUpperCase())} — ${esc(modelo)}</p>
  <div style="height:1px;background:#e5e7eb;margin-bottom:20px"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:20px">
    <div><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px">Tipo</div><div style="font-size:11pt;font-weight:600;color:#1a1f36">${esc(tipo)}</div></div>
    <div><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px">Secretaria atual</div><div style="font-size:11pt;font-weight:600;color:#1a1f36">${esc(sl(siglaAtual))}</div></div>
    <div><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px">Período de atividade</div><div style="font-size:11pt;font-weight:600;color:#1a1f36">${esc(periodoStr)}</div></div>
    <div><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px">Total de registros</div><div style="font-size:11pt;font-weight:600;color:#1a1f36">${qtde.toLocaleString('pt-BR')}</div></div>
  </div>
  <div style="font-size:8pt;color:#9ca3af;display:flex;justify-content:space-between">
    <span>Gastos RV v${CONFIG.VERSAO||'1.x'}</span><span>Emitido em ${dtStr}</span>
  </div>
</div>

<div style="padding:0 48px">

<!-- KPIs GLOBAIS -->
<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Indicadores Globais</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">
    <div style="font-size:8pt;color:#9ca3af;margin-bottom:4px">Total Acumulado</div>
    <div style="font-size:14pt;font-weight:800;color:#185FA5;font-variant-numeric:tabular-nums">${fmtBRL(totalVei)}</div>
  </div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">
    <div style="font-size:8pt;color:#9ca3af;margin-bottom:4px">Ticket Médio Mensal</div>
    <div style="font-size:14pt;font-weight:800;color:#185FA5;font-variant-numeric:tabular-nums">${fmtBRL(ticketMedio)}</div>
  </div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">
    <div style="font-size:8pt;color:#9ca3af;margin-bottom:4px">vs. Média da Frota</div>
    <div style="font-size:14pt;font-weight:800;color:${esc(corMedia)};font-variant-numeric:tabular-nums">${pctMedia>0?'+':''}${fmtPct(pctMedia)}</div>
    <div style="font-size:8pt;color:#9ca3af">Média: ${fmtBRL(mediaFlota)}</div>
  </div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">
    <div style="font-size:8pt;color:#9ca3af;margin-bottom:4px">Ranking na Frota</div>
    <div style="font-size:14pt;font-weight:800;color:#1a1f36">#${rankingPos}</div>
    <div style="font-size:8pt;color:#9ca3af">entre ${esc(tipo)}s</div>
  </div>
</div>

<!-- CONTRATO -->
<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Informações de Contrato</div>
<div style="margin-bottom:20px">${contratoHtmlPDF}</div>

<!-- DADOS DO VEÍCULO -->
<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Dados Cadastrais</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px">
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">Empresa</div><div style="font-size:10pt;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(empresa)}">${esc(empresa)}</div></div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">Departamento</div><div style="font-size:10pt;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(depto)}">${esc(depto)}</div></div>
  <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px"><div style="font-size:8pt;color:#9ca3af">Classificação</div><div style="font-size:10pt;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(classif)}">${esc(classif)}</div></div>
</div>

<!-- ANÁLISE POR DESPESA -->
<div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:14px">Análise por Tipo de Despesa</div>
${despSecoes}

<!-- HISTÓRICO DE SECRETARIAS -->
<div style="page-break-inside:avoid">
  <div style="font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#9ca3af;margin-bottom:10px">Histórico de Secretarias</div>
  <p style="font-size:10pt;color:#6b7280;margin-bottom:10px">${siglasList.length>1?`Veículo transitou por ${siglasList.length} secretarias`:'Secretaria única no período'}</p>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:24px">${siglaLinhas}</div>
</div>

</div><!-- /padding -->
</body></html>`;

    win.document.write(html);
    win.document.close();
    setTimeout(()=>{ if(typeof App!=='undefined') App.showToast('success','Ficha gerada','Use Ctrl+P para salvar como PDF'); }, 500);
  }

  return { abrirFicha, abrirBusca };
})();