require('dotenv').config();
const express = require('express');
const path = require('path');
const { getContent } = require('./config/sheets');

const app = express();
const PORT = process.env.PORT || 3000;
const MEXY_BASE_URL = process.env.MEXY_BASE_URL || 'https://laymon.mxy.mx/rastreo';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/static', express.static(path.join(__dirname, 'public')));

// Regex laxa: hashes de Mexy son alfanuméricos largos, sin espacios.
const HASH_PATTERN = /^[a-zA-Z0-9]{10,80}$/;

app.get('/track/:hash', async (req, res) => {
  const { hash } = req.params;

  if (!HASH_PATTERN.test(hash)) {
    return res.status(400).send('Link de tracking inválido.');
  }

  const mexyUrl = `${MEXY_BASE_URL}/${hash}`;
  const content = await getContent();

  res.render('tracking', {
    mexyUrl,
    content,
    brandColor: '#EA1D3B'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send(
    'Laymon Tracking está corriendo. Usa /track/&lt;hash&gt; con el hash que te da Mexy.'
  );
});

app.listen(PORT, () => {
  console.log(`🍕 Laymon Tracking corriendo en el puerto ${PORT}`);
});
