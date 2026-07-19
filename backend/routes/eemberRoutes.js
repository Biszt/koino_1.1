// backend/routes/eemberRoutes.js

// ===== EXPRESS ROUTER IMPORTÁLÁSA =====
// Ez kezeli az útvonalakat
const express = require('express');

// ===== ROUTER PÉLDÁNY LÉTREHOZÁSA =====
// Ez egy mini Express alkalmazás
const router = express.Router();

// ===== CONTROLLER IMPORTÁLÁSA =====
// Ez fogja kezelni az üzleti logikát
const eemberController = require('../controllers/eemberController');

// ===== MIDDLEWARE IMPORTÁLÁSA =====
// Az authMiddleware ellenőrzi a JWT tokent és beállítja a req.user objektumot
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===== ÚTVONALAK DEFINIÁLÁSA =====

// ----- EEMBER REGISZTRÁCIÓ -----
// POST kérés: /api/eember/regisztracio
// Nyilvános – authentikáció nem szükséges
router.post('/eember/regisztracio', eemberController.regisztracio);

// ----- EEMBER BEJELENTKEZÉS -----
// POST kérés: /api/eember/bejelentkezes
// Nyilvános – authentikáció nem szükséges
router.post('/eember/bejelentkezes', eemberController.bejelentkezes);

// ----- SAJÁT ADATOK LEKÉRÉSE -----
// GET kérés: /api/eember/sajat-adatok
// Védett – csak bejelentkezett eemberek érhetik el
// Visszaadja: eemberNev, nev, tudatpontok (főoldal statisztika sávhoz)
router.get('/eember/sajat-adatok', authMiddleware, eemberController.sajatAdatokLekereses);

// ----- PROFIL-ADATOK MÓDOSÍTÁSA -----
// PUT kérés: /api/eember/adatok (body: nev, lokacio)
// Védett – az eember beállítások modal használja (terv 8. pont)
router.put('/eember/adatok', authMiddleware, eemberController.profilModositasa);

// ----- JELSZÓVÁLTÁS -----
// POST kérés: /api/eember/jelszovaltas (body: regiJelszo, ujJelszo)
// Védett – csak a régi jelszó helyes megadásával
router.post('/eember/jelszovaltas', authMiddleware, eemberController.jelszoValtas);

// ===== ROUTER EXPORTÁLÁSA =====
// Ezt importálja a server.js
module.exports = router;