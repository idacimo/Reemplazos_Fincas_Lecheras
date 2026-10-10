# Plan de reemplazos del hato lechero | Datavet

Calculadora web para planear el programa de novillas de reemplazo en fincas lecheras: cuántas terneras criar, cuántas novillas se necesitan en cada etapa, qué estrategia de semen cubre la meta y cuánto cuesta el levante. Compara el escenario **actual** con una **meta** y con el **inventario real de hoy**, y descarga el plan en **Excel** y **PDF** con la marca Datavet.

Desarrollada por **Iván Darío Cifuentes Moreno** · Datavet — *Analizar para innovar, innovar para evolucionar*
ivan.cifuentes@datavet.info · idacimo@gmail.com · WhatsApp (+57) 315 501 0037

**En línea:** https://idacimo.github.io/Reemplazos_Fincas_Lecheras/

## Dos modos de uso

| Modo | Para quién | Qué pide |
|---|---|---|
| **Rápido** (por defecto) | Ganaderos y público general; pensado para el celular | 3 pasos y 7 preguntas en lenguaje sencillo, con valores típicos ya escritos. Resultado en tarjetas grandes, semáforo y barras por grupo de animales. |
| **Completo** | Médicos veterinarios, zootecnistas, asesores | Todos los parámetros de los escenarios actual y meta, costos por etapa, cualquier moneda, tubería de levante, tablas detalladas. |

Ambos modos comparten los mismos datos: se puede empezar en Rápido y pasar a Completo sin perder nada. El enlace `…/#completo` abre directamente el modo completo. Los datos se guardan solo en el celular o computador de quien usa la página (no se envían a ningún servidor).

## Privacidad

- Todos los cálculos se hacen en el navegador de quien usa la página. Los datos de la finca no se envían a ningún servidor; Datavet no los recibe ni los guarda.
- El PDF y el Excel se generan en el dispositivo y se descargan directamente.
- La página recuerda los últimos datos solo en ese dispositivo (almacenamiento local del navegador). El botón «Borrar mis datos de este dispositivo» los elimina.
- No se piden datos personales; el nombre de la finca es opcional y solo aparece en las descargas.
- Si más adelante se agrega un contador de uso, debe contar solo eventos anónimos (visitas, descargas) sin ningún dato de la finca, y este aviso debe actualizarse.

## Estructura

```
index.html                 página (marcado)
css/app.css                estilos de pantalla e impresión
js/model.js                modelo de cálculo, constantes y formatos (también se usa en las pruebas)
js/app.js                  interfaz: modo rápido y modo completo
js/export-common.js        utilidades de descarga (gráficos, pie de página)
js/export-xlsx.js          Excel con estilos (ExcelJS)
js/export-pdf.js           PDF tamaño carta (jsPDF + AutoTable, texto seleccionable)
vendor/                    librerías y fuente Jost copiadas de npm (no se usan CDN)
assets/                    logos, isotipo, favicon e imagen para redes sociales
presentacion/              código QR para las charlas
tests/                     pruebas del modelo (Node) y de punta a punta (Playwright)
```

No requiere compilación ni servidor: son archivos estáticos.

## Uso local

```bash
npm install
npm run serve        # http://localhost:8080
npm test             # modelo de cálculo
npm run test:e2e     # navegador: modo rápido, descargas de Excel y PDF, modo completo
npm run vendor       # solo si se actualizan las librerías en package.json
```

## Publicar en GitHub Pages

1. El repositorio debe ser **público** (GitHub Pages gratis solo publica repositorios públicos).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En 1 a 2 minutos queda en `https://idacimo.github.io/Reemplazos_Fincas_Lecheras/`. Cada cambio que llegue a `main` se publica solo.

### Dominio propio (cuando se quiera la versión definitiva)

Por ejemplo `reemplazos.datavet.info`:

1. En **Hostinger → Dominios → datavet.info → DNS**, crear un registro **CNAME**: nombre `reemplazos`, apunta a `idacimo.github.io`.
2. En **GitHub → Settings → Pages → Custom domain**, escribir `reemplazos.datavet.info`, guardar y, cuando GitHub lo permita, marcar **Enforce HTTPS**.
3. Actualizar la URL de `og:image` en `index.html` y regenerar el código QR con la nueva dirección.

El servidor de Hostinger donde corre n8n no se toca: el DNS solo indica dónde está la página.

## Modelo (resumen)

- Vacas totales = vacas en ordeño ÷ [(IEP×30,4 − días secos) ÷ (IEP×30,4)].
- Reemplazos/año = vacas totales × tasa de descarte.
- Terneras a criar = reemplazos ÷ supervivencia acumulada del levante.
- Inventario de cada etapa = terneras que entran × duración/12 × supervivencia media. Gestación fija en 9 meses.
- Validación: 100 vacas en ordeño, IEP 13,5, 60 días secos, descarte 30 %, pérdidas 5/2/1/3/1 %, EPP 24 → 35,14 reemplazos/año, 39,70 terneras, 72,84 novillas (prueba automática en `tests/unit`).
- Modo rápido: usa los valores típicos del escenario actual para lo que no pregunta y fija el primer servicio 12 meses antes del primer parto. La meta es el escenario de referencia de la raza.

## Antes de publicar

- Confirmar que las referencias técnicas y textos tomados del cuaderno de NotebookLM no tengan restricciones de derechos de autor.
- Aviso: la herramienta es de apoyo a la decisión y no reemplaza el criterio del médico veterinario o del zootecnista.

## Licencia

Por definir (por ejemplo, «Todos los derechos reservados © Datavet» o una licencia abierta). Las librerías incluidas en `vendor/` conservan sus licencias: ExcelJS (MIT), jsPDF (MIT), jsPDF-AutoTable (MIT) y la fuente Jost (SIL Open Font License).
