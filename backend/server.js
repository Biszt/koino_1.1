// backend/server.js

console.info('server.js indítása...');

// ===================================
// SZÜKSÉGES KÖNYVTÁRAK IMPORTÁLÁSA
// ===================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

// ===================================
// ÚTVONALAK IMPORTÁLÁSA
// ===================================

const eemberRoutes = require('./routes/eemberRoutes');
const lokacioRoutes = require('./routes/lokacioRoutes');
const tartalomRoutes = require('./routes/tartalomRoutes');
const tudatpontRoutes = require('./routes/tudatpontRoutes');
const kategoriaRoutes = require('./routes/kategoriaRoutes');
const tartalomTipusRoutes = require('./routes/tartalomTipusRoutes');
const javaslatRoutes = require('./routes/javaslatRoutes');
const ertekJavaslatRoutes = require('./routes/ertekJavaslatRoutes');
const egyezmenyRoutes = require('./routes/egyezmenyRoutes');

// ÚJ – Értesítési rendszer routes importálása
const ertesitesRoutes = require('./routes/ertesitesRoutes');
const ertesitesiBeallitasRoutes = require('./routes/ertesitesiBeallitasRoutes');
// Platform statisztika route importálása
const platformStatisztikaRoutes = require('./routes/platformStatisztikaRoutes');
// ÚJ – Pakli route importálása
const pakliRoutes = require('./routes/pakliRoutes');

const feltoltesRoutes = require('./routes/feltoltesRoutes');

// ÚJ – Cím-alapú entitás-kereső route importálása
const keresesRoutes = require('./routes/keresesRoutes');

// ===================================
// EXPRESS ALKALMAZÁS LÉTREHOZÁSA
// ===================================

const app = express();

// ===================================
// MIDDLEWARE-EK BEÁLLÍTÁSA
// ===================================

app.use(cors());
app.use(express.json());

// Diagnosztika: kiírjuk az elérési utakat, hogy lássuk hol keres a szerver
// __dirname = a server.js fájl mappája (pl. /app/backend)
// process.cwd() = a futtatás helye (pl. /app)
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());

// A projekt gyökér meghatározása:
// server.js helye: koino_1.1/backend/server.js
// frontend helye: koino_1.1/frontend/index.html
// Tehát a gyökér: __dirname + '..' = koino_1.1/
const PROJEKT_GYOKER = path.resolve(__dirname, '..');

// Diagnosztika: kiírjuk a kiszámított gyökér útvonalat
console.log('PROJEKT_GYOKER:', PROJEKT_GYOKER);
console.log('Frontend útvonal:', path.join(PROJEKT_GYOKER, 'frontend'));
console.log('index.html útvonal:', path.join(PROJEKT_GYOKER, 'frontend', 'index.html'));

// Statikus fájlok kiszolgálása a frontend mappából
// pl. koino_1.1/frontend/css/main.css → http://localhost:3000/css/main.css
app.use(express.static(path.join(PROJEKT_GYOKER, 'frontend')));

// Feltöltött fájlok kiszolgálása – böngészőben futtatható kiterjesztések
// letöltésként kezelve (Content-Type felülírással)
app.use('/uploads', (req, res, next) => {
  const kiszolgalasKentToltendo = ['.js', '.html', '.htm', '.svg', '.ts', '.mjs'];
  const kiterjesztes = path.extname(req.path).toLowerCase();

  if (kiszolgalasKentToltendo.includes(kiterjesztes)) {
    // Böngésző nem futtatja, csak letölti
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
  }

  next();
}, express.static(path.join(__dirname, 'uploads')));

// ===================================
// ÚTVONALAK REGISZTRÁLÁSA
// ===================================

app.use('/api', eemberRoutes);
app.use('/api', lokacioRoutes);
app.use('/api/tartalom', tartalomRoutes);
app.use('/api/tudatpont', tudatpontRoutes);
app.use('/api/kategoria', kategoriaRoutes);
app.use('/api/tartalomTipus', tartalomTipusRoutes);
app.use('/api/javaslat', javaslatRoutes);
app.use('/api', ertekJavaslatRoutes);
app.use('/api/egyezmeny', egyezmenyRoutes);

// Értesítési rendszer route-ok regisztrálása
app.use('/api/ertesitesek', ertesitesRoutes);
app.use('/api/ertesitesi-beallitasok', ertesitesiBeallitasRoutes);
// Platform statisztika route regisztrálása
app.use('/api', platformStatisztikaRoutes);
// ÚJ – Pakli route regisztrálása
app.use('/api/pakli', pakliRoutes);
// Feltöltés route regisztrálása
app.use('/api/feltoltes', feltoltesRoutes);
// ÚJ – Cím-alapú entitás-kereső route regisztrálása (GET /api/kereses)
app.use('/api', keresesRoutes);

// ===================================
// GYÖKÉR ÚTVONAL
// ===================================

app.get('/', (req, res) => {
// Az index.html abszolút elérési útja
const celFajl = path.join(PROJEKT_GYOKER, 'frontend', 'index.html');

// Diagnosztika: kiírjuk melyik fájlt próbáljuk kiszolgálni
console.log('index.html kiszolgálása:', celFajl);

res.sendFile(celFajl);
});

// ===================================
// MONGODB KAPCSOLAT ÉS SZERVER INDÍTÁSA
// ===================================

mongoose.connect(process.env.MONGODB_URI)
.then(() => {
console.log('MongoDB kapcsolat sikeres');

const javaslatCronJob = require('./jobs/javaslatCronJob');
javaslatCronJob.start();

app.listen(3000, () => {
console.log('Szerver fut a 3000-es porton');
console.log('Elérhető: http://localhost:3000');
});
})
.catch((err) => {
console.error('Database connection error:', err);
});