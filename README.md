# Laymon Tracking

Página de tracking con marca Laymon que envuelve el link de rastreo de Mexy.
El cliente ve el mapa en tiempo real de Mexy, pero con logo, colores, mensaje
y promos de Laymon encima — en vez de ver marca Mexy los 15-20 minutos que
espera su pedido.

```
Mexy te da:      https://laymon.mxy.mx/rastreo/HASH
Tú le mandas:    https://tu-dominio.onrender.com/track/HASH
```

---

## 1. Cómo funciona

- `GET /track/:hash` — recibe el mismo hash que te da Mexy, arma la URL
  original de Mexy, la mete en un `<iframe>`, y le pone diseño Laymon encima
  (header, mensaje, promo semanal, sugerencia random, pizza animada).
- El **mensaje, la promo, la imagen, el link y las sugerencias** salen de un
  Google Sheet que tú editas — no hay que tocar código para cambiarlos.
- El servidor lee ese Sheet cada `SHEET_CACHE_MINUTES` minutos (5 por
  default) y cachea el resultado, para no golpear Google en cada visita.

---

## 2. Preparar el Google Sheet (el CMS)

1. Crea un Google Sheet nuevo con **dos columnas**: `campo` y `valor`.
2. Llena las filas exactamente con estos nombres de campo (el orden no
   importa, los nombres sí):

   | campo              | valor                                                      |
   |--------------------|-------------------------------------------------------------|
   | mensaje_principal  | Aquí puedes ver la ubicación del repartidor que lleva tu pedido. Tu pedido va en camino, puedes ver el tracking del repartidor en tiempo real aquí: |
   | promo_titulo       | Pizza Carnívora                                              |
   | promo_texto        | Esta semana con doble pepperoni                              |
   | promo_imagen       | https://... (link directo a una imagen, puede ser de Drive publicado o de tu web) |
   | promo_link         | https://laymonpizzeria.getjusto.com/pedir                    |
   | sugerencia_1       | ¿Ya probaste nuestra Focaccia del día?                       |
   | sugerencia_2       | Agrega una Coca de vidrio bien fría a tu pedido               |
   | sugerencia_3       | Pregunta por el postre de temporada                          |

   Puedes agregar `sugerencia_4`, `sugerencia_5`, etc. — todas las filas que
   empiecen con `sugerencia_` se juntan y rotan solas en la página.

   Si dejas `promo_titulo` y `promo_texto` vacíos, el bloque de promo
   simplemente no aparece (no te obliga a tener promo todo el tiempo).

3. **Publica el Sheet como CSV:**
   - Archivo → Compartir → **Publicar en la web**
   - En "Vincular", selecciona la hoja correcta.
   - En el segundo desplegable, elige **Valores separados por comas (.csv)**
   - Clic en **Publicar**
   - Copia el link que te da Google (algo como
     `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv`)

4. Pega ese link en la variable de entorno `SHEET_CSV_URL` (ver sección 4).

**Editar es así de simple:** abres el Sheet, cambias una celda, guardas.
El cambio se refleja en la página de tracking en un máximo de
`SHEET_CACHE_MINUTES` minutos, sin tocar nada más.

---

## 3. Deploy en Render (gratis, 24/7)

1. Sube esta carpeta a un repo de GitHub (privado está bien).
2. Entra a [render.com](https://render.com) → **New** → **Web Service**.
3. Conecta el repo.
4. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. En **Environment Variables**, agrega:
   - `SHEET_CSV_URL` → el link que copiaste en el paso 2.4
   - `MEXY_BASE_URL` → `https://laymon.mxy.mx/rastreo` (déjalo así salvo que
     Mexy cambie su dominio)
   - `SHEET_CACHE_MINUTES` → `5` (o el valor que prefieras)
6. Deploy. Render te da una URL tipo
   `https://laymon-tracking.onrender.com`.

**Nota sobre el plan gratis de Render:** se "duerme" tras ~15 min sin
tráfico y tarda unos segundos en despertar en la siguiente visita. Para un
tracking que se manda justo cuando sale el pedido, normalmente no se nota.
Si te molesta, existen servicios gratis tipo UptimeRobot que hacen ping
cada 5 min para mantenerlo despierto, o se sube al plan pago de Render
($7 USD/mes) cuando el volumen lo justifique.

---

## 4. Variables de entorno

Copia `.env.example` a `.env` para desarrollo local:

```
PORT=3000
SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/TU_ID/pub?output=csv
MEXY_BASE_URL=https://laymon.mxy.mx/rastreo
SHEET_CACHE_MINUTES=5
```

En Render, estas mismas variables se configuran en el panel de
"Environment", no en un archivo `.env` (ese archivo no se sube al repo,
está en `.gitignore`).

---

## 5. Correrlo localmente (para probar antes de deploy)

```bash
npm install
cp .env.example .env
# edita .env con tu SHEET_CSV_URL real
npm start
```

Abre `http://localhost:3000/track/CUALQUIER_HASH_DE_PRUEBA` — mientras el
hash tenga entre 10 y 80 caracteres alfanuméricos, la página carga (aunque
el iframe de Mexy mostrará error si el hash no es uno real, eso es
esperado en pruebas).

**Nota:** en el entorno donde armé este proyecto no pude instalar las
dependencias de npm por una restricción de red del sandbox (bloqueo directo
a registry.npmjs.org, no relacionado con este código). Sí verifiqué:
- Sintaxis válida de todos los archivos `.js` (`node --check`)
- La lógica de parseo del CSV y armado de contenido, con un test aislado
  que corrí con datos de ejemplo (comillas, comas, sugerencias múltiples)
- El balance de bloques `<% %>` en el template EJS

Lo que **no** pude correr end-to-end es el servidor Express completo (eso
necesita `npm install`). Cuando lo subas a Render o lo corras en tu máquina
con internet normal, el primer `npm start` + visita a `/track/<hash>` va a
ser la prueba real. Si algo truena ahí, es la primera vuelta de iteración
que hacemos juntos.

---

## 6. Cómo lo usas día a día

Cuando le mandas WhatsApp al cliente con el tracking, en vez de pasarle el
link de Mexy tal cual, le pasas tu versión:

```
Antes:  https://laymon.mxy.mx/rastreo/b0009f6c839f0e1cfff3ae...
Ahora:  https://laymon-tracking.onrender.com/track/b0009f6c839f0e1cfff3ae...
```

Es el mismo hash, solo cambias el dominio de adelante. Si quieres, arma un
snippet de WhatsApp guardado en tu teléfono con el prefijo ya listo para
pegar el hash.

---

## 7. Roadmap / lo que sigue

- [x] Logo real (badge de flamas) integrado en el header
- [x] Tipografías oficiales integradas: Brick (autohospedada, `public/fonts/`)
      para tagline y títulos de promo; Chelsea Market (Google Fonts) para
      cuerpo de texto. Myriad descartado — no es tipografía oficial.
- [x] Ícono real de pizza (Asset 5, del set de íconos de marca) integrado
      sobre el mapa, con las llamas parpadeando por separado en vez de
      rotar la pieza completa (el fuego no gira, tira flama)
- [ ] Confirmar el resto del diseño (layout, jerarquía) contra
      `laymonpizzeria.com` y el menú de Justo — aún no se ha comparado
      visualmente contra esas referencias
- [ ] Analytics: cuántas visitas recibe cada tracking (Plausible/Umami,
      ambos tienen tier gratis)
- [ ] Si algún día Mexy da acceso a su API real, se puede reemplazar el
      iframe por un mapa propio con marcador de pizza en vez de overlay CSS
