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

  // Excel
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('.step[data-step="3"] [data-action="xlsx"]')]);
  expect(dx.suggestedFilename()).toMatch(/^plan_reemplazos_La_Esperanza_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await readFile(await dx.path()));
  expect(wb.worksheets.map(w => w.name)).toEqual(['Resumen', 'Parámetros', 'Inventario por etapa', 'Etapas', 'Diagnóstico', 'Gráfico']);
  const res = wb.getWorksheet('Resumen');
  expect(res.getCell('A8').value).toBe('Vacas adultas totales');
  expect(res.getCell('B8').value).toBe(118);
  expect(res.getCell('B8').numFmt).toBe('#,##0');
  expect(res.getCell('A7').fill.fgColor.argb).toBe('FF07193F');
  const inv = wb.getWorksheet('Inventario por etapa');
  const req = [8, 9, 10, 11, 12].map(r => inv.getCell(`D${r}`).value);
  expect(req.every(Number.isInteger)).toBe(true);
  expect(req.reduce((a, b) => a + b, 0)).toBe(inv.getCell('D13').value);
  expect(inv.getCell('F13').value).toBe(84);
  expect(wb.getWorksheet('Diagnóstico').getCell('C8').fill.fgColor.argb).toMatch(/^FF(209B6C|F5A623|D0021B)$/);

  // PDF
  const [dp] = await Promise.all([page.waitForEvent('download'), page.click('.step[data-step="3"] [data-action="pdf"]')]);
  const pdf = await readFile(await dp.path());
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  const pages = (pdf.toString('latin1').match(/\/Type \/Page[^s]/g) || []).length;
  expect(pages).toBeGreaterThanOrEqual(2);
  expect(pages).toBeLessThanOrEqual(4);
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
