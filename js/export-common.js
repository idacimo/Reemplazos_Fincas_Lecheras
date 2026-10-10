/* Plan de reemplazos | Datavet — utilidades compartidas por las descargas de Excel y PDF */
'use strict';
(function () {
const {STAGES, nf} = window.RM;
/* Pie de los entregables, según el manual de marca */
const FOOTER_LINES = [
  'Iván Darío Cifuentes Moreno — Médico veterinario · Magíster en Gestión de Negocios Ganaderos · Consultor en analítica de datos e inteligencia de negocios',
  'Datavet — «Analizar para innovar, innovar para evolucionar» · Medellín, Colombia · ivan.cifuentes@datavet.info · idacimo@gmail.com · WhatsApp (+57) 315 501 0037 · LinkedIn: idacimo'
];
const FOOTER = FOOTER_LINES.join('\n');
const SLOGAN = 'Datavet · Analizar para innovar, innovar para evolucionar';

function saveBlob(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

const bufToB64 = buf => {
  const bytes = new Uint8Array(buf); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
async function fetchB64(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo leer ' + url);
  return bufToB64(await r.arrayBuffer());
}

function loadImg(src){
  return new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = src; });
}

/* SVG de la tubería → PNG (data URL) */
async function svgToPng(inner, w = 1920, h = 560){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 280" width="${w}" height="${h}" font-family="Jost, Arial, Helvetica, sans-serif">` +
              `<rect width="960" height="280" fill="#fff"/>${inner.replace(/<title>[\s\S]*?<\/title>/g, '')}</svg>`;
  const im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
  return c.toDataURL('image/png');
}

/* Barras agrupadas por etapa: requeridas actual, meta y, si hay dato, inventario de hoy */
function barChartPng(rep, W = 1800, H = 900){
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const F = 'Jost, Arial, Helvetica, sans-serif';
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  const hasHoy = rep.inv.n > 0;
  const series = [
    {name:'Requeridas, actual', color:'#07193F', v:rep.ra.st.map(s => s.invR)},
    {name:'Requeridas, meta', color:'#209B6C', v:rep.rm.st.map(s => s.invR)}
  ];
  if (hasHoy) series.push({name:'Hay hoy', color:'#F5A623', v:rep.inv.rows.map(r => r.has ? r.v : 0)});
  const max = Math.max(1, ...series.flatMap(s => s.v));
  const step = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : max / Math.pow(10, Math.floor(Math.log10(max))) > 2 ? 1 : 0.5);
  const top = Math.ceil(max * 1.15 / step) * step;
  const L = 120, R = 40, T = 150, B = 170, cw = W - L - R, ch = H - T - B;
  x.fillStyle = '#07193F'; x.font = `500 40px ${F}`; x.textBaseline = 'alphabetic';
  x.fillText('Novillas por etapa: actual frente a meta', L, 62);
  // leyenda
  let lx = L; x.font = `30px ${F}`;
  series.forEach(s => { x.fillStyle = s.color; x.fillRect(lx, 84, 26, 26); x.fillStyle = '#1F2E4F'; x.fillText(s.name, lx + 36, 107); lx += 36 + x.measureText(s.name).width + 46; });
  // cuadrícula
  x.font = `26px ${F}`; x.textAlign = 'right';
  for (let v = 0; v <= top + 1e-9; v += step) {
    const y = T + ch - v / top * ch;
    x.strokeStyle = '#E0E0E0'; x.lineWidth = 2; x.beginPath(); x.moveTo(L, y); x.lineTo(W - R, y); x.stroke();
    x.fillStyle = '#4F5B73'; x.fillText(nf(v, step < 1 ? 1 : 0), L - 14, y + 9);
  }
  // barras
  const gw = cw / 5, bw = Math.min(90, (gw - 50) / series.length);
  x.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    const gx = L + i * gw + (gw - bw * series.length) / 2;
    series.forEach((s, k) => {
      const v = s.v[i], h = v / top * ch, bx = gx + k * bw;
      x.fillStyle = s.color; x.fillRect(bx + 4, T + ch - h, bw - 8, h);
      x.fillStyle = '#07193F'; x.font = `700 26px ${F}`; x.fillText(nf(v, 0), bx + bw / 2, T + ch - h - 10);
    });
    x.fillStyle = '#1F2E4F'; x.font = `500 26px ${F}`;
    const words = STAGES[i].full.split(' · ');
    x.fillText(words[0], L + i * gw + gw / 2, T + ch + 42);
    x.font = `24px ${F}`; x.fillStyle = '#4F5B73';
    wrap(x, words[1], L + i * gw + gw / 2, T + ch + 76, gw - 20, 28);
  }
  x.strokeStyle = '#07193F'; x.lineWidth = 3; x.beginPath(); x.moveTo(L, T + ch); x.lineTo(W - R, T + ch); x.stroke();
  return c.toDataURL('image/png');
}
function wrap(x, text, cx, y, maxW, lh){
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (x.measureText(t).width > maxW && line) { x.fillText(line, cx, y); y += lh; line = w; } else line = t;
  }
  if (line) x.fillText(line, cx, y);
}

window.DVC = {FOOTER, FOOTER_LINES, SLOGAN, saveBlob, bufToB64, fetchB64, svgToPng, barChartPng, loadImg};
})();
