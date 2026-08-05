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

// Egy szülő gyerekei tudatpont szerint, LAPOZVA — a Síkidom nézet
// képernyő-vezérelt betöltésének adatforrása.
// GET /api/sikidom/gyerekek?szulo=<id|elhagyva>&kihagy=<szám>&darab=<szám>
// A `szulo` elhagyva → a gyökerek (a legfelső szint).
// VÉDETT - csak bejelentkezett eemberek
router.get('/sikidom/gyerekek', authMiddleware, sikidomController.gyerekek);

// ===================================
// ROUTER EXPORTÁLÁSA
// ===================================
module.exports = router;
