/**
 * Integración con Google Sheets vía CSV público.
 *
 * Por qué así y no con la API oficial de Google:
 * - Cero credenciales, cero service accounts, cero OAuth.
 * - Luis edita el Sheet como cualquier hoja de cálculo y publica.
 * - El servidor solo hace un fetch a una URL pública de solo lectura.
 *
 * Formato esperado del Sheet (2 columnas: campo | valor):
 *
 *   campo                | valor
 *   ----------------------|--------------------------------------------
 *   mensaje_principal     | Tu pedido va en camino...
 *   promo_titulo          | Pizza Carnívora
 *   promo_texto           | Esta semana con doble pepperoni
 *   promo_imagen          | https://.../carnivora.jpg
 *   promo_link            | https://laymonpizzeria.getjusto.com/pedir
 *   sugerencia_1          | ¿Ya probaste el postre de Nutella?
 *   sugerencia_2          | Agrega una Coca de vidrio a tu pedido
 *   sugerencia_3          | La Focaccia del día está buenísima
 *
 * Cualquier fila que empiece con "sugerencia_" se junta en una lista
 * y el server elige una al azar en cada carga de página.
 */

const fetch = require('node-fetch');

const SHEET_CACHE_MINUTES = parseFloat(process.env.SHEET_CACHE_MINUTES || '5');

// Contenido de respaldo si el Sheet no responde o aún no se configuró.
const FALLBACK_CONTENT = {
  mensaje_principal:
    'Aquí puedes ver la ubicación del repartidor que lleva tu pedido. Tu pedido va en camino, puedes ver el tracking en tiempo real aquí:',
  promo_titulo: '',
  promo_texto: '',
  promo_imagen: '',
  promo_link: '',
  sugerencias: [
    '¿Ya probaste nuestra Focaccia del día?',
    'Una Coca de vidrio bien fría cae perfecto con la pizza.',
    'Pregunta por el postre de temporada la próxima vez.'
  ]
};

let cache = {
  data: null,
  fetchedAt: 0
};

/** Parser CSV simple: soporta comillas dobles y comas dentro de campos citados. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }
  // última celda/fila si el archivo no termina en salto de línea
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Convierte las filas [campo, valor] del Sheet en un objeto de contenido. */
function rowsToContent(rows) {
  const content = {
    mensaje_principal: '',
    promo_titulo: '',
    promo_texto: '',
    promo_imagen: '',
    promo_link: '',
    sugerencias: []
  };

  // Se salta la fila de encabezado si la primera celda dice "campo"
  const dataRows = rows[0] && /^campo$/i.test(rows[0][0]?.trim() || '') ? rows.slice(1) : rows;

  for (const cols of dataRows) {
    const key = (cols[0] || '').trim().toLowerCase();
    const value = (cols[1] || '').trim();
    if (!key) continue;

    if (key.startsWith('sugerencia')) {
      if (value) content.sugerencias.push(value);
    } else if (key in content) {
      content[key] = value;
    }
  }

  if (content.sugerencias.length === 0) {
    content.sugerencias = FALLBACK_CONTENT.sugerencias;
  }
  if (!content.mensaje_principal) {
    content.mensaje_principal = FALLBACK_CONTENT.mensaje_principal;
  }

  return content;
}

function pickRandomSuggestion(content) {
  const list = content.sugerencias && content.sugerencias.length
    ? content.sugerencias
    : FALLBACK_CONTENT.sugerencias;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Devuelve el contenido del Sheet (con cache) más una sugerencia random
 * escogida fresh en cada llamada, incluso si el resto viene de cache.
 */
async function getContent() {
  const now = Date.now();
  const cacheAgeMinutes = (now - cache.fetchedAt) / 1000 / 60;
  const csvUrl = process.env.SHEET_CSV_URL;

  const needsRefresh = !cache.data || cacheAgeMinutes > SHEET_CACHE_MINUTES;

  if (needsRefresh && csvUrl && !csvUrl.includes('TU_ID_AQUI')) {
    try {
      const res = await fetch(csvUrl, { timeout: 8000 });
      if (!res.ok) throw new Error(`Sheet respondió ${res.status}`);
      const text = await res.text();
      const rows = parseCSV(text);
      cache = { data: rowsToContent(rows), fetchedAt: now };
    } catch (err) {
      console.error('[sheets] No se pudo leer el Google Sheet, usando cache/fallback:', err.message);
      if (!cache.data) cache = { data: FALLBACK_CONTENT, fetchedAt: now };
    }
  } else if (!cache.data) {
    cache = { data: FALLBACK_CONTENT, fetchedAt: now };
  }

  return {
    ...cache.data,
    sugerencia_random: pickRandomSuggestion(cache.data)
  };
}

module.exports = { getContent, parseCSV, rowsToContent };
