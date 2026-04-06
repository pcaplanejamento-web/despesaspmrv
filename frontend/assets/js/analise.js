/**
 * analise.js — v1.0
 * Análise Avançada: filtros próprios, independentes dos filtros principais.
 * Visualiza histórico por veículo, secretaria, departamento e período.
 * Não interfere com State, Filters, Tables ou qualquer outro módulo.
 */
const Analise = (() => {

  // ── Estado interno — completamente isolado ────────────────────────────────
  let _estado = {
    mesIni: '', anoIni: '', mesFim: '', anoFim: '',
    secretaria: '', despesa: '', placa: '',
  };
  let _chartInst = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function fmtBRL(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtMes(m) { return (typeof CONFIG!=='undefined'?CONFIG.MESES[m]:'')||String(m||'--'); }
  function sl(sigla) { return typeof Filters!=='undefined' ? Filters.siglaLabel(sigla||'') : sigla||'--'; }
  function isDark() { return document.documentElement.getAttribute('data-theme')==='dark'; }
  function textColor() { return isDark()?'rgba(232,237,245,.75)':'rgba(26,31,54,.70)'; }
  function gridColor() { return isDark()?'rgba(255,255,255,.07)':'rgba(67,97,238,.07)'; }
  function kFmt(v) {
    if(v>=1e6) return 'R$'+(v/1e6).toFixed(1).replace('.',',')+'M';
    if(v>=1e3) return 'R$'+(v/1e3).toFixed(0)+'k';
    return 'R$'+v;
  }

  // ── Inicializar filtros — popula selects com dados disponíveis ────────────
  function init() {
    _popularMeses();
    _popularAnos();
    _bindEvents();
  }

  function _popularMeses() {
    const meses = typeof CONFIG !== 'undefined' ? CONFIG.MESES.slice(1) : [];
    ['aaMesIni','aaMesFim'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '<option value="">Mês</option>' +
        meses.map((m,i) => `<option value="${i+1}">${m}</option>`).join('');
    });
  }

  function _popularAnos() {
    const data = typeof State !== 'undefined' ? State.getRawData() : [];
    const anos = [...new Set(data.map(r=>r.Ano).filter(Boolean))].sort((a,b)=>b-a);
    ['aaAnoIni','aaAnoFim'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '<option value="">Ano</option>' + anos.map(a=>`<option value="${a}">${a}</option>`).join('');
    });
  }

  function _popularSecretarias() {
    const data = typeof State !== 'undefined' ? State.getRawData() : [];
    const siglas = [...new Set(data.map(r=>r.Sigla).filter(Boolean))].sort();
    const el = document.getElementById('aaSecretaria');
    if (!el) return;
    el.innerHTML = '<option value="">Todas</option>' +
      siglas.map(s=>`<option value="${s}">${sl(s)}</option>`).join('');
  }

  // ── Autocompletar placas ──────────────────────────────────────────────────
  function _bindPlacaAutocomplete() {
    const inp = document.getElementById('aaPlacaInput');
    const sug = document.getElementById('aaPlacaSugestoes');
    if (!inp || !sug) return;
    const data = typeof State !== 'undefined' ? State.getRawData() : [];
    const placas = [...new Set(data.map(r=>r.Placa||'').filter(Boolean))].sort();
    inp.addEventListener('input', () => {
      const q = (inp.value||'').toUpperCase().trim();
      sug.innerHTML = '';
      if (!q) { sug.style.display='none'; return; }
      const matches = placas.filter(p=>p.toUpperCase().includes(q)).slice(0,8);
      if (!matches.length) { sug.style.display='none'; return; }
      sug.style.display = 'block';
      sug.innerHTML = matches.map(p=>`<button class="aa-sug-item" data-placa="${p}">${p}</button>`).join('');
      sug.querySelectorAll('.aa-sug-item').forEach(b=>b.addEventListener('click',()=>{
        inp.value = b.dataset.placa;
        sug.innerHTML=''; sug.style.display='none';
      }));
    });
    document.addEventListener('click', e => {
      if (!sug.contains(e.target) && e.target !== inp) {
        sug.innerHTML=''; sug.style.display='none';
      }
    });
  }

  // ── Bind events ───────────────────────────────────────────────────────────
  function _bindEvents() {
    document.getElementById('aaBtnAplicar')?.addEventListener('click', aplicar);
    document.getElementById('aaBtnLimpar')?.addEventListener('click', limpar);
  }

  // ── Aplicar filtros e gerar análise ──────────────────────────────────────
  function aplicar() {
    _estado.mesIni = document.getElementById('aaMesIni')?.value||'';
    _estado.anoIni = document.getElementById('aaAnoIni')?.value||'';
    _estado.mesFim = document.getElementById('aaMesFim')?.value||'';
    _estado.anoFim = document.getElementById('aaAnoFim')?.value||'';
    _estado.secretaria = document.getElementById('aaSecretaria')?.value||'';
    _estado.despesa = document.getElementById('aaDespesa')?.value||'';
    _estado.placa = (document.getElementById('aaPlacaInput')?.value||'').trim().toUpperCase();
    _renderAnalise();
  }

  function limpar() {
    ['aaMesIni','aaAnoIni','aaMesFim','aaAnoFim','aaSecretaria','aaDespesa'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    const pi=document.getElementById('aaPlacaInput'); if(pi) pi.value='';
    _estado = { mesIni:'',anoIni:'',mesFim:'',anoFim:'',secretaria:'',despesa:'',placa:'' };
    const res = document.getElementById('aaResultado');
    if (res) res.innerHTML = `
      <div class="aa-vazio">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        <p>Configure os filtros acima e clique em <strong>Gerar Análise</strong> para visualizar os dados.</p>
      </div>`;
    document.getElementById('aaFiltrosCount').textContent = 'todos os dados';
  }

  // ── Filtrar dados (lê de State.getRawData, não de getFilteredData) ────────
  function _filtrar() {
    const data = typeof State !== 'undefined' ? State.getRawData() : [];
    return data.filter(r => {
      if (_estado.placa && (r.Placa||'').toUpperCase() !== _estado.placa) return false;
      if (_estado.secretaria && r.Sigla !== _estado.secretaria) return false;
      if (_estado.despesa && r.Despesa !== _estado.despesa) return false;
      if (_estado.anoIni && _estado.mesIni) {
        const d = (r.Ano||0)*100 + (r.Mes||0);
        const ini = parseInt(_estado.anoIni)*100 + parseInt(_estado.mesIni);
        if (d < ini) return false;
      } else if (_estado.anoIni) {
        if ((r.Ano||0) < parseInt(_estado.anoIni)) return false;
      }
      if (_estado.anoFim && _estado.mesFim) {
        const d = (r.Ano||0)*100 + (r.Mes||0);
        const fim = parseInt(_estado.anoFim)*100 + parseInt(_estado.mesFim);
        if (d > fim) return false;
      } else if (_estado.anoFim) {
        if ((r.Ano||0) > parseInt(_estado.anoFim)) return false;
      }
      return true;
    });
  }

  // ── Renderizar análise ────────────────────────────────────────────────────
  function _renderAnalise() {
    const regs = _filtrar();
    const res = document.getElementById('aaResultado');
    if (!res) return;

    const count = res.querySelector ? null : null;
    document.getElementById('aaFiltrosCount').textContent = `${regs.length.toLocaleString('pt-BR')} registros`;

    if (!regs.length) {
      res.innerHTML = `
        <div class="aa-vazio">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p>Nenhum registro encontrado para os filtros selecionados.</p>
        </div>`;
      return;
    }

    // Calcular KPIs
    const total = regs.reduce((s,r)=>s+r.Valor,0);
    const meses = new Set(regs.map(r=>`${r.Ano}-${r.Mes}`));
    const mediaM = meses.size ? total/meses.size : 0;
    const placas = new Set(regs.map(r=>r.Placa).filter(Boolean));
    const siglas = new Set(regs.map(r=>r.Sigla).filter(Boolean));

    // Por secretaria
    const bySigla = {};
    regs.forEach(r=>{ const k=r.Sigla||'--'; bySigla[k]=(bySigla[k]||0)+r.Valor; });
    const topSiglas = Object.entries(bySigla).sort((a,b)=>b[1]-a[1]).slice(0,8);

    // Por mês
    const byMes = {};
    regs.forEach(r=>{
      if(!r.Mes||!r.Ano) return;
      const k=`${r.Ano}-${String(r.Mes).padStart(2,'0')}`;
      byMes[k]=(byMes[k]||0)+r.Valor;
    });
    const evolucao = Object.entries(byMes).sort((a,b)=>a[0].localeCompare(b[0]));

    // Por veículo (top 10)
    const byPlaca = {};
    regs.forEach(r=>{ if(!r.Placa) return; if(!byPlaca[r.Placa]) byPlaca[r.Placa]={total:0,modelo:r.Modelo||r.Placa,qtde:0}; byPlaca[r.Placa].total+=r.Valor; byPlaca[r.Placa].qtde++; });
    const topPlacas = Object.entries(byPlaca).sort((a,b)=>b[1].total-a[1].total).slice(0,10);

    // Render HTML
    const PAL = typeof CONFIG!=='undefined'?CONFIG.PALETA_GRAFICOS:['#4361ee','#7c3aed','#059669','#d97706','#e11d48'];

    res.innerHTML = `
      <!-- KPIs da análise -->
      <div class="aa-kpi-grid">
        <div class="aa-kpi">
          <div class="aa-kpi-label">Total no Período</div>
          <div class="aa-kpi-val">${fmtBRL(total)}</div>
          <div class="aa-kpi-sub">${regs.length.toLocaleString('pt-BR')} registros</div>
        </div>
        <div class="aa-kpi">
          <div class="aa-kpi-label">Média Mensal</div>
          <div class="aa-kpi-val">${fmtBRL(mediaM)}</div>
          <div class="aa-kpi-sub">${meses.size} meses com dados</div>
        </div>
        <div class="aa-kpi">
          <div class="aa-kpi-label">Veículos</div>
          <div class="aa-kpi-val">${placas.size.toLocaleString('pt-BR')}</div>
          <div class="aa-kpi-sub">placas distintas</div>
        </div>
        <div class="aa-kpi">
          <div class="aa-kpi-label">Secretarias</div>
          <div class="aa-kpi-val">${siglas.size.toLocaleString('pt-BR')}</div>
          <div class="aa-kpi-sub">unidades envolvidas</div>
        </div>
      </div>

      <!-- Gráfico evolução -->
      <div class="chart-section-wrap" style="margin-bottom:20px;">
        <div class="chart-section-banner chart-banner-green">
          <div class="chart-banner-left">
            <div class="chart-banner-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <h3 class="chart-banner-title">Evolução Mensal no Período</h3>
              <p class="chart-banner-sub">${regs.length.toLocaleString('pt-BR')} registros — ${meses.size} meses</p>
            </div>
          </div>
        </div>
        <div class="chart-section-body">
          <div class="chart-wrap chart-wrap-lg">
            <canvas id="aaChartEvolucao" aria-label="Gráfico evolução mensal análise avançada"></canvas>
          </div>
        </div>
      </div>

      <!-- Grid: por secretaria + por veículo -->
      <div class="charts-grid-2col">
        <div class="chart-section-wrap">
          <div class="chart-section-banner chart-banner-blue">
            <div class="chart-banner-left">
              <div class="chart-banner-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div>
                <h3 class="chart-banner-title">Por Secretaria</h3>
                <p class="chart-banner-sub">${siglas.size} secretarias</p>
              </div>
            </div>
          </div>
          <div class="chart-section-body">
            <div class="chart-wrap">
              <canvas id="aaChartSiglas" aria-label="Gráfico por secretaria análise avançada"></canvas>
            </div>
          </div>
        </div>
        <div class="chart-section-wrap">
          <div class="chart-section-banner chart-banner-purple">
            <div class="chart-banner-left">
              <div class="chart-banner-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <div>
                <h3 class="chart-banner-title">Top Veículos</h3>
                <p class="chart-banner-sub">${placas.size} veículos no período</p>
              </div>
            </div>
          </div>
          <div class="chart-section-body">
            <div class="chart-wrap">
              <canvas id="aaChartVeiculos" aria-label="Gráfico top veículos análise avançada"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela detalhada dos registros -->
      <div class="chart-section-wrap" style="margin-top:20px;">
        <div class="chart-section-banner" style="background:linear-gradient(135deg,#0891b2,#0ea5e9);">
          <div class="chart-banner-left">
            <div class="chart-banner-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div>
              <h3 class="chart-banner-title">Registros do Período</h3>
              <p class="chart-banner-sub">Clique em qualquer linha para ver detalhes</p>
            </div>
          </div>
          <div class="chart-banner-controls">
            <span class="ci-contador-pill">${regs.length.toLocaleString('pt-BR')} registros</span>
          </div>
        </div>
        <div class="chart-section-body" style="padding:0;">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Local</th>
                  <th>Departamento</th>
                  <th>Despesa</th>
                  <th>Tipo</th>
                  <th>Placa</th>
                  <th>Modelo</th>
                  <th>Mês</th>
                  <th>Ano</th>
                  <th style="text-align:right">Valor</th>
                </tr>
              </thead>
              <tbody id="aaTableBody">
                ${regs.slice(0,50).map(r=>`<tr class="table-row-clickable" data-placa="${r.Placa||''}">
                  <td class="td-sigla td-mono">${r.Sigla||'--'}</td>
                  <td class="td-truncate">${r.Departamento||'--'}</td>
                  <td>${r.Despesa||'--'}</td>
                  <td>${r.Tipo||'--'}</td>
                  <td class="td-mono">${r.Placa||'--'}</td>
                  <td class="td-truncate">${r.Modelo||'--'}</td>
                  <td>${fmtMes(r.Mes)}</td>
                  <td class="fw-600">${r.Ano||'--'}</td>
                  <td class="td-number fw-700">${fmtBRL(r.Valor)}</td>
                </tr>`).join('')}
                ${regs.length > 50 ? `<tr><td colspan="9" style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px;">Exibindo 50 de ${regs.length.toLocaleString('pt-BR')} registros</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    // Bind click em linhas da tabela
    setTimeout(() => {
      document.querySelectorAll('#aaTableBody tr.table-row-clickable').forEach(tr=>{
        tr.addEventListener('click', ()=>{
          const placa = tr.dataset.placa;
          const reg = regs.find(r=>r.Placa===placa);
          if (reg && typeof Modal !== 'undefined') Modal.open('detalheRegistro', reg);
        });
      });

      // Renderizar gráficos
      _renderCharts(evolucao, topSiglas, topPlacas, PAL);
    }, 50);
  }

  function _renderCharts(evolucao, topSiglas, topPlacas, PAL) {
    const TT = () => ({
      backgroundColor: isDark()?'#1a1f36':'#fff',
      titleColor: isDark()?'#e8edf5':'#1a1f36',
      bodyColor: isDark()?'#9ca3af':'#6b7280',
      borderColor: isDark()?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)',
      borderWidth:1, padding:12, cornerRadius:10,
      titleFont:{weight:'700',size:13}, bodyFont:{size:12},
    });

    // Evolução
    const evCanvas = document.getElementById('aaChartEvolucao');
    if (evCanvas && evolucao.length) {
      if (_chartInst?.evolucao) _chartInst.evolucao.destroy();
      const labels = evolucao.map(([k])=>{
        const [a,m] = k.split('-');
        return (typeof CONFIG!=='undefined'?CONFIG.MESES[parseInt(m)]:m)||m;
      });
      const cor = PAL[0];
      if (!_chartInst) _chartInst = {};
      _chartInst.evolucao = new Chart(evCanvas, {
        type: 'line',
        data: { labels, datasets: [{
          data: evolucao.map(([,v])=>v),
          borderColor: cor, backgroundColor: cor+'22',
          fill: true, tension: .35,
          pointBackgroundColor: cor, pointBorderColor: '#fff', pointBorderWidth: 2,
          pointRadius: 5, pointHoverRadius: 9, borderWidth: 2.5,
        }]},
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend:{display:false}, tooltip:{...TT(),callbacks:{label:ctx=>' '+ctx.parsed.y?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})||'—'}} },
          scales: {
            x:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11}}},
            y:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11},callback:kFmt}},
          },
        },
      });
    }

    // Por Sigla
    const sigCanvas = document.getElementById('aaChartSiglas');
    if (sigCanvas && topSiglas.length) {
      if (_chartInst?.siglas) _chartInst.siglas.destroy();
      if (!_chartInst) _chartInst = {};
      _chartInst.siglas = new Chart(sigCanvas, {
        type: 'bar',
        data: {
          labels: topSiglas.map(([s])=>s),
          datasets: [{ data: topSiglas.map(([,v])=>v), backgroundColor: PAL.map(c=>c+'BB'), borderRadius: 6, borderSkipped: false }]
        },
        options: {
          responsive: true, maintainAspectRatio: true, indexAxis: 'y',
          plugins: { legend:{display:false}, tooltip:{...TT(),callbacks:{label:ctx=>' '+ctx.parsed.x?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})||'—'}} },
          scales: {
            x:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11},callback:kFmt}},
            y:{grid:{display:false},border:{display:false},ticks:{color:textColor(),font:{size:11,weight:'600'}}},
          },
        },
      });
    }

    // Top Veículos
    const veicCanvas = document.getElementById('aaChartVeiculos');
    if (veicCanvas && topPlacas.length) {
      if (_chartInst?.veiculos) _chartInst.veiculos.destroy();
      if (!_chartInst) _chartInst = {};
      _chartInst.veiculos = new Chart(veicCanvas, {
        type: 'bar',
        data: {
          labels: topPlacas.map(([p,d])=>d.modelo!==p?d.modelo:p),
          datasets: [{ data: topPlacas.map(([,d])=>d.total), backgroundColor: PAL.map((_,i)=>PAL[i%PAL.length]+'BB'), borderRadius: 6, borderSkipped: false }]
        },
        options: {
          responsive: true, maintainAspectRatio: true, indexAxis: 'y',
          plugins: { legend:{display:false}, tooltip:{...TT(),callbacks:{label:ctx=>' '+ctx.parsed.x?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})||'—'}} },
          scales: {
            x:{grid:{color:gridColor(),drawTicks:false},border:{display:false},ticks:{color:textColor(),font:{size:11},callback:kFmt}},
            y:{grid:{display:false},border:{display:false},ticks:{color:textColor(),font:{size:11,weight:'600'}}},
          },
        },
      });
    }
  }

  // ── Preencher filtros da análise avançada a partir de contexto externo ─────
  // Permite que outros módulos naveguem para cá com filtros pré-preenchidos
  function preencherFiltros(opts) {
    if (!opts) return;
    if (opts.sigla) {
      const el = document.getElementById('aaSecretaria');
      if (el) el.value = opts.sigla;
    }
    if (opts.placa) {
      const el = document.getElementById('aaPlacaInput');
      if (el) el.value = opts.placa;
    }
    if (opts.mes) {
      const el = document.getElementById('aaMesIni');
      if (el) el.value = opts.mes;
      const el2 = document.getElementById('aaMesFim');
      if (el2) el2.value = opts.mes;
    }
    if (opts.ano) {
      const el = document.getElementById('aaAnoIni');
      if (el) el.value = opts.ano;
      const el2 = document.getElementById('aaAnoFim');
      if (el2) el2.value = opts.ano;
    }
  }

  // ── Chamado quando dados do sistema são carregados ────────────────────────
  function onDataReady() {
    _popularAnos();
    _popularSecretarias();
    _bindPlacaAutocomplete();
  }

  return { init, onDataReady, aplicar, limpar, preencherFiltros };
})();
