/* Plan de reemplazos del hato lechero | Datavet
   Modelo de cálculo, constantes y formatos. No depende del navegador: se usa también en las pruebas (Node). */
(function (root) {
'use strict';

const FEM_SX = 0.90, FEM_CV = 0.50, GEST = 9;

const STAGES = [
  {name:'Etapa 1 · Lactancia', full:'Etapa 1 · Lactancia', simple:'Terneras de leche', simpleDesc:'Del nacimiento al destete',
   desc:'Del nacimiento al destete.', color:'#66BE8F', txt:'#07193F'},
  {name:'Etapa 2 · Destete a 6 m', full:'Etapa 2 · Destete a 6 meses', simple:'Terneras destetas', simpleDesc:'Del destete a los 6 meses',
   desc:'Del destete a los 6 meses de edad.', color:'#26B0B3', txt:'#07193F'},
  {name:'Etapa 3 · 6 m al 1.er servicio', full:'Etapa 3 · 6 meses al primer servicio', simple:'Novillas de levante', simpleDesc:'De 6 meses hasta el primer servicio',
   desc:'De los 6 meses de edad hasta el primer servicio.', color:'#209B6C', txt:'#07193F'},
  {name:'Etapa 4 · En servicio', full:'Etapa 4 · Novillas en servicio', simple:'Novillas en servicio', simpleDesc:'Ya servidas, aún vacías',
   desc:'Del primer servicio hasta la concepción; dura la edad al primer parto − 9 − la edad al primer servicio.', color:'#009245', txt:'#FFFFFF'},
  {name:'Etapa 5 · Gestantes', full:'Etapa 5 · Novillas gestantes', simple:'Novillas preñadas', simpleDesc:'Los 9 meses antes del primer parto',
   desc:'Los 9 meses de gestación, hasta el primer parto.', color:'#07193F', txt:'#FFFFFF'}
];

/* [código, nombre, símbolo que se muestra] */
const CURRENCIES = [
  ['COP','Peso colombiano','$'],['USD','Dólar estadounidense','US$'],['MXN','Peso mexicano','$'],['PEN','Sol peruano','S/'],
  ['CLP','Peso chileno','$'],['ARS','Peso argentino','$'],['BRL','Real brasileño','R$'],['UYU','Peso uruguayo','$U'],
  ['BOB','Boliviano','Bs'],['PYG','Guaraní','Gs'],['CRC','Colón costarricense','₡'],['GTQ','Quetzal','Q'],
  ['DOP','Peso dominicano','RD$'],['EUR','Euro','€'],['GBP','Libra esterlina','£'],['CAD','Dólar canadiense','CA$'],
  ['AUD','Dólar australiano','A$'],['NZD','Dólar neozelandés','NZ$']
];

/* Costos de ejemplo en dólares: base para convertir a cualquier moneda con la tasa que se escriba */
const BASE_USD = {c1:3.90, c2:1.95, c3:2.32, c4:2.33, c5:2.33};
const PRESET = {Holstein:{dest:2, serv:13, EPP:24}, Jersey:{dest:2, serv:11, EPP:21}};
const DEF = {
  a:{M:100, secas:null, IEP:14, DS:65, TD:28, raza:'Holstein', dest:2.5, serv:16, EPP:28, p1:8, p2:3, p3:2, p4:5, p5:2, mort:6, sx:0, cb:10},
  m:{M:100, secas:null, IEP:13.5, DS:60, TD:30, raza:'Holstein', dest:2, serv:13, EPP:24, p1:5, p2:2, p3:1, p4:3, p5:1, mort:5, sx:15, cb:25},
  /* Costos de ejemplo en pesos colombianos (equivalen a BASE_USD con una TRM de referencia de $3.200) */
  sh:{mon:'COP', costCur:'COP', c1:12480, c2:6240, c3:7420, c4:7460, c5:7460}
};

const ROWS = [
  {g:'Hato adulto'},
  {k:'M', l:'Vacas en ordeño', u:'cab'},
  {k:'secas', l:'Vacas secas hoy (opcional)', u:'cab', opt:true},
  {k:'IEP', l:'Intervalo entre partos', u:'meses (o días)'},
  {k:'DS', l:'Días secos (si no hay dato de vacas secas)', u:'días'},
  {k:'TD', l:'Tasa de descarte anual', u:'%'},
  {g:'Edades del levante'},
  {k:'raza', l:'Raza', type:'sel'},
  {k:'dest', l:'Edad al destete', u:'meses'},
  {k:'serv', l:'Edad al primer servicio', u:'meses'},
  {k:'EPP', l:'Edad al primer parto', u:'meses'},
  {g:'Pérdidas por etapa (muerte y descarte)'},
  {k:'p1', l:STAGES[0].name, u:'%'},
  {k:'p2', l:STAGES[1].name, u:'%'},
  {k:'p3', l:STAGES[2].name, u:'%'},
  {k:'p4', l:STAGES[3].name, u:'%'},
  {k:'p5', l:STAGES[4].name, u:'%'},
  {g:'Nacimientos y semen'},
  {k:'mort', l:'Mortinatos y muertes < 48 h', u:'%'},
  {k:'sx', l:'Preñeces con semen sexado', u:'%'},
  {k:'cb', l:'Preñeces con semen de carne', u:'%'},
  {k:'conv', l:'Preñeces con semen convencional', u:'%', type:'calc'}
];
const COSTROWS = [
  {k:'c1', l:STAGES[0].name}, {k:'c2', l:STAGES[1].name}, {k:'c3', l:STAGES[2].name},
  {k:'c4', l:STAGES[3].name}, {k:'c5', l:STAGES[4].name}
];

/* ---------- formatos (convención colombiana: punto = miles, coma = decimales) ---------- */
const nf = (x, d = 1) => isFinite(x) ? x.toLocaleString('es-CO', {minimumFractionDigits:d, maximumFractionDigits:d}) : '–';
const sgn = (x, d = 1) => !isFinite(x) ? '–' : (x > 0.0005 ? '+' : x < -0.0005 ? '−' : '') + nf(Math.abs(x), d);
const toIn = v => String(v).replace('.', ',');
/* Intervalo entre partos: si se escribe en días (más de 40), se convierte a meses */
const iepMonths = v => v > 40 ? +(v / 30.4).toFixed(1) : v;
const symOf = mon => { const c = CURRENCIES.find(x => x[0] === mon); return c ? c[2] : mon; };

/* Acepta 15.000 · 3,90 · 1.234,5 · y también 1,234.56 o 3.90 */
const parse = s => {
  let t = String(s).trim().replace(/\s/g, '');
  if (t === '') return NaN;
  const hasD = t.includes('.'), hasC = t.includes(',');
  if (hasD && hasC) {
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (hasD) {
    if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  } else if (hasC) {
    if (/^-?[1-9]\d{0,2}(,\d{3}){2,}$/.test(t)) t = t.replace(/,/g, '');
    else t = t.replace(',', '.');
  }
  const v = parseFloat(t);
  return isFinite(v) ? v : NaN;
};

/* Dato opcional: vacío, null o no numérico = no ingresado */
const hasValue = v => v !== null && v !== undefined && v !== '' && isFinite(v);

/* ---------- modelo ---------- */
function compute(p, costs){
  const errs = [];
  const dias = p.IEP * 30.4;
  /* Vacas secas: si se conoce cuántas hay hoy, el hato adulto es ordeño + secas.
     Si no, se estima con la proporción en ordeño = (IEP × 30,4 − días secos) ÷ (IEP × 30,4). */
  const hasSecas = hasValue(p.secas);
  const PordEst = (dias - p.DS) / dias;
  const secasEst = p.M / PordEst - p.M;
  if (!(p.M > 0)) errs.push('Las vacas en ordeño deben ser mayores que cero.');
  if (hasSecas && !(p.secas >= 0)) errs.push('Las vacas secas no pueden ser negativas.');
  if (!hasSecas && !(PordEst > 0 && PordEst <= 1)) errs.push('Los días secos deben ser menores que el intervalo entre partos.');
  const Pord = hasSecas ? p.M / (p.M + p.secas) : PordEst;
  if (!(p.TD >= 0 && p.TD < 100)) errs.push('La tasa de descarte debe estar entre 0 y 100 %.');
  if (!(p.dest > 0 && p.dest <= 6)) errs.push('La edad al destete debe estar entre 0 y 6 meses.');
  if (!(p.serv >= 6)) errs.push('La edad al primer servicio debe ser de 6 meses o más.');
  if (p.EPP - GEST - p.serv < 0) errs.push(`La edad al primer parto (${toIn(p.EPP)} m) debe ser al menos 9 meses mayor que la edad al primer servicio (${toIn(p.serv)} m).`);
  if (p.sx + p.cb > 100) errs.push('El semen sexado y el de carne suman más del 100 % de las preñeces.');
  const losses = [p.p1, p.p2, p.p3, p.p4, p.p5];
  if (losses.some(x => !(x >= 0 && x < 100))) errs.push('Las pérdidas por etapa deben estar entre 0 y 100 %.');

  const T = hasSecas ? p.M + p.secas : p.M / Pord, secas = T - p.M;
  const C = T * p.TD / 100;
  const d = [p.dest, 6 - p.dest, p.serv - 6, p.EPP - GEST - p.serv, GEST].map(x => Math.max(0, x));
  const s = losses.map(x => 1 - x / 100);
  const Scum = s.reduce((a, b) => a * b, 1);
  const H = C / Scum;
  const c = [costs.c1, costs.c2, costs.c3, costs.c4, costs.c5];
  let e = H, age = 0, I = 0, daily = 0;
  const st = d.map((di, i) => {
    const inv = e * di / 12 * (1 + s[i]) / 2;
    const o = {e0:e, e1:e * s[i], d:di, a0:age, a1:age + di, inv, cost:inv * c[i] * 365};
    I += inv; daily += inv * c[i];
    e *= s[i]; age += di;
    return o;
  });
  const partos = T * 12 / p.IEP;
  const vivos = partos * (1 - p.mort / 100);
  const sx = p.sx / 100, cb = p.cb / 100, cv = Math.max(0, 1 - sx - cb);
  const fem = vivos * (FEM_SX * sx + FEM_CV * cv);
  const bal = fem - H;
  const need = H / vivos;                                    // fracción de nacidos vivos que deben ser hembras de reemplazo
  const sMinBeef = need / FEM_SX;                            // sexado mínimo si todo lo demás va a carne
  const bMax = Math.min(1 - sx, Math.max(0, 1 + 0.8 * sx - 2 * need)); // carne máxima con el sexado actual
  const sReq = Math.max(0, (need - 0.5 + 0.5 * cb) / 0.4);   // sexado mínimo con la carne actual
  const annual = daily * 365;
  /* Animales: se muestran en enteros. El inventario por etapa se reparte con el método del mayor residuo
     para que las etapas sumen exactamente el total redondeado. */
  const IR = Math.round(I);
  const fl = st.map(o => Math.floor(o.inv));
  if (isFinite(IR) && fl.every(isFinite)) {
    let rem = IR - fl.reduce((a, b) => a + b, 0);
    st.map((o, i) => [o.inv - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rem > 0) { fl[i]++; rem--; } });
  }
  st.forEach((o, i) => { o.invR = fl[i]; });
  const femR = Math.round(fem), HR = Math.round(H);
  return {errs, Pord, T, secas, hasSecas, secasEst, C, Scum, H, st, I, IR, ratio:I / p.M * 100, partos, vivos, fem, bal, femR, HR, balR:femR - HR,
          novPos:fem * Scum, need, sMinBeef, bMax, sReq, cv, daily, annual, perHeifer:annual / C, ageEnd:age};
}

/* Convierte los costos de ejemplo (en USD) con la tasa "1 USD equivale a" */
function convertCosts(rate){
  const out = {};
  for (const k of Object.keys(BASE_USD)) { const x = BASE_USD[k] * rate; out[k] = +(x >= 100 ? x.toFixed(0) : x.toFixed(2)); }
  return out;
}

/* Indicadores del resumen: [nombre, valor, decimales ('$' = moneda), dirección buena (+1 subir, −1 bajar, 0 neutra), con signo] */
const SUM = [
  ['Vacas adultas totales', r => r.T, 0, 0],
  ['Vacas secas', r => r.secas, 0, 0],
  ['Novillas paridas necesarias por año', r => r.C, 0, 0],
  ['Supervivencia acumulada del levante (%)', r => r.Scum * 100, 1, 1],
  ['Terneras vivas a criar por año', r => r.HR, 0, -1],
  ['Inventario total de levante (cabezas)', r => r.IR, 0, -1],
  ['Novillas por cada 100 vacas en ordeño', r => r.ratio, 0, -1],
  ['Partos por año', r => r.partos, 0, 0],
  ['Terneras hembras nacidas vivas por año', r => r.femR, 0, 0],
  ['Balance de terneras hembras por año', r => r.balR, 0, 1, true],
  ['Novillas paridas posibles por año', r => r.novPos, 0, 0],
  ['Costo diario del levante', r => r.daily, '$', -1],
  ['Costo anual del levante', r => r.annual, '$', -1],
  ['Costo por novilla parida', r => r.perHeifer, '$', -1]
];

const eppRange = p => p.raza === 'Jersey' ? [21, 22] : [22, 24];
const DIAG = [
  /* Semáforo: un valor mejor que la referencia nunca queda en rojo.
     Descarte bajo no es crítico (solo atención: menos selección); descarte alto sí. */
  {l:'Tasa de descarte anual', ref:'25–35 %', v:(r, p) => p.TD, f:v => nf(v, 0) + ' %', unit:'%', dec:0,
   st:v => v >= 25 && v <= 35 ? 'g' : v <= 40 ? 'y' : 'r'},
  {l:'Intervalo entre partos', ref:'≤ 13,5 meses (≤ 410 días)', v:(r, p) => p.IEP, f:v => `${nf(v, 1)} m · ${nf(v * 30.4, 0)} d`, unit:'m', dec:1,
   st:v => v <= 13.5 ? 'g' : v <= 14.5 ? 'y' : 'r'},
  /* Edad al primer parto: más temprano es mejor; solo por debajo de 2 meses del rango se pide revisar el peso al servicio */
  {l:'Edad al primer parto', ref:'Holstein 22–24 m, Jersey 21–22 m', v:(r, p) => p.EPP, f:v => nf(v, 1) + ' m', unit:'m', dec:1,
   st:(v, p) => { const [lo, hi] = eppRange(p); return v <= hi ? (v >= lo - 2 ? 'g' : 'y') : (v <= hi + 3 ? 'y' : 'r'); }},
  {l:'Mortalidad en lactancia', ref:'≤ 5 %', v:(r, p) => p.p1, f:v => nf(v, 1) + ' %', unit:'%', dec:1,
   st:v => v <= 5 ? 'g' : v <= 8 ? 'y' : 'r'},
  {l:'Pérdida acumulada del levante', ref:'8–12 %', v:r => (1 - r.Scum) * 100, f:v => nf(v, 1) + ' %', unit:'%', dec:1,
   st:v => v <= 12 ? 'g' : v <= 15 ? 'y' : 'r'},
  /* Es lo que se requiere: necesitar menos novillas para sostener el hato es mejor */
  {l:'Novillas por cada 100 vacas en ordeño', ref:'≤ 75 (meta 65–75)', v:r => r.ratio, f:v => nf(v, 0), dec:0,
   st:v => { v = Math.round(v); return v <= 75 ? 'g' : v <= 85 ? 'y' : 'r'; }},
  {l:'Balance de terneras hembras', ref:'≥ 0 por año', v:r => r.balR, f:v => sgn(v, 0), dec:0,
   st:v => v >= 0 ? 'g' : v >= -3 ? 'y' : 'r'}
];
const WORD = {g:'Dentro de la referencia o mejor', y:'Requiere atención', r:'Crítico'};
const DOT = {g:'#209B6C', y:'#F5A623', r:'#D0021B'};

const api = {FEM_SX, FEM_CV, GEST, STAGES, CURRENCIES, BASE_USD, PRESET, DEF, ROWS, COSTROWS,
             nf, sgn, toIn, symOf, parse, hasValue, iepMonths, compute, convertCosts, SUM, DIAG, WORD, DOT, eppRange};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.RM = api;
})(typeof window !== 'undefined' ? window : globalThis);
