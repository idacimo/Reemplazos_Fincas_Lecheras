# Instrucciones para Claude Code

Pega este texto en Claude Code, con la terminal abierta en la carpeta de este proyecto.

---

Eres mi ingeniero front-end. Este proyecto es `index.html`, una calculadora de reemplazos para fincas lecheras (HTML, CSS y JS en un solo archivo, sin build). Lee primero `README.md` y luego todo `index.html`. Responde y escribe todos los textos en **español de Colombia, con tildes correctas**. No cambies el modelo de cálculo ni los resultados numéricos. Las pruebas de validación del README deben seguir dando lo mismo.

## Reglas que no se pueden romper

- Animales siempre en **enteros** (nunca decimales). Las etapas deben sumar exactamente el total.
- Formato colombiano: `.` para miles y `,` para decimales, también en el Excel (formatos de celda numéricos reales, no texto).
- Moneda por defecto: pesos con símbolo `$` (no "COP"). Otras monedas se convierten con la tasa "1 USD equivale a".
- Marca Datavet: azul oscuro `#07193F`, verde `#209B6C`, verde claro `#66BE8F`, turquesa `#26B0B3`, azul profundo `#0C1234`, semáforo `#209B6C` / `#F5A623` / `#D0021B`. Tipografía **Ubuntu**. Tono formal, claro y orientado a la acción.
- Logo: `assets/logo-datavet-negativo.png` (blanco, para fondos oscuros). Pide el logo principal cromático si lo necesitas para fondos claros.

## Tarea 1. Excel profesional con marca Datavet

Hoy `exportXlsx()` usa SheetJS Community (`xlsx 0.18.5`), que no permite estilos. Reemplázalo por **ExcelJS** (CDN con versión fija) o la alternativa que permita estilos en el navegador, manteniendo la descarga 100 % en el cliente. Requisitos:

- Hojas: Resumen, Parámetros, Inventario por etapa, Etapas, Diagnóstico (igual contenido que hoy).
- Cada hoja con **banda de encabezado azul `#07193F`** con el logo Datavet, título de la hoja en blanco (Ubuntu o Calibri si no hay Ubuntu), finca, fecha y moneda; línea verde `#209B6C` como separador.
- Encabezados de tabla: fondo `#07193F`, texto blanco en negrita. Filas alternas blanco y `#F5F5F5`, bordes finos `#E0E0E0`. Fila de totales en negrita con borde superior verde.
- Columna "Actual" y "Meta" con colores distintos y sutiles. Diferencias negativas en rojo, positivas en verde.
- Formatos numéricos: enteros `#,##0` para animales, `0,0 "%"` para porcentajes y moneda con el símbolo elegido (`"$" #,##0`). Alineación, anchos de columna ajustados, filas congeladas, cuadrícula oculta.
- Hoja Diagnóstico con el semáforo en celdas coloreadas (verde / ámbar / rojo).
- Pie en cada hoja: "Datavet · Analizar para innovar, innovar para evolucionar · Iván Darío Cifuentes Moreno · idacimo@gmail.com · (+57) 315 501 0037".
- Configurar impresión: orientación horizontal, ajustar a una página de ancho, encabezado y pie, márgenes.
- Si se prefiere, agrega una hoja con un gráfico de barras Actual vs. Meta por etapa con los colores de marca.

## Tarea 2. PDF / impresión sin huérfanos ni espacios en blanco

Revisa `@media print` y la estructura de la página. Hoy hay espacios en blanco grandes y a veces la última hoja queda solo con el pie de diseño.

- Tamaño carta (`@page { size: Letter; margin: 14mm }`), `print-color-adjust: exact` para conservar colores.
- Evitar cortes dentro de tarjetas, tablas, filas y gráficos (`break-inside: avoid`); títulos con `break-after: avoid`. Controlar huérfanos/viudas (`orphans` y `widows`).
- Compactar espacios, paddings y alturas mínimas en impresión para que el contenido fluya y no queden huecos. Ocultar controles que no aportan (botones, campos de entrada vacíos, avisos de pantalla).
- Dejar el contenido en un **número mínimo de páginas** sin hoja final casi vacía. Reordenar secciones para impresión si ayuda (resumen y gráfico primero, detalle después).
- Encabezado con logo y pie con numeración "Página X de Y" y el slogan. Si CSS puro no basta, genera el PDF con una solución cliente (por ejemplo `html2pdf.js`/`jsPDF`) solo si el resultado queda mejor, y conserva texto seleccionable.
- Verifica con Chromium headless (Playwright) imprimiendo a PDF con la configuración de Datavet: recorre la finca de ejemplo y la finca con inventario "Hay hoy" lleno. Revisa **cada página como imagen** y confirma que no hay hojas casi vacías ni tablas cortadas.

## Tarea 3. Calidad y publicación

- Corre una revisión ortográfica completa del español (tildes, "Período", mayúsculas) en textos, alertas, `title`, `aria-label` y hojas del Excel.
- Revisa accesibilidad básica (contraste, `label` en inputs, foco visible) y que funcione bien en celular.
- Agrega `<meta>` de descripción y Open Graph, favicon con el isotipo Datavet y `lang="es-CO"`.
- Escribe pruebas automáticas mínimas (Node + jsdom o Playwright): caso de validación (35,14 / 39,70 / 72,84 sin redondear en el modelo), animales enteros, suma de etapas = total, conversión de moneda y generación del Excel.
- Prepara el despliegue en GitHub Pages (rama `main`, raíz) y, si quieres, un workflow `.github/workflows/test.yml` que corra las pruebas.
- Haz commits pequeños y descriptivos por tarea.

## Entrega

Al terminar, muéstrame: capturas del PDF (todas las páginas), una captura de cada hoja del Excel, y la lista de cambios. Si algo de la marca no está claro (logo cromático, fuente Ubuntu para Excel), pregúntame antes de inventarlo.
