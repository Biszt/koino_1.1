// backend/routes/sikidomRoutes.js

// ===================================
// EXPRESS ROUTER IMPORTÁLÁSA
// ===================================
const express = require('express');
const router = express.Router();

// ===================================
// CONTROLLER IMPORTÁLÁSA
// ===================================
const sikidomController = require('../controllers/sikidomController');

// ===================================
// MIDDLEWARE IMPORTÁLÁSA
// ===================================
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// Egy szülő gyerekei egy TUDATPONT-KÜSZÖB fölött (nem lapozás, kurzoros) —
// a Síkidom nézet képernyő-vezérelt betöltésének adatforrása.
// GET /api/sikidom/gyerekek?szulo=<id|elhagyva>&minPont=<szám>
//                          &kurzorPont=<szám>&kurzorId=<id>&darab=<szám>
//                          &osszesKell=<0|1>
// A `szulo` elhagyva → a gyökerek (a legfelső szint).
// VÉDETT - csak bejelentkezett eemberek
router.get('/sikidom/gyerekek', authMiddleware, sikidomController.gyerekek);

// Egy entitás ŐS-LÁNCA (önmagától a gyökérig) — a Síkidom nézet ág-gyökértől
// indításához (a kártya-menüs „Síkidom nézet").
// GET /api/sikidom/oslanc?entitas=<id>
// VÉDETT - csak bejelentkezett eemberek
router.get('/sikidom/oslanc', authMiddleware, sikidomController.oslanc);

// ===================================
// ROUTER EXPORTÁLÁSA
// ===================================
module.exports = router;
