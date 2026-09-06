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
const gondolatRoutes = require('./routes/gondolatRoutes');
const tudatpontRoutes = require('./routes/tudatpontRoutes');
const kategoriaRoutes = require('./routes/kategoriaRoutes');
const gondolatTipusRoutes = require('./routes/gondolatTipusRoutes');
const javaslatRoutes = require('./routes/javaslatRoutes');
const ertekJavaslatRoutes = require('./routes/ertekJavaslatRoutes');
const egyezmenyRoutes = require('./routes/egyezmenyRoutes');
const meghivoRoutes = require('./routes/meghivoRoutes');

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

// ÚJ – Struktúra nézet (teljes képernyős fa-nézet) route importálása
const strukturaRoutes = require('./routes/strukturaRoutes');

// ÚJ – Síkidom nézet (fraktál kör-pakolás) route importálása
const sikidomRoutes = require('./routes/sikidomRoutes');

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

// ===== FEJLESZTŐI HOMOKOZÓK KIZÁRÁSA ÉLESBEN (2026-08-17) =====
// A síkidom-/pakolás-teszt oldalak és a hozzájuk tartozó teszt-kód dev-only
// homokozók (böngészős kísérletezéshez). Élesen (koino.hu, NODE_ENV=production)
// ne legyenek elérhetők — 404-gyel válaszolunk rájuk, MIELŐTT a statikus
// kiszolgáló odaadná őket. Dev-ben (NODE_ENV=development) érintetlenül maradnak.
if (process.env.NODE_ENV === 'production') {
  const tesztHomokozoMinta = /^\/(sikidomTeszt\.html|regiPakolasTeszt\.html|js\/teszt\/|css\/teszt\/)/;
  app.use((req, res, next) => {
    if (tesztHomokozoMinta.test(req.path)) {
      console.log('server.js - teszt-homokozó blokkolva (éles):', req.path);
      return res.status(404).send('Not found');
    }
    next();
  });
}

// Statikus fájlok kiszolgálása a frontend mappából
// pl. koino_1.1/frontend/css/main.css → http://localhost:3000/css/main.css
//
// ===== CACHE-STRATÉGIA: „no-cache" (mindig egyeztetünt) =====
// A böngésző CACHE-ELHETI a fájlt, de HASZNÁLAT ELŐTT mindig egyeztetnie kell a
// szerverrel (feltételes kérés az ETag / Last-Modified alapján). Ha a fájl nem
// változott, a szerver olcsó „304 Not Modified"-ot ad (nincs újraletöltés); ha
// változott (pl. új deploy után), friss „200"-at a friss gondolattal.
// MIÉRT KELL (Csaba, 2026-08-19): enélkül a mobil böngészők agresszíven cache-elik
// az ES-modulokat, és deploy után is a RÉGI kódot futtatják — órákig félrevezető
// „nem működik" tüneteket okozva, holott a kód rég jó. (Nem `no-store`: azzal minden
// betöltés újraletöltene; a `no-cache` + ETag a gyors ÉS friss kombináció.)
app.use(express.static(path.join(PROJEKT_GYOKER, 'frontend'), {
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

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
app.use('/api/gondolat', gondolatRoutes);
app.use('/api/tudatpont', tudatpontRoutes);
app.use('/api/kategoria', kategoriaRoutes);
app.use('/api/gondolatTipus', gondolatTipusRoutes);
app.use('/api/javaslat', javaslatRoutes);
app.use('/api', ertekJavaslatRoutes);
app.use('/api/egyezmeny', egyezmenyRoutes);
app.use('/api/meghivo', meghivoRoutes);

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
// ÚJ – Struktúra nézet route regisztrálása (GET /api/struktura + /api/struktura/darabszam)
app.use('/api', strukturaRoutes);
// ÚJ – Síkidom nézet route regisztrálása (GET /api/sikidom)
app.use('/api', sikidomRoutes);

// ===================================
// GYÖKÉR ÚTVONAL
// ===================================

app.get('/', (req, res) => {
// Az index.html abszolút elérési útja
const celFajl = path.join(PROJEKT_GYOKER, 'frontend', 'index.html');

// Diagnosztika: kiírjuk melyik fájlt próbáljuk kiszolgálni
console.log('index.html kiszolgálása:', celFajl);

// Az index.html a belépési pont — soha ne szolgáljon ki régi verziót cache-ből
// (lásd a statikus kiszolgálás no-cache magyarázatát fentebb). Egyeztetés ETag
// alapján: változatlan = 304, változott = friss 200.
res.setHeader('Cache-Control', 'no-cache');
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

// E-mail összefoglalók (5. lépés): azoknak, akik időközönkénti összefoglalót kérnek.
// 10 percenként fut, és csak annak küld, akinél letelt a SAJÁT beállított időköze.
const emailOsszefoglaloCronJob = require('./jobs/emailOsszefoglaloCronJob');
emailOsszefoglaloCronJob.start();

app.listen(3000, () => {
console.log('Szerver fut a 3000-es porton');
console.log('Elérhető: http://localhost:3000');
});
})
.catch((err) => {
console.error('Database connection error:', err);
});