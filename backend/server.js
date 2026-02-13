// backend/server.js

console.info('server.js indítása...');

// ===================================
// SZÜKSÉGES KÖNYVTÁRAK IMPORTÁLÁSA
// ===================================

const express = require('express'); // Web szerver keretrendszer
const mongoose = require('mongoose'); // MongoDB kapcsolat
const cors = require('cors'); // Cross-Origin Resource Sharing
const path = require('path'); // Útvonal kezelés

// Környezeti változók betöltése .env fájlból
require('dotenv').config();

// ===================================
// ÚTVONALAK IMPORTÁLÁSA
// ===================================

// Ember útvonalak importálása
const emberRoutes = require('./routes/emberRoutes');
// Lokáció útvonalak importálása
const lokacioRoutes = require('./routes/lokacioRoutes');
// Tartalom routes importálása
const tartalomRoutes = require('./routes/tartalomRoutes');
// Tudatpont routes importálása
const tudatpontRoutes = require('./routes/tudatpontRoutes');
// Kategória routes importálása
const kategoriaRoutes = require('./routes/kategoriaRoutes');
// Tartalom Típus routes importálása
const tartalomTipusRoutes = require('./routes/tartalomTipusRoutes');
// Javaslat routes importálása
const javaslatRoutes = require('./routes/javaslatRoutes');
// Érték Javaslat routes importálása
const ertekJavaslatRoutes = require('./routes/ertekJavaslatRoutes');
// Egyezmény routes importálása
const egyezmenyRoutes = require('./routes/egyezmenyRoutes');

// ===================================
// EXPRESS ALKALMAZÁS LÉTREHOZÁSA
// ===================================

const app = express();

// ===================================
// MIDDLEWARE-EK BEÁLLÍTÁSA
// ===================================

// CORS engedélyezése (frontend-backend kommunikációhoz)
app.use(cors());

// JSON adatok feldolgozása a kérésekből
app.use(express.json());

// Statikus fájlok kiszolgálása (frontend)
app.use(express.static('frontend'));

// ===================================
// ÚTVONALAK REGISZTRÁLÁSA
// ===================================

// Minden /api előtaggal kezdődik

// /api/ember... útvonalak kezelése
app.use('/api', emberRoutes);

// /api/lokacio... útvonalak kezelése
app.use('/api', lokacioRoutes);

// /api/tartalom... útvonalak kezelése
app.use('/api/tartalom', tartalomRoutes);

// /api/tudatpont... útvonalak kezelése
app.use('/api/tudatpont', tudatpontRoutes);

// /api/kategoria... útvonalak kezelése
app.use('/api/kategoria', kategoriaRoutes);

// /api/tartalomTipus... útvonalak kezelése
app.use('/api/tartalomTipus', tartalomTipusRoutes);

// /api/javaslat... útvonalak kezelése
app.use('/api/javaslat', javaslatRoutes);

// /api/ertekJavaslat... útvonalak kezelése 
app.use('/api', ertekJavaslatRoutes);

// /api/egyezmeny... útvonalak kezelése
app.use('/api/egyezmeny', egyezmenyRoutes); 

// ===================================
// GYÖKÉR ÚTVONAL
// ===================================

// Gyökér útvonal - index.html kiszolgálása
app.get('/', (req, res) => {
  res.sendFile('frontend/index.html');
});

// ===================================
// MONGODB KAPCSOLAT ÉS SZERVER INDÍTÁSA
// ===================================

mongoose.connect(process.env.MONGODB_URI) // .env-ben tárolt DB kapcsolat
  .then(() => {
    console.log('MongoDB kapcsolat sikeres'); // Sikeres DB kapcsolat

    // Javaslat időzítés indítása (percenkénti frissítés és végrehajtás)
    const javaslatCronJob = require('./jobs/javaslatCronJob');
    javaslatCronJob.start();
    
    // Sikeres DB kapcsolat után: szerver indítása 3000-es porton
    app.listen(3000, () => {
      console.log('Szerver fut a 3000-es porton');
      console.log('Elérhető: http://localhost:3000');
    });
  })
  .catch((err) => {
    // DB kapcsolat hiba esetén: hibaüzenet
    console.error('Database connection error:', err);
  });
