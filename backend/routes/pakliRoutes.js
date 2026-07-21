// backend/routes/pakliRoutes.js

const express = require('express');
const router = express.Router();
const pakliController = require('../controllers/pakliController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// GET /api/pakli
// Pakli lekérése a kiválasztott entitás függvényében
router.get('/', authMiddleware, (req, res) => pakliController.pakliLekerese(req, res));

// GET /api/pakli/rendezett
// Lapos, rendezett lista (Rendezés nézet, 15. terv-pont) — 1. lépés: időrendi mód
// Védett végpont: bejelentkezés szükséges
router.get('/rendezett', authMiddleware, (req, res) => pakliController.rendezettLekerese(req, res));

// GET /api/pakli/szoveg/:entitasTipus/:entitasId
// Egyetlen entitás szöveg/leírás/indoklás mezőjének lekérése
// Védett végpont: bejelentkezés szükséges
router.get('/szoveg/:entitasTipus/:entitasId', authMiddleware, (req, res) => pakliController.entitasSzovegLekerese(req, res));

module.exports = router;