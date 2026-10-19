/* Plan de reemplazos | Datavet — descarga en Excel con marca Datavet (ExcelJS, todo en el navegador) */
'use strict';
(function () {
const {STAGES, SUM, DIAG, WORD, COSTROWS} = window.RM;

const NAVY = 'FF07193F', GREEN = 'FF209B6C', LINE = 'FFE0E0E0', ALT = 'FFF5F5F5', MUTED = 'FF4F5B73';
const RED_T = 'FFB00218', GREEN_T = 'FF17784F';
const TINT = {a:['FFF3F6FB', 'FFE9EEF6'], m:['FFF0F9F4', 'FFE3F3EA']};   // columnas Actual y Meta: fila blanca / fila alterna
const LIGHT = {g:'FF209B6C', y:'FFF5A623', r:'FFD0021B'};
const FONT = 'Jost';   // fuente de la marca; si el equipo no la tiene instalada, Excel la reemplaza por una similar

const fill = argb => ({type:'pattern', pattern:'solid', fgColor:{argb}});
const thin = argb => ({style:'thin', color:{argb}});

/* Formatos de número: Excel guarda el código con punto decimal y lo muestra según la configuración regional
   (en un equipo en español de Colombia: 1.234,5). */
const F = {
  int:'#,##0', dec1:'#,##0.0', dec2:'#,##0.00',
  pct:'0.0" %"', pct0:'0" %"', months:'0.0" m"',
  signed:'+#,##0;-#,##0;0', signed1:'+#,##0.0;-#,##0.0;0.0'
};
const moneyFmt = (sym, dec = 0) => {
  const s = String(sym).replace(/"/g, '');
  const n = dec ? '#,##0.' + '0'.repeat(dec) : '#,##0';
  return `"${s}" ${n};-"${s}" ${n}`;
};

async function exportXlsx(rep, fileName, loadScript){
  await loadScript('vendor/exceljs.min.js');
  const {ra, rm} = rep;
  const wb = new window.ExcelJS.Workbook();
  wb.creator = 'Datavet · Iván Darío Cifuentes Moreno';
  wb.title = 'Plan de reemplazos del hato lechero';
  wb.company = 'Datavet';
  wb.created = new Date();
  const logoId = wb.addImage({base64:await window.DVC.fetchB64('assets/logo-datavet-negativo.png'), extension:'png'});
  const money = (dec = 0) => moneyFmt(rep.sym, dec);
  const costDec = Math.max(...COSTROWS.map(r => rep.S.sh[r.k])) < 100 ? 2 : 0;
  const metaLine = [rep.finca ? `Finca: ${rep.finca}` : 'Finca: sin nombre', rep.fechaTxt ? `Fecha: ${rep.fechaTxt}` : '', rep.mode === 'simple' ? '' : `Moneda: ${rep.mon} (${rep.sym})`].filter(Boolean).join('   ·   ');

  /* ---------- hoja con banda de marca ---------- */
  function sheet(name, title, widths, landscape = true){
    const ws = wb.addWorksheet(name, {
      properties:{tabColor:{argb:name === 'Resumen' ? GREEN : NAVY}, defaultRowHeight:18},
      views:[{showGridLines:false}],
      pageSetup:{paperSize:1, orientation:landscape ? 'landscape' : 'portrait', fitToPage:true, fitToWidth:1, fitToHeight:1,
                 horizontalCentered:true, margins:{left:0.5, right:0.5, top:0.75, bottom:0.75, header:0.3, footer:0.3}},
      headerFooter:{
        oddHeader:`&L&"${FONT},Bold"&10Datavet&R&"${FONT},Regular"&9Plan de reemplazos del hato lechero · ${title}`,
        oddFooter:`&L&"${FONT},Regular"&7Iván Darío Cifuentes Moreno · Datavet — Analizar para innovar, innovar para evolucionar · Medellín, Colombia&R&"${FONT},Regular"&8Página &P de &N`
      }
    });
    ws.columns = widths.map(w => ({width:w}));
    const n = widths.length;
    const band = [30, 22, 26, 20];
    band.forEach((h, i) => {
      const row = ws.getRow(i + 1); row.height = h;
      for (let c = 1; c <= n; c++) row.getCell(c).fill = fill(NAVY);
    });
    ws.addImage(logoId, {tl:{col:0.12, row:0.25}, ext:{width:150, height:51}, editAs:'absolute'});
    const brand = ws.getCell(1, n);
    brand.value = 'Plan de reemplazos del hato lechero';
    brand.font = {name:FONT, size:10, color:{argb:'FFB9C7DA'}};
    brand.alignment = {horizontal:'right', vertical:'middle'};
    const t = ws.getCell(3, 1);
    t.value = title; t.font = {name:FONT, size:15, bold:true, color:{argb:'FFFFFFFF'}}; t.alignment = {vertical:'middle'};
    const m = ws.getCell(4, 1);
    m.value = metaLine; m.font = {name:FONT, size:10, color:{argb:'FFDDE6F0'}}; m.alignment = {vertical:'top'};
    const sep = ws.getRow(5); sep.height = 4;
    for (let c = 1; c <= n; c++) sep.getCell(c).fill = fill(GREEN);
    ws.getRow(6).height = 10;
    ws.__n = n;
    return ws;
  }

  /* ---------- tabla con estilo Datavet ----------
     cols: [{h:'Encabezado', fmt, align, tint:'a'|'m', wrap}]  rows: arrays de valores; opts.total: índice de fila de totales */
  function table(ws, r0, cols, rows, opts = {}){
    const hr = ws.getRow(r0); hr.height = 30;
    cols.forEach((c, j) => {
      const cell = hr.getCell(j + 1);
      cell.value = c.h;
      cell.font = {name:FONT, size:10, bold:true, color:{argb:'FFFFFFFF'}};
      cell.fill = fill(NAVY);
      cell.alignment = {horizontal:j === 0 || c.align === 'left' ? 'left' : 'right', vertical:'middle', wrapText:true};
      cell.border = {bottom:thin(NAVY)};
    });
    rows.forEach((vals, i) => {
      const row = ws.getRow(r0 + 1 + i);
      const isTotal = opts.total === i, isGroup = vals.__group;
      const alt = i % 2 === 1;
      if (vals.__h) row.height = vals.__h;
      cols.forEach((c, j) => {
        const cell = row.getCell(j + 1);
        const v = vals[j];
        cell.value = v === '' || v === undefined || (typeof v === 'number' && !isFinite(v)) ? null : v;
        cell.font = {name:FONT, size:10, bold:isTotal || isGroup, color:{argb:isGroup ? GREEN_T : NAVY}};
        cell.alignment = {horizontal:j === 0 || c.align === 'left' ? 'left' : 'right', vertical:'middle', wrapText:!!c.wrap || j === 0};
        if (c.fmt && typeof v === 'number') cell.numFmt = typeof c.fmt === 'function' ? c.fmt(i) : c.fmt;
        if (isGroup) { cell.border = {bottom:thin(GREEN)}; return; }
        cell.fill = fill(c.tint ? TINT[c.tint][alt ? 1 : 0] : (alt ? ALT : 'FFFFFFFF'));
        cell.border = isTotal ? {top:{style:'medium', color:{argb:GREEN}}, bottom:thin(LINE)} : {bottom:thin(LINE)};
        if (c.color) { const col = c.color(v, i); if (col) cell.font = {...cell.font, color:{argb:col}, bold:true}; }
        if (c.style) c.style(cell, v, i);
      });
    });
    ws.views = [{state:'frozen', ySplit:r0, xSplit:0, topLeftCell:`A${r0 + 1}`, showGridLines:false}];
    ws.pageSetup.printTitlesRow = `${r0}:${r0}`;
    return r0 + rows.length;
  }

  function note(ws, r, text, opts = {}){
    ws.mergeCells(r, 1, r, ws.__n);
    const c = ws.getCell(r, 1);
    c.value = text;
    c.font = {name:FONT, size:opts.size || 10, italic:!!opts.italic, bold:!!opts.bold, color:{argb:opts.color || MUTED}};
    c.alignment = {wrapText:true, vertical:'top'};
    const chars = ws.columns.reduce((a, col) => a + (col.width || 10), 0);
    ws.getRow(r).height = Math.max(16, Math.ceil(text.length / (chars * 1.05)) * 14 + 4);
    return r;
  }
  function footer(ws, r){
    const c = note(ws, r + 2, window.DVC.FOOTER, {size:9});
    ws.getCell(c, 1).border = {top:thin(GREEN)};
    const chars = ws.columns.reduce((a, col) => a + (col.width || 10), 0) * 1.15;
    ws.getRow(c).height = window.DVC.FOOTER_LINES.reduce((a, l) => a + Math.ceil(l.length / chars), 0) * 12.5 + 6;
  }

  /* direcciones de color: diferencia mejor = verde, peor = rojo */
  const dirColor = dir => v => (typeof v !== 'number' || !dir || Math.abs(v) < 1e-9) ? null : (v * dir > 0 ? GREEN_T : RED_T);
  const negRed = v => typeof v === 'number' && v < -0.05 ? RED_T : (typeof v === 'number' && v > 0.05 ? GREEN_T : null);

  const LIGHT_STYLE = (cell, v) => {
    cell.value = WORD[v];
    cell.fill = fill(LIGHT[v]);
    cell.font = {name:FONT, size:10, bold:true, color:{argb:v === 'y' ? NAVY : 'FFFFFFFF'}};
    cell.alignment = {horizontal:'center', vertical:'middle'};
    cell.border = {bottom:thin('FFFFFFFF'), top:thin('FFFFFFFF')};
  };

  if (rep.mode === 'simple' && rep.simple) {
    /* ===== Modo rápido: solo lo preguntado, los resultados y los supuestos ===== */
    const sr = rep.simple, p = rep.S.a;
    {
      const ws = sheet('Resultados', 'Resultados del plan', [52, 30]);
      let r = table(ws, 7, [{h:'Para sostener su hato, usted necesita'}, {h:'Cantidad', fmt:F.int}],
        [...sr.kpis.map(([v, l]) => [l.charAt(0).toUpperCase() + l.slice(1), Math.round(v)]), ['Vacas adultas totales', Math.round(ra.T)]]);
      note(ws, ++r, sr.herd, {size:9});
      r += 2;
      note(ws, r, sr.verdict.title, {bold:true, size:11, color:sr.verdict.kind === 'ok' ? GREEN_T : sr.verdict.kind === 'bad' ? RED_T : 'FF8A5A00'});
      note(ws, ++r, sr.verdict.text, {color:NAVY});
      if (sr.invText) note(ws, ++r, sr.invText, {color:NAVY});
      r += 2;
      r = table(ws, r, [{h:'Sus datos'}, {h:'Valor', align:'left'}], sr.entered.map(e => [...e]));
      note(ws, r + 2, sr.assumptions, {italic:true, size:9});
      footer(ws, r + 3);
      ws.views = [{showGridLines:false}];
    }
    {
      const ws = sheet('Por grupo', 'Hembras por grupo', [30, 38, 13, 13, 13]);
      const hasHoy = sr.groups.some(g => g.hoy !== null);
      const rows = sr.groups.map((g, i) => [g.name, g.desc, g.need, g.meta, g.hoy === null ? '' : g.hoy]);
      rows.push(['Total', '', ra.IR, rm.IR, rep.inv.n ? rep.inv.total : '']);
      const end = table(ws, 7, [
        {h:'Grupo', style:(cell, v, i) => { if (i < 5) cell.value = {richText:[{text:'■ ', font:{name:FONT, size:11, color:{argb:'FF' + sr.groups[i].color.slice(1)}}}, {text:v, font:{name:FONT, size:10, color:{argb:NAVY}}}]}; }},
        {h:'Edad', align:'left'}, {h:'Necesita', tint:'a', fmt:F.int}, {h:'Meta', tint:'m', fmt:F.int},
        {h:hasHoy ? 'Hoy tiene' : 'Hoy tiene (sin dato)', fmt:F.int, style:(cell, v, i) => { if (i < 5 && typeof v === 'number' && v < sr.groups[i].need) cell.font = {...cell.font, color:{argb:RED_T}, bold:true}; }}
      ], rows, {total:5});
      note(ws, end + 2, 'Necesita: hembras requeridas con sus indicadores actuales. Meta: las que bastarían si alcanza los valores de referencia de la raza. En rojo, los grupos donde hoy tiene menos de las que necesita.', {italic:true, size:9});
      footer(ws, end + 3);
    }
    {
      const ws = sheet('Semáforo', 'Semáforo de sus indicadores', [42, 16, 32, 36]);
      const fmts = [];
      const rows = DIAG.map(d => {
        const v = d.v(ra, p), rr = d.dec === 0 ? Math.round(v) : Math.round(v * 10) / 10;
        fmts.push(d.unit === '%' ? (d.dec ? F.pct : F.pct0) : d.unit === 'm' ? F.months : (d.l.startsWith('Balance') ? F.signed : F.int));
        return [d.l, rr, d.st(v, p), d.ref];
      });
      const end = table(ws, 7, [{h:'Indicador'}, {h:'Su valor', fmt:i => fmts[i]}, {h:'Estado', style:LIGHT_STYLE}, {h:'Referencia', align:'left', wrap:true}], rows);
      note(ws, end + 2, 'Verde: dentro de la referencia o mejor. Ámbar: requiere atención. Rojo: crítico.', {italic:true, size:9});
      footer(ws, end + 3);
    }
    {
      const ws = sheet('Gráfico', 'Gráfico por etapa', [14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
      const bars = wb.addImage({base64:window.DVC.barChartPng(rep).split(',')[1], extension:'png'});
      ws.addImage(bars, {tl:{col:0.2, row:6.5}, ext:{width:900, height:450}, editAs:'oneCell'});
      for (let r = 7; r <= 31; r++) ws.getRow(r).height = 18;
      footer(ws, 31);
    }
  } else {
    /* ===== Resumen ===== */
    {
      const ws = sheet('Resumen', 'Resumen del plan', [50, 18, 18, 18]);
      const rows = [], fmts = [], dirs = [];
      SUM.forEach(([l, f, d, dir, signed]) => {
        let a = f(ra), m = f(rm);
        if (d === 0) { a = Math.round(a); m = Math.round(m); }
        rows.push([d === '$' ? `${l} (${rep.sym})` : l, a, m, m - a]);
        fmts.push(d === '$' ? [money(), money(), `+${money().split(';')[0]};-${money().split(';')[0]};${money().split(';')[0]}`]
          : d === 1 ? [F.pct, F.pct, '+0.0" %";-0.0" %";0.0" %"']
          : [signed ? F.signed : F.int, signed ? F.signed : F.int, F.signed]);
        dirs.push(dir);
      });
      const end = table(ws, 7, [
        {h:'Indicador'},
        {h:'Actual', tint:'a', fmt:i => fmts[i][0]},
        {h:'Meta', tint:'m', fmt:i => fmts[i][1]},
        {h:'Diferencia (meta − actual)', fmt:i => fmts[i][2], style:(cell, v, i) => { const col = dirColor(dirs[i])(v); if (col) cell.font = {...cell.font, color:{argb:col}, bold:true}; }}
      ], rows);
      let r = end + 2;
      note(ws, r, 'Conclusión', {bold:true, color:NAVY, size:11});
      note(ws, ++r, (rep.finca ? rep.finca + '. ' : '') + rep.lead, {color:NAVY, size:10.5});
      r += 2;
      note(ws, r, 'Terneras disponibles y estrategia de semen', {bold:true, color:NAVY, size:11});
      for (const [k, name] of [['a', 'Actual'], ['m', 'Meta']]) {
        note(ws, ++r, `${name}: ` + rep.semen[k].map(t => t.text).join(' '), {color:NAVY});
      }
      note(ws, r + 2, 'Verde: la meta mejora frente al escenario actual. Rojo: la meta empeora. Las cifras de animales están en enteros.', {italic:true, size:9});
      footer(ws, r + 3);
    }

    /* ===== Parámetros ===== */
    {
      const ws = sheet('Parámetros', 'Parámetros usados', [46, 12, 16, 16], false);
      const rows = []; const kinds = [];
      rep.params.forEach(p => {
        if (p.g) { const g = [p.g, '', '', '']; g.__group = true; rows.push(g); kinds.push('g'); return; }
        const unit = p.cost ? `${rep.sym}/día` : (p.u || '');
        const label = p.l.replace(/ \([^)]*\)$/, '');
        rows.push([label, unit, p.va, p.cost ? p.va : p.vm]);
        kinds.push(p.cost ? 'cost' : p.u === '%' ? 'pct' : 'num');
      });
      const fmt = i => kinds[i] === 'cost' ? money(costDec) : 'General';
      const end = table(ws, 7, [
        {h:'Parámetro'}, {h:'Unidad', align:'left'},
        {h:'Actual', tint:'a', fmt}, {h:'Meta', tint:'m', fmt}
      ], rows);
      note(ws, end + 2, 'Los costos por novilla por día son los mismos en ambos escenarios. Valores de Meta: escenario de referencia de la raza.', {italic:true, size:9});
      footer(ws, end + 3);
    }

    /* ===== Inventario por etapa ===== */
    {
      const ws = sheet('Inventario por etapa', 'Inventario por etapa', [36, 15, 15, 14, 14, 11, 13, 13, 20]);
      const per = s => s.d > 0 ? `${String(+s.a0.toFixed(1)).replace('.', ',')}–${String(+s.a1.toFixed(1)).replace('.', ',')}` : 'no aplica';
      const rows = ra.st.map((s, i) => {
        const r = rep.inv.rows[i];
        return [STAGES[i].full, per(s), per(rm.st[i]), s.invR, rm.st[i].invR, r.has ? r.v : '', r.has ? r.dA : '', r.has ? r.dM : '', Math.round(s.cost)];
      });
      rows.push(['Total', `0–${String(+ra.ageEnd.toFixed(1)).replace('.', ',')}`, `0–${String(+rm.ageEnd.toFixed(1)).replace('.', ',')}`, ra.IR, rm.IR,
                 rep.inv.n ? rep.inv.total : '', rep.inv.n ? rep.inv.dA : '', rep.inv.n ? rep.inv.dM : '', Math.round(ra.st.reduce((a, s) => a + s.cost, 0))]);
      const end = table(ws, 7, [
        {h:'Etapa', style:(cell, v, i) => { if (i < 5) cell.value = {richText:[{text:'■ ', font:{name:FONT, size:11, color:{argb:'FF' + STAGES[i].color.slice(1)}}}, {text:v, font:{name:FONT, size:10, color:{argb:NAVY}}}]}; }},
        {h:'Período actual (meses de edad)'}, {h:'Período meta (meses de edad)'},
        {h:'Requeridas, actual', tint:'a', fmt:F.int}, {h:'Requeridas, meta', tint:'m', fmt:F.int},
        {h:'Hay hoy', fmt:F.int},
        {h:'Hoy − actual', fmt:F.signed, color:negRed}, {h:'Hoy − meta', fmt:F.signed, color:negRed},
        {h:`Costo anual, actual (${rep.sym})`, fmt:money()}
      ], rows, {total:5});
      let r = end + 2;
      if (rep.inv.n) note(ws, r++, `Hoy hay ${rep.inv.total} novillas. Un valor negativo, en rojo, es una etapa con déficit frente a ese escenario.`, {color:NAVY});
      note(ws, r, 'Las etapas suman exactamente el total: se reparten con el método del mayor residuo. El costo anual usa el inventario requerido del escenario actual.', {italic:true, size:9});
      footer(ws, r + 1);
    }

    /* ===== Etapas ===== */
    {
      const ws = sheet('Etapas', 'Etapas del levante', [36, 70, 18, 18]);
      const per = s => s.d > 0 ? `${String(+s.a0.toFixed(1)).replace('.', ',')}–${String(+s.a1.toFixed(1)).replace('.', ',')}` : 'no aplica';
      const end = table(ws, 7, [
        {h:'Etapa'}, {h:'A qué período corresponde', align:'left', wrap:true},
        {h:'Período actual (meses de edad)', tint:'a'}, {h:'Período meta (meses de edad)', tint:'m'}
      ], STAGES.map((s, i) => Object.assign([s.full, s.desc, per(ra.st[i]), per(rm.st[i])], {__h:30})));
      footer(ws, end);
    }

    /* ===== Diagnóstico ===== */
    {
      const ws = sheet('Diagnóstico', 'Diagnóstico frente a referencias', [40, 13, 31, 13, 31, 34]);
      const fmts = [];
      const rows = DIAG.map(d => {
        const va = d.v(ra, rep.S.a), vm = d.v(rm, rep.S.m);
        const rr = x => d.dec === 0 ? Math.round(x) : Math.round(x * 10) / 10;
        fmts.push(d.unit === '%' ? (d.dec ? F.pct : F.pct0) : d.unit === 'm' ? F.months : (d.l.startsWith('Balance') ? F.signed : F.int));
        return [d.l, rr(va), d.st(va, rep.S.a), rr(vm), d.st(vm, rep.S.m), d.ref];
      });
      const light = LIGHT_STYLE;
      const end = table(ws, 7, [
        {h:'Indicador'}, {h:'Actual', tint:'a', fmt:i => fmts[i]}, {h:'Estado, actual', style:light},
        {h:'Meta', tint:'m', fmt:i => fmts[i]}, {h:'Estado, meta', style:light}, {h:'Referencia', align:'left', wrap:true}
      ], rows);
      note(ws, end + 2, 'Semáforo: verde = dentro de la referencia o mejor; ámbar = requiere atención; rojo = crítico.', {italic:true, size:9});
      footer(ws, end + 3);
    }

    /* ===== Gráfico ===== */
    {
      const ws = sheet('Gráfico', 'Gráfico: actual frente a meta', [14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
      const bars = wb.addImage({base64:window.DVC.barChartPng(rep).split(',')[1], extension:'png'});
      ws.addImage(bars, {tl:{col:0.2, row:6.5}, ext:{width:900, height:450}, editAs:'oneCell'});
      const pipe = wb.addImage({base64:(await window.DVC.svgToPng(rep.pipeSvg('a'))).split(',')[1], extension:'png'});
      ws.addImage(pipe, {tl:{col:0.2, row:31}, ext:{width:900, height:262}, editAs:'oneCell'});
      for (let r = 7; r <= 47; r++) ws.getRow(r).height = 18;
      note(ws, 48, 'Tubería de levante del escenario actual: el área de cada tramo equivale a las novillas de esa etapa; la línea punteada es la meta.', {italic:true, size:9});
      footer(ws, 48);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  window.DVC.saveBlob(new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), fileName);
  return wb;
}

window.DVX = {exportXlsx};
})();
