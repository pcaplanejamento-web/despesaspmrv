/**
 * veiculo.js — v1.0
 * Ficha do Veículo: busca por placa com autocomplete, histórico completo,
 * gráfico mês a mês (Chart.js), composição combustível/manutenção,
 * comparativo vs média da frota, top classificações.
 */
const Veiculo = (() => {

  const PAL = CONFIG.PALETA_GRAFICOS;
  const fmtBRL = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fmtMes  = m => CONFIG.MESES[m] || String(m||'--');
  const fmtMes3 = m => (CONFIG.MESES[m]||String(m)).substring(0,3);
  const isDark  = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = () => isDark() ? 'rgba(232,237,245,.75)' : 'rgba(26,31,54,.70)';
  const gridColor = () => isDark() ? 'rgba(255,255,255,.07)' : 'rgba(67,97,238,.07)';
  function kFmt(v){ if(v>=1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M'; if(v>=1e3) return 'R$'+(v/1e3).toFixed(0)+'k'; return 'R$'+v; }

  let _chartFicha = null;

  // ── Modal de busca por placa ───────────────────────────────────────────────

  function abrirBusca() {
    if (typeof Modal === 'undefined') return;

    const placas = [...new Set(
      State.getRawData().map(r => r.Placa||'').filter(Boolean)
    )].sort();

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
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
          Busque pela placa ou identificador do veículo/máquina para ver o histórico completo de despesas.
        </p>
        <div class="veiculo-busca-wrap">
          <input id="veiculoBuscaInput" class="veiculo-busca-input" type="text"
            placeholder="Ex: ABC-1234 ou ZZZ-001..."
            autocomplete="off" spellcheck="false" style="text-transform:uppercase">
          <button id="veiculoBuscaBtn" class="btn-veiculo-busca">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Buscar
          </button>
        </div>
        <div id="veiculoSugestoes" class="veiculo-sugestoes" style="margin-top:12px"></div>
      </div>`, 'modal-panel');

    const inp = document.getElementById('veiculoBuscaInput');
    const btn = document.getElementById('veiculoBuscaBtn');
    const sug = document.getElementById('veiculoSugestoes');

    inp?.addEventListener('input', () => {
      const q = (inp.value||'').toUpperCase().trim();
      sug.innerHTML = '';
      if (!q) return;
      placas.filter(p => p.toUpperCase().includes(q)).slice(0,10).forEach(p => {
        const b = document.createElement('button');
        b.className = 'veiculo-sug-item';
        b.textContent = p;
        b.addEventListener('click', () => abrirFicha(p));
        sug.appendChild(b);
      });
    });

    inp?.addEventListener('keydown', e => { if (e.key==='Enter') abrirFicha((inp.value||'').trim()); });
    btn?.addEventListener('click',  () => abrirFicha((inp?.value||'').trim()));
    inp?.focus();
  }

  // ── Ficha completa ────────────────────────────────────────────────────────

  function abrirFicha(placa) {
    if (!placa) return;
    const todos = State.getRawData();
    const regs  = todos.filter(r => (r.Placa||'').toUpperCase() === placa.toUpperCase());
    if (!regs.length) {
      if (typeof App !== 'undefined') App.showToast('warn', 'Veículo não encontrado', `Placa: ${placa}`);
      return;
    }
    _renderFicha(placa.toUpperCase(), regs, todos);
  }

  function _renderFicha(placa, regs, todos) {
    // ── KPIs básicos
    const totalVei  = regs.reduce((s,r) => s+r.Valor, 0);
    const modelo    = regs.find(r=>r.Modelo)?.Modelo || '--';
    const tipo      = regs.find(r=>r.Tipo)?.Tipo || '--';
    const sigla     = regs.find(r=>r.Sigla)?.Sigla || '--';
    const qtde      = regs.length;

    // ── Composição
    const combRegs  = regs.filter(r => (r.Despesa||'').toLowerCase().startsWith('combust'));
    const manuRegs  = regs.filter(r => (r.Despesa||'').toLowerCase().startsWith('manut'));
    const totalComb = combRegs.reduce((s,r) => s+r.Valor, 0);
    const totalManu = manuRegs.reduce((s,r) => s+r.Valor, 0);
    const pctComb   = totalVei > 0 ? ((totalComb/totalVei)*100).toFixed(1) : '0';
    const pctManu   = totalVei > 0 ? ((totalManu/totalVei)*100).toFixed(1) : '0';

    // ── Comparativo vs média da frota do mesmo tipo
    const veicsTipo = {};
    todos.filter(r => r.Tipo===tipo && r.Placa).forEach(r => {
      veicsTipo[r.Placa] = (veicsTipo[r.Placa]||0) + r.Valor;
    });
    const totaisTipo  = Object.values(veicsTipo);
    const mediaFlota  = totaisTipo.length ? totaisTipo.reduce((s,v)=>s+v,0)/totaisTipo.length : 0;
    const rankingIdx  = [...totaisTipo].sort((a,b)=>b-a).indexOf(totalVei) + 1;
    const diffMedia   = totalVei - mediaFlota;
    const pctMedia    = mediaFlota > 0 ? (diffMedia/mediaFlota)*100 : 0;
    const corMedia    = diffMedia > 0 ? '#e11d48' : '#059669';
    const setaMedia   = diffMedia > 0
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    // ── Evolução por mês
    const porMes = {};
    regs.forEach(r => {
      if (!r.Mes||!r.Ano) return;
      const k = `${r.Ano}-${String(r.Mes).padStart(2,'0')}`;
      if (!porMes[k]) porMes[k] = {mes:r.Mes, ano:r.Ano, total:0, qtde:0};
      porMes[k].total += r.Valor;
      porMes[k].qtde++;
    });
    const evolucao = Object.entries(porMes).sort((a,b)=>a[0]<b[0]?-1:1).map(([,v])=>v);

    // ── Top classificações
    const porClassif = {};
    regs.forEach(r => { const k=r.Classificacao||'--'; porClassif[k]=(porClassif[k]||0)+r.Valor; });
    const topClassif = Object.entries(porClassif).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // ── Secretarias onde o veículo apareceu
    const siglas = [...new Set(regs.map(r=>r.Sigla).filter(Boolean))];
    function _sl(s){try{const lbl=typeof Filters!=='undefined'?Filters.siglaLabel(s||''):s||'--';return(lbl!=null&&lbl!=='')?String(lbl):String(s||'--');}catch(e){return String(s||'--');}}
    function _slShort(s){return _sl(s).split('—')[0].trim()||String(s||'--');}

    if (_chartFicha) { _chartFicha.destroy(); _chartFicha = null; }

    Modal.openRaw(`
      <div class="modal-header">
        <div class="modal-header-left">
          <div class="modal-header-icon" style="background:rgba(67,97,238,.12);color:var(--accent)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div>
            <div class="modal-tag">Ficha do Veículo · ${tipo}</div>
            <h2 class="modal-title">${placa}</h2>
          </div>
        </div>
        <button class="modal-close-btn" data-modal-close aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">

        <!-- KPIs -->
        <div class="veiculo-kpi-grid">
          <div class="veiculo-kpi">
            <span class="veiculo-kpi-label">Total Gasto</span>
            <span class="veiculo-kpi-val" style="color:var(--accent)">${fmtBRL(totalVei)}</span>
            <span class="veiculo-kpi-sub">${qtde} registros · ${evolucao.length} mês(es)</span>
          </div>
          <div class="veiculo-kpi">
            <span class="veiculo-kpi-label">Identificação</span>
            <span class="veiculo-kpi-val" style="font-size:14px;line-height:1.3">${modelo}</span>
            <span class="veiculo-kpi-sub">${tipo} · ${siglas.map(_slShort).join(', ')}</span>
          </div>
          <div class="veiculo-kpi">
            <span class="veiculo-kpi-label">vs. Média da Frota (${tipo})</span>
            <span class="veiculo-kpi-val" style="color:${corMedia};display:flex;align-items:center;gap:4px">
              ${setaMedia}${pctMedia>0?'+':''}${pctMedia.toFixed(1).replace('.',',')}%
            </span>
            <span class="veiculo-kpi-sub">Média: ${fmtBRL(mediaFlota)} · Ranking #${rankingIdx} de ${totaisTipo.length}</span>
          </div>
        </div>

        <!-- Barra combustível vs manutenção -->
        <div style="margin:0 0 20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted)">Composição de Despesas</span>
            <span style="font-size:11px;color:var(--text-muted)">${combRegs.length} comb. · ${manuRegs.length} manu.</span>
          </div>
          <div class="veiculo-barra-wrap">
            <div class="veiculo-barra-seg" style="width:${pctComb}%;background:#185FA5" title="Combustível ${pctComb}%"></div>
            <div class="veiculo-barra-seg" style="width:${pctManu}%;background:#D85A30" title="Manutenção ${pctManu}%"></div>
            ${100-parseFloat(pctComb)-parseFloat(pctManu)>0?`<div class="veiculo-barra-seg" style="width:${(100-parseFloat(pctComb)-parseFloat(pctManu)).toFixed(1)}%;background:var(--surface3)"></div>`:''}
          </div>
          <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">
            <span style="font-size:12px;color:#185FA5;font-weight:600;display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:10px;border-radius:50%;background:#185FA5;display:inline-block"></span>
              Combustível — ${fmtBRL(totalComb)} (${pctComb}%)
            </span>
            <span style="font-size:12px;color:#D85A30;font-weight:600;display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:10px;border-radius:50%;background:#D85A30;display:inline-block"></span>
              Manutenção — ${fmtBRL(totalManu)} (${pctManu}%)
            </span>
          </div>
        </div>

        <!-- Gráfico evolução -->
        <div class="modal-secao-titulo">Evolução Mensal de Gastos</div>
        <div style="position:relative;height:180px;margin-bottom:20px">
          <canvas id="veiculoChartFicha"></canvas>
        </div>

        <!-- Top classificações -->
        <div class="modal-secao-titulo">Principais Classificações</div>
        <div style="display:flex;flex-direction:column;gap:0">
          ${topClassif.map(([c,v]) => {
            const pc = totalVei>0 ? ((v/totalVei)*100).toFixed(1) : 0;
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-dim)">
              <div style="flex:1;font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c}">${c}</div>
              <div style="width:80px;height:6px;background:var(--surface3);border-radius:3px;flex-shrink:0">
                <div style="width:${pc}%;height:100%;background:var(--accent);border-radius:3px;transition:width .4s"></div>
              </div>
              <div style="font-size:12px;font-weight:700;color:var(--accent);white-space:nowrap;min-width:90px;text-align:right;font-variant-numeric:tabular-nums">${fmtBRL(v)}</div>
            </div>`;
          }).join('')}
        </div>

        ${siglas.length > 1 ? `
          <div class="modal-secao-titulo" style="margin-top:16px">Secretarias onde aparece</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${siglas.map(s=>`<span style="background:var(--accent-soft);color:var(--accent);border:1px solid rgba(67,97,238,.2);font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px">${s}</span>`).join('')}
          </div>` : ''}

      </div>`, 'modal-panel modal-panel-wide');

    // Renderizar gráfico após DOM
    requestAnimationFrame(() => {
      const canvas = document.getElementById('veiculoChartFicha');
      if (!canvas || !evolucao.length) return;
      if (_chartFicha) { _chartFicha.destroy(); }

      const labels = evolucao.map(e => `${fmtMes3(e.mes)}/${String(e.ano).slice(2)}`);
      const values = evolucao.map(e => e.total);

      _chartFicha = new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: PAL[0]+'BB',
            borderColor: PAL[0],
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400, easing: 'easeOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark() ? '#1a1f36' : '#fff',
              titleColor:      isDark() ? '#e8edf5'  : '#1a1f36',
              bodyColor:       isDark() ? '#9ca3af'   : '#6b7280',
              borderColor:     isDark() ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)',
              borderWidth: 1, padding: 10, cornerRadius: 8,
              callbacks: { label: ctx => ' ' + fmtBRL(ctx.parsed.y) },
            },
          },
          scales: {
            x: { grid:{display:false}, border:{display:false}, ticks:{color:textColor(),font:{size:10}} },
            y: { grid:{color:gridColor(),drawTicks:false}, border:{display:false}, ticks:{color:textColor(),font:{size:10},callback:kFmt} },
          },
        },
      });
    });
  }

  return { abrirFicha, abrirBusca };
})();
