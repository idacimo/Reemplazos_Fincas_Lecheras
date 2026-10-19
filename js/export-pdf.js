/* Plan de reemplazos | Datavet — informe PDF tamaño carta (jsPDF + AutoTable, texto seleccionable) */
'use strict';
(function () {
const {STAGES, SUM, DIAG, WORD, DOT, nf, sgn} = window.RM;

const C = {navy:[7, 25, 63], green:[32, 155, 108], greenT:[23, 120, 79], redT:[176, 2, 24], muted:[79, 91, 115],
           line:[224, 224, 224], alt:[245, 245, 245], wash:[241, 246, 243], light:[185, 199, 218], white:[255, 255, 255]};
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

async function exportPdf(rep, fileName, loadScript){
  await loadScript('vendor/jspdf.umd.min.js');
  await loadScript('vendor/jspdf.plugin.autotable.min.js');
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({unit:'mm', format:'letter', orientation:'portrait', compress:true});
  doc.setProperties({title:'Plan de reemplazos del hato lechero' + (rep.finca ? ' · ' + rep.finca : ''), author:'Datavet · Iván Darío Cifuentes Moreno',
                     subject:'Plan de reemplazos', creator:'Datavet'});

  /* Fuente Jost (marca Datavet) incrustada; si no se puede cargar, Helvetica con caracteres compatibles.
     Jost no trae ₡ ni Σ: se escriben con letras. */
  let FN = 'Jost', SB = 'semibold';
  let clean = s => String(s).replace(/₡/g, 'CRC ').replace(/Σ/g, 'Suma de');
  try {
    const fonts = await Promise.all(['Regular', 'SemiBold', 'Bold'].map(w => window.DVC.fetchB64(`vendor/fonts/Jost-${w}.ttf`)));
    [['Regular', 'normal'], ['SemiBold', 'semibold'], ['Bold', 'bold']].forEach(([w, st], i) => {
      doc.addFileToVFS(`Jost-${w}.ttf`, fonts[i]); doc.addFont(`Jost-${w}.ttf`, 'Jost', st);
    });
  } catch (e) {
    FN = 'helvetica'; SB = 'bold';
    const c0 = clean;
    clean = s => c0(s).replace(/−/g, '-').replace(/–/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/—/g, '-');
  }
  const font = (style = 'normal', size = 9, color = C.navy) => {
    doc.setFont(FN, style === 'semibold' ? SB : style);
    doc.setFontSize(size); doc.setTextColor(...color);
  };

  const W = 215.9, H = 279.4, ML = 14, MR = 14, CW = W - ML - MR, TOP2 = 24, BOT = 24;
  const logoNeg = 'data:image/png;base64,' + await window.DVC.fetchB64('assets/logo-datavet-negativo.png');
  const logoCol = 'data:image/png;base64,' + await window.DVC.fetchB64('assets/logo-datavet.png');
  const {ra, rm} = rep;
  const money = (x, d = 0) => `${rep.sym} ${nf(x, d)}`;
  const metaLine = [rep.finca || 'Finca sin nombre', rep.fechaTxt, rep.mode === 'simple' ? '' : `Moneda: ${rep.mon} (${rep.sym})`].filter(Boolean).join('  ·  ');

  /* ---------- encabezado de la primera página ---------- */
  doc.setFillColor(...C.navy); doc.rect(0, 0, W, 31, 'F');
  doc.setFillColor(...C.green); doc.rect(0, 31, W, 1.3, 'F');
  doc.addImage(logoNeg, 'PNG', ML, 8.5, 42, 42 * 176 / 520);
  font('bold', 15.5, C.white); doc.text(clean('Plan de reemplazos del hato lechero'), W - MR, 14.5, {align:'right'});
  font('normal', 9.5, C.light); doc.text(clean(metaLine), W - MR, 21.5, {align:'right'});
  let y = 41;

  const newPage = () => { doc.addPage(); y = TOP2 + 2; };
  const ensure = need => { if (y + need > H - BOT) newPage(); };
  const para = (text, size = 9.5, color = C.navy, style = 'normal', width = CW, x = ML, lh = 1.38) => {
    font(style, size, color);
    const lines = doc.splitTextToSize(clean(text), width);
    const step = size * 0.3528 * lh;
    ensure(lines.length * step);
    lines.forEach(l => { doc.text(l, x, y + size * 0.3528); y += step; });
    return lines.length * step;
  };
  const h2 = (text, need = 30) => {
    ensure(need + 9);
    font('bold', 12, C.navy); doc.text(clean(text), ML, y + 4.5);
    doc.setDrawColor(...C.green); doc.setLineWidth(0.7);
    doc.line(ML, y + 6.6, ML + doc.getTextWidth(clean(text)), y + 6.6);
    y += 10;
  };

  /* ---------- tablas ---------- */
  const tbl = (opts) => {
    doc.autoTable(Object.assign({
      startY:y, margin:{left:ML, right:MR, top:TOP2 + 2, bottom:BOT},
      theme:'plain', rowPageBreak:'avoid',
      styles:{font:FN, fontSize:8.4, textColor:C.navy, cellPadding:{top:1.5, bottom:1.5, left:2, right:2}, lineColor:C.line, valign:'middle', overflow:'linebreak'},
      headStyles:{fillColor:C.navy, textColor:C.white, fontStyle:SB, fontSize:8, halign:'right'},
      bodyStyles:{lineWidth:{bottom:0.2}},
      alternateRowStyles:{fillColor:C.alt},
      didParseCell:d => { if (d.section === 'head' && d.column.index === 0) d.cell.styles.halign = 'left'; }
    }, opts));
    y = doc.lastAutoTable.finalY + 7;
  };
  const colorCell = (d, col) => { if (col) { d.cell.styles.textColor = col; d.cell.styles.fontStyle = 'bold'; } };

  /* ---------- informe del modo rápido: solo lo preguntado, resultados y supuestos ---------- */
  const box = (kind, title, text) => {
    const col = kind === 'bad' ? C.redT : kind === 'warn' ? [196, 128, 10] : C.green;
    const bg = kind === 'bad' ? [253, 237, 239] : kind === 'warn' ? [255, 247, 232] : [234, 247, 240];
    font('normal', 9.4); const lines = doc.splitTextToSize(clean(text), CW - 12);
    const hh = 6 + 5.2 + lines.length * 4.6 + 3;
    ensure(hh + 3);
    doc.setFillColor(...bg); doc.roundedRect(ML, y, CW, hh, 2, 2, 'F');
    doc.setFillColor(...col); doc.rect(ML, y, 1.4, hh, 'F');
    font('bold', 11, C.navy); doc.text(clean(title), ML + 6, y + 7.4);
    font('normal', 9.4, C.navy); lines.forEach((l, i) => doc.text(l, ML + 6, y + 12.8 + i * 4.6));
    y += hh + 4;
  };
  async function simpleBody(){
    const sr = rep.simple, p = rep.S.a;
    para(`${rep.finca ? rep.finca + ' · ' : ''}${sr.raza} · ${sr.herd}`, 9.5, C.muted);
    y += 1;
    para('Para sostener su hato, usted necesita:', 15, C.navy, 'bold');
    y += 2;
    const gap = 4, kw = (CW - gap * 2) / 3, kh = 25;
    sr.kpis.forEach(([v, l], i) => {
      const x = ML + i * (kw + gap);
      doc.setFillColor(...(i === 0 ? C.green : C.navy)); doc.roundedRect(x, y, kw, kh, 2.5, 2.5, 'F');
      font('bold', 22, C.white); doc.text(nf(v, 0), x + 5, y + 11.5);
      font('normal', 8.6, i === 0 ? [232, 246, 239] : C.light);
      doc.splitTextToSize(clean(l), kw - 10).forEach((t, k) => doc.text(t, x + 5, y + 17 + k * 3.6));
    });
    y += kh + 6;
    box(sr.verdict.kind, sr.verdict.title, sr.verdict.text);
    if (sr.invText) box(rep.inv.dA < -0.5 ? 'warn' : 'ok', 'Inventario de hoy', sr.invText);

    h2('¿Cuántas hembras debe tener en cada grupo?', 50);
    const hasHoy = sr.groups.some(g => g.hoy !== null);
    const gHead = ['Grupo', 'Edad', 'Necesita', 'Meta'].concat(hasHoy ? ['Hoy tiene'] : []);
    tbl({head:[gHead], pageBreak:'avoid',
         body:sr.groups.map(g => [g.name, g.desc, nf(g.need, 0), nf(g.meta, 0)].concat(hasHoy ? [g.hoy === null ? '–' : nf(g.hoy, 0)] : []).map(clean)),
         foot:[['Total', '', nf(ra.IR, 0), nf(rm.IR, 0)].concat(hasHoy ? [rep.inv.n ? nf(rep.inv.total, 0) : '–'] : [])], showFoot:'lastPage',
         footStyles:{fontStyle:'bold', fillColor:C.white, textColor:C.navy, halign:'right', lineWidth:{top:0.5}, lineColor:C.green},
         columnStyles:{0:{halign:'left', cellWidth:46}, 1:{halign:'left', textColor:C.muted}, 2:{halign:'right', cellWidth:22, fontStyle:'bold'}, 3:{halign:'right', cellWidth:22, fillColor:[240, 249, 244]}, 4:{halign:'right', cellWidth:22}},
         didParseCell:d => {
           if (d.column.index <= 1) d.cell.styles.halign = 'left';
           if (d.column.index === 0 && d.section === 'body') d.cell.styles.cellPadding = {top:1.5, bottom:1.5, left:6, right:2};
           if (d.section === 'body' && d.column.index === 4 && hasHoy) { const g = sr.groups[d.row.index]; if (g.hoy !== null && g.hoy < g.need) colorCell(d, C.redT); }
         },
         didDrawCell:d => { if (d.section === 'body' && d.column.index === 0) { doc.setFillColor(...hex(sr.groups[d.row.index].color)); doc.rect(d.cell.x + 1.6, d.cell.y + d.cell.height / 2 - 1.3, 2.6, 2.6, 'F'); } }});

    h2('Semáforo de sus indicadores', DIAG.length * 6.2 + 12);
    const sts = DIAG.map(d => d.st(d.v(ra, p), p));
    tbl({head:[['Indicador', 'Su valor', 'Estado', 'Referencia']], pageBreak:'avoid',
         body:DIAG.map((d, i) => [d.l, d.f(d.v(ra, p)), WORD[sts[i]], d.ref].map(clean)),
         columnStyles:{0:{halign:'left', cellWidth:58}, 1:{halign:'right', cellWidth:27}, 2:{halign:'left', cellWidth:52}, 3:{halign:'left', textColor:C.muted}},
         didParseCell:d => {
           if (d.column.index !== 1) d.cell.styles.halign = 'left';
           if (d.section === 'body' && d.column.index === 2) { d.cell.styles.cellPadding = {top:1.5, bottom:1.5, left:7, right:2}; d.cell.styles.fontStyle = SB; }
         },
         didDrawCell:d => { if (d.section === 'body' && d.column.index === 2) { doc.setFillColor(...hex(DOT[sts[d.row.index]])); doc.circle(d.cell.x + 3.6, d.cell.y + d.cell.height / 2, 1.5, 'F'); } }});

    h2('¿Qué gana si llega a la meta?', 40);
    tbl({head:[['', 'Hoy', 'Meta']], pageBreak:'avoid', body:sr.meta.map(r => r.map(clean)),
         columnStyles:{0:{halign:'left', cellWidth:96}, 1:{halign:'right'}, 2:{halign:'right', fillColor:[240, 249, 244]}},
         didParseCell:d => { if (d.section === 'body' && d.row.index === sr.meta.length - 1) d.cell.styles.fontStyle = 'bold'; }});
    y -= 4;
    para(sr.dI > 0 ? `Con la meta mantendría ${nf(sr.dI, 0)} animales menos en levante para sostener el mismo hato.` : 'Con la meta el levante no se reduce.', 9, C.navy);
    y += 5;

    h2('Sus datos', 50);
    tbl({head:[['Dato', 'Valor']], pageBreak:'avoid', body:sr.entered.map(r => r.map(clean)),
         columnStyles:{0:{halign:'left', cellWidth:96}, 1:{halign:'left'}},
         didParseCell:d => { d.cell.styles.halign = 'left'; }});
    y -= 3;
    para(sr.assumptions, 7.8, C.muted);
    y += 2;
    para('Herramienta de apoyo a la decisión. No reemplaza el criterio del médico veterinario o del zootecnista. Este informe se generó en el dispositivo del usuario: Datavet no recibe ni guarda los datos de la finca. © 2026 Datavet. Todos los derechos reservados.', 7.8, C.muted);
  }

  if (rep.mode === 'simple' && rep.simple) await simpleBody();
  else {
    /* ---------- titular ---------- */
    para((rep.finca ? rep.finca + '. ' : '') + rep.lead, 13, C.navy, 'bold', CW, ML, 1.3);
    y += 1.5;
    para(`Para sostener el hato se necesitan ${nf(ra.C, 0)} novillas paridas por año en el escenario actual y ${nf(rm.C, 0)} en la meta. Balance de terneras hembras: ${sgn(ra.balR, 0)} por año en el actual y ${sgn(rm.balR, 0)} en la meta.`, 9.5, C.muted);
    y += 4;

    /* ---------- tarjetas ---------- */
    const kpis = [
      ['Vacas adultas totales', ra.T, rm.T],
      ['Novillas paridas por año', ra.C, rm.C],
      ['Terneras a criar por año', ra.HR, rm.HR],
      ['Novillas en levante', ra.IR, rm.IR]
    ];
    const gap = 3.5, kw = (CW - gap * 3) / 4, kh = 20;
    kpis.forEach(([l, a, m], i) => {
      const x = ML + i * (kw + gap);
      doc.setFillColor(...(i === 3 ? C.navy : C.wash)); doc.roundedRect(x, y, kw, kh, 2, 2, 'F');
      doc.setFillColor(...C.green); doc.rect(x, y + 2, 1.1, kh - 4, 'F');
      font('normal', 8, i === 3 ? C.light : C.muted); doc.text(clean(l), x + 4, y + 5.6);
      font('bold', 17, i === 3 ? C.white : C.navy); doc.text(nf(a, 0), x + 4, y + 13.2);
      font('normal', 8.2, i === 3 ? [102, 190, 143] : C.greenT); doc.text(clean(`Meta: ${nf(m, 0)}`), x + 4, y + 17.6);
    });
    y += kh + 6;

    /* ---------- tubería ---------- */
    h2('Tubería de levante, escenario actual', 62);
    const png = await window.DVC.svgToPng(rep.pipeSvg('a'));
    const ph = CW * 280 / 960;
    doc.addImage(png, 'PNG', ML, y - 2, CW, ph);
    y += ph - 1;
    let lx = ML;
    STAGES.forEach(s => {
      doc.setFillColor(...hex(s.color)); doc.rect(lx, y - 2.4, 2.8, 2.8, 'F');
      font('normal', 7.6, C.navy); const t = clean(s.full); doc.text(t, lx + 4, y);
      lx += 4 + doc.getTextWidth(t) + 5;
    });
    y += 4;
    para('El área de cada tramo equivale a las novillas de esa etapa: el largo es la duración en meses y el alto, las terneras de cada cohorte anual que siguen en el levante. La línea punteada es la meta.', 7.6, C.muted);
    y += 5;

    /* Semen */
    h2('Terneras disponibles y estrategia de semen', 40);
    {
      const colW = (CW - 8) / 2, y0 = y;
      let yEnd = y;
      [['a', 'Actual', ML], ['m', 'Meta', ML + colW + 8]].forEach(([k, name, x]) => {
        y = y0;
        font('bold', 10, k === 'a' ? C.navy : C.greenT); doc.text(name, x, y + 3.5); y += 6;
        rep.semen[k].forEach(t => {
          const col = t.kind === 'bad' ? C.redT : t.kind === 'warn' ? [138, 90, 0] : C.navy;
          if (t.kind !== 'p') { doc.setFillColor(...(t.kind === 'bad' ? C.redT : [245, 166, 35])); }
          const y1 = y;
          para(t.text, 8.6, col, 'normal', colW - (t.kind !== 'p' ? 3 : 0), x + (t.kind !== 'p' ? 3 : 0));
          if (t.kind !== 'p') doc.rect(x, y1, 1, y - y1, 'F');
          y += 1.6;
        });
        yEnd = Math.max(yEnd, y);
      });
      y = yEnd + 5;
    }

    /* Resumen */
    h2('Resumen del plan', SUM.length * 5.1 + 7);
    const dirs = [];
    const sumBody = SUM.map(([l, f, dd, dir, signed]) => {
      let a = f(ra), m = f(rm);
      if (dd === 0) { a = Math.round(a); m = Math.round(m); }
      const df = m - a; dirs.push(Math.abs(df) < 1e-6 || !dir ? 0 : (df * dir > 0 ? 1 : -1));
      const cell = v => dd === '$' ? money(v) : (signed ? sgn(v, dd) : nf(v, dd));
      const dt = dd === '$' ? (df > 0 ? '+' : df < 0 ? '−' : '') + money(Math.abs(df)) : sgn(df, dd);
      return [l, cell(a), cell(m), dt].map(clean);
    });
    tbl({head:[['Indicador', 'Actual', 'Meta', 'Diferencia']], body:sumBody, pageBreak:'avoid',
         styles:{font:FN, fontSize:8.1, textColor:C.navy, cellPadding:{top:0.95, bottom:0.95, left:2, right:2}, lineColor:C.line, valign:'middle'},
         columnStyles:{0:{halign:'left', cellWidth:88}, 1:{halign:'right', fillColor:[243, 246, 251]}, 2:{halign:'right', fillColor:[240, 249, 244]}, 3:{halign:'right'}},
         didParseCell:d => {
           if (d.section === 'head' && d.column.index === 0) d.cell.styles.halign = 'left';
           if (d.section === 'body' && d.column.index === 3) colorCell(d, dirs[d.row.index] > 0 ? C.greenT : dirs[d.row.index] < 0 ? C.redT : null);
           if (d.section === 'body' && (d.column.index === 1 || d.column.index === 2) && d.row.index % 2) d.cell.styles.fillColor = d.column.index === 1 ? [233, 238, 246] : [227, 243, 234];
         }});

    /* Inventario */
    h2('Inventario por etapa', 62);
    const per = s => s.d > 0 ? `${nf(+s.a0.toFixed(1), s.a0 % 1 ? 1 : 0)}–${nf(+s.a1.toFixed(1), s.a1 % 1 ? 1 : 0)}` : 'no aplica';
    const invBody = ra.st.map((s, i) => {
      const r = rep.inv.rows[i];
      return [STAGES[i].full, per(s), per(rm.st[i]), nf(s.invR, 0), nf(rm.st[i].invR, 0), r.has ? nf(r.v, 0) : '–', r.has ? sgn(r.dA, 0) : '–', r.has ? sgn(r.dM, 0) : '–', money(s.cost)].map(clean);
    });
    const invFoot = ['Total', `0–${nf(+ra.ageEnd.toFixed(1), ra.ageEnd % 1 ? 1 : 0)}`, `0–${nf(+rm.ageEnd.toFixed(1), rm.ageEnd % 1 ? 1 : 0)}`, nf(ra.IR, 0), nf(rm.IR, 0),
                     rep.inv.n ? nf(rep.inv.total, 0) : '–', rep.inv.n ? sgn(rep.inv.dA, 0) : '–', rep.inv.n ? sgn(rep.inv.dM, 0) : '–', money(ra.st.reduce((a, s) => a + s.cost, 0))].map(clean);
    const negs = [...rep.inv.rows.map(r => r.has ? [r.dA, r.dM] : [0, 0]), [rep.inv.dA, rep.inv.dM]];
    tbl({head:[['Etapa', 'Período actual (meses)', 'Período meta (meses)', 'Requeridas, actual', 'Requeridas, meta', 'Hay hoy', 'Hoy − actual', 'Hoy − meta', 'Costo anual, actual'].map(clean)],
         body:invBody, foot:[invFoot], showFoot:'lastPage',
         styles:{font:FN, fontSize:7.8, textColor:C.navy, cellPadding:{top:1.4, bottom:1.4, left:1.6, right:1.6}, lineColor:C.line, valign:'middle'},
         headStyles:{fillColor:C.navy, textColor:C.white, fontStyle:SB, fontSize:7.2, halign:'right'},
         footStyles:{fontStyle:'bold', fillColor:C.white, textColor:C.navy, halign:'right', lineWidth:{top:0.5}, lineColor:C.green},
         columnStyles:{0:{halign:'left', cellWidth:40}, 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right', fillColor:[243, 246, 251]}, 4:{halign:'right', fillColor:[240, 249, 244]}, 5:{halign:'right'}, 6:{halign:'right'}, 7:{halign:'right'}, 8:{halign:'right', cellWidth:27}},
         didParseCell:d => {
           if (d.column.index === 0) d.cell.styles.halign = 'left';
           if (d.column.index === 0 && d.section === 'body') d.cell.styles.cellPadding = {top:1.4, bottom:1.4, left:5, right:1.6};
           if ((d.section === 'body' || d.section === 'foot') && (d.column.index === 6 || d.column.index === 7)) {
             const v = negs[d.section === 'foot' ? 5 : d.row.index][d.column.index - 6];
             colorCell(d, v < -0.05 ? C.redT : null);
           }
         },
         didDrawCell:d => {
           if (d.section === 'body' && d.column.index === 0) { doc.setFillColor(...hex(STAGES[d.row.index].color)); doc.rect(d.cell.x + 1.5, d.cell.y + d.cell.height / 2 - 1.3, 2.6, 2.6, 'F'); }
         }});
    if (rep.inv.n) para(rep.inv.n === 5
        ? `Hoy hay ${nf(rep.inv.total, 0)} novillas. La meta requiere ${nf(rm.IR, 0)}: ${rep.inv.dM >= 0 ? 'sobran' : 'faltan'} ${nf(Math.abs(rep.inv.dM), 0)} frente a la meta y ${rep.inv.dA >= 0 ? 'sobran' : 'faltan'} ${nf(Math.abs(rep.inv.dA), 0)} frente al escenario actual.`
        : `Hay datos de inventario en ${rep.inv.n} de 5 etapas; las diferencias del total solo cuentan las etapas con dato.`, 8.5, C.navy), y += 4;

    /* Diagnóstico */
    h2('Diagnóstico frente a referencias', DIAG.length * 6.2 + 16);
    [['g', 0], ['y', 1], ['r', 2]].reduce((x, [k]) => {
      doc.setFillColor(...hex(DOT[k])); doc.circle(x + 1.3, y - 1, 1.3, 'F');
      font('normal', 8, C.muted); doc.text(WORD[k], x + 4, y);
      return x + 8 + doc.getTextWidth(WORD[k]);
    }, ML);
    y += 4;
    const sts = [];
    const diagBody = DIAG.map(d => {
      const va = d.v(ra, rep.S.a), vm = d.v(rm, rep.S.m);
      sts.push([d.st(va, rep.S.a), d.st(vm, rep.S.m)]);
      return [d.l, d.f(va), d.f(vm), d.ref].map(clean);
    });
    tbl({head:[['Indicador', 'Actual', 'Meta', 'Referencia']], body:diagBody, pageBreak:'avoid',
         columnStyles:{0:{halign:'left', cellWidth:70}, 1:{halign:'left', cellWidth:28}, 2:{halign:'left', cellWidth:28}, 3:{halign:'left'}},
         didParseCell:d => {
           d.cell.styles.halign = 'left';
           if (d.section === 'body' && (d.column.index === 1 || d.column.index === 2)) d.cell.styles.cellPadding = {top:1.5, bottom:1.5, left:6.5, right:2};
           if (d.section === 'body' && d.column.index === 3) d.cell.styles.textColor = C.muted;
         },
         didDrawCell:d => {
           if (d.section === 'body' && (d.column.index === 1 || d.column.index === 2)) {
             doc.setFillColor(...hex(DOT[sts[d.row.index][d.column.index - 1]]));
             doc.circle(d.cell.x + 3.4, d.cell.y + d.cell.height / 2, 1.35, 'F');
           }
         }});
    /* Parámetros: dos columnas para ahorrar espacio */
    const blocks = []; rep.params.forEach(p => { if (p.g) blocks.push({g:p.g, rows:[]}); else blocks[blocks.length - 1].rows.push(p); });
    const halves = [[0, 1, 3], [2, 4]].map(ix => ix.map(i => blocks[i]).filter(Boolean));
    const rowsOf = h => h.reduce((a, bl) => a + bl.rows.length + 1, 0);
    h2('Parámetros usados', Math.max(...halves.map(rowsOf)) * 4.6 + 8);
    {
      const y0 = y, colW = (CW - 6) / 2; let yMax = y;
      halves.forEach((half, k) => {
        const groups = [], body = [];
        half.forEach(bl => { groups.push(body.length); body.push([{content:clean(bl.g), colSpan:3}]); bl.rows.forEach(p => body.push([p.l, String(p.a), String(p.m)].map(clean))); });
        y = y0;
        tbl({head:[['Parámetro', 'Actual', 'Meta']], body, pageBreak:'avoid',
             margin:{left:ML + k * (colW + 6), right:k ? MR : MR + colW + 6, top:TOP2 + 2, bottom:BOT}, tableWidth:colW,
             styles:{font:FN, fontSize:7.6, textColor:C.navy, cellPadding:{top:0.8, bottom:0.8, left:1.8, right:1.8}, lineColor:C.line},
             columnStyles:{0:{halign:'left'}, 1:{halign:'right', cellWidth:20, fillColor:[243, 246, 251]}, 2:{halign:'right', cellWidth:18, fillColor:[240, 249, 244]}},
             alternateRowStyles:{},
             didParseCell:d => {
               if (d.section === 'head' && d.column.index === 0) d.cell.styles.halign = 'left';
               if (d.section === 'body' && groups.includes(d.row.index)) Object.assign(d.cell.styles, {fontStyle:SB, textColor:C.greenT, fillColor:C.white, halign:'left', lineWidth:{bottom:0.35}, lineColor:C.green});
             }});
        yMax = Math.max(yMax, y);
      });
      y = yMax;
    }

    /* Método y aviso */
    h2('Cómo calcula', 30);
    [
      'Vacas adultas totales = vacas en ordeño + vacas secas. Si no se ingresan las vacas secas, se estiman con la proporción en ordeño = (IEP × 30,4 − días secos) ÷ (IEP × 30,4).',
      'Novillas paridas necesarias por año = vacas totales × tasa de descarte anual. Terneras a criar = novillas necesarias ÷ supervivencia acumulada del levante.',
      'Inventario de cada etapa = terneras que entran × duración en años × supervivencia media de la etapa. Gestación fija de 9 meses.',
      'Terneras hembras nacidas vivas = partos × (1 − mortinatos) × (0,90 × % sexado + 0,50 × % convencional). El semen de carne no aporta reemplazos.',
      'Costo anual del levante = Σ inventario de la etapa × costo diario × 365.'
    ].forEach(t => { para('•  ' + t, 8.2, C.navy); y += 0.6; });
    y += 2;
    para('Herramienta de apoyo a la decisión. No reemplaza el criterio del médico veterinario o del zootecnista. Este informe se generó en el dispositivo del usuario: Datavet no recibe ni guarda los datos de la finca. © 2026 Datavet. Todos los derechos reservados.', 8, C.muted, 'normal');
  }

  /* ---------- encabezado (páginas 2+) y pie en todas ---------- */
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.addImage(logoCol, 'PNG', ML, 9, 28, 28 * 159 / 640);
      font('normal', 8.3, C.muted); doc.text(clean('Plan de reemplazos del hato lechero · ' + metaLine), W - MR, 14, {align:'right'});
      doc.setDrawColor(...C.green); doc.setLineWidth(0.6); doc.line(ML, 18.5, W - MR, 18.5);
    }
    doc.setDrawColor(...C.green); doc.setLineWidth(0.4); doc.line(ML, H - 19, W - MR, H - 19);
    const [l1, l2] = window.DVC.FOOTER_LINES.map(clean);
    const [name, role] = l1.split(' — '), cut = l2.indexOf(' · ivan');
    font('semibold', 6.9, C.navy); doc.text(name, ML, H - 15);
    font('normal', 6.9, C.muted); doc.text(' — ' + role, ML + doc.getTextWidth(name), H - 15);
    doc.text(l2.slice(0, cut), ML, H - 11.6);
    doc.text(l2.slice(cut + 3), ML, H - 8.2);
    font('bold', 7.6, C.navy);
    doc.text(`Página ${p} de ${n}`, W - MR, H - 11.6, {align:'right'});
  }

  window.DVC.saveBlob(doc.output('blob'), fileName);
  return doc;
}

window.DVP = {exportPdf};
})();
