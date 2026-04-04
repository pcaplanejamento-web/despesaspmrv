/**
 * exportacao.js — v1.0
 * Exportação XLSX: dados brutos + resumo por secretaria + resumo por mês
 * Relatório PDF: via window.print() com CSS @media print
 */
const Exportacao = (() => {

  function fmtBRL(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtMes(m) { return CONFIG.MESES[m]||String(m||'--'); }
  const sl = () => typeof Filters !== 'undefined' ? Filters.siglaLabel : s => s;

  // ── Carregar SheetJS dinamicamente ────────────────────

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

  // ── Exportar XLSX ─────────────────────────────────────

  async function exportarXLSX() {
    if (typeof App !== 'undefined') App.showToast('info', 'Preparando XLSX...', 'Aguarde um momento');
    try {
      await _loadXLSX();
    } catch(e) {
      if (typeof App !== 'undefined') App.showToast('error', 'Erro ao exportar', e.message);
      return;
    }

    const data = State.getFilteredData();
    if (!data.length) {
      if (typeof App !== 'undefined') App.showToast('warn', 'Sem dados para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();

    // ── ABA 1: Dados Brutos ──
    const hdrs = ['Empresa','Sigla','Centro de Custo','Departamento','Despesa','Modelo',
      'Classificação','Tipo','Placa','Valor (R$)','Liquidado (R$)','Mês','Ano','Contrato'];
    const rows = data.map(r => [
      r.Empresa||'', r.Sigla||'', r.CentroCusto||'', r.Departamento||'',
      r.Despesa||'', r.Modelo||'', r.Classificacao||'', r.Tipo||'', r.Placa||'',
      r.Valor||0, r.Liquidado||0, r.Mes||'', r.Ano||'', r.Contrato||'',
    ]);
    const ws1 = XLSX.utils.aoa_to_sheet([hdrs, ...rows]);
    // Formatar colunas de valor como moeda
    const range = XLSX.utils.decode_range(ws1['!ref']||'A1');
    for (let R=1; R<=range.e.r; R++) {
      ['J','K'].forEach(col => {
        const cell = ws1[`${col}${R+1}`];
        if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
      });
    }
    ws1['!cols'] = [10,8,20,20,12,20,24,10,10,14,14,6,6,16].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, ws1, 'Dados Brutos');

    // ── ABA 2: Resumo por Secretaria ──
    const bySigla = {};
    data.forEach(r => {
      const k = r.Sigla||'--';
      if (!bySigla[k]) bySigla[k] = { sigla:k, nome:sl()(k), total:0, comb:0, manu:0, qtde:0 };
      bySigla[k].total += r.Valor||0;
      bySigla[k].qtde++;
      if ((r.Despesa||'').toLowerCase().startsWith('combust')) bySigla[k].comb += r.Valor||0;
      if ((r.Despesa||'').toLowerCase().startsWith('manut'))   bySigla[k].manu += r.Valor||0;
    });
    const siglaRows = Object.values(bySigla).sort((a,b)=>b.total-a.total);
    const totalSigla = siglaRows.reduce((s,r)=>s+r.total,0);
    const siglaHdrs  = ['Sigla','Secretaria / Fundo','Qtde','Total (R$)','Combustível (R$)','Manutenção (R$)','% do Total'];
    const siglaData  = siglaRows.map(r=>[
      r.sigla, r.nome, r.qtde, r.total, r.comb, r.manu,
      totalSigla>0?parseFloat(((r.total/totalSigla)*100).toFixed(2)):0,
    ]);
    siglaData.push(['','TOTAL', siglaRows.reduce((s,r)=>s+r.qtde,0), totalSigla,
      siglaRows.reduce((s,r)=>s+r.comb,0), siglaRows.reduce((s,r)=>s+r.manu,0), 100]);
    const ws2 = XLSX.utils.aoa_to_sheet([siglaHdrs, ...siglaData]);
    ws2['!cols'] = [8,32,8,16,16,16,10].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Secretaria');

    // ── ABA 3: Resumo por Mês ──
    const byMes = {};
    data.forEach(r => {
      if (!r.Mes||!r.Ano) return;
      const k=`${r.Ano}-${String(r.Mes).padStart(2,'0')}`;
      if (!byMes[k]) byMes[k]={mes:r.Mes,ano:r.Ano,label:`${fmtMes(r.Mes)}/${r.Ano}`,total:0,comb:0,manu:0,qtde:0};
      byMes[k].total += r.Valor||0;
      byMes[k].qtde++;
      if ((r.Despesa||'').toLowerCase().startsWith('combust')) byMes[k].comb += r.Valor||0;
      if ((r.Despesa||'').toLowerCase().startsWith('manut'))   byMes[k].manu += r.Valor||0;
    });
    const mesRows = Object.entries(byMes).sort((a,b)=>a[0]<b[0]?-1:1).map(([,v])=>v);
    const mesHdrs = ['Mês/Ano','Qtde','Total (R$)','Combustível (R$)','Manutenção (R$)'];
    const mesData  = mesRows.map(r=>[r.label, r.qtde, r.total, r.comb, r.manu]);
    mesData.push(['TOTAL', mesRows.reduce((s,r)=>s+r.qtde,0),
      mesRows.reduce((s,r)=>s+r.total,0), mesRows.reduce((s,r)=>s+r.comb,0), mesRows.reduce((s,r)=>s+r.manu,0)]);
    const ws3 = XLSX.utils.aoa_to_sheet([mesHdrs, ...mesData]);
    ws3['!cols'] = [14,8,16,16,16].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Mês');

    // Gerar e baixar
    const buf  = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a    = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `gastos_rv_${new Date().toISOString().slice(0,10)}.xlsx`,
    });
    a.click(); URL.revokeObjectURL(a.href);
    if (typeof App !== 'undefined') App.showToast('success', 'XLSX exportado', `${data.length.toLocaleString('pt-BR')} registros em 3 abas`);
  }

  // ── Relatório PDF ─────────────────────────────────────

  function gerarPDF() {
    const data    = State.getFilteredData();
    const filtros = State.getFilters();
    const total   = data.reduce((s,r)=>s+r.Valor,0);
    const qtde    = data.length;

    // Resumo por secretaria (para o PDF)
    const bySigla = {};
    data.forEach(r=>{ const k=r.Sigla||'--'; bySigla[k]=(bySigla[k]||0)+r.Valor; });
    const topSiglas = Object.entries(bySigla).sort((a,b)=>b[1]-a[1]).slice(0,20);

    // Construir filtros ativos em texto
    const filtrosAtivos = [];
    if (filtros.anos?.length)        filtrosAtivos.push(`Anos: ${filtros.anos.join(', ')}`);
    if (filtros.despesas?.length)    filtrosAtivos.push(`Despesas: ${filtros.despesas.join(', ')}`);
    if (filtros.tipos?.length)       filtrosAtivos.push(`Tipo: ${filtros.tipos.join(', ')}`);
    if (filtros.secretarias?.length) filtrosAtivos.push(`Secretarias: ${filtros.secretarias.map(sl()).join(', ')}`);
    if (filtros.classificacoes?.length) filtrosAtivos.push(`Classificações: ${filtros.classificacoes.join(', ')}`);

    // Criar janela de impressão
    const win = window.open('','_blank','width=900,height=700');
    if (!win) { App?.showToast('warn','Permitir popups','Habilite popups para gerar o PDF'); return; }

    const now = new Date();
    const dtStr = now.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Despesas — Gastos RV</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#fff;color:#1a1f36;font-size:13px;line-height:1.5;}
  .capa{padding:60px 48px 40px;border-bottom:4px solid #4361ee;}
  .logo{display:flex;align-items:center;gap:12px;margin-bottom:32px;}
  .logo-icon{width:44px;height:44px;background:linear-gradient(135deg,#4361ee,#7b6df8);border-radius:12px;display:flex;align-items:center;justify-content:center;}
  .logo-icon svg{stroke:#fff;}
  .logo-nome{font-size:20px;font-weight:800;color:#1a1f36;letter-spacing:-.3px;}
  .logo-sub{font-size:12px;color:#6b7280;}
  h1{font-size:28px;font-weight:800;color:#1a1f36;letter-spacing:-.5px;margin-bottom:8px;}
  .subtitulo{font-size:14px;color:#6b7280;margin-bottom:24px;}
  .filtros-ativos{background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;font-size:12px;color:#4b5563;}
  .filtros-ativos strong{color:#1a1f36;}
  .secao{padding:32px 48px;}
  .secao-titulo{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#6b7280;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;}
  .kpis-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;}
  .kpi-box{background:#f8f9fc;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;}
  .kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:4px;}
  .kpi-valor{font-size:22px;font-weight:800;color:#4361ee;letter-spacing:-.5px;}
  .kpi-sub{font-size:11px;color:#9ca3af;margin-top:4px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  thead th{background:#f1f5f9;color:#374151;padding:9px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;text-align:left;border-bottom:2px solid #e5e7eb;}
  thead th.tr{text-align:right;}
  tbody td{padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#374151;}
  tbody td.tr{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#4361ee;}
  tbody tr:last-child td{border-bottom:2px solid #e5e7eb;font-weight:700;}
  .rodape{padding:20px 48px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#9ca3af;}
  @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
</style>
</head>
<body>
<div class="capa">
  <div class="logo">
    <div class="logo-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    </div>
    <div>
      <div class="logo-nome">Gastos RV</div>
      <div class="logo-sub">Prefeitura Municipal de Rio Verde — PMRV</div>
    </div>
  </div>
  <h1>Relatório de Despesas de Frota</h1>
  <p class="subtitulo">Combustível e Manutenção — emitido em ${dtStr}</p>
  ${filtrosAtivos.length?`<div class="filtros-ativos"><strong>Filtros ativos:</strong> ${filtrosAtivos.join(' · ')}</div>`:''}
</div>

<div class="secao">
  <div class="secao-titulo">Indicadores Gerais</div>
  <div class="kpis-grid">
    <div class="kpi-box">
      <div class="kpi-label">Total de Despesas</div>
      <div class="kpi-valor">${fmtBRL(total)}</div>
      <div class="kpi-sub">${qtde.toLocaleString('pt-BR')} registros</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Combustível</div>
      <div class="kpi-valor">${fmtBRL(data.filter(r=>(r.Despesa||'').toLowerCase().startsWith('combust')).reduce((s,r)=>s+r.Valor,0))}</div>
      <div class="kpi-sub">${data.filter(r=>(r.Despesa||'').toLowerCase().startsWith('combust')).length} registros</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Manutenção</div>
      <div class="kpi-valor">${fmtBRL(data.filter(r=>(r.Despesa||'').toLowerCase().startsWith('manut')).reduce((s,r)=>s+r.Valor,0))}</div>
      <div class="kpi-sub">${data.filter(r=>(r.Despesa||'').toLowerCase().startsWith('manut')).length} registros</div>
    </div>
  </div>

  <div class="secao-titulo" style="margin-top:8px">Despesas por Secretaria</div>
  <table>
    <thead><tr><th>Sigla</th><th>Secretaria / Fundo</th><th class="tr">Total</th><th class="tr">% do Total</th></tr></thead>
    <tbody>
      ${topSiglas.map(([sigla,val])=>`<tr>
        <td><strong>${sigla}</strong></td>
        <td>${sl()(sigla)}</td>
        <td class="tr">${fmtBRL(val)}</td>
        <td class="tr">${total>0?((val/total)*100).toFixed(1).replace('.',',')+'%':'--'}</td>
      </tr>`).join('')}
      <tr>
        <td colspan="2"><strong>TOTAL</strong></td>
        <td class="tr">${fmtBRL(topSiglas.reduce((s,[,v])=>s+v,0))}</td>
        <td class="tr">100,0%</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="rodape">
  <span>Gastos RV v${CONFIG.VERSAO||'1.x'} — Sistema de Análise de Despesas de Frota</span>
  <span>${dtStr}</span>
</div>
</body>
</html>`);

    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  }

  return { exportarXLSX, gerarPDF };
})();
