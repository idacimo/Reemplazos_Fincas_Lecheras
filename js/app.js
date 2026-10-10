/* Plan de reemplazos | Datavet — interfaz (modo rápido y modo completo) */
'use strict';
const {STAGES, CURRENCIES, PRESET, DEF, ROWS, COSTROWS, FEM_SX, nf, sgn, toIn, symOf, parse, compute, convertCosts,
       SUM, DIAG, WORD} = window.RM;

const STORE = 'datavet-reemplazos-v2';
const clone = o => JSON.parse(JSON.stringify(o));
let S = clone(DEF);
let real = ['', '', '', '', ''];
let finca = '';
let view = 'a';
let mode = 'simple';
let step = 1;
let LAST = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sym = () => symOf(S.sh.mon);
const money = (x, d = 0) => `${sym()}\u00a0${nf(x, d)}`;
const pct = x => nf(x * 100, 0) + ' %';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

/* ---------- guardar en el dispositivo (solo comodidad; si falla, la página funciona igual) ---------- */
function save(){
  try { localStorage.setItem(STORE, JSON.stringify({S, real, finca, mode})); } catch (e) { /* sin almacenamiento */ }
}
function load(){
  try {
    const o = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (o && o.S && o.S.a && o.S.m && o.S.sh) {
      S = {a:{...DEF.a, ...o.S.a}, m:{...DEF.m, ...o.S.m}, sh:{...DEF.sh, ...o.S.sh}};
      if (Array.isArray(o.real) && o.real.length === 5) real = o.real.map(String);
      finca = typeof o.finca === 'string' ? o.finca : '';
      if (o.mode === 'full' || o.mode === 'simple') mode = o.mode;
    }
  } catch (e) { /* datos dañados: se usan los de ejemplo */ }
}

function toast(msg, err = false, ms = 3200){
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms);
}

/* ====================================================================== */
/* Gráfica de tubería (SVG). Se usa en pantalla y en las descargas.         */
/* ====================================================================== */
function outline(r, X, Hh, yc){
  const top = [], bot = [];
  top.push(`${X(0)},${yc - Hh(r.H) / 2}`); bot.push(`${X(0)},${yc + Hh(r.H) / 2}`);
  r.st.forEach(s => { if (s.d > 0) { top.push(`${X(s.a1)},${yc - Hh(s.e1) / 2}`); bot.push(`${X(s.a1)},${yc + Hh(s.e1) / 2}`); } });
  return top.concat(bot.reverse()).join(' ');
}
function pipeSvg(sel, oth, selName, othName, pSel){
  const W = 960, Ht = 280, ml = 92, mr = 236, mt = 44, mb = 44;
  const cw = W - ml - mr, ch = Ht - mt - mb, yc = mt + ch / 2;
  const xmax = Math.max(sel.ageEnd, oth.ageEnd, 1);
  const ymax = Math.max(sel.H, oth.H, 1);
  const X = a => ml + a / xmax * cw;
  const Hh = n => isFinite(n) ? n / ymax * ch : 0;
  let g = `<text x="${ml}" y="20" font-size="15" font-weight="500" fill="#07193F">Escenario ${selName}: ${nf(sel.IR, 0)} novillas en levante</text>`;
  for (let a = 0; a <= xmax + 1e-6; a += 3) {
    g += `<line x1="${X(a)}" x2="${X(a)}" y1="${mt + ch + 5}" y2="${mt + ch + 10}" stroke="#9AA6B8"/>` +
         `<text x="${X(a)}" y="${mt + ch + 25}" font-size="12" text-anchor="middle" fill="#4F5B73">${a}</text>`;
  }
  g += `<text x="${X(0) - 10}" y="${mt + ch + 25}" font-size="12" text-anchor="end" fill="#4F5B73">meses</text>`;
  sel.st.forEach((s, i) => {
    if (s.d <= 0) return;
    const x0 = X(s.a0), x1 = X(s.a1), h0 = Hh(s.e0) / 2, h1 = Hh(s.e1) / 2, w = x1 - x0;
    g += `<polygon points="${x0},${yc - h0} ${x1},${yc - h1} ${x1},${yc + h1} ${x0},${yc + h0}" fill="${STAGES[i].color}" stroke="#fff" stroke-width="1.5"><title>${STAGES[i].full}: ${nf(s.invR, 0)} novillas, de ${toIn(+s.a0.toFixed(1))} a ${toIn(+s.a1.toFixed(1))} meses</title></polygon>`;
    if (w >= 28) g += `<text x="${(x0 + x1) / 2}" y="${yc + 5}" text-anchor="middle" font-size="${w >= 64 ? 16 : 12.5}" font-weight="700" fill="${STAGES[i].txt}" pointer-events="none">${nf(s.invR, 0)}</text>`;
  });
  if (oth) {
    g += `<polygon points="${outline(oth, X, Hh, yc)}" fill="none" stroke="#07193F" stroke-width="1.6" stroke-dasharray="6 5" opacity=".75"/>`;
    g += `<text x="${X(oth.ageEnd) + 6}" y="${yc - Hh(oth.st[4].e1) / 2 - 6}" font-size="12" fill="#07193F" opacity=".85">${othName}</text>`;
  }
  g += `<text x="${X(0) - 10}" y="${yc - 2}" text-anchor="end" font-size="17" font-weight="700" fill="#07193F">${nf(sel.HR, 0)}</text>` +
       `<text x="${X(0) - 10}" y="${yc + 15}" text-anchor="end" font-size="12" fill="#4F5B73">terneras/año</text>`;
  const bx = W - mr + 90, bw = mr - 94, bh = 92;
  const xe = X(sel.ageEnd) + 4;
  g += `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#209B6C"/></marker></defs>`;
  g += `<line x1="${xe}" y1="${yc}" x2="${bx - 4}" y2="${yc}" stroke="#209B6C" stroke-width="2.5" marker-end="url(#ar)"/>`;
  g += `<text x="${bx - 46}" y="${yc - 10}" text-anchor="middle" font-size="13" font-weight="700" fill="#17784F">${nf(sel.C, 0)}</text>` +
       `<text x="${bx - 46}" y="${yc + 20}" text-anchor="middle" font-size="11.5" fill="#4F5B73">paridas/año</text>`;
  g += `<rect x="${bx}" y="${yc - bh / 2}" width="${bw}" height="${bh}" rx="6" fill="#07193F"/>` +
       `<text x="${bx + 14}" y="${yc - 18}" font-size="12.5" fill="#B9C7DA">Hato adulto</text>` +
       `<text x="${bx + 14}" y="${yc + 6}" font-size="20" font-weight="700" fill="#fff">${nf(sel.T, 0)} vacas</text>` +
       `<text x="${bx + 14}" y="${yc + 26}" font-size="12.5" fill="#66BE8F">${nf(pSel.M, 0)} en ordeño</text>`;
  return g;
}

/* ====================================================================== */
/* Modo completo                                                          */
/* ====================================================================== */
function buildFull(){
  $('#params tbody').innerHTML = ROWS.map(r => {
    if (r.g) return `<tr class="grp"><th colspan="3" scope="colgroup">${r.g}</th></tr>`;
    let h = `<tr><td>${r.l} <small>${r.u || ''}</small></td>`;
    for (const sc of ['a', 'm']) {
      const lab = `${r.l}, ${sc === 'a' ? 'actual' : 'meta'}`;
      if (r.type === 'sel') h += `<td class="${sc}"><select data-s="${sc}" data-k="${r.k}" aria-label="${lab}"><option>Holstein</option><option>Jersey</option><option>Otra</option></select></td>`;
      else if (r.type === 'calc') h += `<td class="${sc}"><span class="calc" id="conv-${sc}"></span></td>`;
      else h += `<td class="${sc}"><input inputmode="decimal" autocomplete="off" data-s="${sc}" data-k="${r.k}" aria-label="${lab}"></td>`;
    }
    return h + '</tr>';
  }).join('');
  $('#costs tbody').innerHTML = `<tr class="grp"><th colspan="2" id="costHead">Costo por novilla por día</th></tr>
    <tr><td><label for="cursel">Moneda</label></td><td><select id="cursel" style="width:190px">${CURRENCIES.map(c => `<option value="${c[0]}">${c[1]} (${c[2]})</option>`).join('')}<option value="__otra">Otra…</option></select></td></tr>
    <tr id="monRow" style="display:none"><td><small><label for="mon">Símbolo o código de la moneda</label></small></td><td><input id="mon" autocomplete="off" maxlength="6" placeholder="Ej. L" style="text-align:left"></td></tr>
    <tr class="noprint"><td><small><label for="rate" id="rateLab">Valor de 1 USD en esta moneda</label></small></td><td><input id="rate" inputmode="decimal" autocomplete="off" placeholder="Ej. 3.200"></td></tr>
    <tr class="noprint"><td colspan="2"><button type="button" class="btn line" id="conv">Convertir costos de ejemplo con esta tasa</button></td></tr>
    <tr class="noprint" id="curWarnRow" style="display:none"><td colspan="2"><div class="alert warn" id="curWarn" style="text-align:left;font-size:13px"></div></td></tr>` +
    COSTROWS.map(r => `<tr><td>${r.l} <small>por día</small></td><td><input inputmode="decimal" autocomplete="off" data-c="${r.k}" aria-label="Costo diario, ${r.l}"></td></tr>`).join('');

  $('#stages').innerHTML = `<thead><tr><th scope="col">Etapa</th><th scope="col">Período actual (meses de edad)</th><th scope="col">Período meta (meses de edad)</th><th scope="col">Requeridas, actual</th><th scope="col">Requeridas, meta</th><th scope="col">Hay hoy</th><th scope="col">Hoy − actual</th><th scope="col">Hoy − meta</th><th scope="col">Costo anual, actual</th></tr></thead>
    <tbody>${STAGES.map((s, i) => `<tr><td><span class="sw" style="background:${s.color}"></span>${s.full}</td><td id="sa${i}"></td><td id="sm${i}"></td><td id="ra${i}"></td><td id="rm${i}"></td><td class="in"><input inputmode="numeric" autocomplete="off" data-real="${i}" aria-label="Novillas hoy en ${s.full}"></td><td id="dfa${i}"></td><td id="dfm${i}"></td><td id="cs${i}"></td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td id="saT"></td><td id="smT"></td><td id="raT"></td><td id="rmT"></td><td id="reT"></td><td id="dfaT"></td><td id="dfmT"></td><td id="csT"></td></tr></tfoot>`;
  $('#legend').innerHTML = STAGES.map(s => `<span><span class="sw" style="background:${s.color};margin:0"></span>${s.full}</span>`).join('');
}

function updCur(){
  $('#costHead').textContent = `Costo por novilla por día, en ${sym()} (ambos escenarios)`;
  $('#rateLab').textContent = `Valor de 1 USD en ${sym()}`;
  const stale = S.sh.costCur !== S.sh.mon;
  $('#curWarnRow').style.display = stale ? '' : 'none';
  if (stale) $('#curWarn').textContent = `Los costos de abajo siguen en ${symOf(S.sh.costCur)} (${S.sh.costCur}). Escriba cuánto vale 1 USD en ${sym()} y pulse «Convertir», o escriba sus propios costos.`;
}
function syncCur(){
  const known = CURRENCIES.some(c => c[0] === S.sh.mon);
  $('#cursel').value = known ? S.sh.mon : '__otra';
  $('#monRow').style.display = known ? 'none' : '';
  $('#mon').value = known ? '' : S.sh.mon;
  updCur();
}
function fillFull(){
  $$('#params [data-k]').forEach(el => {
    const v = S[el.dataset.s][el.dataset.k];
    el.value = el.tagName === 'SELECT' ? v : toIn(v);
    el.classList.remove('bad');
  });
  syncCur();
  $('#rate').value = '';
  $$('#costs [data-c]').forEach(el => { el.value = toIn(S.sh[el.dataset.c]); el.classList.remove('bad'); });
  $$('[data-real]').forEach(el => { el.value = real[+el.dataset.real]; el.classList.remove('bad'); });
  $$('[data-bind=finca]').forEach(el => { el.value = finca; });
}

function renderFull(ra, rm){
  $('#conv-a').textContent = toIn(+(ra.cv * 100).toFixed(1));
  $('#conv-m').textContent = toIn(+(rm.cv * 100).toFixed(1));
  $('#errors').innerHTML = [...ra.errs.map(e => `<div class="alert"><b>Actual:</b> ${e}</div>`), ...rm.errs.map(e => `<div class="alert"><b>Meta:</b> ${e}</div>`)].join('');

  const dI = rm.IR - ra.IR, dC = rm.annual - ra.annual;
  const pre = finca ? `${esc(finca)}. ` : '';
  $('#lead').innerHTML = dI === 0
    ? `${pre}Los dos escenarios requieren ${nf(ra.IR, 0)} novillas en levante.`
    : `${pre}Con los parámetros meta, el levante pasa de ${nf(ra.IR, 0)} a ${nf(rm.IR, 0)} novillas (${sgn(dI, 0)}) y el costo anual ${dC <= 0 ? 'baja' : 'sube'} ${money(Math.abs(dC))}.`;
  $('#sub').textContent = `Para sostener el hato se necesitan ${nf(ra.C, 0)} novillas paridas por año en el escenario actual y ${nf(rm.C, 0)} en la meta. Balance de terneras hembras: ${sgn(ra.balR, 0)} por año en el actual y ${sgn(rm.balR, 0)} en la meta.`;
  $('#printMeta').textContent = [finca, fechaTxt(), `Moneda: ${S.sh.mon} (${sym()})`].filter(Boolean).join(' · ');

  const sel = view === 'a' ? ra : rm, oth = view === 'a' ? rm : ra;
  $('#pipe').innerHTML = pipeSvg(sel, oth, view === 'a' ? 'actual' : 'meta', view === 'a' ? 'Meta' : 'Actual', view === 'a' ? S.a : S.m);

  const cell = (v, d, signed) => d === '$' ? money(v) : (signed ? sgn(v, d) : nf(v, d));
  $('#sum').innerHTML = `<thead><tr><th scope="col">Indicador</th><th scope="col">Actual</th><th scope="col">Meta</th><th scope="col">Diferencia</th></tr></thead><tbody>` +
    SUM.map(([l, f, d, dir, signed]) => {
      let a = f(ra), m = f(rm);
      if (d === 0) { a = Math.round(a); m = Math.round(m); }
      const df = m - a;
      const cls = !dir || Math.abs(df) < 1e-6 ? '' : (df * dir > 0 ? 'up' : 'down');
      const dtxt = d === '$' ? (df > 0 ? '+' : df < 0 ? '−' : '') + money(Math.abs(df)) : sgn(df, d);
      return `<tr><td>${l}</td><td>${cell(a, d, signed)}</td><td>${cell(m, d, signed)}</td><td class="${cls}">${dtxt}</td></tr>`;
    }).join('') + '</tbody>';

  $('#semen').innerHTML = [['a', 'Actual', ra, S.a], ['m', 'Meta', rm, S.m]].map(([k, name, r, p]) =>
    `<div><h3 class="${k}">${name}</h3>${semenText(r, p).map(t => t.kind === 'p' ? `<p>${t.text}</p>` : `<div class="alert${t.kind === 'warn' ? ' warn' : ''}">${t.text}</div>`).join('')}</div>`).join('');

  const per = s => s.d > 0 ? `${toIn(+s.a0.toFixed(1))}–${toIn(+s.a1.toFixed(1))}` : 'no aplica';
  const setDf = (id, df) => { const el = document.getElementById(id); el.textContent = sgn(df, 0); el.className = df < -0.05 ? 'down' : ''; };
  const clrDf = id => { const el = document.getElementById(id); el.textContent = '–'; el.className = ''; };
  const inv = inventory(ra, rm);
  ra.st.forEach((s, i) => {
    const sm = rm.st[i];
    document.getElementById('sa' + i).textContent = per(s);
    document.getElementById('sm' + i).textContent = per(sm);
    document.getElementById('ra' + i).textContent = nf(s.invR, 0);
    document.getElementById('rm' + i).textContent = nf(sm.invR, 0);
    document.getElementById('cs' + i).textContent = money(s.cost);
    const row = inv.rows[i];
    if (row.has) { setDf('dfa' + i, row.dA); setDf('dfm' + i, row.dM); } else { clrDf('dfa' + i); clrDf('dfm' + i); }
  });
  $('#saT').textContent = `0–${toIn(+ra.ageEnd.toFixed(1))}`;
  $('#smT').textContent = `0–${toIn(+rm.ageEnd.toFixed(1))}`;
  $('#raT').textContent = nf(ra.IR, 0);
  $('#rmT').textContent = nf(rm.IR, 0);
  $('#reT').textContent = inv.n ? nf(inv.total, 0) : '–';
  $('#stages').classList.toggle('noinv', !inv.n);
  if (inv.n) { setDf('dfaT', inv.dA); setDf('dfmT', inv.dM); } else { clrDf('dfaT'); clrDf('dfmT'); }
  $('#csT').textContent = money(ra.st.reduce((a, s) => a + s.cost, 0));
  $('#stagesNote').innerHTML = inv.n
    ? (inv.n === 5
        ? `Hoy hay ${nf(inv.total, 0)} novillas (${nf(inv.total / S.a.M * 100, 0)} por cada 100 vacas en ordeño). La meta requiere ${nf(rm.IR, 0)} (${nf(rm.ratio, 0)} por cada 100): ${inv.dM >= 0 ? 'sobran' : 'faltan'} ${nf(Math.abs(inv.dM), 0)} frente a la meta y ${inv.dA >= 0 ? 'sobran' : 'faltan'} ${nf(Math.abs(inv.dA), 0)} frente al escenario actual.`
        : `Hay datos en ${inv.n} de 5 etapas; las diferencias del total solo cuentan las etapas con dato.`) +
      (inv.overCostM > 0 ? ` Mantener las novillas que exceden la meta cuesta ${money(inv.overCostM)} al año; esos animales se pueden vender o usar para crecer el hato.` : '') +
      ' Un valor negativo, en rojo, es una etapa con déficit frente a ese escenario: contrástelo con el balance de terneras.'
    : 'Escriba el inventario de hoy para compararlo con la meta. La columna de costo anual usa el inventario requerido del escenario actual.';

  $('#stageGuide').innerHTML = '<ul class="guide">' +
    STAGES.map((st, i) => `<li><span class="sw" style="background:${st.color}"></span><b>${st.full}.</b> ${st.desc} Período actual: ${per(ra.st[i])} meses de edad. Período meta: ${per(rm.st[i])}.</li>`).join('') + '</ul>';

  $('#diag').innerHTML = `<thead><tr><th scope="col">Indicador</th><th scope="col">Actual</th><th scope="col">Meta</th><th scope="col" style="text-align:left">Referencia</th></tr></thead><tbody>` +
    DIAG.map(d => {
      const out = [[ra, S.a], [rm, S.m]].map(([r, p]) => { const v = d.v(r, p), s = d.st(v, p); return `<td title="${WORD[s]}"><span class="dot ${s}" role="img" aria-label="${WORD[s]}"></span>${d.f(v)}</td>`; }).join('');
      return `<tr><td>${d.l}</td>${out}<td class="ref">${d.ref}</td></tr>`;
    }).join('') + '</tbody>';

  $('#paramsPrint').innerHTML = `<thead><tr><th scope="col">Parámetro</th><th scope="col">Actual</th><th scope="col">Meta</th></tr></thead><tbody>` +
    paramRows(ra, rm).map(r => r.g ? `<tr class="grp"><td colspan="3">${r.g}</td></tr>` : `<tr><td>${r.l}</td><td>${r.a}</td><td>${r.m}</td></tr>`).join('') + '</tbody>';
}

/* Filas de parámetros para impresión y descargas */
function paramRows(ra, rm){
  const out = [];
  ROWS.forEach(r => {
    if (r.g) { out.push({g:r.g}); return; }
    const l = r.u ? `${r.l} (${r.u})` : r.l;
    if (r.type === 'calc') out.push({l, a:toIn(+(ra.cv * 100).toFixed(1)), m:toIn(+(rm.cv * 100).toFixed(1)), va:ra.cv * 100, vm:rm.cv * 100, k:r.k, u:r.u});
    else if (r.type === 'sel') out.push({l, a:S.a[r.k], m:S.m[r.k], va:S.a[r.k], vm:S.m[r.k], k:r.k});
    else out.push({l, a:nf(S.a[r.k], S.a[r.k] % 1 ? 1 : 0), m:nf(S.m[r.k], S.m[r.k] % 1 ? 1 : 0), va:S.a[r.k], vm:S.m[r.k], k:r.k, u:r.u});
  });
  out.push({g:`Costo por novilla por día (${sym()})`});
  COSTROWS.forEach(r => out.push({l:r.l, a:money(S.sh[r.k], S.sh[r.k] % 1 ? 2 : 0), m:'Igual', va:S.sh[r.k], vm:S.sh[r.k], k:r.k, cost:true}));
  return out;
}

/* Inventario de hoy frente a lo requerido */
function inventory(ra, rm){
  const c = [S.sh.c1, S.sh.c2, S.sh.c3, S.sh.c4, S.sh.c5];
  let n = 0, total = 0, dA = 0, dM = 0, overCostM = 0;
  const rows = ra.st.map((s, i) => {
    const v = parse(real[i]), has = real[i] !== '' && isFinite(v);
    if (!has) return {has:false};
    const a = v - s.invR, m = v - rm.st[i].invR;
    n++; total += v; dA += a; dM += m;
    if (m > 0) overCostM += m * c[i] * 365;
    return {has:true, v, dA:a, dM:m};
  });
  return {rows, n, total, dA, dM, overCostM};
}

/* Textos de la estrategia de semen: [{kind:'p'|'warn'|'bad', text}] */
function semenText(r, p){
  const out = [];
  out.push({kind:'p', text:`Nacen ${nf(r.femR, 0)} terneras hembras vivas al año y se necesitan ${nf(r.HR, 0)}. El balance es de ${sgn(r.balR, 0)} terneras, equivalentes a ${sgn(Math.round(r.bal * r.Scum), 0)} novillas paridas por año.`});
  out.push({kind:'p', text:`Las hembras de reemplazo deben ser al menos el ${pct(r.need)} de los nacimientos vivos.`});
  if (r.need > FEM_SX) out.push({kind:'bad', text:'No alcanza ni con 100 % de semen sexado. Hay que bajar la tasa de descarte o las pérdidas del levante, o planear la compra de novillas.'});
  else if (r.bal < -0.05) {
    if (r.sReq <= 1 - p.cb / 100) out.push({kind:'warn', text:`Con ${nf(p.cb, 0)} % de semen de carne, el sexado debe subir al menos a ${pct(r.sReq)} de las preñeces para cubrir los reemplazos.`});
    else out.push({kind:'warn', text:`Con ${nf(p.cb, 0)} % de semen de carne no se alcanzan los reemplazos aunque el resto sea sexado. Hay que reducir el semen de carne; con 100 % sexado en lo que no es carne, bastaría ${pct(r.sMinBeef)} de sexado.`});
  } else out.push({kind:'p', text:`Hay margen. Con ${nf(p.sx, 0)} % de sexado se puede llevar hasta ${pct(r.bMax)} de las preñeces a semen de carne (hoy ${nf(p.cb, 0)} %). Si todo lo que no es sexado fuera carne, bastaría ${pct(r.sMinBeef)} de sexado.`});
  return out;
}

/* ====================================================================== */
/* Modo rápido                                                            */
/* ====================================================================== */
const SIMPLE_KEYS = ['M', 'IEP', 'EPP', 'TD', 'p1', 'sx', 'cb'];

function buildSimple(){
  $('#s-inv-grid').innerHTML = STAGES.map((s, i) =>
    `<div class="inv-row"><span class="sw" style="background:${s.color}"></span><label for="s-real${i}" style="flex:1">${s.simple}<small>${s.simpleDesc}</small></label><input id="s-real${i}" data-sreal="${i}" inputmode="numeric" autocomplete="off" placeholder="–"></div>`).join('');
}
function fillSimple(){
  SIMPLE_KEYS.forEach(k => { const el = $(`#s-${k}`); el.value = toIn(S.a[k]); el.classList.remove('bad'); });
  $$('#s-raza button').forEach(b => b.setAttribute('aria-checked', b.dataset.raza === S.a.raza ? 'true' : 'false'));
  $$('[data-sreal]').forEach(el => { el.value = real[+el.dataset.sreal]; });
  if (real.some(v => v !== '')) $('#s-inv').open = true;
  $$('[data-bind=finca]').forEach(el => { el.value = finca; });
}

/* En el modo rápido solo se pregunta la edad al primer parto; el primer servicio se fija 12 meses antes. */
function setSimple(k, v){
  S.a[k] = v;
  if (k === 'EPP') S.a.serv = Math.max(6, v - 12);
  if (k === 'M') S.m.M = v;
  if (k === 'sx' && S.a.sx + S.a.cb > 100) { S.a.cb = 100 - S.a.sx; $('#s-cb').value = toIn(S.a.cb); }
  if (k === 'cb' && S.a.sx + S.a.cb > 100) { S.a.sx = 100 - S.a.cb; $('#s-sx').value = toIn(S.a.sx); }
}
function setRaza(r){
  S.a.raza = r;
  S.m = {...clone(DEF.m), ...(PRESET[r] || {}), M:S.a.M, raza:r};
  $$('#s-raza button').forEach(b => b.setAttribute('aria-checked', b.dataset.raza === r ? 'true' : 'false'));
}

function goStep(n, focus = true){
  if (n === 3) {
    const ra = compute(S.a, S.sh);
    const bad = $$('.simple .stepper input.bad');
    if (bad.length) { bad[0].focus(); toast('Revise el dato marcado en rojo.', true); return; }
    if (ra.errs.length) { $('#s-errs').innerHTML = ra.errs.map(e => `<div class="alert">${e}</div>`).join(''); toast('Revise los datos antes de continuar.', true); return; }
  }
  step = n;
  $$('.simple .step').forEach(s => { s.hidden = +s.dataset.step !== n; });
  $$('.steps li').forEach(li => {
    const k = +li.dataset.step;
    if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.classList.toggle('done', k < n);
  });
  render();
  if (!focus) return;
  window.scrollTo({top:0, behavior:'smooth'});
  const h = $(`.simple .step[data-step="${n}"] .step-h, .simple .step[data-step="${n}"] .r-head h2`);
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({preventScroll:true}); }
}

function renderSimple(ra, rm){
  $('#s-conv').textContent = `Con semen convencional: ${toIn(+(ra.cv * 100).toFixed(0))} de cada 100. El semen sexado da cerca de 90 % de hembras; el convencional, 50 %.`;
  $('#h-EPP').textContent = S.a.raza === 'Jersey' ? 'Edad al primer parto. En Jersey lo ideal es entre 21 y 22 meses.' : 'Edad al primer parto. En Holstein lo ideal es entre 22 y 24 meses.';
  $('#s-errs').innerHTML = ra.errs.map(e => `<div class="alert">${e}</div>`).join('');
  if (step !== 3) return;

  const inv = inventory(ra, rm);
  let h = `<div class="r-head">
    <p>${finca ? esc(finca) + ' · ' : ''}${nf(S.a.M, 0)} vacas en ordeño · ${esc(S.a.raza === 'Otra' ? 'otra raza o cruce' : S.a.raza)}</p>
    <h2>Para sostener su hato, usted necesita:</h2>
    <div class="kpis">
      <div class="kpi hl"><b>${nf(ra.C, 0)}</b><span>novillas que paran cada año</span></div>
      <div class="kpi"><b>${nf(ra.HR, 0)}</b><span>terneras hembras para criar cada año</span></div>
      <div class="kpi"><b>${nf(ra.IR, 0)}</b><span>hembras de levante en la finca, siempre</span></div>
    </div></div>`;

  // ¿Le alcanzan las terneras?
  const sem = semenText(ra, S.a);
  if (ra.need > FEM_SX) {
    h += `<div class="verdict bad"><h3>No le alcanzan las terneras</h3><p>Nacen <b>${nf(ra.femR, 0)}</b> terneras hembras al año y necesita <b>${nf(ra.HR, 0)}</b>. ${sem[2].text}</p></div>`;
  } else if (ra.bal < -0.05) {
    h += `<div class="verdict ${ra.balR <= -3 ? 'bad' : 'warn'}"><h3>Le faltan ${nf(Math.abs(ra.balR), 0)} terneras hembras al año</h3><p>Nacen <b>${nf(ra.femR, 0)}</b> y necesita <b>${nf(ra.HR, 0)}</b>. ${sem[2].text}</p></div>`;
  } else {
    h += `<div class="verdict ok"><h3>Sus vacas producen suficientes terneras</h3><p>Nacen <b>${nf(ra.femR, 0)}</b> terneras hembras al año y necesita <b>${nf(ra.HR, 0)}</b>${ra.balR > 0 ? `: le sobran <b>${nf(ra.balR, 0)}</b>` : ''}. ${ra.bMax > S.a.cb / 100 + 0.005 ? `Puede llevar hasta el <b>${pct(ra.bMax)}</b> de las preñeces a semen de carne.` : ''}</p></div>`;
  }

  // Inventario de hoy
  if (inv.n) {
    const dA = Math.round(inv.dA);
    h += `<div class="verdict ${dA < 0 ? 'warn' : 'ok'}"><h3>Hoy tiene ${nf(inv.total, 0)} hembras de levante${inv.n < 5 ? ` <small>(${inv.n} de 5 grupos)</small>` : ''}</h3>
      <p>${dA === 0 ? 'Es justo lo que necesita.' : dA > 0 ? `Le sobran <b>${nf(dA, 0)}</b> frente a lo que necesita con sus indicadores actuales.` : `Le faltan <b>${nf(-dA, 0)}</b> frente a lo que necesita con sus indicadores actuales.`}
      Si llega a la meta, necesitaría <b>${nf(rm.IR, 0)}</b>.</p></div>`;
  }

  // Si llega a la meta
  const ahorro = ra.annual - rm.annual, dI = ra.IR - rm.IR;
  h += `<div class="card"><h3>¿Qué gana si llega a la meta?</h3>
    <table class="compare"><thead><tr><th scope="col"></th><th scope="col">Hoy</th><th scope="col">Meta</th></tr></thead><tbody>
      <tr><td>Edad al primer parto</td><td>${nf(S.a.EPP, S.a.EPP % 1 ? 1 : 0)} meses</td><td>${nf(S.m.EPP, 0)} meses</td></tr>
      <tr><td>Intervalo entre partos</td><td>${nf(S.a.IEP, 1)} meses</td><td>${nf(S.m.IEP, 1)} meses</td></tr>
      <tr><td>Muertes antes del destete</td><td>${nf(S.a.p1, 0)} de 100</td><td>${nf(S.m.p1, 0)} de 100</td></tr>
      <tr><td><b>Hembras de levante necesarias</b></td><td><b>${nf(ra.IR, 0)}</b></td><td><b>${nf(rm.IR, 0)}</b></td></tr>
      <tr><td>Costo del levante al año*</td><td>${money(ra.annual)}</td><td>${money(rm.annual)}</td></tr>
    </tbody></table>
    <p class="hint" style="margin:10px 0 0">${dI > 0 ? `Con la meta mantendría <b>${nf(dI, 0)} animales menos</b> en levante` : 'Con la meta el levante no se reduce'}${ahorro > 0 ? ` y ahorraría cerca de <b>${money(ahorro)} al año</b>` : ''}. *Con costos de referencia; ajústelos en el análisis completo.</p></div>`;

  // Semáforo
  h += `<div class="card"><h3>Semáforo de sus indicadores</h3><ul class="lights">` +
    DIAG.map(d => { const v = d.v(ra, S.a), s = d.st(v, S.a); return `<li><span class="dot ${s}" role="img" aria-label="${WORD[s]}"></span><span class="lt"><b>${d.l}</b><small>${WORD[s]} · Referencia: ${d.ref}</small></span><span class="lv">${d.f(v)}</span></li>`; }).join('') +
    `</ul></div>`;

  // Barras por etapa
  const max = Math.max(...ra.st.map(s => s.invR), ...rm.st.map(s => s.invR), ...inv.rows.map(r => r.has ? r.v : 0), 1);
  h += `<div class="card"><h3>¿Cuántas hembras debe tener en cada grupo?</h3>${ra.st.map((s, i) => {
    const r = inv.rows[i];
    const bar = (v, c, lab) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:52px;font-size:13px;color:#4F5B73">${lab}</span><span style="flex:1;background:#EEF1F4;border-radius:6px;height:16px;overflow:hidden"><span style="display:block;height:100%;width:${Math.max(0, v) / max * 100}%;background:${c};border-radius:6px"></span></span><b style="width:40px;text-align:right;font-variant-numeric:tabular-nums">${nf(v, 0)}</b></div>`;
    return `<div style="margin:0 0 12px"><div style="font-weight:500;margin-bottom:2px"><span class="sw" style="background:${STAGES[i].color}"></span>${STAGES[i].simple} <small style="color:#4F5B73;font-weight:400">· ${STAGES[i].simpleDesc.toLowerCase()}</small></div>` +
      bar(s.invR, '#07193F', 'Necesita') + bar(rm.st[i].invR, '#209B6C', 'Meta') + (r.has ? bar(r.v, '#F5A623', 'Hoy') : '') + '</div>';
  }).join('')}</div>`;

  $('#s-result').innerHTML = h;
}

/* ====================================================================== */
/* Render general y modos                                                 */
/* ====================================================================== */
function fechaTxt(){
  const f = $('#fecha').value;
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}
function render(){
  const ra = compute(S.a, S.sh), rm = compute(S.m, S.sh);
  LAST = {ra, rm};
  if (mode === 'full') renderFull(ra, rm); else renderSimple(ra, rm);
  save();
}

function setMode(m, push = true){
  mode = m;
  document.body.dataset.mode = m;
  $$('.modes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'));
  $$('[data-view]').forEach(v => { v.hidden = v.dataset.view !== m; });
  if (m === 'full') fillFull(); else fillSimple();
  if (push) history.replaceState(null, '', m === 'full' ? '#completo' : location.pathname + location.search);
  render();
}

/* Datos que usan las descargas (Excel y PDF) */
function report(){
  const ra = compute(S.a, S.sh), rm = compute(S.m, S.sh);
  return {S:clone(S), real:[...real], finca, fecha:$('#fecha').value, fechaTxt:fechaTxt(), mon:S.sh.mon, sym:sym(), mode,
          ra, rm, inv:inventory(ra, rm), params:paramRows(ra, rm), semen:{a:semenText(ra, S.a), m:semenText(rm, S.m)},
          pipeSvg:(which) => which === 'm' ? pipeSvg(rm, ra, 'meta', 'Actual', S.m) : pipeSvg(ra, rm, 'actual', 'Meta', S.a),
          lead:$('#lead') ? leadText(ra, rm) : ''};
}
function leadText(ra, rm){
  const dI = rm.IR - ra.IR, dC = rm.annual - ra.annual;
  return dI === 0 ? `Los dos escenarios requieren ${nf(ra.IR, 0)} novillas en levante.`
    : `Con los parámetros meta, el levante pasa de ${nf(ra.IR, 0)} a ${nf(rm.IR, 0)} novillas (${sgn(dI, 0)}) y el costo anual ${dC <= 0 ? 'baja' : 'sube'} ${money(Math.abs(dC))}.`;
}
function fileName(ext){
  const slug = finca.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `plan_reemplazos_${slug ? slug + '_' : ''}${$('#fecha').value || 'datavet'}.${ext}`;
}

/* Carga perezosa de librerías (solo al descargar) */
const loaded = {};
function loadScript(src){
  if (!loaded[src]) loaded[src] = new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok;
    s.onerror = () => { delete loaded[src]; ko(new Error('No se pudo cargar ' + src)); };
    document.head.appendChild(s);
  });
  return loaded[src];
}

async function download(kind, btn){
  const ra = compute(S.a, S.sh), rm = compute(S.m, S.sh);
  if (ra.errs.length || rm.errs.length) { toast('Hay datos por corregir antes de descargar.', true); return; }
  const btns = $$(`[data-action="${kind}"]`);
  btns.forEach(b => { b.disabled = true; });
  toast(kind === 'pdf' ? 'Preparando el PDF…' : 'Preparando el Excel…', false, 15000);
  try {
    if (kind === 'xlsx') await window.DVX.exportXlsx(report(), fileName('xlsx'), loadScript);
    else await window.DVP.exportPdf(report(), fileName('pdf'), loadScript);
    toast(kind === 'pdf' ? 'PDF descargado.' : 'Excel descargado.');
  } catch (e) {
    console.error(e);
    toast('No se pudo generar el archivo. Revise su conexión e inténtelo de nuevo.', true, 6000);
  } finally {
    btns.forEach(b => { b.disabled = false; });
  }
}

/* ---------- eventos ---------- */
function bind(){
  $$('.modes button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $$('[data-mode-go]').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.modeGo); window.scrollTo({top:0}); }));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.go)));
  $$('[data-action]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.action;
    if (a === 'print') window.print(); else download(a, b);
  }));
  $$('[data-bind=finca]').forEach(el => el.addEventListener('input', () => {
    finca = el.value.trim();
    $$('[data-bind=finca]').forEach(o => { if (o !== el) o.value = el.value; });
    render();
  }));

  // modo rápido
  $$('#s-raza button').forEach(b => b.addEventListener('click', () => { setRaza(b.dataset.raza); render(); }));
  $$('.simple .stepper').forEach(st => {
    const k = st.dataset.k, inc = +st.dataset.step, min = +st.dataset.min, max = +st.dataset.max;
    const inp = st.querySelector('input');
    const dec = String(inc).includes('.') ? 1 : 0;
    const commit = v => { inp.classList.remove('bad'); setSimple(k, v); render(); };
    inp.addEventListener('input', () => {
      const v = parse(inp.value);
      const ok = isFinite(v) && v >= min && v <= max;
      inp.classList.toggle('bad', !ok);
      if (ok) commit(v);
    });
    inp.addEventListener('blur', () => { if (!inp.classList.contains('bad')) inp.value = toIn(S.a[k]); });
    const bump = d => {
      const cur = isFinite(parse(inp.value)) ? parse(inp.value) : S.a[k];
      const v = Math.min(max, Math.max(min, +(Math.round((cur + d * inc) / inc) * inc).toFixed(dec)));
      inp.value = toIn(v); commit(v);
    };
    st.querySelector('.minus').addEventListener('click', () => bump(-1));
    st.querySelector('.plus').addEventListener('click', () => bump(1));
  });
  $('#s-inv-grid').addEventListener('input', e => {
    const el = e.target; if (el.dataset.sreal === undefined) return;
    const t = el.value.trim(), bad = t !== '' && !(parse(t) >= 0);
    el.classList.toggle('bad', bad);
    real[+el.dataset.sreal] = bad ? '' : t;
    render();
  });

  // modo completo
  const pt = $('#params');
  pt.addEventListener('input', e => {
    const el = e.target, sc = el.dataset.s, k = el.dataset.k;
    if (!sc || el.tagName === 'SELECT') return;
    const v = parse(el.value);
    el.classList.toggle('bad', !isFinite(v));
    if (isFinite(v)) { S[sc][k] = v; render(); }
  });
  pt.addEventListener('change', e => {
    const el = e.target;
    if (el.tagName !== 'SELECT') return;
    const sc = el.dataset.s;
    S[sc].raza = el.value;
    const pr = PRESET[el.value];
    if (pr) {
      Object.assign(S[sc], pr);
      for (const k of Object.keys(pr)) { const inp = pt.querySelector(`[data-s="${sc}"][data-k="${k}"]`); inp.value = toIn(pr[k]); inp.classList.remove('bad'); }
    }
    render();
  });
  $('#costs').addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'cursel') return;
    if (el.id === 'rate') { el.classList.remove('bad'); return; }
    if (el.id === 'mon') { S.sh.mon = el.value.trim() || '$'; S.sh.costCur = S.sh.mon; updCur(); render(); return; }
    const v = parse(el.value);
    el.classList.toggle('bad', !isFinite(v));
    if (isFinite(v)) { S.sh[el.dataset.c] = v; S.sh.costCur = S.sh.mon; updCur(); render(); }
  });
  $('#cursel').addEventListener('change', e => {
    const mon = $('#mon');
    if (e.target.value === '__otra') { $('#monRow').style.display = ''; mon.value = ''; S.sh.mon = '$'; mon.focus(); }
    else { $('#monRow').style.display = 'none'; mon.value = ''; S.sh.mon = e.target.value; }
    updCur(); render();
  });
  $('#conv').addEventListener('click', () => {
    const rEl = $('#rate'), r = parse(rEl.value);
    if (!(r > 0)) { rEl.classList.add('bad'); rEl.focus(); return; }
    Object.assign(S.sh, convertCosts(r));
    S.sh.costCur = S.sh.mon;
    $$('#costs [data-c]').forEach(el => { el.value = toIn(S.sh[el.dataset.c]); el.classList.remove('bad'); });
    updCur(); render();
  });
  $('#stages').addEventListener('input', e => {
    const el = e.target; if (el.dataset.real === undefined) return;
    const bad = el.value.trim() !== '' && !isFinite(parse(el.value));
    el.classList.toggle('bad', bad);
    real[+el.dataset.real] = bad ? '' : el.value.trim();
    render();
  });
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    view = b.dataset.v;
    $$('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    render();
  }));
  $('#reset').addEventListener('click', () => { S = clone(DEF); real = ['', '', '', '', '']; fillFull(); render(); toast('Se restablecieron los valores de ejemplo.'); });
  $('#fecha').addEventListener('input', render);
  $('#wipe').addEventListener('click', () => {
    if (!confirm('¿Borrar los datos guardados en este dispositivo? La calculadora volverá a los valores de ejemplo.')) return;
    try { localStorage.removeItem(STORE); } catch (e) { /* sin almacenamiento */ }
    S = clone(DEF); real = ['', '', '', '', '']; finca = '';
    if (mode === 'full') fillFull(); else { fillSimple(); goStep(1, false); }
    render();
    toast('Se borraron los datos de este dispositivo.');
  });
}

/* ---------- inicio ---------- */
load();
buildFull();
buildSimple();
$('#fecha').value = today();
bind();
setMode(location.hash === '#completo' ? 'full' : mode, false);
goStep(1, false);

/* Para pruebas automáticas y depuración */
window.APP = {get S(){ return S; }, get real(){ return real; }, report, render, setMode, goStep, compute};
