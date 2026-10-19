// Pruebas del modelo de cálculo (Node, sin navegador): npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('../../js/model.js');

const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('caso de validación del modelo de referencia (sin redondear)', () => {
  const r = M.compute(M.DEF.m, M.DEF.sh);
  near(r.C, 35.14);   // reemplazos por año
  near(r.H, 39.70);   // terneras a criar
  near(r.I, 72.84);   // novillas en levante
  assert.deepEqual(r.errs, []);
});

test('animales en enteros y etapas que suman exactamente el total', () => {
  const casos = [M.DEF.a, M.DEF.m,
    {...M.DEF.a, M:37, IEP:13.2, TD:31.7, p1:6.5},
    {...M.DEF.m, M:1234, raza:'Jersey', ...M.PRESET.Jersey},
    {...M.DEF.a, M:3, TD:22}];
  for (const p of casos) {
    const r = M.compute(p, M.DEF.sh);
    r.st.forEach(s => assert.ok(Number.isInteger(s.invR)));
    assert.ok(Number.isInteger(r.IR) && Number.isInteger(r.HR) && Number.isInteger(r.femR));
    assert.equal(r.st.reduce((a, s) => a + s.invR, 0), r.IR);
    assert.equal(r.IR, Math.round(r.I));
  }
});

test('conversión de moneda con la tasa «1 USD equivale a»', () => {
  assert.deepEqual(M.convertCosts(3200), {c1:12480, c2:6240, c3:7424, c4:7456, c5:7456});
  assert.deepEqual(M.convertCosts(1), {c1:3.9, c2:1.95, c3:2.32, c4:2.33, c5:2.33});
  assert.deepEqual(M.convertCosts(17.5), {c1:68.25, c2:34.13, c3:40.6, c4:40.77, c5:40.77});
  assert.equal(M.symOf('COP'), '$');
  assert.equal(M.symOf('USD'), 'US$');
});

test('lectura y formato de números colombianos', () => {
  assert.equal(M.parse('15.000'), 15000);
  assert.equal(M.parse('3,90'), 3.9);
  assert.equal(M.parse('1.234,5'), 1234.5);
  assert.equal(M.parse('1,234.56'), 1234.56);
  assert.equal(M.parse('13.5'), 13.5);
  assert.ok(Number.isNaN(M.parse('abc')));
  assert.equal(M.nf(1234567.891, 1), '1.234.567,9');
  assert.equal(M.nf(1234, 0), '1.234');
  assert.equal(M.sgn(-5, 0), '−5');
  assert.equal(M.sgn(3, 0), '+3');
});

test('validaciones del modelo', () => {
  const r = M.compute({...M.DEF.a, EPP:20, serv:16}, M.DEF.sh);
  assert.ok(r.errs.some(e => e.includes('edad al primer parto')));
  const r2 = M.compute({...M.DEF.a, sx:60, cb:50}, M.DEF.sh);
  assert.ok(r2.errs.some(e => e.includes('100 %')));
});

test('vacas secas: si se ingresan, el hato adulto es ordeño + secas', () => {
  const est = M.compute(M.DEF.a, M.DEF.sh);
  assert.equal(est.hasSecas, false);
  near(est.T, est.secasEst + 100, 1e-9);
  const r = M.compute({...M.DEF.a, secas:25}, M.DEF.sh);
  assert.equal(r.hasSecas, true);
  assert.equal(r.T, 125);
  assert.equal(r.secas, 25);
  near(r.C, 125 * 0.28, 1e-9);
  // vacío o null = se estima como antes (el caso de validación no cambia)
  near(M.compute({...M.DEF.m, secas:null}, M.DEF.sh).I, 72.84);
  near(M.compute({...M.DEF.m, secas:''}, M.DEF.sh).I, 72.84);
});

test('intervalo entre partos escrito en días se convierte a meses', () => {
  assert.equal(M.iepMonths(410), 13.5);
  assert.equal(M.iepMonths(390), 12.8);
  assert.equal(M.iepMonths(13.5), 13.5);
});

test('semáforo: un valor mejor que la referencia nunca queda en rojo', () => {
  const st = label => M.DIAG.find(d => d.l === label).st;
  assert.equal(st('Intervalo entre partos')(12.8), 'g');
  assert.equal(st('Edad al primer parto')(21, {raza:'Holstein'}), 'g');
  assert.equal(st('Edad al primer parto')(20, {raza:'Holstein'}), 'g');
  assert.notEqual(st('Edad al primer parto')(18, {raza:'Holstein'}), 'r');
  assert.equal(st('Novillas por cada 100 vacas en ordeño')(50), 'g');
  assert.equal(st('Mortalidad en lactancia')(2), 'g');
  assert.equal(st('Pérdida acumulada del levante')(4), 'g');
  assert.notEqual(st('Tasa de descarte anual')(15), 'r');
  // lo malo sigue alertando
  assert.equal(st('Intervalo entre partos')(15), 'r');
  assert.equal(st('Edad al primer parto')(30, {raza:'Holstein'}), 'r');
  assert.equal(st('Tasa de descarte anual')(45), 'r');
});
