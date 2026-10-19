// Pruebas de punta a punta: npm run test:e2e
import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.errors = errors;
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test('modo rápido: tres pasos, resultados y descargas', async ({ page }) => {
  await page.fill('#s-finca', 'La Esperanza');
  await page.click('.step[data-step="1"] [data-go="2"]');
  await expect(page.locator('.step[data-step="2"]')).toBeVisible();
  await page.click('#s-inv summary');
  for (const [i, v] of [[0, 7], [1, 10], [2, 30], [3, 12], [4, 25]]) await page.fill(`#s-real${i}`, String(v));
  await page.click('.step[data-step="2"] [data-go="3"]');
  const kpis = page.locator('.kpi b');
  await expect(kpis).toHaveText(['33', '41', '82']);
  await expect(page.locator('#s-result')).toContainText('Hoy tiene 84 hembras de levante');

  // Excel del modo rápido: solo lo preguntado y los resultados
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('.step[data-step="3"] [data-action="xlsx"]')]);
  expect(dx.suggestedFilename()).toMatch(/^plan_reemplazos_La_Esperanza_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await readFile(await dx.path()));
  expect(wb.worksheets.map(w => w.name)).toEqual(['Resultados', 'Por grupo', 'Semáforo', 'Gráfico']);
  const res = wb.getWorksheet('Resultados');
  expect(res.getCell('B8').value).toBe(33);
  expect(res.getCell('A7').fill.fgColor.argb).toBe('FF07193F');
  const allText = wb.worksheets.flatMap(w => w.getSheetValues().flat()).map(v => typeof v === 'object' && v ? JSON.stringify(v) : String(v)).join(' ');
  expect(allText).not.toMatch(/\$\s?\d/);   // sin montos de dinero: los costos no se preguntan en el modo rápido
  const grp = wb.getWorksheet('Por grupo');
  const req = [8, 9, 10, 11, 12].map(r => grp.getCell(`C${r}`).value);
  expect(req.reduce((a, b) => a + b, 0)).toBe(grp.getCell('C13').value);
  expect(grp.getCell('E13').value).toBe(84);
  expect(wb.getWorksheet('Semáforo').getCell('C8').fill.fgColor.argb).toMatch(/^FF(209B6C|F5A623|D0021B)$/);

  // PDF
  const [dp] = await Promise.all([page.waitForEvent('download'), page.click('.step[data-step="3"] [data-action="pdf"]')]);
  const pdf = await readFile(await dp.path());
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  const pages = (pdf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
  expect(pages).toBeGreaterThanOrEqual(1);
  expect(pages).toBeLessThanOrEqual(3);
});

test('modo rápido: vacas secas e intervalo en días', async ({ page }) => {
  await page.fill('#s-secas', '30');
  await page.click('.step[data-step="1"] [data-go="2"]');
  await page.fill('#s-IEP', '390');
  await page.locator('#s-IEP').blur();
  await expect(page.locator('#s-IEP')).toHaveValue('12,8');
  await page.click('.step[data-step="2"] [data-go="3"]');
  await expect(page.locator('.r-head p')).toContainText('100 en ordeño + 30 secas = 130 vacas adultas');
  const iep = page.locator('.lights li', {hasText:'Intervalo entre partos'});
  await expect(iep.locator('.dot')).toHaveClass(/\bg\b/);
});

test('modo completo: Excel con las 6 hojas detalladas', async ({ page }) => {
  await page.click('.modes [data-mode="full"]');
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('.full-bar [data-action="xlsx"]')]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await readFile(await dx.path()));
  expect(wb.worksheets.map(w => w.name)).toEqual(['Resumen', 'Parámetros', 'Inventario por etapa', 'Etapas', 'Diagnóstico', 'Gráfico']);
  expect(wb.getWorksheet('Resumen').getCell('B8').value).toBe(118);
});

test('modo rápido: datos inválidos no dejan avanzar', async ({ page }) => {
  await page.click('.step[data-step="1"] [data-go="2"]');
  await page.fill('#s-EPP', '5');
  await expect(page.locator('#s-EPP')).toHaveClass(/bad/);
  await page.click('.step[data-step="2"] [data-go="3"]');
  await expect(page.locator('.step[data-step="2"]')).toBeVisible();
});

test('modo completo: conversión de moneda y suma de etapas', async ({ page }) => {
  await page.click('.modes [data-mode="full"]');
  await expect(page).toHaveURL(/#completo$/);
  await expect(page.locator('#raT')).toHaveText('82');
  const sum = await page.$$eval('[id^=ra]', els => els.filter(e => /^ra\d$/.test(e.id)).reduce((a, e) => a + Number(e.textContent.replace(/\./g, '')), 0));
  expect(sum).toBe(82);
  await page.selectOption('#cursel', 'USD');
  await expect(page.locator('#curWarn')).toBeVisible();
  await page.fill('#rate', '1');
  await page.click('#conv');
  await expect(page.locator('[data-c="c1"]')).toHaveValue('3,9');
  await expect(page.locator('#cs0')).toContainText('US$');
});

test('privacidad: borrar los datos guardados en el dispositivo', async ({ page }) => {
  await page.fill('#s-finca', 'Finca Prueba');
  await page.fill('#s-M', '250');
  expect(await page.evaluate(() => localStorage.getItem('datavet-reemplazos-v2'))).toContain('Finca Prueba');
  page.once('dialog', d => d.accept());
  await page.click('#wipe');
  await expect(page.locator('#s-finca')).toHaveValue('');
  await expect(page.locator('#s-M')).toHaveValue('100');
  expect(await page.evaluate(() => localStorage.getItem('datavet-reemplazos-v2'))).not.toContain('Finca Prueba');
});

test('contador anónimo: eventos sin datos de la finca', async ({ page }) => {
  await page.evaluate(() => { window.__ev = []; window.goatcounter = {count: o => window.__ev.push(o)}; });
  await page.fill('#s-finca', 'Finca Secreta');
  await page.click('.step[data-step="1"] [data-go="2"]');
  await page.click('.step[data-step="2"] [data-go="3"]');
  await Promise.all([page.waitForEvent('download'), page.click('.step[data-step="3"] [data-action="pdf"]')]);
  await expect.poll(() => page.evaluate(() => window.__ev.length)).toBe(2);
  const ev = await page.evaluate(() => window.__ev);
  expect(ev.map(e => e.path)).toEqual(['resultados-rapido', 'descarga-pdf-rapido']);
  expect(JSON.stringify(ev)).not.toContain('Secreta');
  // en localhost no se carga el script de GoatCounter
  expect(await page.locator('script[src*="gc.zgo.at"]').count()).toBe(0);
});
