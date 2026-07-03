// backend/routes/platformStatisztikaRoutes.js

// ===== EXPRESS ROUTER IMPORTÁLÁSA =====
// Ez kezeli az útvonalakat
const express = require('express');

// ===== ROUTER PÉLDÁNY LÉTREHOZÁSA =====
// Ez egy mini Express alkalmazás
const router = express.Router();

// ===== CONTROLLER IMPORTÁLÁSA =====
// Ez fogja kezelni a statisztika lekérések logikáját
const platformStatisztikaController = require('../controllers/platformStatisztikaController');

// ===== MIDDLEWARE IMPORTÁLÁSA =====
// Az authMiddleware ellenőrzi a JWT tokent és beállítja a req.user objektumot
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===== ÚTVONALAK DEFINIÁLÁSA =====

// ----- PLATFORM STATISZTIKA LEKÉRÉSE -----
// GET kérés: /api/platform/statisztika
// Védett – csak bejelentkezett eemberek érhetik el
// Visszaadja: eemberekSzama, tartalmakSzama (főoldal statisztika sávhoz)
router.get('/platform/statisztika', authMiddleware, platformStatisztikaController.platformStatisztikaLekereses);

// ===== ROUTER EXPORTÁLÁSA =====
// Ezt importálja a server.js
module.exports = router;